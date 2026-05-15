/**
 * Stitch Export Popup Script
 * Handles the extension popup UI and user interactions
 */

// State management
const AppState = {
  NOT_ON_STITCH: 'notOnStitch',
  READY: 'ready',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  BATCH_EXPORT: 'batchExport'
};

let currentState = AppState.NOT_ON_STITCH;

// DOM Elements
const states = {
  notOnStitch: document.getElementById('notOnStitchState'),
  ready: document.getElementById('readyState'),
  loading: document.getElementById('loadingState'),
  success: document.getElementById('successState'),
  error: document.getElementById('errorState'),
  batchExport: document.getElementById('batchExportState')
};

const elements = {
  exportButton: document.getElementById('exportButton'),
  exportAllButton: document.getElementById('exportAllButton'),
  exportLinksButton: document.getElementById('exportLinksButton'),
  exportAllButtonNotOnStitch: document.getElementById('exportAllButtonNotOnStitch'),
  copyButton: document.getElementById('copyButton'),
  backButton: document.getElementById('backButton'),
  retryButton: document.getElementById('retryButton'),
  cancelBatchButton: document.getElementById('cancelBatchButton'),
  loadingMessage: document.getElementById('loadingMessage'),
  successMessage: document.getElementById('successMessage'),
  errorMessage: document.getElementById('errorMessage'),
  batchProgressBar: document.getElementById('batchProgressBar'),
  batchProgressText: document.getElementById('batchProgressText'),
  batchProgressCount: document.getElementById('batchProgressCount')
};

// Initialize popup
async function initialize() {
  console.log('[Stitch Export] Initializing popup...');

  // Setup event listeners first so they always work
  setupEventListeners();

  // Listen for batch progress messages from background
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'batchProgress') {
      if (currentState !== AppState.BATCH_EXPORT) {
        setState(AppState.BATCH_EXPORT);
      }
      updateBatchProgressUI(request.current, request.total, request.message);
    }
  });

  // Check if batch export is currently running
  try {
    const batchState = await chrome.runtime.sendMessage({ action: 'getBatchExportState' });
    if (batchState && batchState.isRunning) {
      setState(AppState.BATCH_EXPORT);
      
      // If it was cancelled but still running
      if (batchState.cancelled) {
         updateBatchProgressUI(batchState.current, batchState.total, 'Cancelled by user');
         if(elements.cancelBatchButton) {
            elements.cancelBatchButton.disabled = true;
            elements.cancelBatchButton.textContent = 'Cancelling...';
         }
      } else {
         updateBatchProgressUI(batchState.current, batchState.total, 'Resuming view...');
      }
      return;
    }
  } catch (e) {
    // Ignore
  }

  // Check if we're on a Stitch page
  const isOnStitch = await checkIfOnStitchPage();

  if (isOnStitch) {
    setState(AppState.READY);
  } else {
    setState(AppState.NOT_ON_STITCH);
  }
}

// Check if current tab is on Stitch
async function checkIfOnStitchPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url) {
      return false;
    }

    return tab.url.includes('stitch.withgoogle.com') &&
      tab.url.includes('/projects/');
  } catch (error) {
    console.error('[Stitch Export] Error checking page:', error);
    return false;
  }
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('popoutButton')?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') });
  });
  elements.exportButton?.addEventListener('click', handleExport);
  elements.exportAllButton?.addEventListener('click', handleExportAll);
  elements.exportAllButtonNotOnStitch?.addEventListener('click', handleExportAll);
  elements.exportLinksButton?.addEventListener('click', handleExportLinks);
  elements.copyButton?.addEventListener('click', handleCopyToClipboard);
  elements.backButton?.addEventListener('click', () => setState(AppState.READY));
  elements.retryButton?.addEventListener('click', () => setState(AppState.READY));
  elements.cancelBatchButton?.addEventListener('click', handleCancelBatch);

  // Toggle custom settings visibility
  const radioButtons = document.querySelectorAll('input[name="format"]');
  const customSettings = document.getElementById('customSettings');

  radioButtons.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'custom') {
        customSettings.classList.remove('hidden');
      } else {
        customSettings.classList.add('hidden');
      }
    });
  });
}

