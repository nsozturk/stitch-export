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
    if (!window.location.pathname.includes('/projects/')) {
      return;
    }

    // Only inject where the Stitch chat UI is present
    const hasChatUI = document.querySelector('[data-testid="chat-msg-list"], [data-testid="chat-header"]');
    if (!hasChatUI) {
      console.warn('[Stitch Export] Chat UI not detected in this frame, skipping injection');
      return;
    }

    // Check if button already exists
    if (exportButton && document.contains(exportButton)) {
      return;
    }

    // Create export button
    exportButton = createExportButton();

    // Find a good place to inject the button
    // User wants it next to the Share button
    // The Share button is usually in a container like: <div class="flex items-center gap-2 md:gap-4">
    // We look for the Share button specifically
    const shareButton = findShareButton();

    if (shareButton) {
      // Insert after the share button's parent div if it's wrapped, or directly after
      // The user snippet shows Share button inside a div, inside the flex container
      // We want to be a sibling of that div

      // Try to find the container that holds the share button
      const shareContainer = shareButton.closest('div');
      if (shareContainer && shareContainer.parentElement && shareContainer.parentElement.classList.contains('flex')) {
        shareContainer.parentElement.insertBefore(exportButton, shareContainer.nextSibling);
        console.log('[Stitch Export] Button injected next to Share button');
      } else {
        // Fallback: just append to the same container as share button
        shareButton.parentElement.appendChild(exportButton);
        console.log('[Stitch Export] Button injected near Share button (fallback 1)');
      }
    } else {
      // Fallback: find header and append
      const header = document.querySelector('[data-testid="chat-header"] .flex.items-center.gap-2') ||
        document.querySelector('[data-testid="chat-header"]');

      if (header) {
        header.appendChild(exportButton);
        console.log('[Stitch Export] Button injected in header (fallback 2)');
      } else {
        // Ultimate fallback: fixed position
        document.body.appendChild(exportButton);
        exportButton.style.position = 'fixed';
        exportButton.style.top = '20px';
        exportButton.style.right = '20px';
        exportButton.style.zIndex = '10000';
        console.log('[Stitch Export] Button injected to body (ultimate fallback)');
      }
    }
  }

  // Find the Share button in the DOM
  function findShareButton() {
    // Look for button with "Share" text
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find(btn => btn.textContent.includes('Share'));
  }

  // Create export button element
  function createExportButton() {
    // Wrapper div to match the Share button's wrapper if needed, 
    // but the user snippet shows the button itself has the classes.
    // We'll create the button directly with the requested classes.

    const button = document.createElement('button');
    button.id = 'stitch-export-button';

    // Use the exact classes provided by the user
    button.className = 'items-center justify-center gap-2 bg-clip-border duration-75 ease-out focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 bg-accent enabled:hover:opacity-80 font-heading hidden md:flex md:gap-[6px] px-3 py-1 h-[unset] rounded-md text-black';

    // Add margin to separate from Share button if needed (though parent gap usually handles it)
    button.style.marginLeft = '8px';
    button.style.backgroundColor = '#eef0f5'; // Approximate 'bg-accent' if not available, user said "preserve color" but gave classes. 
    // If 'bg-accent' is a Tailwind class available in the app, it will work. 
    // If not, we might need to force a color. The Share button usually has a light grey/blue tint.
    // Let's assume the classes work because they are from the app. 
    // But to be safe, let's set a background color that looks like the Share button just in case the class doesn't resolve in our context (though it should).
    // Actually, better to trust the classes if we are injecting into the app.

    button.innerHTML = `
      <span class="text-[#191919] mb-[1px]">
        <svg xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" fill="currentColor" viewBox="0 0 256 256">
          <path d="M216,112v96a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V112A16,16,0,0,1,56,96H80a8,8,0,0,1,0,16H56v96H200V112H176a8,8,0,0,1,0-16h24A16,16,0,0,1,216,112ZM93.66,69.66,120,43.31V136a8,8,0,0,0,16,0V43.31l26.34,26.35a8,8,0,0,0,11.32-11.32l-40-40a8,8,0,0,0-11.32,0l-40,40A8,8,0,0,0,93.66,69.66Z"></path>
        </svg>
      </span>
      <p class="font-heading text-sm font-medium leading-[1]">Export</p>
    `;

    // Click handler
    button.addEventListener('click', handleExportClick);

    return button;
  }

  // Find a good injection point in the Stitch UI - DEPRECATED/UNUSED in favor of findShareButton logic inside injectExportButton
  function findInjectionPoint() {
    return null;
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
  function executeExport() {
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

      // Extract conversation
      const conversationData = extractor.extractConversation();

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
        border-color: #4285F4;
        background: #f0f7ff;
      }

      #stitch-export-dialog .format-option input[type="radio"] {
        margin-top: 2px;
        margin-right: 12px;
        cursor: pointer;
        accent-color: #4285F4;
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
        background: #4285F4;
        color: white;
      }

      #stitch-export-dialog .btn-primary:hover {
        background: #3367D6;
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
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e0e0e0;
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
        font-size: 13px;
        font-weight: 500;
        color: #555;
      }

      #stitch-export-dialog .input-group input {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        transition: border-color 0.2s;
      }

      #stitch-export-dialog .input-group input:focus {
        border-color: #4285F4;
        outline: none;
        box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.1);
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
        sendResponse({ success: false, error: 'Export libraries not loaded in this frame' });
        return true;
      }

      try {
        // Extract conversation
        const conversationData = extractor.extractConversation();

        if (!conversationData) {
          sendResponse({
            success: false,
            error: 'No conversation data found. Make sure you\'re on a Stitch project page with messages.'
          });
          return true;
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
