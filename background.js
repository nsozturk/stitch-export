/**
 * Stitch Export Background Service Worker
 * Handles context menu, batch export, and background tasks
 */

importScripts('libs/jszip.min.js', 'utils/formatters.js');

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Stitch Export] Extension installed');

  // Create context menu items
  chrome.contextMenus.create({
    id: 'stitch-export-context',
    title: 'Export Stitch Conversation',
    contexts: ['page'],
    documentUrlPatterns: ['https://stitch.withgoogle.com/projects/*']
  });

  chrome.contextMenus.create({
    id: 'stitch-export-all-context',
    title: 'Export All Stitch Projects',
    contexts: ['page'],
    documentUrlPatterns: ['https://stitch.withgoogle.com/*']
  });

  console.log('[Stitch Export] Context menu created');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'stitch-export-context') {
    handleContextMenuExport(tab);
  }
  if (info.menuItemId === 'stitch-export-all-context') {
    handleContextMenuExportAll(tab);
  }
});

// ============================================================
// Action badge — list page shows project count, detail page
// shows "EXP" reminder. Theme colors: #8D6A8A / #745472.
// ============================================================

const BADGE_COLOR_LIST = '#8D6A8A';   // primary accent
const BADGE_COLOR_DETAIL = '#745472'; // hover/dark
const BADGE_TEXT_COLOR = '#FFFFFF';
const PROJECT_COUNT_CACHE_MS = 10 * 60 * 1000; // 10 min
let _projectCountCache = { value: null, fetchedAt: 0 };
let _fetchInFlight = null;

const isStitchHost = (url) => typeof url === 'string' && url.indexOf('https://stitch.withgoogle.com/') === 0;
const isProjectDetailUrl = (url) => isStitchHost(url) && /\/projects\/\d+/.test(url);
const isProjectListUrl = (url) => isStitchHost(url) && !isProjectDetailUrl(url);

function formatCount(n) {
  if (typeof n !== 'number' || isNaN(n) || n < 0) return '';
  if (n > 999) return '999+';
  return String(n);
}

async function fetchProjectCountFromTab(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: async () => {
        try {
          const html = document.documentElement.innerHTML;
          const sidMatch = html.match(/"FdrFJe":"([^"]+)"/);
          const tokenMatch = html.match(/"SNlM0e":"([^"]+)"/);
          if (!sidMatch || !tokenMatch) return { ok: false };
          const params = new URLSearchParams({
            'f.req': '[[["A7f2qf","[]",null,"1"]]]',
            'at': tokenMatch[1]
          });
          const res = await fetch(`/_/Nemo/data/batchexecute?rpcids=A7f2qf&f.sid=${sidMatch[1]}&rt=c`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            body: params.toString()
          });
          const text = await res.text();
          // Parse the JSON envelope; a regex missed titles with escapes (e.g. "&" → &) and null titles
          const seen = new Set();
          for (const line of text.split('\n')) {
            if (!line.startsWith('[["wrb.fr","A7f2qf"')) continue;
            const inner = JSON.parse(JSON.parse(line)[0][2]);
            for (const p of (inner && inner[0]) || []) {
              const id = String((p && p[0]) || '').split('/')[1];
              if (id) seen.add(id);
            }
          }
          return { ok: true, count: seen.size };
        } catch (e) {
          return { ok: false };
        }
      }
    });
    const r = results && results[0] && results[0].result;
    if (r && r.ok && typeof r.count === 'number') return r.count;
  } catch (e) {
    // executeScript can fail if tab navigated; ignore
  }
  return null;
}

async function getProjectCount(tabId) {
  const now = Date.now();
  if (_projectCountCache.value != null && now - _projectCountCache.fetchedAt < PROJECT_COUNT_CACHE_MS) {
    return _projectCountCache.value;
  }
  if (_fetchInFlight) return _fetchInFlight;
  _fetchInFlight = (async () => {
    const count = await fetchProjectCountFromTab(tabId);
    if (count != null) {
      _projectCountCache = { value: count, fetchedAt: Date.now() };
    }
    _fetchInFlight = null;
    return count;
  })();
  return _fetchInFlight;
}

// Braille spinner — renders well in Chrome action badge.
const SPINNER_FRAMES = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
let _spinnerTimer = null;
let _spinnerFrame = 0;
let _spinnerTabId = null;

function startBadgeSpinner(tabId, color) {
  stopBadgeSpinner();
  _spinnerTabId = tabId;
  _spinnerFrame = 0;
  try { chrome.action.setBadgeBackgroundColor({ tabId, color }); } catch (e) {}
  const tick = () => {
    const ch = SPINNER_FRAMES[_spinnerFrame % SPINNER_FRAMES.length];
    _spinnerFrame++;
    chrome.action.setBadgeText({ tabId, text: ch }).catch(() => stopBadgeSpinner());
  };
  tick();
  _spinnerTimer = setInterval(tick, 120);
}

function stopBadgeSpinner() {
  if (_spinnerTimer) {
    clearInterval(_spinnerTimer);
    _spinnerTimer = null;
  }
  _spinnerTabId = null;
}

