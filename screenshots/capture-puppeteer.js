/**
 * Capture popup screenshots for the Chrome Web Store listing.
 *
 * Strategy: load popup.html in a real browser, stub chrome.* APIs so the
 * popup.js doesn't crash, then for each state call setState() manually
 * via page.evaluate() to drive the UI into the target state.
 *
 * Output: 01-popup-main.png, 02-popup-batch-progress.png, ..., 1280×800
 * marketing crops where useful.
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = __dirname;
const REPO_ROOT = path.resolve(__dirname, '..');
const POPUP_HTML = path.join(REPO_ROOT, 'popup', 'popup.html');

/** Stub script injected before popup.js so it doesn't crash on chrome.* APIs. */
const chromeStub = `
  window.chrome = {
    runtime: {
      onMessage: { addListener: () => {} },
      sendMessage: (msg, cb) => {
        // Default stubs for messages the popup sends on load
        if (msg && msg.action === 'getBatchExportState') {
          const r = { isRunning: false, total: 0, current: 0 };
          if (cb) cb(r); return Promise.resolve(r);
        }
        if (msg && msg.action === 'getProjectCount') {
          const r = { count: 71, cached: true };
          if (cb) cb(r); return Promise.resolve(r);
        }
        if (cb) cb({});
        return Promise.resolve({});
      },
      getURL: (p) => 'chrome-extension://stub/' + p,
      lastError: null
    },
    tabs: {
      query: (q, cb) => {
        const r = [{ id: 1, url: 'https://stitch.withgoogle.com/projects/123', active: true }];
        if (cb) cb(r); return Promise.resolve(r);
      },
      sendMessage: (id, msg, cb) => { if (cb) cb({}); return Promise.resolve({}); },
      create: () => Promise.resolve({})
    },
    scripting: {
      executeScript: () => Promise.resolve([{ result: { success: false } }])
    },
    downloads: { download: () => Promise.resolve(1) }
  };
`;

const captures = [
  {
    file: '01-popup-ready-on-stitch.png',
    setup: async (page) => {
      // popup.js auto-detects state; force "ready"
      await page.evaluate(() => {
        document.querySelectorAll('.state').forEach(e => e.classList.add('hidden'));
        document.getElementById('readyState').classList.remove('hidden');
      });
    }
  },
  {
    file: '02-popup-custom-format.png',
    setup: async (page) => {
      await page.evaluate(() => {
        document.querySelectorAll('.state').forEach(e => e.classList.add('hidden'));
        document.getElementById('readyState').classList.remove('hidden');
        const cs = document.getElementById('customSettings');
        if (cs) cs.classList.remove('hidden');
        const customRadio = document.querySelector('input[name="format"][value="custom"]');
        const claudeRadio = document.querySelector('input[name="format"][value="claude"]');
        if (claudeRadio) claudeRadio.checked = false;
        if (customRadio) customRadio.checked = true;
      });
    }
  },
  {
    file: '03-popup-not-on-stitch.png',
    setup: async (page) => {
      await page.evaluate(() => {
        document.querySelectorAll('.state').forEach(e => e.classList.add('hidden'));
        document.getElementById('notOnStitchState').classList.remove('hidden');
      });
    }
  },
  {
    file: '04-popup-batch-progress.png',
    setup: async (page) => {
      await page.evaluate(() => {
        document.querySelectorAll('.state').forEach(e => e.classList.add('hidden'));
        document.getElementById('batchExportState').classList.remove('hidden');
        const bar = document.getElementById('batchProgressBar');
        if (bar) bar.style.width = '48%';
        const txt = document.getElementById('batchProgressText');
        if (txt) txt.textContent = 'Downloaded 34/71: Xporter Dashboard Command Center (6 files)';
        const count = document.getElementById('batchProgressCount');
        if (count) count.textContent = '34 / 71 projects';
      });
    }
  },
  {
    file: '05-popup-success.png',
    setup: async (page) => {
      await page.evaluate(() => {
        document.querySelectorAll('.state').forEach(e => e.classList.add('hidden'));
        document.getElementById('successState').classList.remove('hidden');
        const msg = document.getElementById('successMessage');
        if (msg) msg.textContent = 'Successfully exported 71/71 projects to ZIP!';
      });
    }
  },
  {
    file: '06-popup-error.png',
    setup: async (page) => {
      await page.evaluate(() => {
        document.querySelectorAll('.state').forEach(e => e.classList.add('hidden'));
        document.getElementById('errorState').classList.remove('hidden');
        const msg = document.getElementById('errorMessage');
        if (msg) msg.textContent = 'No conversation data found. Make sure you are on a Stitch project page with messages.';
      });
    }
  },
  {
    file: '07-popup-loading-counting.png',
    setup: async (page) => {
      // Show "counting projects…" inline loading state
      await page.evaluate(() => {
        document.querySelectorAll('.state').forEach(e => e.classList.add('hidden'));
        document.getElementById('readyState').classList.remove('hidden');
        document.querySelectorAll('.export-all-label').forEach(el => {
          el.classList.add('is-loading');
        });
        document.querySelectorAll('.export-all-hint').forEach(el => {
          el.classList.remove('hidden');
        });
      });
    }
  }
];

async function main() {
  // Read popup HTML, inject the chrome stub BEFORE popup.js loads
  let html = fs.readFileSync(POPUP_HTML, 'utf8');
  const stubTag = `<script>${chromeStub}</script>\n  `;
  // Insert stub right before the popup.js script tag
  html = html.replace(/<script src="popup\.js"><\/script>/, stubTag + '<script src="popup.js"></script>');

  // Write temp HTML alongside popup so relative paths resolve
  const tempHtml = path.join(REPO_ROOT, 'popup', '_capture.html');
  fs.writeFileSync(tempHtml, html);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    for (const c of captures) {
      const page = await browser.newPage();
      await page.setViewport({ width: 400, height: 600, deviceScaleFactor: 2 });
      await page.goto('file://' + tempHtml, { waitUntil: 'domcontentloaded' });
      // Give popup.js a moment to run initialize() and stubs to respond
      await new Promise(r => setTimeout(r, 350));
      // Force the desired state
      await c.setup(page);
      // Settle layout
      await new Promise(r => setTimeout(r, 150));

      const out = path.join(SCREENSHOTS_DIR, c.file);
      await page.screenshot({ path: out, fullPage: false, omitBackground: false });
      console.log(`✓ ${c.file}`);
      await page.close();
    }
  } finally {
    await browser.close();
    fs.unlinkSync(tempHtml);
  }

  console.log('\nDone — screenshots in', SCREENSHOTS_DIR);
}

main().catch(err => {
  console.error('FAIL:', err);
  process.exit(1);
});
