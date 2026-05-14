/**
 * Stitch Export Background Service Worker
 * Handles context menu, batch export, and background tasks
 */

importScripts('libs/jszip.min.js');

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
      border-color: #4285F4;
      background: #f0f7ff;
    }

    .format-option-ctx input[type="radio"] {
      margin-top: 2px;
      margin-right: 12px;
      cursor: pointer;
      accent-color: #4285F4;
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
      background: #4285F4;
      color: white;
    }

    .btn-primary-ctx:hover {
      background: #3367D6;
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

  if (request.action === 'cancelBatchExport') {
    batchExportState.cancelled = true;
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
// Batch Export All Projects
// ============================================================

async function handleExportAllProjects(format, options = {}) {
  batchExportState = {
    isRunning: true,
    total: 0,
    current: 0,
    projects: [],
    results: [],
    format,
    cancelled: false
  };

  try {
    console.log('[Stitch Export] Starting batch export...');
    updateBatchProgress('Fetching project list...', 0, 0);

    // Step 1: Get project list from dashboard
    const projects = await fetchProjectList();
    if (!projects || projects.length === 0) {
      throw new Error('No projects found. Make sure you are logged into stitch.withgoogle.com');
    }

    batchExportState.total = projects.length;
    batchExportState.projects = projects;
    updateBatchProgress(`Found ${projects.length} projects. Starting export...`, 0, projects.length);

    // Step 2: Export each project
    for (let i = 0; i < projects.length; i++) {
      if (batchExportState.cancelled) {
        throw new Error('Export cancelled by user');
      }

      batchExportState.current = i + 1;
      const project = projects[i];
      const progressText = `Exporting project ${i + 1}/${projects.length}: ${project.title || project.id}`;
      updateBatchProgress(progressText, i + 1, projects.length);

      try {
        const result = await exportSingleProject(project, format, options);
        if (result.success) {
          batchExportState.results.push(result);
          console.log(`[Stitch Export] Exported project ${project.id}: ${result.filename}`);
        } else {
          console.warn(`[Stitch Export] Failed to export project ${project.id}: ${result.error}`);
        }
      } catch (error) {
        console.error(`[Stitch Export] Error exporting project ${project.id}:`, error);
      }

      // Small delay between projects to avoid overwhelming the browser
      await delay(1500);
    }

    // Step 3: Create ZIP
    const exportedCount = batchExportState.results.length;
    if (exportedCount === 0) {
      throw new Error('No projects were successfully exported');
    }

    updateBatchProgress(`Creating ZIP archive with ${exportedCount} exports...`, batchExportState.total, batchExportState.total);
    const zipBase64 = await createZipFromResults(batchExportState.results, format);

    // Step 4: Download
    const timestamp = new Date().toISOString().split('T')[0];
    const dataUrl = 'data:application/zip;base64,' + zipBase64;

    await chrome.downloads.download({
      url: dataUrl,
      filename: `stitch-all-exports-${format}-${timestamp}.zip`,
      saveAs: true
    });

    updateBatchProgress(`Done! Exported ${exportedCount}/${batchExportState.total} projects.`, batchExportState.total, batchExportState.total);

    return {
      success: true,
      exportedCount,
      totalCount: batchExportState.total
    };

  } catch (error) {
    console.error('[Stitch Export] Batch export error:', error);
    updateBatchProgress(`Error: ${error.message}`, batchExportState.current, batchExportState.total);
    return { success: false, error: error.message };
  } finally {
    batchExportState.isRunning = false;
  }
}

// Fetch list of projects from the Stitch dashboard
async function fetchProjectList() {
  // Open dashboard in a background tab
  const tab = await chrome.tabs.create({
    url: 'https://stitch.withgoogle.com/',
    active: false
  });

  try {
    // Wait for tab to finish loading
    await waitForTabLoad(tab.id);

    // The Stitch dashboard renders in an iframe; wait for it to load
    // Retry a few times with increasing delays
    let allProjects = [];
    const attempts = [
      { wait: 6000,  desc: 'initial' },
      { wait: 4000,  desc: 'retry-1' },
      { wait: 5000,  desc: 'retry-2' }
    ];

    for (const attempt of attempts) {
      if (allProjects.length > 0) break;

      console.log(`[Stitch Export] Dashboard extraction attempt: ${attempt.desc}, waiting ${attempt.wait}ms...`);
      await delay(attempt.wait);

      // First: try to read iframe src attributes from the main frame to get direct iframe URLs
      const iframeResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractIframeProjectUrls
      });

      for (const r of iframeResults) {
        if (r.result && Array.isArray(r.result)) {
          for (const p of r.result) {
            if (p && p.id && !allProjects.find(ap => ap.id === p.id)) {
              allProjects.push(p);
            }
          }
        }
      }

      // Second: run inside all frames (main + iframes) to scrape links
      const frameResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: extractProjectListFromPage
      });

      for (const r of frameResults) {
        if (r.result && Array.isArray(r.result)) {
          for (const p of r.result) {
            if (p && p.id && !allProjects.find(ap => ap.id === p.id)) {
              allProjects.push(p);
            }
          }
        }
      }

      console.log(`[Stitch Export] Attempt ${attempt.desc}: found ${allProjects.length} projects`);
    }

    return allProjects;

  } finally {
    // Always close the dashboard tab
    try {
      await chrome.tabs.remove(tab.id);
    } catch (e) {
      // Tab may already be closed
    }
  }
}