async function applyBadge(tab) {
  if (!tab || !tab.id) return;
  const tabId = tab.id;
  const url = tab.url || '';

  try {
    if (isProjectDetailUrl(url)) {
      // Switching away from a list tab → stop any running spinner
      if (_spinnerTabId !== null && _spinnerTabId !== tabId) stopBadgeSpinner();
      await chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR_DETAIL });
      if (chrome.action.setBadgeTextColor) {
        try { await chrome.action.setBadgeTextColor({ tabId, color: BADGE_TEXT_COLOR }); } catch (e) {}
      }
      await chrome.action.setBadgeText({ tabId, text: 'EXP' });
      await chrome.action.setTitle({ tabId, title: 'Click to export this Stitch project' });
      return;
    }

    if (isProjectListUrl(url)) {
      await chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR_LIST });
      if (chrome.action.setBadgeTextColor) {
        try { await chrome.action.setBadgeTextColor({ tabId, color: BADGE_TEXT_COLOR }); } catch (e) {}
      }

      const cached = _projectCountCache.value;
      if (typeof cached === 'number') {
        // Fast path: show cached count instantly. Refresh in background.
        stopBadgeSpinner();
        await chrome.action.setBadgeText({ tabId, text: formatCount(cached) });
        await chrome.action.setTitle({ tabId, title: `${cached} Stitch projects — click to export all` });
        const fresh = await getProjectCount(tabId);
        if (fresh != null) {
          try {
            const cur = await chrome.tabs.get(tabId);
            if (cur && isProjectListUrl(cur.url || '')) {
              await chrome.action.setBadgeText({ tabId, text: formatCount(fresh) });
              await chrome.action.setTitle({ tabId, title: `${fresh} Stitch projects — click to export all` });
            }
          } catch (e) { /* tab closed */ }
        }
        return;
      }

      // No cache → spin while fetching
      startBadgeSpinner(tabId, BADGE_COLOR_LIST);
      await chrome.action.setTitle({ tabId, title: 'Stitch — projeler sayılıyor, biraz uzun sürebilir…' });

      const fresh = await getProjectCount(tabId);
      stopBadgeSpinner();
      try {
        const cur = await chrome.tabs.get(tabId);
        if (cur && isProjectListUrl(cur.url || '')) {
          if (fresh != null) {
            await chrome.action.setBadgeText({ tabId, text: formatCount(fresh) });
            await chrome.action.setTitle({ tabId, title: `${fresh} Stitch projects — click to export all` });
          } else {
            await chrome.action.setBadgeText({ tabId, text: '?' });
            await chrome.action.setTitle({ tabId, title: 'Stitch — proje sayısı alınamadı' });
          }
        }
      } catch (e) { /* tab closed */ }
      return;
    }

    // Not a Stitch tab → clear
    await chrome.action.setBadgeText({ tabId, text: '' });
    await chrome.action.setTitle({ tabId, title: 'Stitch Export — open stitch.withgoogle.com to use' });
  } catch (e) {
    // Action API can throw if tab disappears; ignore
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    applyBadge(tab);
  }
});

chrome.tabs.onActivated.addListener(async (info) => {
  try {
    const tab = await chrome.tabs.get(info.tabId);
    applyBadge(tab);
  } catch (e) { /* tab closed */ }
});

chrome.runtime.onStartup.addListener(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) applyBadge(tab);
  } catch (e) {}
});

// Also apply on install for the currently active tab
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) applyBadge(tab);
  } catch (e) {}
});

// Handle context menu export all
async function handleContextMenuExportAll(tab) {
  try {
    console.log('[Stitch Export] Context menu export-all triggered');
    // Use default format (claude)
    await handleExportAllProjects('claude', {});
  } catch (error) {
    console.error('[Stitch Export] Context menu export-all error:', error);
  }
}

// Handle context menu export
async function handleContextMenuExport(tab) {
  try {
    console.log('[Stitch Export] Context menu export triggered');

    // Show format selection dialog by injecting a script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: showExportDialog
    });

  } catch (error) {
    console.error('[Stitch Export] Context menu export error:', error);
  }
}

