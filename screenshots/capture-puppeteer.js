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
  // The tab the popup "sees"; each capture sets it before the popup initialises
  window.__tabUrl = window.__tabUrl || 'https://stitch.google.com/';
  try { localStorage.setItem('whatsNewSeen', '1.3.1'); } catch (e) {}
  window.chrome = {
    runtime: {
      onMessage: { addListener: () => {} },
      sendMessage: (msg, cb) => {
        let r = {};
        if (msg && msg.action === 'getBatchExportState') r = { isRunning: false, total: 0, current: 0 };
        if (msg && msg.action === 'getProjectCount') r = { count: 117, cached: true };
        if (cb) cb(r);
        return Promise.resolve(r);
      },
      getURL: (p) => 'chrome-extension://stub/' + p,
      getManifest: () => ({ version: '1.3.1' }),
      requestUpdateCheck: () => Promise.resolve({ status: 'no_update' }),
      lastError: null
    },
    tabs: {
      query: (q, cb) => {
        const r = [{ id: 1, windowId: 1, url: window.__tabUrl, active: true }];
        if (cb) cb(r); return Promise.resolve(r);
      },
      sendMessage: (id, msg, cb) => { if (cb) cb({}); return Promise.resolve({}); },
      create: () => Promise.resolve({}),
      update: () => Promise.resolve({})
    },
    windows: { update: () => Promise.resolve({}) },
    scripting: { executeScript: () => Promise.resolve([{ result: { success: false } }]) },
    downloads: { download: () => Promise.resolve(1) }
  };
`;

const DASHBOARD = 'https://stitch.google.com/';
const PROJECT = 'https://stitch.google.com/projects/1234567890123456789';

// Each capture: which tab the popup believes it is on, then drive the real popup functions
const captures = [
  {
    file: '01-popup-dashboard.png',
    url: DASHBOARD,
    setup: async (page) => {
      await page.evaluate(() => {
        setState(AppState.NOT_ON_STITCH);
        document.querySelectorAll('.export-all-label').forEach(el => { el.textContent = 'Export All Projects (117)'; });
      });
    }
  },
  {
    file: '02-popup-project.png',
    url: PROJECT,
    setup: async (page) => {
      await page.evaluate(() => {
        setState(AppState.READY);
        document.querySelectorAll('.export-all-label').forEach(el => { el.textContent = 'Export All Projects (117)'; });
      });
    }
  },
  {
    file: '03-popup-progress-reading.png',
    url: DASHBOARD,
    setup: async (page) => {
      await page.evaluate(() => {
        setState(AppState.BATCH_EXPORT);
        startElapsedClock(Date.now() - 42000);
        updateBatchProgressUI(71, 117, 'Step 1/3 · Reading projects 71/117: Travel Planner App');
      });
    }
  },
  {
    file: '04-popup-progress-opening.png',
    url: DASHBOARD,
    setup: async (page) => {
      await page.evaluate(() => {
        setState(AppState.BATCH_EXPORT);
        startElapsedClock(Date.now() - 95000);
        updateBatchProgressUI(1, 3, 'Step 2/3 · 3 project(s) had not been opened in Stitch for a while. Opening them one by one in a background tab and reading only those again: "Recipe Book" (2/3)...');
      });
    }
  },
  {
    file: '05-popup-progress-downloading.png',
    url: DASHBOARD,
    setup: async (page) => {
      await page.evaluate(() => {
        setState(AppState.BATCH_EXPORT);
        startElapsedClock(Date.now() - 128000);
        updateBatchProgressUI(88, 117, 'Step 3/3 · Downloading screen files 88/117: Fitness Tracker (37 files)');
      });
    }
  },
  {
    file: '06-popup-success.png',
    url: DASHBOARD,
    setup: async (page) => {
      await page.evaluate(() => {
        setState(AppState.SUCCESS);
        updateSuccessMessage('Successfully exported 117/117 projects to ZIP!');
      });
    }
  },
  {
    file: '07-popup-whats-new.png',
    url: DASHBOARD,
    setup: async (page) => {
      await page.evaluate(() => {
        setState(AppState.NOT_ON_STITCH);
        document.querySelectorAll('.export-all-label').forEach(el => { el.textContent = 'Export All Projects (117)'; });
        renderWhatsNew();
      });
    }
  },
  {
    file: '08-popup-not-on-stitch.png',
    url: 'https://www.google.com/',
    setup: async (page) => {
      await page.evaluate(() => setState(AppState.NOT_ON_STITCH));
    }
  },
  {
    file: '09-popup-custom-format.png',
    url: PROJECT,
    setup: async (page) => {
      await page.evaluate(() => {
        setState(AppState.READY);
        const custom = document.querySelector('input[name="format"][value="custom"]');
        if (custom) { custom.checked = true; custom.dispatchEvent(new Event('change', { bubbles: true })); }
        document.getElementById('customSettings')?.classList.remove('hidden');
      });
    }
  }
];

async function main() {
  // Read popup HTML, inject the chrome stub BEFORE popup.js loads
  let html = fs.readFileSync(POPUP_HTML, 'utf8');
  const stubTag = `<script>${chromeStub}</script>\n  `;
  // Insert stub right before the popup.js script tag
  html = html.replace('<script src="../utils/remote-config.js"></script>', stubTag + '<script src="../utils/remote-config.js"></script>');

  // Write temp HTML alongside popup so relative paths resolve
  const tempHtml = path.join(REPO_ROOT, 'popup', '_capture.html');
  fs.writeFileSync(tempHtml, html);

  const browser = await puppeteer.launch({
    headless: 'new',
    // Use the installed Chrome when puppeteer has no bundled browser (PUPPETEER_EXECUTABLE_PATH overrides)
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ||
      (fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined),
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    for (const c of captures) {
      const page = await browser.newPage();
      await page.setViewport({ width: 400, height: 640, deviceScaleFactor: 2 });
      await page.evaluateOnNewDocument((u) => { window.__tabUrl = u; }, c.url);
      await page.goto('file://' + tempHtml, { waitUntil: 'domcontentloaded' });
      // Let initialize() finish (remote-config check included) before forcing a state
      await new Promise(r => setTimeout(r, 2500));
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