// Handle export action
async function handleExport() {
  try {
    setState(AppState.LOADING);
    updateLoadingMessage('Extracting conversation from Stitch...');

    // Get selected format
    const format = getSelectedFormat();

    // Get custom options if applicable
    const options = {};
    if (format === 'custom') {
      options.userRole = document.getElementById('customUserRole').value || 'user';
      options.assistantRole = document.getElementById('customAssistantRole').value || 'assistant';
    }

    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Try message passing first (more reliable)
    try {
      const response = await sendMessageToTab(tab.id, { action: 'export', format, options });

      if (response && response.success) {
        // Content script handled it
        setState(AppState.SUCCESS);
        updateSuccessMessage(`Successfully exported ${response.filename || 'conversation'}`);
        return;
      }
    } catch (msgError) {
      console.log('[Stitch Export] Message passing failed, trying executeScript:', msgError);
    }

    // Fallback to executeScript
    if (!chrome.scripting) {
      throw new Error('Chrome scripting API not available. Please reload the extension.');
    }

    // Execute in ALL frames (including iframes) to find the messages
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: extractAndFormat,
      args: [format, options]
    });

    if (!results || results.length === 0) {
      throw new Error('Failed to extract conversation data');
    }

    // Find the first successful result from any frame
    let successResult = null;
    for (const result of results) {
      if (result.result && result.result.success && result.result.data) {
        successResult = result.result;
        console.log('[Stitch Export] Found messages in frame:', result.frameId);
        break;
      }
    }

    if (!successResult) {
      // Check if we got any error messages
      const errors = results.filter(r => r.result && r.result.error).map(r => r.result.error);
      if (errors.length > 0) {
        throw new Error(errors[0]);
      }
      throw new Error('No conversation data found in any frame');
    }

    const { success, data, filename, error } = successResult;

    if (!success) {
      throw new Error(error || 'Unknown extraction error');
    }

    // Trigger download
    await downloadFile(data, filename);

    // Show success
    setState(AppState.SUCCESS);
    updateSuccessMessage(`Successfully exported ${filename}`);

  } catch (error) {
    console.error('[Stitch Export] Export error:', error);
    setState(AppState.ERROR);
    updateErrorMessage(error.message || 'An unexpected error occurred');
  }
}