// Function to inject and show export dialog (runs in page context)
function showExportDialog() {
  // Check if dialog already exists
  if (document.getElementById('stitch-export-context-dialog')) {
    return;
  }

  // Create dialog
  const dialog = document.createElement('div');
  dialog.id = 'stitch-export-context-dialog';
  dialog.innerHTML = `
    <div class="dialog-overlay-ctx">
      <div class="dialog-content-ctx">
        <div class="dialog-header-ctx">
          <h2>Export Stitch Conversation</h2>
          <button class="close-btn-ctx" aria-label="Close">×</button>
        </div>

        <div class="dialog-body-ctx">
          <label class="format-label-ctx">Select Export Format:</label>

          <div class="format-options-ctx">
            <label class="format-option-ctx">
              <input type="radio" name="ctx-export-format" value="claude" checked>
              <div>
                <div class="format-title-ctx">Claude Code Format</div>
                <div class="format-desc-ctx">Structured format compatible with Claude Code exports</div>
              </div>
            </label>

            <label class="format-option-ctx">
              <input type="radio" name="ctx-export-format" value="openai">
              <div>
                <div class="format-title-ctx">OpenAI ChatGPT Format</div>
                <div class="format-desc-ctx">Compatible with OpenAI Chat Completion API</div>
              </div>
            </label>
          </div>
        </div>

        <div class="dialog-footer-ctx">
          <button class="btn-ctx btn-secondary-ctx cancel-btn-ctx">Cancel</button>
          <button class="btn-ctx btn-primary-ctx export-btn-ctx">Export</button>
        </div>
      </div>
    </div>
  `;

  // Add styles
  const styles = document.createElement('style');
  styles.textContent = `
    .dialog-overlay-ctx {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      animation: fadeIn-ctx 0.2s ease-out;
    }

    .dialog-content-ctx {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 500px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    }

    @keyframes fadeIn-ctx {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .dialog-header-ctx {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid #e0e0e0;
    }

    .dialog-header-ctx h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }

    .close-btn-ctx {
      background: none;
      border: none;
      padding: 4px 8px;
      cursor: pointer;
      color: #666;
      font-size: 24px;
      line-height: 1;
    }

    .close-btn-ctx:hover {
      color: #333;
    }

    .dialog-body-ctx {
      padding: 24px;
    }

    .format-label-ctx {
      display: block;
      font-weight: 600;
      margin-bottom: 16px;
      color: #555;
      font-size: 14px;
    }

    .format-options-ctx {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .format-option-ctx {
      display: flex;
      align-items: flex-start;
      padding: 14px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .format-option-ctx:hover {
      border-color: #8D6A8A;
      background: #f5f0f5;
    }

    .format-option-ctx input[type="radio"] {
      margin-top: 2px;
      margin-right: 12px;
      cursor: pointer;
      accent-color: #8D6A8A;
    }

    .format-title-ctx {
      font-weight: 500;
      margin-bottom: 4px;
      color: #333;
      font-size: 14px;
    }

    .format-desc-ctx {
      font-size: 13px;
      color: #666;
      line-height: 1.4;
    }

    .dialog-footer-ctx {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
    }

    .btn-ctx {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }

    .btn-primary-ctx {
      background: #8D6A8A;
      color: white;
    }

    .btn-primary-ctx:hover {
      background: #745472;
    }

    .btn-secondary-ctx {
      background: white;
      color: #666;
      border: 1px solid #e0e0e0;
    }

    .btn-secondary-ctx:hover {
      background: #f5f5f5;
    }
  `;

  document.head.appendChild(styles);
  document.body.appendChild(dialog);

  // Event handlers
  function closeDialog() {
    dialog.remove();
    styles.remove();
  }

  function executeExport() {
    try {
      const selectedFormat = dialog.querySelector('input[name="ctx-export-format"]:checked')?.value || 'claude';

      const conversationData = StitchExtractor.extractConversation();

      if (!conversationData) {
        alert('No conversation data found. Make sure you\'re on a Stitch project page with messages.');
        closeDialog();
        return;
      }

      const formattedData = StitchFormatters.format(conversationData, selectedFormat);
      const filename = StitchFormatters.generateFilename(conversationData, selectedFormat);

      const success = StitchDownloader.downloadJSON(formattedData, filename);

      if (success) {
        StitchDownloader.showSuccessNotification(filename);
      } else {
        alert('Failed to download file');
      }

      closeDialog();

    } catch (error) {
      console.error('[Stitch Export] Export error:', error);
      alert('An error occurred during export: ' + error.message);
      closeDialog();
    }
  }

  dialog.querySelector('.close-btn-ctx').addEventListener('click', closeDialog);
  dialog.querySelector('.cancel-btn-ctx').addEventListener('click', closeDialog);
  dialog.querySelector('.export-btn-ctx').addEventListener('click', executeExport);
  dialog.querySelector('.dialog-overlay-ctx').addEventListener('click', (e) => {
    if (e.target.classList.contains('dialog-overlay-ctx')) {
      closeDialog();
    }
  });
}

// Batch export state
let batchExportState = {
  isRunning: false,
  total: 0,
  current: 0,
  projects: [],
  results: [],
  format: 'claude',
  cancelled: false
};

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Stitch Export] Message received:', request);

  if (request.action === 'export') {
    handleExportRequest(request.format, sender.tab);
    return true;
  }

  
  if (request.action === 'exportProjectLinks') {
    handleExportProjectLinks().then(result => {
      sendResponse(result);
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  if (request.action === 'exportProject') {
    // Single project ZIP: same pipeline as Export All, limited to one project
    handleExportAllProjects(request.format, request.options, request.projectId)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'exportAllProjects') {
    handleExportAllProjects(request.format, request.options)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'getBatchExportState') {
    sendResponse({ ...batchExportState });
    return true;
  }

  if (request.action === 'getProjectCount') {
    // Return cached value immediately if present. Otherwise try to fetch from
    // the active Stitch tab (lazily warms cache for popup display).
    if (typeof _projectCountCache.value === 'number') {
      sendResponse({ count: _projectCountCache.value, cached: true });
      return true;
    }
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && isStitchHost(tab.url || '')) {
          const count = await getProjectCount(tab.id);
          sendResponse({ count: (typeof count === 'number' ? count : null), cached: false });
        } else {
          sendResponse({ count: null, cached: false });
        }
      } catch (e) {
        sendResponse({ count: null, cached: false });
      }
    })();
    return true;
  }

    if (request.action === 'cancelBatchExport') {
    batchExportState.cancelled = true;
    if (batchExportState.currentTabId) {
       chrome.tabs.remove(batchExportState.currentTabId).catch(() => {});
       batchExportState.currentTabId = null;
    }
    sendResponse({ success: true });
    return true;
  }

  return true;
});

// Handle export request
async function handleExportRequest(format, tab) {
  try {
    // Execute extraction in the tab
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (fmt) => {
        try {
          const data = StitchExtractor.extractConversation();
          if (!data) return { success: false, error: 'No data found' };

          const formatted = StitchFormatters.format(data, fmt);
          const filename = StitchFormatters.generateFilename(data, fmt);

          return { success: true, data: formatted, filename };
        } catch (err) {
          return { success: false, error: err.message };
        }
      },
      args: [format]
    });

    if (results && results[0] && results[0].result && results[0].result.success) {
      console.log('[Stitch Export] Export successful');
    }

  } catch (error) {
    console.error('[Stitch Export] Export request error:', error);
  }
}

// ============================================================
// Batch Export All Projects — Pure API approach
// One tab kept open as auth/fetch context, NO per-project tabs,
// NO UI automation. Uses ErneX (screen instances → HTML download
// URLs) and dNS8Mc (chat sessions) RPCs. HTML files downloaded
// directly from contribution.usercontent.google.com (no cookie
// needed — URLs are self-authenticating).
// ============================================================