// Extract project URLs from iframe src attributes in the main frame
function extractIframeProjectUrls() {
  const projects = [];
  const seen = new Set();

  // The Stitch app renders inside an iframe from appspot.com
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    const src = iframe.src || '';
    // Match project IDs in iframe src URLs like:
    // https://app-companion-430619.appspot.com/projects/123456
    const match = src.match(/projects\/(\d+)/);
    if (match) {
      const id = match[1];
      if (!seen.has(id)) {
        seen.add(id);
        projects.push({
          id,
          title: `Project ${id}`,
          url: `https://stitch.withgoogle.com/projects/${id}`
        });
      }
    }
  }

  return projects;
}

// Self-contained function injected into page (main or iframe) to extract project list
function extractProjectListFromPage() {
  const projects = [];
  const seenIds = new Set();

  // Strategy 1: Full href links containing /projects/
  const links = document.querySelectorAll('a[href*="/projects/"]');
  links.forEach(link => {
    const match = link.href.match(/projects\/(\d+)/);
    if (match) {
      const id = match[1];
      if (!seenIds.has(id)) {
        seenIds.add(id);
        const title = link.textContent.trim() || `Project ${id}`;
        projects.push({ id, title, url: link.href });
      }
    }
  });

  // Strategy 1b: Relative href links (hash or path-only routing)
  const relLinks = document.querySelectorAll('a[href^="#/projects/"], a[href^="/projects/"], a[href^="projects/"]');
  relLinks.forEach(link => {
    const match = link.getAttribute('href').match(/projects\/(\d+)/);
    if (match) {
      const id = match[1];
      if (!seenIds.has(id)) {
        seenIds.add(id);
        const title = link.textContent.trim() || `Project ${id}`;
        projects.push({ id, title, url: `https://stitch.withgoogle.com/projects/${id}` });
      }
    }
  });

  // Strategy 2: data-project-id attributes
  const dataElements = document.querySelectorAll('[data-project-id]');
  dataElements.forEach(el => {
    const id = el.getAttribute('data-project-id');
    if (id && !seenIds.has(id)) {
      seenIds.add(id);
      const titleEl = el.querySelector('h3, h4, .title, [class*="title"], span, p, div');
      const title = titleEl ? titleEl.textContent.trim() : `Project ${id}`;
      projects.push({ id, title, url: `https://stitch.withgoogle.com/projects/${id}` });
    }
  });

  // Strategy 3: Search innerText/innerHTML for project IDs in likely containers
  const containers = document.querySelectorAll('section, article, div[role="listitem"], [class*="project"], [class*="card"], [class*="item"], [class*="row"]');
  containers.forEach(container => {
    const html = container.innerHTML;
    const matches = html.matchAll(/projects\/(\d+)/g);
    for (const match of matches) {
      const id = match[1];
      if (!seenIds.has(id)) {
        seenIds.add(id);
        // Try to find a nearby title
        const titleEl = container.querySelector('h1, h2, h3, h4, .title, [class*="title"], [class*="name"], span, p, div');
        const title = titleEl ? titleEl.textContent.trim().substring(0, 100) : `Project ${id}`;
        projects.push({ id, title, url: `https://stitch.withgoogle.com/projects/${id}` });
      }
    }
  });

  // Strategy 4: Look for numeric IDs in any onclick or data attributes
  const allElements = document.querySelectorAll('[onclick*="projects"], [data-href*="projects"], [data-url*="projects"]');
  allElements.forEach(el => {
    const attrs = ['onclick', 'data-href', 'data-url', 'data-link'];
    for (const attr of attrs) {
      const val = el.getAttribute(attr);
      if (val) {
        const match = val.match(/projects\/(\d+)/);
        if (match) {
          const id = match[1];
          if (!seenIds.has(id)) {
            seenIds.add(id);
            const title = el.textContent.trim() || `Project ${id}`;
            projects.push({ id, title, url: `https://stitch.withgoogle.com/projects/${id}` });
          }
        }
      }
    }
  });

  return projects;
}

// Export a single project by opening it in a temporary tab
async function exportSingleProject(project, format, options) {
  const tab = await chrome.tabs.create({
    url: project.url,
    active: false
  });

  try {
    // Wait for tab load
    await waitForTabLoad(tab.id);

    // Wait for iframe content to load
    await delay(5000);

    // Try extraction (may need retries if iframe is slow)
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await delay(3000);
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: (fmt, opts) => {
          try {
            if (typeof StitchExtractor === 'undefined') {
              return { success: false, error: 'StitchExtractor not loaded' };
            }

            const data = StitchExtractor.extractConversation();
            if (!data || !data.messages || data.messages.length === 0) {
              return { success: false, error: 'No conversation data found' };
            }

            const formatted = StitchFormatters.format(data, fmt, opts);
            const filename = StitchFormatters.generateFilename(data, fmt);

            return {
              success: true,
              data: formatted,
              filename,
              projectId: data.projectId,
              projectTitle: data.projectTitle
            };
          } catch (err) {
            return { success: false, error: err.message };
          }
        },
        args: [format, options]
      });

      // Find first successful result from any frame
      for (const result of results) {
        if (result.result && result.result.success) {
          return result.result;
        }
        if (result.result && result.result.error) {
          lastError = result.result.error;
        }
      }
    }

    return { success: false, error: lastError || 'No data extracted after retries' };

  } finally {
    try {
      await chrome.tabs.remove(tab.id);
    } catch (e) {
      // Tab may already be closed
    }
  }
}

// Create a ZIP archive from all export results
async function createZipFromResults(results, format) {
  const zip = new JSZip();
  const folderName = `stitch-exports-${format}-${new Date().toISOString().split('T')[0]}`;
  const folder = zip.folder(folderName);

  for (const result of results) {
    const filename = result.filename || `stitch-export-${result.projectId}-${format}.json`;
    const content = JSON.stringify(result.data, null, 2);
    folder.file(filename, content);
  }

  // Generate base64
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

  return new Promise((resolve) => {
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

// Promise-based delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('[Stitch Export] Background script loaded');