// Handle export links (debug)
async function handleExportLinks() {
  try {
    const originalText = elements.exportLinksButton.innerHTML;
    elements.exportLinksButton.innerHTML = 'Extracting...';
    elements.exportLinksButton.disabled = true;

    const result = await chrome.runtime.sendMessage({ action: 'exportProjectLinks' });

    if (result && result.success) {
      updateSuccessMessage(`Successfully exported ${result.count} project links!`);
      setTimeout(() => setState(AppState.SUCCESS), 500);
    } else {
      throw new Error(result?.error || 'Failed to export links');
    }
  } catch (error) {
    console.error('[Stitch Export] Export links error:', error);
    updateErrorMessage(error.message || 'Failed to export links');
    setState(AppState.ERROR);
  } finally {
    if (elements.exportLinksButton) {
      elements.exportLinksButton.disabled = false;
      elements.exportLinksButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z"/><path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z"/></svg> Extract All Links (Debug)`;
    }
  }
}

// Handle export all projects action
async function handleExportAll() {
  try {
    setState(AppState.BATCH_EXPORT);
    updateBatchProgressUI(0, 0, 'Starting batch export...');

    // Get selected format
    const format = getSelectedFormat();

    // Get custom options if applicable
    const options = {};
    if (format === 'custom') {
      options.userRole = document.getElementById('customUserRole').value || 'user';
      options.assistantRole = document.getElementById('customAssistantRole').value || 'assistant';
    }

    // Start batch export in background
    const result = await chrome.runtime.sendMessage({
      action: 'exportAllProjects',
      format,
      options
    });

    if (result && result.success) {
      setState(AppState.SUCCESS);
      updateSuccessMessage(`Successfully exported ${result.exportedCount}/${result.totalCount} projects to ZIP!`);
    } else {
      throw new Error(result?.error || 'Batch export failed');
    }

  } catch (error) {
    console.error('[Stitch Export] Batch export error:', error);
    setState(AppState.ERROR);
    updateErrorMessage(error.message || 'Batch export failed');
  }
}

// Handle cancel batch export
async function handleCancelBatch() {
  try {
    if (elements.cancelBatchButton) {
       elements.cancelBatchButton.disabled = true;
       elements.cancelBatchButton.textContent = 'Cancelling...';
    }
    await chrome.runtime.sendMessage({ action: 'cancelBatchExport' });
    updateBatchProgressUI(0, 0, 'Cancelled by user');
  } catch (e) {
    console.error('[Stitch Export] Cancel error:', e);
  }
}

// Update batch export UI
function updateBatchProgressUI(current, total, message) {
  if (elements.batchProgressBar) {
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    elements.batchProgressBar.style.width = percent + '%';
  }

  if (elements.batchProgressText && message) {
    elements.batchProgressText.textContent = message;
  }

  if (elements.batchProgressCount) {
    elements.batchProgressCount.textContent = `${current} / ${total} projects`;
  }
}

// Handle copy to clipboard action
async function handleCopyToClipboard() {
  try {
    setState(AppState.LOADING);
    updateLoadingMessage('Copying conversation to clipboard...');

    // Get selected format
    const format = getSelectedFormat();

    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Execute extraction and copy in ALL frames
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: extractAndCopy,
      args: [format]
    });

    if (!results || results.length === 0) {
      throw new Error('Failed to copy conversation data');
    }

    // Find the first successful result from any frame
    let successResult = null;
    for (const result of results) {
      if (result.result && result.result.success) {
        successResult = result.result;
        console.log('[Stitch Export] Copied from frame:', result.frameId);
        break;
      }
    }

    if (!successResult) {
      const errors = results.filter(r => r.result && r.result.error).map(r => r.result.error);
      if (errors.length > 0) {
        throw new Error(errors[0]);
      }
      throw new Error('No conversation data found in any frame');
    }

    const { success, error } = successResult;

    if (!success) {
      throw new Error(error || 'Failed to copy to clipboard');
    }

    // Show success
    setState(AppState.SUCCESS);
    updateSuccessMessage('Conversation copied to clipboard!');

  } catch (error) {
    console.error('[Stitch Export] Copy error:', error);
    setState(AppState.ERROR);
    updateErrorMessage(error.message || 'Failed to copy to clipboard');
  }
}

// Function to inject and execute in page context (self-contained)
function extractAndFormat(format, options = {}) {
  try {
    // Check if StitchExtractor is available (content script loaded)
    if (typeof StitchExtractor !== 'undefined') {
      const conversationData = StitchExtractor.extractConversation();

      if (!conversationData) {
        return {
          success: false,
          error: 'No conversation data found'
        };
      }

      const formattedData = StitchFormatters.format(conversationData, format, options);
      const filename = StitchFormatters.generateFilename(conversationData, format);

      return {
        success: true,
        data: formattedData,
        filename: filename
      };
    }

    // Fallback: Self-contained extraction (if content script didn't load)
    console.log('[Stitch Export] Using fallback extraction');

    // Simple extraction logic
    const markdownDivs = document.querySelectorAll('.markdown, div.markdown, [class*="markdown"]');

    if (markdownDivs.length === 0) {
      return {
        success: false,
        error: 'No messages found on this page'
      };
    }

    const messages = [];
    markdownDivs.forEach((div, index) => {
      // Check for Stitch indicator
      const section = div.closest('section');
      let role = 'user';

      if (section) {
        const hasStitch = section.innerHTML.includes('stitch-avatar') ||
          section.textContent.includes('Stitch');
        role = hasStitch ? 'assistant' : 'user';
      } else {
        role = index % 2 === 0 ? 'user' : 'assistant';
      }

      let content = div.textContent.trim();

      // Clean up Stitch-specific formatting
      content = content.replace(/\[Images generated by Stitch\]:[\s\S]*?---\s*/g, '');
      content = content.replace(/https:\/\/lh3\.googleusercontent\.com\/a\/[^\s]+/g, '');
      content = content.replace(/\n{3,}/g, '\n\n').trim();

      if (content) {
        messages.push({ role, content, timestamp: new Date().toISOString() });
      }
    });

    if (messages.length === 0) {
      return {
        success: false,
        error: 'No messages could be extracted'
      };
    }

    // Get project info
    const projectId = window.location.href.match(/projects\/(\d+)/)?.[1] || 'unknown';
    const projectTitle = document.querySelector('h1')?.textContent || 'Stitch Export';

    const conversationData = {
      projectId,
      projectTitle,
      timestamp: new Date().toISOString(),
      messages
    };

    // Simple formatting
    let formattedData;
    if (format === 'openai' || format === 'chatgpt') {
      formattedData = {
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        metadata: {
          source: 'stitch.withgoogle.com',
          project_id: projectId,
          format: 'openai_chat'
        }
      };
    } else {
      formattedData = {
        conversation: {
          title: projectTitle,
          created_at: new Date().toISOString(),
          messages: messages
        },
        metadata: {
          source: 'stitch.withgoogle.com',
          project_id: projectId,
          format: 'claude_code'
        }
      };
    }

    const filename = `stitch-export-${projectId}-${format}-${new Date().toISOString().split('T')[0]}.json`;

    return {
      success: true,
      data: formattedData,
      filename: filename
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to extract and copy to clipboard (injected into page)
async function extractAndCopy(format) {
  try {
    const conversationData = StitchExtractor.extractConversation();

    if (!conversationData) {
      return {
        success: false,
        error: 'No conversation data found'
      };
    }

    const formattedData = StitchFormatters.format(conversationData, format);
    const jsonString = JSON.stringify(formattedData, null, 2);

    await navigator.clipboard.writeText(jsonString);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Send message to tab's content script
function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

// Download file
async function downloadFile(data, filename) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  await chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  });

  // Cleanup
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Get selected export format
function getSelectedFormat() {
  const selectedRadio = document.querySelector('input[name="format"]:checked');
  return selectedRadio ? selectedRadio.value : 'claude';
}

// Set UI state
function setState(state) {
  currentState = state;

  // Hide all states
  Object.values(states).forEach(el => {
    if (el) el.classList.add('hidden');
  });

  // Show current state
  switch (state) {
    case AppState.NOT_ON_STITCH:
      states.notOnStitch?.classList.remove('hidden');
      break;
    case AppState.READY:
      states.ready?.classList.remove('hidden');
      break;
    case AppState.LOADING:
      states.loading?.classList.remove('hidden');
      break;
    case AppState.SUCCESS:
      states.success?.classList.remove('hidden');
      break;
    case AppState.ERROR:
      states.error?.classList.remove('hidden');
      break;
    case AppState.BATCH_EXPORT:
      states.batchExport?.classList.remove('hidden');
      break;
  }
}

// Update loading message
function updateLoadingMessage(message) {
  if (elements.loadingMessage) {
    elements.loadingMessage.textContent = message;
  }
}

// Update success message
function updateSuccessMessage(message) {
  if (elements.successMessage) {
    elements.successMessage.textContent = message;
  }
}

// Update error message
function updateErrorMessage(message) {
  if (elements.errorMessage) {
    elements.errorMessage.textContent = message;
  }
}

// Initialize when popup loads
document.addEventListener('DOMContentLoaded', initialize);