async function handleExportAllProjects(format, options = {}, onlyProjectId = null) {
  // Local handle: a cancelled run that is still unwinding must not touch a newer run
  const state = batchExportState = {
    isRunning: true,
    total: 0,
    current: 0,
    projects: [],
    results: [],
    format,
    cancelled: false
  };
  let workTab = null;

  try {
    console.log('[Stitch Export] Starting API batch export...');
    updateBatchProgress('Opening Stitch dashboard...', 0, 0);

    workTab = await chrome.tabs.create({
      url: 'https://stitch.withgoogle.com/',
      active: false
    });
    state.currentTabId = workTab.id;
    await waitForTabLoad(workTab.id);
    await delay(1500);

    // Step 1: extract auth tokens + project list in a single page-context call
    updateBatchProgress('Fetching auth tokens and project list...', 0, 0);
    const initResults = await chrome.scripting.executeScript({
      target: { tabId: workTab.id },
      func: fetchAuthAndProjectsInPage
    });
    const init = initResults && initResults[0] && initResults[0].result;
    if (!init || !init.success) {
      throw new Error(init?.error || 'Failed to initialize batch export');
    }

    if (!init.projects || init.projects.length === 0) {
      throw new Error('No projects found. Make sure you are logged into stitch.withgoogle.com');
    }

    // Refresh badge cache with authoritative count
    _projectCountCache = { value: init.projects.length, fetchedAt: Date.now() };

    const projects = onlyProjectId ? init.projects.filter(p => p.id === onlyProjectId) : init.projects;
    if (projects.length === 0) {
      throw new Error('This project was not found in your Stitch account');
    }
    // A single project also gets a picture of every HTML screen; for all projects that would bloat the ZIP
    const includeScreenshots = !!onlyProjectId;

    state.total = projects.length;
    state.projects = projects;

    // Step 2: fire ALL ErneX + dNS8Mc API calls in the tab context with
    // internal parallelism (concurrency = API_CONCURRENCY). One big
    // executeScript dispatches the whole batch, returning when complete.
    const API_CONCURRENCY = 10;
    updateBatchProgress(`Fetching API data for ${projects.length} projects (${API_CONCURRENCY} parallel)...`, 0, projects.length);

    const apiResults = await chrome.scripting.executeScript({
      target: { tabId: workTab.id },
      func: fetchProjectsBatchInPage,
      args: [projects, API_CONCURRENCY]
    });
    const batchData = apiResults && apiResults[0] && apiResults[0].result;
    if (!batchData || !batchData.success) {
      throw new Error(batchData?.error || 'Batch API fetch failed');
    }

    const apiOk = (batchData.results || []).filter(r => r && r.success);
    // Build screen index per project: uid → { name, htmlUrl, screenshotUrl,
    // screenPath, filename }. Same UID across ErneX final + chat turns is
    // deduplicated — we download each unique URL once.
    const sanitizeName = (n) => (n || 'screen')
      .replace(/[^a-zA-Z0-9_\- ]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 40) || 'screen';

    let totalUniqueUrls = 0;
    for (const r of apiOk) {
      const seen = new Set();
      r._index = new Map();
      const add = (s) => {
        if (!s || !s.uid || seen.has(s.uid)) return;
        seen.add(s.uid);
        r._index.set(s.uid, { ...s, filename: `${sanitizeName(s.name)}_${s.uid.substring(0, 8)}.html` });
      };
      for (const s of (r.screens || [])) add(s);
      for (const t of (r.turns || [])) {
        for (const s of ((t.assistant && t.assistant.generatedScreens) || [])) add(s);
      }
      totalUniqueUrls += r._index.size;
    }
    updateBatchProgress(`API done — ${apiOk.length}/${projects.length} projects, ${totalUniqueUrls} unique files. Downloading...`, 0, projects.length);

    // Step 3: download all HTMLs from contribution.usercontent.google.com in
    // the service worker, with HTML_CONCURRENCY parallel projects.
    const HTML_CONCURRENCY = 6;
    let processed = 0;
    let nextIdx = 0;

    const worker = async () => {
      while (true) {
        if (state.cancelled || state !== batchExportState) return;
        const idx = nextIdx++;
        if (idx >= apiOk.length) return;
        const r = apiOk[idx];

        // Fetch each unique HTML URL once, in parallel within this project
        const shots = [];
        const fetches = [...r._index.entries()].map(async ([uid, meta]) => {
          try {
            if (!meta.htmlUrl) {
              // Image-only screen: store the picture itself. A bare lh3 URL serves a
              // 286px preview; "=s0" returns the original resolution.
              const img = await fetchFullImage(meta.screenshotUrl);
              if (!img) return null;
              meta.filename = meta.filename.replace(/\.html$/, `.${img.ext}`);
              return [uid, img.bytes];
            }
            const resp = await fetch(meta.htmlUrl);
            if (!resp.ok) return null;
            const html = await resp.text();
            if (includeScreenshots && meta.screenshotUrl) {
              const shot = await fetchFullImage(meta.screenshotUrl);
              if (shot) {
                meta.shotFilename = meta.filename.replace(/\.html$/, `.${shot.ext}`);
                shots.push([uid, shot.bytes]);
              }
            }
            return [uid, html];
          } catch (e) {
            return null;
          }
        });
        const fetched = await Promise.all(fetches);
        const htmlByUid = [];
        for (const f of fetched) {
          if (f) htmlByUid.push(f);
        }

        state.results.push({
          success: true,
          projectId: r.projectId,
          projectTitle: r.projectTitle,
          finalScreens: r.screens || [],
          turns: r.turns || [],
          screenIndex: [...r._index.entries()],
          htmlByUid,
          shotByUid: shots
        });
        processed++;
        state.current = processed;
        updateBatchProgress(`Downloaded ${processed}/${apiOk.length}: ${r.projectTitle || r.projectId} (${htmlByUid.length} files)`, processed, apiOk.length);
      }
    };

    const workers = [];
    for (let i = 0; i < Math.min(HTML_CONCURRENCY, apiOk.length); i++) {
      workers.push(worker());
    }
    await Promise.all(workers);

    if (state.cancelled || state !== batchExportState) {
      throw new Error('Export cancelled by user');
    }

    // Step 3: create ZIP
    const exportedCount = state.results.length;
    if (exportedCount === 0) {
      throw new Error('No projects were successfully exported');
    }

    updateBatchProgress(`Creating ZIP archive with ${exportedCount} projects...`, state.total, state.total);
    const zipBase64 = await createZipFromResults(state.results, format, options);

    // Step 4: download
    const timestamp = new Date().toISOString().split('T')[0];
    const dataUrl = 'data:application/zip;base64,' + zipBase64;

    await chrome.downloads.download({
      url: dataUrl,
      filename: onlyProjectId
        ? `stitch-${slugifyName(projects[0].title, 50) || projects[0].id}-${format}-${timestamp}.zip`
        : `stitch-all-exports-${format}-${timestamp}.zip`,
      saveAs: true
    });

    updateBatchProgress(`Done! Exported ${exportedCount}/${state.total} projects.`, state.total, state.total);

    return {
      success: true,
      exportedCount,
      totalCount: state.total
    };

  } catch (error) {
    console.error('[Stitch Export] Batch export error:', error);
    // A cancel removes the work tab, so in-flight calls fail with tab errors; report them as a cancel
    const message = state.cancelled ? 'Export cancelled by user' : error.message;
    if (state === batchExportState) {
      updateBatchProgress(state.cancelled ? 'Cancelled.' : `Error: ${message}`, state.current, state.total);
    }
    return { success: false, cancelled: state.cancelled, error: message };
  } finally {
    state.isRunning = false;
    if (workTab) {
      try { await chrome.tabs.remove(workTab.id); } catch (e) {}
    }
    state.currentTabId = null;
  }
}

