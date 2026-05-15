/**
 * Stitch Export Content Script
 * Injects export button and handles in-page interactions
 */

(function () {
  'use strict';

  let exportButton = null;
  let formatDialog = null;

  // Initialize
  function init() {
    console.log('[Stitch Export] Content script loaded');

    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(injectExportButton, 1000);
      });
    } else {
      setTimeout(injectExportButton, 1000);
    }
  }

  // Inject export button into Stitch UI
  function injectExportButton() {
    // Check if we're on a project page
    if (!window.location.pathname.includes('/projects/') &&
        !window.location.href.includes('/projects/')) {
      return;
    }

    // Check if button already exists
    if (exportButton && document.contains(exportButton)) {
      return;
    }

    // Try to find the top-right toolbar
    const toolbar = findToolbar();

    if (toolbar) {
      exportButton = createExportButton();

      try {
        // Strategy A: Insert right after Stitch's own Export button (same row)
        const stitchExportBtn = findStitchExportButton(toolbar);
        if (stitchExportBtn) {
          stitchExportBtn.insertAdjacentElement('afterend', exportButton);
          console.log('[Stitch Export] Button injected after Stitch Export button');
        } else {
          // Strategy B: Insert before Share wrapper
          const shareWrapper = findShareButtonWrapper(toolbar);
          if (shareWrapper && shareWrapper.parentElement) {
            shareWrapper.insertAdjacentElement('beforebegin', exportButton);
            console.log('[Stitch Export] Button injected before Share button');
          } else {
            // Strategy C: Append to the inner flex container
            const flexContainer = toolbar.querySelector('.flex.items-center');
            if (flexContainer) {
              const profileBtn = flexContainer.querySelector('[aria-label="Account Menu"]')?.closest('.relative');
              if (profileBtn) {
                profileBtn.insertAdjacentElement('beforebegin', exportButton);
              } else {
                flexContainer.appendChild(exportButton);
              }
              console.log('[Stitch Export] Button injected in toolbar (fallback)');
            } else {
              toolbar.appendChild(exportButton);
              console.log('[Stitch Export] Button appended to toolbar panel');
            }
          }
        }
      } catch (err) {
        console.error('[Stitch Export] Button injection error, using fixed position:', err);
        document.body.appendChild(exportButton);
        exportButton.style.position = 'fixed';
        exportButton.style.top = '16px';
        exportButton.style.right = '200px';
        exportButton.style.zIndex = '10000';
      }
    } else {
      // Toolbar not found yet — observe DOM for it
      console.log('[Stitch Export] Toolbar not found, setting up observer...');
      observeForToolbar();
    }
  }

  // Find the top-right toolbar panel
  function findToolbar() {
    // The toolbar is: div.react-flow__panel with classes containing "top" and "right"
    const panels = document.querySelectorAll('.react-flow__panel');
    for (const panel of panels) {
      if (panel.classList.contains('top') && panel.classList.contains('right')) {
        return panel;
      }
    }
    // Also try by style
    return document.querySelector('.react-flow__panel.top.right');
  }

  // Find the Share button wrapper in the toolbar
  function findShareButtonWrapper(toolbar) {
    const buttons = toolbar.querySelectorAll('button');
    for (const btn of buttons) {
      const text = btn.textContent.trim();
      if (text === 'Share' || btn.querySelector('p')?.textContent?.trim() === 'Share') {
        return btn.closest('[data-popup-open]') || btn;
      }
    }
    return null;
  }

  // Find Stitch's own Export button in the toolbar
  function findStitchExportButton(toolbar) {
    const buttons = toolbar.querySelectorAll('button');
    for (const btn of buttons) {
      const text = btn.querySelector('p')?.textContent?.trim() || btn.textContent.trim();
      if (text === 'Export' && btn.id !== 'stitch-export-chat-btn') {
        return btn;
      }
    }
    return null;
  }

  // Watch for the toolbar to appear (React renders async in iframe)
  let _toolbarObserver = null;
  function observeForToolbar() {
    if (_toolbarObserver) return; // already watching

    _toolbarObserver = new MutationObserver(() => {
      const toolbar = findToolbar();
      if (toolbar && !(exportButton && document.contains(exportButton))) {
        _toolbarObserver.disconnect();
        _toolbarObserver = null;
        injectExportButton();
      }
    });

    _toolbarObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    // Safety timeout: stop observing after 30s
    setTimeout(() => {
      if (_toolbarObserver) {
        _toolbarObserver.disconnect();
        _toolbarObserver = null;
        console.log('[Stitch Export] Toolbar observer timed out');
      }
    }, 30000);
  }

  // Create export button element matching Stitch's native button style
  function createExportButton() {
    const button = document.createElement('button');
    button.id = 'stitch-export-chat-btn';

    // Match native Stitch button classes exactly
    button.className = [
      'items-center', 'justify-center', 'bg-clip-border',
      'focus-visible:outline-2', 'focus-visible:outline-current', 'focus-visible:-outline-offset-2',
      'border',
      'enabled:hover:bg-state-hover', 'enabled:active:bg-state-pressed',
      'backdrop-blur-glass', 'text-subtitle-md',
      'bg-surface-container', 'backdrop-blur-glass',
      'font-heading', 'flex', 'gap-[6px]',
      'p-2', 'lg:px-4', 'lg:py-3', 'h-8', 'rounded-[20px]'
    ].join(' ');

    button.tabIndex = 0;
    button.style.transform = 'none';

    // Mauve/purple accent — matches extension dialog theme
    button.style.borderColor = '#8D6A8A';
    button.style.color = '#C4A0C1';

    // Download icon + text
    button.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 12.15L5.625 8.775L6.6 7.8L8.325 9.525V3.375H9.675V9.525L11.4 7.8L12.375 8.775L9 12.15ZM4.05 14.625C3.675 14.625 3.356 14.494 3.094 14.231C2.831 13.969 2.7 13.65 2.7 13.275V11.025H4.05V13.275H13.95V11.025H15.3V13.275C15.3 13.65 15.169 13.969 14.906 14.231C14.644 14.494 14.325 14.625 13.95 14.625H4.05Z"/>
      </svg>
      <p class="hidden lg:inline font-heading text-sm font-medium leading-[1]" style="color: #C4A0C1;">Export Chat</p>
    `;

    // Hover effects
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = 'rgba(141, 106, 138, 0.15)';
      button.style.borderColor = '#C4A0C1';
    });
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = '';
      button.style.borderColor = '#8D6A8A';
    });

    // Click handler
    button.addEventListener('click', handleExportClick);

    return button;
  }



  // Handle export button click
  function handleExportClick(e) {
    e.preventDefault();
    e.stopPropagation();

    showFormatDialog();
  }

  // Show format selection dialog
  function showFormatDialog() {
    // Remove existing dialog if any
    if (formatDialog) {
      formatDialog.remove();
    }

    // Create dialog
    formatDialog = document.createElement('div');
    formatDialog.id = 'stitch-export-dialog';

    formatDialog.innerHTML = `
      <div class="dialog-overlay">
        <div class="dialog-content">
          <div class="dialog-header">
            <h2>Export Stitch Conversation</h2>
            <button class="close-btn" aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 5l10 10M15 5L5 15"/>
              </svg>
            </button>
          </div>

          <div class="dialog-body">
            <label class="format-label">Select Export Format:</label>

            <div class="format-options">
              <label class="format-option">
                <input type="radio" name="export-format" value="claude" checked>
                <div class="format-info">
                  <span class="format-title">Claude Code Format</span>
                  <span class="format-desc">Structured format compatible with Claude Code exports</span>
                </div>
              </label>

              <label class="format-option">
                <input type="radio" name="export-format" value="openai">
                <div class="format-info">
                  <span class="format-title">OpenAI ChatGPT Format</span>
                  <span class="format-desc">Compatible with OpenAI Chat Completion API</span>
                </div>
              </label>

              <label class="format-option">
                <input type="radio" name="export-format" value="custom">
                <div class="format-info">
                  <span class="format-title">Custom JSON Format</span>
                  <span class="format-desc">Customize role names for User and Assistant</span>
                </div>
              </label>
            </div>

            <div id="custom-settings" class="custom-settings" style="display: none;">
                <div class="input-group">
                    <label for="custom-user-role">User Role Name:</label>
                    <input type="text" id="custom-user-role" value="user" placeholder="e.g. Human">
                </div>
                <div class="input-group">
                    <label for="custom-assistant-role">Assistant Role Name:</label>
                    <input type="text" id="custom-assistant-role" value="assistant" placeholder="e.g. Model">
                </div>
            </div>
          </div>

          <div class="dialog-footer">
            <button class="btn btn-secondary cancel-btn">Cancel</button>
            <button class="btn btn-primary export-btn">Export</button>
          </div>
        </div>
      </div>
    `;

    // Add styles
    addDialogStyles();

    // Add to page
    document.body.appendChild(formatDialog);

    // Setup event listeners
    formatDialog.querySelector('.close-btn').addEventListener('click', closeDialog);
    formatDialog.querySelector('.cancel-btn').addEventListener('click', closeDialog);
    formatDialog.querySelector('.export-btn').addEventListener('click', executeExport);
    formatDialog.querySelector('.dialog-overlay').addEventListener('click', (e) => {
      if (e.target.classList.contains('dialog-overlay')) {
        closeDialog();
      }
    });

    // Toggle custom settings visibility
    const radioButtons = formatDialog.querySelectorAll('input[name="export-format"]');
    const customSettings = formatDialog.querySelector('#custom-settings');

    radioButtons.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
          customSettings.style.display = 'flex';
          // Animate opening
          customSettings.style.opacity = '0';
          setTimeout(() => {
            customSettings.style.opacity = '1';
          }, 10);
        } else {
          customSettings.style.display = 'none';
        }
      });
    });
  }

  // Close dialog
  function closeDialog() {
    if (formatDialog) {
      formatDialog.remove();
      formatDialog = null;
    }
  }

  // Execute export
  async function executeExport() {
    const extractor = window.StitchExtractor;
    const formatters = window.StitchFormatters;
    const downloader = window.StitchDownloader;

    if (!extractor || !formatters || !downloader) {
      console.error('[Stitch Export] Core utilities missing', { extractor, formatters, downloader });
      StitchDownloader?.showErrorNotification?.('Export libraries not loaded; reload the page and try again.');
      return;
    }

    try {
      // Get selected format
      const selectedFormat = formatDialog.querySelector('input[name="export-format"]:checked')?.value || 'claude';

      // Get custom options if applicable
      const options = {};
      if (selectedFormat === 'custom') {
        options.userRole = formatDialog.querySelector('#custom-user-role').value || 'user';
        options.assistantRole = formatDialog.querySelector('#custom-assistant-role').value || 'assistant';
      }

      // Extract conversation (now async — supports API + sidebar clicking)
      const conversationData = await extractor.extractConversation();

      if (!conversationData) {
        StitchDownloader.showErrorNotification('No conversation data found. Make sure you\'re on a Stitch project page with messages.');
        closeDialog();
        return;
      }

      // Format the data
      const formattedData = formatters.format(conversationData, selectedFormat, options);

      // Generate filename
      const filename = formatters.generateFilename(conversationData, selectedFormat);

      // Download
      const success = downloader.downloadJSON(formattedData, filename);

      if (success) {
        downloader.showSuccessNotification(filename);
      } else {
        downloader.showErrorNotification('Failed to download file');
      }

      closeDialog();

    } catch (error) {
      console.error('[Stitch Export] Export error:', error);
      downloader.showErrorNotification(error.message || 'An error occurred during export');
      closeDialog();
    }
  }

  // Add dialog styles
  function addDialogStyles() {
    if (document.getElementById('stitch-export-styles')) {
      return;
    }

    const styles = document.createElement('style');
    styles.id = 'stitch-export-styles';
    styles.textContent = `
      #stitch-export-dialog .dialog-overlay {
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
        animation: fadeIn 0.2s ease-out;
      }

      #stitch-export-dialog .dialog-content {
        background: white;
        border-radius: 12px;
        width: 90%;
        max-width: 500px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.3s ease-out;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideUp {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      #stitch-export-dialog .dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        border-bottom: 1px solid #e0e0e0;
      }

      #stitch-export-dialog .dialog-header h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }

      #stitch-export-dialog .close-btn {
        background: none;
        border: none;
        padding: 4px;
        cursor: pointer;
        color: #666;
        transition: color 0.2s;
      }

      #stitch-export-dialog .close-btn:hover {
        color: #333;
      }

      #stitch-export-dialog .dialog-body {
        padding: 24px;
      }

      #stitch-export-dialog .format-label {
        display: block;
        font-weight: 600;
        margin-bottom: 16px;
        color: #555;
        font-size: 14px;
      }

      #stitch-export-dialog .format-options {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      #stitch-export-dialog .format-option {
        display: flex;
        align-items: flex-start;
        padding: 14px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }

      #stitch-export-dialog .format-option:hover {
        border-color: #8D6A8A;
        background: #f5f0f5;
      }

      #stitch-export-dialog .format-option input[type="radio"] {
        margin-top: 2px;
        margin-right: 12px;
        cursor: pointer;
        accent-color: #8D6A8A;
      }

      #stitch-export-dialog .format-info {
        flex: 1;
      }

      #stitch-export-dialog .format-title {
        display: block;
        font-weight: 500;
        margin-bottom: 4px;
        color: #333;
        font-size: 14px;
      }

      #stitch-export-dialog .format-desc {
        display: block;
        font-size: 13px;
        color: #666;
        line-height: 1.4;
      }

      #stitch-export-dialog .dialog-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 16px 24px;
        border-top: 1px solid #e0e0e0;
      }

      #stitch-export-dialog .btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
      }

      #stitch-export-dialog .btn-primary {
        background: #8D6A8A;
        color: white;
      }

      #stitch-export-dialog .btn-primary:hover {
        background: #745472;
      }

      #stitch-export-dialog .btn-secondary {
        background: white;
        color: #666;
        border: 1px solid #e0e0e0;
      }

      #stitch-export-dialog .btn-secondary:hover {
        background: #f5f5f5;
      }

      /* Custom Settings Styles */
      #stitch-export-dialog .custom-settings {
        margin-top: 16px;
        padding: 16px;
        background: #16151A;
        border-radius: 8px;
        border: 1px solid #50384E;
        flex-direction: column;
        gap: 12px;
        transition: opacity 0.3s ease;
      }

      #stitch-export-dialog .input-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      #stitch-export-dialog .input-group label {
        font-size: 12px;
        font-weight: 500;
        color: #8D6A8A;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      #stitch-export-dialog .input-group input {
        padding: 10px 12px;
        border: 1px solid #50384E;
        border-radius: 6px;
        font-size: 14px;
        color: #FFFFFF;
        background: #1B1A20;
        transition: border-color 0.2s, box-shadow 0.2s;
        font-family: inherit;
      }

      #stitch-export-dialog .input-group input::placeholder {
        color: #50384E;
        font-size: 13px;
      }

      #stitch-export-dialog .input-group input:hover {
        border-color: #745472;
      }

      #stitch-export-dialog .input-group input:focus {
        border-color: #8D6A8A;
        outline: none;
        box-shadow: 0 0 0 2px rgba(141, 106, 138, 0.2);
      }
    `;

    document.head.appendChild(styles);
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Stitch Export] Message received:', request);

    if (request.action === 'export') {
      const extractor = window.StitchExtractor;
      const formatters = window.StitchFormatters;
      const downloader = window.StitchDownloader;

      if (!extractor || !formatters || !downloader) {
        // IMPORTANT: Do NOT call sendResponse here. If we respond with
        // {success:false} from a frame that simply doesn't have the libs,
        // the popup receives this "failure" response first and falls through
        // to executeScript — while the iframe (which has the libs) is still
        // running its async extraction in the background, causing zombie
        // sidebar clicking. By returning false, we let the iframe be the
        // sole responder.
        console.log('[Stitch Export] Libraries not available in this frame, ignoring message');
        return false;
      }

      (async () => {
        try {
          // Extract conversation
          const conversationData = await extractor.extractConversation();

          if (!conversationData) {
            sendResponse({
              success: false,
              error: 'No conversation data found. Make sure you\'re on a Stitch project page with messages.'
            });
            return;
          }

          // Format the data
          const formattedData = formatters.format(conversationData, request.format, request.options);

          // Generate filename
          const filename = formatters.generateFilename(conversationData, request.format);

          // Download
          const success = downloader.downloadJSON(formattedData, filename);

          if (success) {
            downloader.showSuccessNotification(filename);
            sendResponse({ success: true, filename });
          } else {
            sendResponse({ success: false, error: 'Download failed' });
          }

        } catch (error) {
          console.error('[Stitch Export] Export error:', error);
          sendResponse({ success: false, error: error.message });
        }
      })();

      return true; // Keep the message channel open for async response
    }
  });

  // Initialize when script loads
  init();

  // Log that content script loaded
  console.log('[Stitch Export] Content script loaded and initialized');
  console.log('[Stitch Export] StitchExtractor available:', typeof StitchExtractor !== 'undefined');
  console.log('[Stitch Export] StitchFormatters available:', typeof StitchFormatters !== 'undefined');
  console.log('[Stitch Export] StitchDownloader available:', typeof StitchDownloader !== 'undefined');
})();
