/**
 * Stitch Export Background Service Worker
 * Handles context menu and background tasks
 */

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Stitch Export] Extension installed');

  // Create context menu item
  chrome.contextMenus.create({
    id: 'stitch-export-context',
    title: 'Export Stitch Conversation',
    contexts: ['page'],
    documentUrlPatterns: ['https://stitch.withgoogle.com/projects/*']
  });

  console.log('[Stitch Export] Context menu created');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'stitch-export-context') {
    handleContextMenuExport(tab);
  }
});

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

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Stitch Export] Message received:', request);

  if (request.action === 'export') {
    handleExportRequest(request.format, sender.tab);
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

console.log('[Stitch Export] Background script loaded');