// Runs in the dashboard tab. Returns { success, projects, auth? } — auth tokens
// are stored on `window.__stitchAuth` for subsequent per-project calls.
async function fetchAuthAndProjectsInPage() {
  try {
    const html = document.documentElement.innerHTML;
    const sidMatch = html.match(/"FdrFJe":"([^"]+)"/);
    const tokenMatch = html.match(/"SNlM0e":"([^"]+)"/);
    if (!sidMatch || !tokenMatch) {
      return { success: false, error: 'Auth tokens (FdrFJe/SNlM0e) not found in page' };
    }
    const sid = sidMatch[1];
    const at = tokenMatch[1];
    window.__stitchAuth = { sid, at };

    const params = new URLSearchParams({
      'f.req': '[[["A7f2qf","[]",null,"1"]]]',
      'at': at
    });
    const res = await fetch(`/_/Nemo/data/batchexecute?rpcids=A7f2qf&f.sid=${sid}&rt=c`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: params.toString()
    });
    const text = await res.text();

    // Parse the JSON envelope; a regex missed titles with escapes (e.g. "&" → &) and null titles
    const projects = [];
    const seen = new Set();
    for (const line of text.split('\n')) {
      if (!line.startsWith('[["wrb.fr","A7f2qf"')) continue;
      const inner = JSON.parse(JSON.parse(line)[0][2]);
      for (const p of (inner && inner[0]) || []) {
        const id = String((p && p[0]) || '').split('/')[1];
        if (!id || seen.has(id)) continue;
        seen.add(id);
        projects.push({ id, title: p[1] || `Untitled ${id}`, url: `https://stitch.withgoogle.com/projects/${id}` });
      }
    }
    if (projects.length === 0) {
      return { success: false, error: 'No projects parsed from A7f2qf response' };
    }
    return { success: true, projects };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Runs in the dashboard tab. Fires ErneX + dNS8Mc for ALL projects with
