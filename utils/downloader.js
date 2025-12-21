/**
 * Stitch Export Download Handler
 * Handles file downloads for exported conversations
 */

const StitchDownloader = {
  /**
   * Download data as JSON file
   * @param {Object} data - Data to download
   * @param {string} filename - Filename for download
   */
  downloadJSON(data, filename) {
    try {
      // Convert data to JSON string with pretty formatting
      const jsonString = JSON.stringify(data, null, 2);

      // Create blob
      const blob = new Blob([jsonString], { type: 'application/json' });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log(`[Stitch Export] Downloaded: ${filename}`);
      return true;

    } catch (error) {
      console.error('[Stitch Export] Download error:', error);
      return false;
    }
  },

  /**
   * Download using Chrome downloads API (from background script)
   * @param {Object} data - Data to download
   * @param {string} filename - Filename for download
   * @returns {Promise} Promise that resolves when download starts
   */
  async downloadViaAPI(data, filename) {
    try {
      // Convert data to JSON string
      const jsonString = JSON.stringify(data, null, 2);

      // Create data URL
      const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString);

      // Use Chrome downloads API
      return new Promise((resolve, reject) => {
        chrome.downloads.download({
          url: dataUrl,
          filename: filename,
          saveAs: true
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(downloadId);
          }
        });
      });

    } catch (error) {
      console.error('[Stitch Export] Download API error:', error);
      throw error;
    }
  },

  /**
   * Show download success notification
   * @param {string} filename - Downloaded filename
   */
  showSuccessNotification(filename) {
    // Create a simple toast notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M7 10l2 2 4-4"/>
          <circle cx="10" cy="10" r="8"/>
        </svg>
        <div>
          <strong>Export successful!</strong>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 2px;">${filename}</div>
        </div>
      </div>
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Remove after 4 seconds
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => {
        document.body.removeChild(notification);
        document.head.removeChild(style);
      }, 300);
    }, 4000);
  },

  /**
   * Show download error notification
   * @param {string} errorMessage - Error message
   */
  showErrorNotification(errorMessage) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
      max-width: 400px;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="10" cy="10" r="8"/>
          <path d="M10 6v4M10 14h.01"/>
        </svg>
        <div>
          <strong>Export failed</strong>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 2px;">${errorMessage}</div>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // Remove after 6 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 6000);
  },

  /**
   * Copy data to clipboard
   * @param {Object} data - Data to copy
   * @returns {boolean} Success status
   */
  async copyToClipboard(data) {
    try {
      const jsonString = JSON.stringify(data, null, 2);

      await navigator.clipboard.writeText(jsonString);

      console.log('[Stitch Export] Copied to clipboard');
      return true;

    } catch (error) {
      console.error('[Stitch Export] Clipboard error:', error);
      return false;
    }
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StitchDownloader;
}

if (typeof window !== 'undefined') {
  window.StitchDownloader = StitchDownloader;
}
