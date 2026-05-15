/**
 * Stitch Conversation Extractor
 * Extracts conversation data from stitch.withgoogle.com pages
 * Uses batchexecute API (rpcid: dNS8Mc) for reliable extraction,
 * with DOM-based fallback.
 */

const StitchExtractor = {
  // Abort flag — stops sidebar clicking when set to true
  _abortExtraction: false,

  /**
   * Main extraction function
   * @returns {Promise<Object>} Extracted conversation data
   */
  async extractConversation() {
    console.log('[Stitch Export] Starting conversation extraction...');
    this._abortExtraction = false;

    try {
      // Extract project metadata
      const projectId = this.extractProjectId();
      const projectTitle = this.extractProjectTitle();
      const sourceUrl = window.location.href;

      // Strategy 1: API-based extraction (most reliable)
      let messages = await this.extractMessagesViaAPI(projectId);

      // Strategy 2: DOM-based extraction via Agent log sidebar clicking
      if (!messages || messages.length === 0) {
        console.log('[Stitch Export] API extraction failed, trying Agent log sidebar...');
        messages = await this.extractMessagesViaSidebar();
      }

      // Strategy 3: Legacy DOM scraping
      if (!messages || messages.length === 0) {
        console.log('[Stitch Export] Sidebar extraction failed, trying legacy DOM...');
        messages = this.extractMessagesLegacy();
      }

      if (!messages || messages.length === 0) {
        console.warn('[Stitch Export] No messages found');
        return null;
      }

      const result = {
        projectId,
        projectTitle,
        sourceUrl,
        timestamp: new Date().toISOString(),
        messages
      };

      console.log(`[Stitch Export] Extracted ${messages.length} messages`);

      // Signal any still-running sidebar clicking to stop
      this._abortExtraction = true;

      return result;

    } catch (error) {
      console.error('[Stitch Export] Extraction error:', error);
      this._abortExtraction = true;
      return null;
    }
  },

  // ─── METADATA ───────────────────────────────────────────────

  /**
   * Extract project ID from URL
   * @returns {string} Project ID
   */
  extractProjectId() {
    const url = window.location.href;
    const match = url.match(/projects\/(\d+)/);
    return match ? match[1] : 'unknown';
  },

  /**
   * Extract project title from page
   * @returns {string} Project title
   */
  extractProjectTitle() {
    // Try multiple selectors for title
    const selectors = [
      '[data-testid="chat-header"] .text-subtitle-md',
      '[data-testid="chat-header"] [class*="text-subtitle"]',
      'h1',
      '[role="heading"]',
      '.project-title',
      'title'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        const title = element.textContent.trim();
        if (title !== 'Stitch - Projects' && title !== 'Stitch') {
          return title;
        }
      }
    }

    return `Stitch Project ${this.extractProjectId()}`;
  },

  // ─── STRATEGY 1: API-BASED EXTRACTION ──────────────────────

  /**
   * Extract messages via the batchexecute API (rpcid: dNS8Mc)
   * This directly queries the Stitch backend for all session data.
   * @param {string} projectId
   * @returns {Promise<Array|null>}
   */
  async extractMessagesViaAPI(projectId) {
    try {
      // Get auth tokens from page HTML
      const html = document.documentElement.innerHTML;
      const sidMatch = html.match(/"FdrFJe":"([^"]+)"/);
      const tokenMatch = html.match(/"SNlM0e":"([^"]+)"/);

      if (!sidMatch || !tokenMatch) {
        console.warn('[Stitch Export] Could not find auth tokens for API extraction');
        return null;
      }

      const params = new URLSearchParams({
        'f.req': `[[["dNS8Mc","[\\"projects/${projectId}\\"]",null,"28"]]]`,
        'at': tokenMatch[1]
      });

      const res = await fetch(
        `/_/Nemo/data/batchexecute?rpcids=dNS8Mc&f.sid=${sidMatch[1]}&rt=c`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: params.toString()
        }
      );

      const text = await res.text();

      // Parse the response: lines alternate between length and JSON
      const lines = text.split('\n');
      let innerData = null;
      for (const line of lines) {
        if (line.startsWith('[["wrb.fr","dNS8Mc"')) {
          try {
            const parsed = JSON.parse(line);
            const innerStr = parsed[0][2];
            innerData = JSON.parse(innerStr);
          } catch (e) {
            console.warn('[Stitch Export] Failed to parse dNS8Mc inner JSON:', e.message);
          }
          break;
        }
      }

      if (!innerData) {
        console.warn('[Stitch Export] dNS8Mc response contained no parseable data');
        return null;
      }

      // Find the sessions array. Structure: innerData contains a nested array
      // where each element has format:
      //   [0]: "projects/{id}/sessions/{sessionId}"
      //   [1]: null
      //   [2]: 3 (status?)
      //   [3]: [userPrompt, ...] — user prompt data
      //   [4]: [screenResults, ..., responseText, suggestions...]
      const sessionsArray = this.findSessionsArray(innerData);

      if (!sessionsArray || sessionsArray.length === 0) {
        console.warn('[Stitch Export] No sessions found in API response');
        return null;
      }

      console.log(`[Stitch Export] Found ${sessionsArray.length} sessions via API`);

      const messages = [];
      const sourceUrl = window.location.href;

      for (let i = 0; i < sessionsArray.length; i++) {
        const turn = sessionsArray[i];

        // Extract user prompt from turn[3][0]
        let userContent = '';
        if (turn[3] && turn[3][0] && typeof turn[3][0] === 'string') {
          userContent = turn[3][0];
        }

        // Extract assistant response and screen names from turn[4]
        let assistantContent = '';
        const screenNames = [];

        if (turn[4]) {
          // Find strings in turn[4] that are responses
          this.extractAPIResponseData(turn[4], (str, depth) => {
            // The response text is usually at a shallow depth in turn[4]
            // and is the longest string
            if (str.length > assistantContent.length && depth <= 3 && !str.startsWith('projects/') && !str.startsWith('http') && !str.startsWith('Title:') && str.length > 30) {
              assistantContent = str;
            }
          });

          // Find screen/design names
          this.extractAPIResponseData(turn[4], (str, depth) => {
            if (depth >= 3 && str.length > 5 && str.length < 100 &&
                !str.startsWith('projects/') && !str.startsWith('http') &&
                !str.startsWith('Title:') && !str.includes('/') &&
                !str.match(/^[a-f0-9]{32}$/) && !str.match(/^\d+$/) &&
                str !== 'figaro_agent') {
              // This might be a screen name
              if (!screenNames.includes(str)) {
                screenNames.push(str);
              }
            }
          });
        }

        if (userContent) {
          messages.push({
            role: 'user',
            content: userContent,
            timestamp: new Date().toISOString(),
            source: sourceUrl
          });
        }

        if (assistantContent) {
          let fullContent = assistantContent;
          if (screenNames.length > 0) {
            fullContent += '\n\n[Generated Screens: ' + screenNames.join(', ') + ']';
          }
          messages.push({
            role: 'assistant',
            content: fullContent,
            timestamp: new Date().toISOString(),
            source: sourceUrl
          });
        }
      }

      return messages.length > 0 ? messages : null;

    } catch (error) {
      console.error('[Stitch Export] API extraction error:', error);
      return null;
    }
  },

  /**
   * Recursively find the sessions array in the parsed API response
   */
  findSessionsArray(obj) {
    if (Array.isArray(obj) && obj.length > 0 && Array.isArray(obj[0]) &&
        typeof obj[0][0] === 'string' && obj[0][0].includes('sessions/')) {
      return obj;
    }
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const result = this.findSessionsArray(item);
        if (result) return result;
      }
    }
    return null;
  },

  /**
   * Recursively extract string data from API response arrays
   * @param {*} obj - Object to traverse
   * @param {Function} callback - Called with (string, depth) for each string found
   * @param {number} depth - Current recursion depth
   */
  extractAPIResponseData(obj, callback, depth = 0) {
    if (typeof obj === 'string' && obj.length > 0) {
      callback(obj, depth);
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        this.extractAPIResponseData(item, callback, depth + 1);
      }
    }
  },

  // ─── STRATEGY 2: SIDEBAR CLICKING ─────────────────────────

  /**
   * Extract messages by clicking through the Agent log sidebar
   * @returns {Promise<Array|null>}
   */
  async extractMessagesViaSidebar() {
    // Open Agent log sidebar if needed
    await this.openAgentLog();

    const menuItems = document.querySelectorAll('[role="menuitem"]');
    if (menuItems.length === 0) {
      console.log('[Stitch Export] No menu items found in Agent log sidebar');
      return null;
    }

    console.log(`[Stitch Export] Found ${menuItems.length} chat items in Agent log`);

    const messages = [];
    const sourceUrl = window.location.href;

    for (let i = 0; i < menuItems.length; i++) {
      // Check abort flag before each click
      if (this._abortExtraction) {
        console.log('[Stitch Export] Sidebar clicking aborted');
        break;
      }

      const menuItem = menuItems[i];

      console.log(`[Stitch Export] Clicking chat item ${i + 1}/${menuItems.length}`);
      menuItem.click();

      // Wait for the detail view to update
      await this.delay(1000);
      await this.waitForDesignsToLoad();

      // Extract content from the detail view
      const promptContainer = document.querySelector('div.group\\/prompt .markdown') ||
                              document.querySelector('div.group\\/prompt');
      const markdownBlocks = document.querySelectorAll('.markdown');

      let userContent = '';
      let assistantContent = '';

      // Find user prompt
      if (promptContainer) {
        userContent = this.extractTextWithFormatting(promptContainer);
      } else if (markdownBlocks.length > 0) {
        userContent = this.extractTextWithFormatting(markdownBlocks[0]);
      }

      // Find assistant response
      const assistantContainer = document.querySelector('.px-4.text-sm.leading-relaxed.mb-2.text-primary');
      if (assistantContainer) {
        assistantContent = this.extractTextWithFormatting(assistantContainer);
      } else if (markdownBlocks.length > 1) {
        assistantContent = this.extractTextWithFormatting(markdownBlocks[markdownBlocks.length - 1]);
      }

      // Append design references
      const detailView = document.querySelector('main') || document.body;
      assistantContent = this.appendDesignReferences(detailView, assistantContent, userContent);

      if (userContent) {
        messages.push({
          role: 'user',
          content: userContent,
          timestamp: new Date().toISOString(),
          source: sourceUrl
        });
      }

      if (assistantContent) {
        messages.push({
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date().toISOString(),
          source: sourceUrl
        });
      }
    }

    return messages.length > 0 ? messages : null;
  },

  // ─── STRATEGY 3: LEGACY DOM SCRAPING ──────────────────────

  /**
   * Legacy synchronous DOM extraction
   * @returns {Array} Array of message objects
   */
  extractMessagesLegacy() {
    const messages = [];
    const chatList = document.querySelector('[data-testid="chat-msg-list"]');

    let messageElements = chatList
      ? Array.from(chatList.querySelectorAll('section'))
      : Array.from(document.querySelectorAll('section.flex.flex-col'));

    if (messageElements.length === 0) {
      const messageSelectors = ['.markdown', 'div.markdown', '[class*="markdown"]'];
      for (const selector of messageSelectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 0) {
          messageElements = elements;
          break;
        }
      }
    }

    if (messageElements.length === 0) {
      messageElements = this.fallbackMessageExtraction();
    }

    console.log(`[Stitch Export] Legacy: Processing ${messageElements.length} message elements`);

    let lastUserMessageContent = '';
    const sourceUrl = window.location.href;

    for (let i = 0; i < messageElements.length; i++) {
      const element = messageElements[i];
      const message = this.extractMessageFromElement(element, i, lastUserMessageContent);

      if (message && message.content && message.content.trim()) {
        message.source = sourceUrl;
        messages.push(message);

        if (message.role === 'user') {
          lastUserMessageContent = message.content;
        }
      }
    }

    return messages;
  },

  /**
   * Fallback method to extract messages when standard selectors don't work
   * @returns {Array} Array of DOM elements that might be messages
   */
  fallbackMessageExtraction() {
    const mainContent = document.querySelector('main') || document.body;
    const paragraphs = Array.from(mainContent.querySelectorAll('p'));
    return paragraphs.filter(p => p.textContent.trim().length > 10);
  },

  // ─── HELPERS ───────────────────────────────────────────────

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Open the Agent log sidebar if needed
   */
  async openAgentLog() {
    const agentLogSpans = Array.from(document.querySelectorAll('span'))
      .filter(span => span.textContent.trim() === 'Agent log');

    if (agentLogSpans.length > 0) {
      const agentLogBtn = agentLogSpans[0].closest('[role="status"]') ||
                          agentLogSpans[0].closest('div.cursor-pointer');
      if (agentLogBtn) {
        const menuItems = document.querySelectorAll('[role="menuitem"]');
        if (menuItems.length === 0) {
          console.log('[Stitch Export] Clicking Agent log to open sidebar...');
          agentLogBtn.click();
          await this.delay(1500);
        }
      }
    }
  },

  /**
   * Wait for designs/images to load
   */
  async waitForDesignsToLoad() {
    for (let i = 0; i < 10; i++) {
      const loaders = document.querySelectorAll(
        '[style*="agentPendingEnter"], .animate-pulse, circle[class*="opacity-25"]'
      );
      if (loaders.length === 0) break;
      await this.delay(500);
    }
    await this.delay(500);
  },

  /**
   * Append design references to content string
   */
  appendDesignReferences(element, content, previousUserContent) {
    let newContent = content || '';
    const designElements = element.querySelectorAll(
      '.bg-design, img[src*="/aida/"], [style*="/aida/"]'
    );

    if (designElements.length > 0) {
      let referenceName = '';

      const titleElement = element.querySelector('span.truncate');
      if (titleElement && titleElement.textContent.trim()) {
        referenceName = `stitch_${this.slugify(titleElement.textContent)}`;
      } else if (previousUserContent) {
        referenceName = `stitch_${this.slugify(previousUserContent)}`;
      }

      if (referenceName && !newContent.includes(`[Design Reference: ${referenceName}]`)) {
        newContent += `\n\n[Design Reference: ${referenceName}]`;
      }
    }
    return newContent;
  },

  /**
   * Extract message data from a DOM element
   */
  extractMessageFromElement(element, index = 0, previousUserContent = '') {
    const role = this.determineMessageRole(element, index);
    const content = this.extractMessageContent(element, previousUserContent);
    const timestamp = this.extractTimestamp(element);

    return {
      role,
      content,
      timestamp: timestamp || new Date().toISOString()
    };
  },

  /**
   * Determine if message is from user or assistant
   */
  determineMessageRole(element, index = 0) {
    const elementText = element.textContent || '';
    const elementHTML = element.outerHTML.toLowerCase();
    const classNames = (typeof element.className === 'string') ? element.className.toLowerCase() : '';
    const dataRole = element.getAttribute('data-role');

    if (element.querySelector('img[alt="Stitch avatar"]')) return 'assistant';
    if (element.querySelector('img[alt^="Profile image for"]')) return 'user';

    const stitchIndicators = element.querySelectorAll('[alt="Stitch avatar"]');
    if (stitchIndicators.length > 0 || elementText.includes('Stitch')) return 'assistant';

    const headerDiv = element.querySelector('.flex.justify-between.items-center');
    if (headerDiv && headerDiv.textContent.includes('Stitch')) return 'assistant';

    if (elementHTML.includes('stitch-avatar')) return 'assistant';

    if (dataRole) {
      if (dataRole.includes('user') || dataRole.includes('human')) return 'user';
      if (dataRole.includes('assistant') || dataRole.includes('ai') || dataRole.includes('bot') || dataRole.includes('stitch')) return 'assistant';
    }

    if (classNames.includes('user') || classNames.includes('human') || classNames.includes('prompt')) return 'user';
    if (classNames.includes('assistant') || classNames.includes('ai') || classNames.includes('bot') || classNames.includes('response')) return 'assistant';

    const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
    if (ariaLabel.includes('user')) return 'user';
    if (ariaLabel.includes('assistant') || ariaLabel.includes('ai') || ariaLabel.includes('stitch')) return 'assistant';

    return index % 2 === 0 ? 'user' : 'assistant';
  },

  /**
   * Extract text content from message element
   */
  extractMessageContent(element, previousUserContent = '') {
    let content = '';

    const markdownElement = element.querySelector('.markdown, [class*="markdown"]');
    if (markdownElement) {
      content = this.extractTextWithFormatting(markdownElement);
    } else {
      content = this.extractTextWithFormatting(element);
    }

    // Clean up Stitch-specific formatting
    content = content.replace(/\[Images generated by Stitch\]:[\s\S]*?---\s*/g, '');
    content = content.replace(/https:\/\/lh3\.googleusercontent\.com\/a\/[^\s]+/g, '');
    content = content.replace(/\n{3,}/g, '\n\n').trim();

    // Check for design artifacts
    const designElements = element.querySelectorAll('.bg-design, img[src*="/aida/"], [style*="/aida/"]');

    if (designElements.length > 0) {
      let referenceName = '';

      const titleElement = element.querySelector('span.truncate');
      if (titleElement && titleElement.textContent.trim()) {
        referenceName = `stitch_${this.slugify(titleElement.textContent)}`;
      } else {
        // Cross-reference by Image ID
        for (const designEl of designElements) {
          let url = designEl.getAttribute('src');
          if (!url) {
            const style = designEl.getAttribute('style');
            if (style) {
              const urlMatch = style.match(/url\(&quot;([^&]+)&quot;\)/) ||
                style.match(/url\("([^"]+)"\)/) ||
                style.match(/url\('([^']+)'\)/) ||
                style.match(/url\(([^)]+)\)/);
              if (urlMatch) url = urlMatch[1];
            }
          }

          const imageId = this.extractImageId(url);
          if (imageId) {
            const relatedImages = document.querySelectorAll(`img[src*="/aida/${imageId}"], [style*="/aida/${imageId}"]`);
            for (const relatedImg of relatedImages) {
              let parent = relatedImg.parentElement;
              for (let i = 0; i < 6 && parent; i++) {
                const relatedTitle = parent.querySelector('span.truncate');
                if (relatedTitle && relatedTitle.textContent.trim()) {
                  referenceName = `stitch_${this.slugify(relatedTitle.textContent)}`;
                  break;
                }
                parent = parent.parentElement;
              }
              if (referenceName) break;
            }
          }
          if (referenceName) break;
        }

        if (!referenceName && previousUserContent) {
          referenceName = `stitch_${this.slugify(previousUserContent)}`;
        }
      }

      if (referenceName) {
        content += `\n\n[Design Reference: ${referenceName}]`;
      }
    }

    return content;
  },

  /**
   * Extract Image ID from a URL
   */
  extractImageId(url) {
    if (!url) return null;
    const match = url.match(/\/aida\/([^/=]+)/);
    return match ? match[1] : null;
  },

  /**
   * Convert text to a slug for filenames
   */
  slugify(text) {
    return text.toString().toLowerCase().trim()
      .replace(/\s+/g, '_')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '_');
  },

  /**
   * Extract image URLs from message element
   */
  extractImageReferences(element) {
    const images = [];
    const imageContainers = element.querySelectorAll('[style*="background-image"]');

    imageContainers.forEach(container => {
      const style = container.getAttribute('style');
      const urlMatch = style.match(/url\(&quot;([^&]+)&quot;\)/);
      if (urlMatch && urlMatch[1]) images.push(urlMatch[1]);
    });

    const imgTags = element.querySelectorAll('img:not([alt="Stitch avatar"])');
    imgTags.forEach(img => {
      const src = img.getAttribute('src');
      if (src && !src.includes('stitch-avatar')) images.push(src);
    });

    return images;
  },

  /**
   * Extract text while preserving formatting
   */
  extractTextWithFormatting(element) {
    const processNode = (node, depth = 0) => {
      let result = '';

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text.trim()) result += text;
        return result;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return result;

      const tagName = node.tagName.toLowerCase();

      switch (tagName) {
        case 'p':
          if (node.textContent.trim()) {
            result += '\n\n' + Array.from(node.childNodes).map(child => processNode(child, depth)).join('');
          }
          break;
        case 'br':
          result += '\n';
          break;
        case 'ul':
        case 'ol':
          result += '\n';
          Array.from(node.children).forEach(child => {
            if (child.tagName.toLowerCase() === 'li') result += processNode(child, depth + 1);
          });
          break;
        case 'li': {
          const listContent = Array.from(node.childNodes).map(child => processNode(child, depth)).join('').trim();
          if (listContent) result += '\n- ' + listContent;
          break;
        }
        case 'strong':
        case 'b': {
          const boldText = Array.from(node.childNodes).map(child => processNode(child, depth)).join('').trim();
          result += '**' + boldText + '**';
          break;
        }
        case 'em':
        case 'i': {
          const italicText = Array.from(node.childNodes).map(child => processNode(child, depth)).join('').trim();
          result += '*' + italicText + '*';
          break;
        }
        case 'code':
          result += '`' + node.textContent + '`';
          break;
        case 'pre':
          result += '\n```\n' + node.textContent + '\n```\n';
          break;
        case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
          const level = parseInt(tagName[1]);
          const headingText = Array.from(node.childNodes).map(child => processNode(child, depth)).join('').trim();
          result += '\n\n' + '#'.repeat(level) + ' ' + headingText + '\n';
          break;
        }
        default:
          result += Array.from(node.childNodes).map(child => processNode(child, depth)).join('');
      }

      return result;
    };

    return processNode(element).replace(/\n{3,}/g, '\n\n').trim();
  },

  /**
   * Extract timestamp from element if available
   */
  extractTimestamp(element) {
    const timeElement = element.querySelector('time');
    if (timeElement) {
      const datetime = timeElement.getAttribute('datetime');
      if (datetime) return datetime;
    }
    const dataTimestamp = element.getAttribute('data-timestamp');
    if (dataTimestamp) return dataTimestamp;
    return null;
  },

  /**
   * Check if we're on a Stitch project page
   */
  isOnStitchProjectPage() {
    return window.location.hostname === 'stitch.withgoogle.com' &&
      window.location.pathname.includes('/projects/');
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StitchExtractor;
}

if (typeof window !== 'undefined') {
  window.StitchExtractor = StitchExtractor;
}