// internal concurrency. Returns { success, results: [{projectId, projectTitle,
// screens, chatData, success, error}] }. Single executeScript dispatch.
async function fetchProjectsBatchInPage(projects, concurrency) {
  const auth = window.__stitchAuth;
  if (!auth) return { success: false, error: 'Auth not initialized in tab' };
  const { sid, at } = auth;

  const findSessions = (obj) => {
    if (Array.isArray(obj) && obj.length > 0 && Array.isArray(obj[0]) &&
        typeof obj[0][0] === 'string' && obj[0][0].includes('sessions/')) {
      return obj;
    }
    if (Array.isArray(obj)) {
      for (const it of obj) {
        const r = findSessions(it);
        if (r) return r;
      }
    }
    return null;
  };

  // Each screen instance is a 16-element array. Extract canonical metadata.
  //   [0][2] = screenshot URL (lh3.googleusercontent.com)
  //   [1][2] = HTML download URL (contribution.usercontent.google.com)
  //   [4]    = clean UID (32 hex chars)
  //   [8]    = human-readable name
  //   [10]   = full path projects/X/screens/Y
  const extractScreenInstance = (sc, fallbackKey) => {
    if (!Array.isArray(sc) || sc.length < 11) return null;
    const screenshotUrl = (sc[0] && sc[0][2]) || null;
    let htmlUrl = sc[1] && sc[1][2];
    if (typeof htmlUrl !== 'string' || htmlUrl.indexOf('contribution.usercontent.google.com') === -1) {
      htmlUrl = null;
    }
    // Image-only screens (generated images) have no HTML file, only the picture
    if (!htmlUrl && typeof screenshotUrl !== 'string') return null;
    const uid = (typeof sc[4] === 'string' && sc[4]) ? sc[4] : `noid-${fallbackKey}`;
    const name = (typeof sc[8] === 'string' && sc[8]) ? sc[8] : '';
    const screenPath = (typeof sc[10] === 'string') ? sc[10] : '';
    return { uid, name, screenPath, htmlUrl, screenshotUrl };
  };

  const fetchOne = async (project) => {
    try {
      // ---- ErneX: final state screens ----
      const erneXParams = new URLSearchParams({
        'f.req': `[[["ErneX","[\\"projects/${project.id}\\",1]",null,"13"]]]`,
        'at': at
      });
      const erneXRes = await fetch(`/_/Nemo/data/batchexecute?rpcids=ErneX&f.sid=${sid}&rt=c`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: erneXParams.toString()
      });
      const erneXText = await erneXRes.text();

      let erneXInner = null;
      for (const line of erneXText.split('\n')) {
        if (line.startsWith('[["wrb.fr","ErneX"')) {
          try {
            const parsed = JSON.parse(line);
            erneXInner = JSON.parse(parsed[0][2]);
          } catch (e) { /* parse error */ }
          break;
        }
      }

      const screens = [];
      const screenList = (erneXInner && Array.isArray(erneXInner[0])) ? erneXInner[0] : [];
      for (let i = 0; i < screenList.length; i++) {
        const s = extractScreenInstance(screenList[i], `e${i}`);
        if (s) screens.push(s);
      }

      // ---- dNS8Mc: per-turn chat + generated screens + suggestions ----
      let turns = [];
      try {
        const dnsParams = new URLSearchParams({
          'f.req': `[[["dNS8Mc","[\\"projects/${project.id}\\"]",null,"10"]]]`,
          'at': at
        });
        const dnsRes = await fetch(`/_/Nemo/data/batchexecute?rpcids=dNS8Mc&f.sid=${sid}&rt=c`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: dnsParams.toString()
        });
        const dnsText = await dnsRes.text();

        let dnsInner = null;
        for (const ln of dnsText.split('\n')) {
          if (ln.startsWith('[["wrb.fr","dNS8Mc"')) {
            try {
              const parsed = JSON.parse(ln);
              dnsInner = JSON.parse(parsed[0][2]);
            } catch (e) { /* parse error */ }
            break;
          }
        }

        if (dnsInner) {
          const sessions = findSessions(dnsInner);
          if (sessions && sessions.length > 0) {
            for (let i = 0; i < sessions.length; i++) {
              const turn = sessions[i];

              // turn[3][0] = user prompt
              const userContent = (turn[3] && typeof turn[3][0] === 'string') ? turn[3][0] : '';

              // Default assistant fields
              let assistantText = '';
              let designSystem = null;
              const generatedScreens = [];
              const suggestions = [];

              if (Array.isArray(turn[4])) {
                // turn[4][1][1] = main assistant text response; some turns carry it at turn[4][0][1]
                if (turn[4][1] && typeof turn[4][1][1] === 'string') {
                  assistantText = turn[4][1][1];
                } else if (turn[4][0] && typeof turn[4][0][1] === 'string') {
                  assistantText = turn[4][0][1];
                }

                // turn[4][0][3] = design system asset: ["assets/<id>", null, [name, null, markdown|null, tokens]]
                const ds = turn[4][0] && turn[4][0][3];
                if (Array.isArray(ds) && typeof ds[0] === 'string' && ds[0].startsWith('assets/')) {
                  const body = Array.isArray(ds[2]) ? ds[2] : [];
                  designSystem = {
                    assetId: ds[0].split('/')[1],
                    name: typeof body[0] === 'string' ? body[0] : '',
                    markdown: typeof body[2] === 'string' ? body[2] : '',
                    tokens: Array.isArray(body[3]) ? body[3] : null
                  };
                }

                // turn[4][0][0][0][N] = generated screen instances for this turn
                try {
                  const gs = turn[4][0] && turn[4][0][0] && turn[4][0][0][0];
                  if (Array.isArray(gs)) {
                    for (let j = 0; j < gs.length; j++) {
                      const s = extractScreenInstance(gs[j], `t${i}_${j}`);
                      if (s) generatedScreens.push(s);
                    }
                  }
                } catch (e) { /* turn produced no screens */ }

                // turn[4][N][2] for N >= 2 = follow-up suggestion prompts
                for (let j = 2; j < turn[4].length; j++) {
                  if (turn[4][j] && typeof turn[4][j][2] === 'string') {
                    suggestions.push(turn[4][j][2]);
                  }
                }
              }

              turns.push({
                index: i + 1,
                sessionId: (typeof turn[0] === 'string') ? turn[0] : '',
                user: { content: userContent },
                assistant: {
                  content: assistantText,
                  designSystem,
                  generatedScreens,
                  suggestions
                }
              });
            }
          }
        }
      } catch (chatErr) {
        // chat is optional
      }

      return {
        success: true,
        projectId: project.id,
        projectTitle: project.title,
        screens,
        turns
      };
    } catch (e) {
      return {
        success: false,
        projectId: project.id,
        projectTitle: project.title,
        error: e.message
      };
    }
  };

  // Concurrency-limited worker pool
  const results = new Array(projects.length);
  let nextIdx = 0;
  const workerCount = Math.max(1, Math.min(concurrency || 8, projects.length));
  const workers = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push((async () => {
      while (true) {
        const idx = nextIdx++;
        if (idx >= projects.length) return;
        results[idx] = await fetchOne(projects[idx]);
      }
    })());
  }
  await Promise.all(workers);

  return { success: true, results };
}

// Fetch list of projects from the Stitch dashboard using the API
async function fetchProjectList() {
  // Open dashboard in a background tab
  const tab = await chrome.tabs.create({
    url: 'https://stitch.withgoogle.com/',
    active: false
  });
  batchExportState.currentTabId = tab.id;

  try {
    // Wait for tab to finish loading
    await waitForTabLoad(tab.id);

    // Give it a brief moment to initialize window variables
    await delay(2000);

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        try {
          // Extract auth tokens from HTML
          const html = document.documentElement.innerHTML;
          const sidMatch = html.match(/"FdrFJe":"([^"]+)"/);
          const tokenMatch = html.match(/"SNlM0e":"([^"]+)"/);
          
          if (!sidMatch || !tokenMatch) {
            return { error: "Could not find auth tokens (FdrFJe or SNlM0e) in page source" };
          }
          
          const params = new URLSearchParams({
            'f.req': '[[["A7f2qf","[]",null,"1"]]]',
            'at': tokenMatch[1]
          });
          
          const res = await fetch(`/_/Nemo/data/batchexecute?rpcids=A7f2qf&f.sid=${sidMatch[1]}&rt=c`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
            },
            body: params.toString()
          });
          
          const text = await res.text();
          
          // Parse the JSON envelope; a regex missed titles with escapes (e.g. "&" → &) and null titles
          const projects = [];
          const seen = new Set();
          for (const line of text.split('\n')) {
            if (!line.startsWith('[["wrb.fr","A7f2qf"')) continue;
            const inner = JSON.parse(JSON.parse(line)[0][2]);
            for (const p of (inner && inner[0]) || []) {
              const id = String((p && p[0]) || '').split('/')[1];
              if (!id || seen.has(id)) continue;
              seen.add(id);
              projects.push({ id, title: p[1] || `Untitled ${id}`, url: `https://stitch.withgoogle.com/projects/${id}` });
            }
          }
          
          if (projects.length > 0) {
             return { success: true, projects };
          } else {
             return { error: "API returned no projects or parse failed" };
          }
        } catch (e) {
          return { error: e.message };
        }
      }
    });

    if (results && results[0] && results[0].result) {
      if (results[0].result.success) {
        return results[0].result.projects;
      } else {
        throw new Error(results[0].result.error || "Failed to fetch projects via API");
      }
    }

    throw new Error("Failed to execute project fetch script");
  } finally {
    // Always close the dashboard tab
    try {
      await chrome.tabs.remove(tab.id);
    } catch (e) {}
  }
}

// Create a ZIP archive from all export results.
//   {projectName}_{projectId}/
//     chat.json                              ← rich per-turn data with file refs
//     screens/{name}_{uid}.html              ← final state (ErneX)
//     history/turn-NNN-{slug}/{name}_{uid}.html  ← screens generated in that turn
function slugifyName(s, max) {
  return (s || '')
    .replace(/[^a-zA-Z0-9 \-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, max || 40);
}

// Download an lh3 image at full size. A bare lh3 URL serves a 286px preview;
// "=s0" returns the original resolution.
async function fetchFullImage(url) {
  const resp = await fetch(url.includes('=') ? url : `${url}=s0`);
  if (!resp.ok) return null;
  const type = resp.headers.get('content-type') || '';
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
  return { ext, bytes: new Uint8Array(await resp.arrayBuffer()) };
}

// Turn the per-turn chat into the message list StitchFormatters expects
function turnsToConversation(result) {
  const messages = [];
  for (const turn of (result.turns || [])) {
    const user = turn.user?.content || '';
    if (user) messages.push({ role: 'user', content: user, timestamp: null });
    const a = turn.assistant || {};
    const parts = [];
    if (a.content) parts.push(a.content);
    if (a.designSystem) parts.push(`[Design system: ${a.designSystem.name}]` + (a.designSystem.markdown ? `\n\n${a.designSystem.markdown}` : ''));
    const names = (a.generatedScreens || []).map(s => s.name).filter(Boolean);
    if (names.length) parts.push(`[Generated Screens: ${names.join(', ')}]`);
    if (parts.length) messages.push({ role: 'assistant', content: parts.join('\n\n'), timestamp: null });
  }
  return {
    projectId: result.projectId,
    projectTitle: result.projectTitle,
    timestamp: new Date().toISOString(),
    messages
  };
}

async function createZipFromResults(results, format, options = {}) {
  const zip = new JSZip();
  const rootName = results.length === 1
    ? `stitch-project-${new Date().toISOString().split('T')[0]}`
    : `stitch-all-projects-${new Date().toISOString().split('T')[0]}`;
  const root = zip.folder(rootName);

  const slugify = slugifyName;

  for (const result of results) {
    const safeProjectName = slugify(result.projectTitle || result.projectId || 'unknown', 60) || 'project';
    const projectFolder = root.folder(`${safeProjectName}_${result.projectId}`);

    const screenIndex = new Map(result.screenIndex || []);
    const htmlByUid = new Map(result.htmlByUid || []);
    const shotByUid = new Map(result.shotByUid || []);

    // ---- screens/ : final state from ErneX ----
    const screensFolder = projectFolder.folder('screens');
    for (const s of (result.finalScreens || [])) {
      const meta = screenIndex.get(s.uid);
      const content = htmlByUid.get(s.uid);
      if (meta && content) {
        screensFolder.file(meta.filename, content);
        if (meta.shotFilename && shotByUid.has(s.uid)) screensFolder.file(meta.shotFilename, shotByUid.get(s.uid));
      }
    }

    // ---- history/turn-NNN-{slug}/ : per-turn generated screens ----
    const turnFolderName = (turn) => {
      const slug = slugify(turn.user?.content || turn.assistant?.content || '', 40) || 'turn';
      return `turn-${String(turn.index).padStart(3, '0')}-${slug}`;
    };

    let createdHistoryFolder = false;
    for (const turn of (result.turns || [])) {
      const generated = (turn.assistant && turn.assistant.generatedScreens) || [];
      if (generated.length === 0) continue;
      if (!createdHistoryFolder) {
        projectFolder.folder('history');
        createdHistoryFolder = true;
      }
      const turnFolder = projectFolder.folder(`history/${turnFolderName(turn)}`);
      for (const s of generated) {
        const meta = screenIndex.get(s.uid);
        const content = htmlByUid.get(s.uid);
        if (meta && content) {
          turnFolder.file(meta.filename, content);
          if (meta.shotFilename && shotByUid.has(s.uid)) turnFolder.file(meta.shotFilename, shotByUid.get(s.uid));
        }
      }
    }

    // ---- design-systems/turn-NNN-{slug}.md : design system docs produced in chat ----
    const designSystemFile = (turn) => {
      const ds = turn.assistant && turn.assistant.designSystem;
      if (!ds || !ds.markdown) return null;
      return `design-systems/turn-${String(turn.index).padStart(3, '0')}-${slugify(ds.name, 40) || 'design-system'}.md`;
    };
    for (const turn of (result.turns || [])) {
      const path = designSystemFile(turn);
      if (path) projectFolder.file(path, turn.assistant.designSystem.markdown);
    }

    // ---- chat.json : rich per-turn data with file refs ----
    const chatJson = {
      projectId: result.projectId,
      projectTitle: result.projectTitle,
      exportedAt: new Date().toISOString(),
      finalScreens: (result.finalScreens || []).map(s => {
        const meta = screenIndex.get(s.uid);
        return {
          name: s.name,
          uid: s.uid,
          screenPath: s.screenPath,
          file: meta ? `screens/${meta.filename}` : null,
          screenshotFile: meta && meta.shotFilename && shotByUid.has(s.uid) ? `screens/${meta.shotFilename}` : null,
          screenshotUrl: s.screenshotUrl
        };
      }),
      turns: (result.turns || []).map(turn => {
        const tfn = turnFolderName(turn);
        return {
          index: turn.index,
          sessionId: turn.sessionId,
          user: turn.user,
          assistant: {
            content: turn.assistant?.content || '',
            designSystem: turn.assistant?.designSystem
              ? { assetId: turn.assistant.designSystem.assetId, name: turn.assistant.designSystem.name, file: designSystemFile(turn), tokens: turn.assistant.designSystem.tokens }
              : null,
            generatedScreens: (turn.assistant?.generatedScreens || []).map(s => {
              const meta = screenIndex.get(s.uid);
              return {
                name: s.name,
                uid: s.uid,
                screenPath: s.screenPath,
                file: meta ? `history/${tfn}/${meta.filename}` : null,
                screenshotFile: meta && meta.shotFilename && shotByUid.has(s.uid) ? `history/${tfn}/${meta.shotFilename}` : null,
                screenshotUrl: s.screenshotUrl
              };
            }),
            suggestions: turn.assistant?.suggestions || []
          }
        };
      })
    };
    projectFolder.file('chat.json', JSON.stringify(chatJson, null, 2));

    // ---- conversation.<format>.json : the chat in the format picked in the popup ----
    const conversation = turnsToConversation(result);
    if (conversation.messages.length > 0) {
      try {
        const formatted = StitchFormatters.format(conversation, format || 'claude', options);
        projectFolder.file(`conversation.${format || 'claude'}.json`, JSON.stringify(formatted, null, 2));
      } catch (e) {
        console.warn('[Stitch Export] Could not format conversation:', e.message);
      }
    }
  }

  return await zip.generateAsync({ type: 'base64' });
}

// Update batch progress (broadcast to popup if open)
function updateBatchProgress(message, current, total) {
  batchExportState.current = current;
  batchExportState.total = total;

  console.log(`[Stitch Export] Batch progress: ${message} (${current}/${total})`);

  // Broadcast to any listening popups
  try {
    chrome.runtime.sendMessage({
      action: 'batchProgress',
      message,
      current,
      total
    }).catch(() => {
      // Popup may not be open, ignore error
    });
  } catch (e) {
    // Ignore
  }
}

// Wait for a tab to finish loading
async function waitForTabLoad(tabId) {
  // Check if already complete
  const tab = await chrome.tabs.get(tabId);
  if (tab.status === 'complete') {
    return;
  }

  // Reject if the tab is closed (cancel, or the user closed it) so the run never hangs
  return new Promise((resolve, reject) => {
    const done = () => {
      chrome.tabs.onUpdated.removeListener(listener);
      chrome.tabs.onRemoved.removeListener(onRemoved);
    };
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        done();
        resolve();
      }
    };
    const onRemoved = (removedTabId) => {
      if (removedTabId === tabId) {
        done();
        reject(new Error(batchExportState.cancelled ? 'Export cancelled by user' : 'The Stitch tab was closed'));
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.onRemoved.addListener(onRemoved);
  });
}

// Promise-based delay that also checks for cancellation
async function delay(ms) {
  const steps = Math.ceil(ms / 200);
  for(let i=0; i<steps; i++) {
    if (batchExportState.cancelled) {
       return Promise.reject(new Error("Export cancelled by user"));
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

console.log('[Stitch Export] Background script loaded');


async function handleExportProjectLinks() {
  try {
    const projects = await fetchProjectList();
    if (!projects || projects.length === 0) {
      throw new Error('No projects found');
    }

    let txtContent = '';
    for (const p of projects) {
      txtContent += `${p.url}  # ${p.title}\n`;
    }

    const base64Data = btoa(unescape(encodeURIComponent(txtContent)));
    const dataUrl = 'data:text/plain;base64,' + base64Data;

    await chrome.downloads.download({
      url: dataUrl,
      filename: 'stitch-export-allproject-links.txt',
      saveAs: true
    });

    return { success: true, count: projects.length };
  } catch (err) {
    console.error('[Stitch Export] Export links error:', err);
    return { success: false, error: err.message };
  }
}
