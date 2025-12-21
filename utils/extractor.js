/**
 * Stitch Conversation Extractor
 * Extracts conversation data from stitch.withgoogle.com pages
 */

const StitchExtractor = {
  /**
   * Main extraction function
   * @returns {Object} Extracted conversation data
   */
  extractConversation() {
    console.log('[Stitch Export] Starting conversation extraction...');

    try {
      // Extract project metadata
      const projectId = this.extractProjectId();
      const projectTitle = this.extractProjectTitle();

      // Extract messages
      const messages = this.extractMessages();

      if (messages.length === 0) {
        console.warn('[Stitch Export] No messages found');
        return null;
      }

      const result = {
        projectId,
        projectTitle,
        timestamp: new Date().toISOString(),
        messages
      };

      console.log(`[Stitch Export] Extracted ${messages.length} messages`);
      return result;

    } catch (error) {
      console.error('[Stitch Export] Extraction error:', error);
      return null;
    }
  },

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

  /**
   * Extract all messages from the conversation
   * @returns {Array} Array of message objects
   */
  extractMessages() {
    const messages = [];
    const chatList = document.querySelector('[data-testid="chat-msg-list"]');

    // Strategy 1: Look for section elements within the chat list
    let messageElements = chatList
      ? Array.from(chatList.querySelectorAll('section'))
      : Array.from(document.querySelectorAll('section.flex.flex-col'));

    if (messageElements.length > 0) {
      console.log(`[Stitch Export] Found ${messageElements.length} section elements`);
    } else {
      // Fallback: Look for markdown divs directly
      console.log('[Stitch Export] No sections found, trying markdown divs...');
      const messageSelectors = [
        '.markdown',
        'div.markdown',
        '[class*="markdown"]'
      ];

      for (const selector of messageSelectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 0) {
          console.log(`[Stitch Export] Found ${elements.length} elements with selector: ${selector}`);
          messageElements = elements;
          break;
        }
      }
    }

    // If still no messages found, try fallback
    if (messageElements.length === 0) {
      console.log('[Stitch Export] No message containers found, trying fallback...');
      messageElements = this.fallbackMessageExtraction();
    }

    console.log(`[Stitch Export] Processing ${messageElements.length} message elements`);

    // Process each message element
    let lastUserMessageContent = '';

    for (let i = 0; i < messageElements.length; i++) {
      const element = messageElements[i];
      const message = this.extractMessageFromElement(element, i, lastUserMessageContent);

      if (message && message.content && message.content.trim()) {
        messages.push(message);
        console.log(`[Stitch Export] Extracted message ${i + 1} (${message.role}): ${message.content.substring(0, 50)}...`);

        // Update last user message content if this is a user message
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
    // Look for paragraphs within the main content area
    // This is a last resort and might need refinement
    const mainContent = document.querySelector('main') || document.body;
    const paragraphs = Array.from(mainContent.querySelectorAll('p'));

    // Filter paragraphs that look like messages (have substantial content)
    return paragraphs.filter(p => {
      const text = p.textContent.trim();
      return text.length > 10; // Arbitrary minimum length
    });
  },

  /**
   * Extract message data from a DOM element
   * @param {Element} element - DOM element containing message
   * @param {number} index - Index of the message in the list
   * @param {string} previousUserContent - Content of the previous user message
   * @returns {Object} Message object
   */
  extractMessageFromElement(element, index = 0, previousUserContent = '') {
    // Determine message role (user or assistant)
    const role = this.determineMessageRole(element, index);

    // Extract content
    const content = this.extractMessageContent(element, previousUserContent);

    // Try to extract timestamp if available
    const timestamp = this.extractTimestamp(element);

    return {
      role,
      content,
      timestamp: timestamp || new Date().toISOString()
    };
  },

  /**
   * Determine if message is from user or assistant
   * @param {Element} element - Message element
   * @param {number} index - Index in the message list
   * @returns {string} 'user' or 'assistant'
   */
  determineMessageRole(element, index = 0) {
    const elementText = element.textContent || '';
    const elementHTML = element.outerHTML.toLowerCase();
    const classNames = element.className.toLowerCase();
    const dataRole = element.getAttribute('data-role');

    // Explicit avatar checks
    if (element.querySelector('img[alt="Stitch avatar"]')) {
      return 'assistant';
    }
    if (element.querySelector('img[alt^="Profile image for"]')) {
      return 'user';
    }

    // Check for "Stitch" text in the header (indicates assistant message)
    const stitchIndicators = element.querySelectorAll('[alt="Stitch avatar"]');
    if (stitchIndicators.length > 0 || elementText.includes('Stitch')) {
      return 'assistant';
    }

    // Alternative: Check if text contains "Stitch" in the header area
    const headerDiv = element.querySelector('.flex.justify-between.items-center');
    if (headerDiv && headerDiv.textContent.includes('Stitch')) {
      return 'assistant';
    }

    // Check for Stitch avatar image
    if (elementHTML.includes('stitch-avatar')) {
      return 'assistant';
    }

    // Check data-role attribute
    if (dataRole) {
      if (dataRole.includes('user') || dataRole.includes('human')) return 'user';
      if (dataRole.includes('assistant') || dataRole.includes('ai') || dataRole.includes('bot') || dataRole.includes('stitch')) return 'assistant';
    }

    // Check class names
    if (classNames.includes('user') || classNames.includes('human') || classNames.includes('prompt')) {
      return 'user';
    }
    if (classNames.includes('assistant') || classNames.includes('ai') || classNames.includes('bot') || classNames.includes('response')) {
      return 'assistant';
    }

    // Check aria-label
    const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
    if (ariaLabel.includes('user')) return 'user';
    if (ariaLabel.includes('assistant') || ariaLabel.includes('ai') || ariaLabel.includes('stitch')) return 'assistant';

    // Default: Stitch typically alternates user/assistant messages
    // User messages usually come first (index 0, 2, 4...)
    // Assistant responses follow (index 1, 3, 5...)
    return index % 2 === 0 ? 'user' : 'assistant';
  },

  /**
   * Extract text content from message element
   * @param {Element} element - Message element
   * @param {string} previousUserContent - Content of the previous user message (for inferring filenames)
   * @returns {string} Message content
   */
  extractMessageContent(element, previousUserContent = '') {
    let content = '';

    // Try to get markdown content if available
    const markdownElement = element.querySelector('.markdown, [class*="markdown"]');
    if (markdownElement) {
      content = this.extractTextWithFormatting(markdownElement);
    } else {
      // Otherwise get all text content
      content = this.extractTextWithFormatting(element);
    }

    // Clean up Stitch-specific formatting
    // Remove "[Images generated by Stitch]:" section and profile/avatar image references
    // Pattern: [Images generated by Stitch]:\nImage 1: <url>\n\n---\n\n<actual message>
    content = content.replace(/\[Images generated by Stitch\]:[\s\S]*?---\s*/g, '');

    // Also remove standalone profile/avatar image URLs (lh3.googleusercontent.com/a/ are user avatars)
    content = content.replace(/https:\/\/lh3\.googleusercontent\.com\/a\/[^\s]+/g, '');

    // Clean up excessive whitespace left after removal
    content = content.replace(/\n{3,}/g, '\n\n').trim();

    // Check for design artifacts (images)
    // The user wants to reference the design filename.
    // Priority 1: Explicit title in the DOM (local)
    // Priority 2: Cross-reference by Image ID (find title in full-view elements)
    // Priority 3: Infer from previous user message

    // We look for .bg-design class OR images/backgrounds containing '/aida/' (Google User Content)
    const designElements = element.querySelectorAll('.bg-design, img[src*="/aida/"], [style*="/aida/"]');

    if (designElements.length > 0) {
      let referenceName = '';

      // Priority 1: Try to find explicit title locally
      const titleElement = element.querySelector('span.truncate');
      if (titleElement && titleElement.textContent.trim()) {
        const slug = this.slugify(titleElement.textContent);
        referenceName = `stitch_${slug}`;
      }
      else {
        // Priority 2: Cross-reference by Image ID
        // Try to find the title in other elements sharing the same image ID
        for (const designEl of designElements) {
          let url = designEl.getAttribute('src');
          if (!url) {
            const style = designEl.getAttribute('style');
            if (style) {
              // Handle both &quot; and regular quotes
              const urlMatch = style.match(/url\(&quot;([^&]+)&quot;\)/) ||
                style.match(/url\("([^"]+)"\)/) ||
                style.match(/url\('([^']+)'\)/) ||
                style.match(/url\(([^)]+)\)/);
              if (urlMatch) url = urlMatch[1];
            }
          }

          const imageId = this.extractImageId(url);
          if (imageId) {
            // Search for other images with this ID in the entire document
            const relatedImages = document.querySelectorAll(`img[src*="/aida/${imageId}"], [style*="/aida/${imageId}"]`);

            for (const relatedImg of relatedImages) {
              // Traverse up to find a container with span.truncate
              // We'll check a few levels up (e.g., 6 levels) to find the container holding the title
              let parent = relatedImg.parentElement;
              for (let i = 0; i < 6 && parent; i++) {
                const relatedTitle = parent.querySelector('span.truncate');
                if (relatedTitle && relatedTitle.textContent.trim()) {
                  const slug = this.slugify(relatedTitle.textContent);
                  referenceName = `stitch_${slug}`;
                  break;
                }
                parent = parent.parentElement;
              }
              if (referenceName) break;
            }
          }
          if (referenceName) break;
        }

        // Priority 3: Fallback to previous user message
        if (!referenceName && previousUserContent) {
          const slug = this.slugify(previousUserContent);
          referenceName = `stitch_${slug}`;
        }
      }

      // Append reference to content if we found a name
      if (referenceName) {
        content += `\n\n[Design Reference: ${referenceName}]`;
      }
    }

    return content;
  },

  /**
   * Extract Image ID from a URL
   * @param {string} url - URL to extract from
   * @returns {string|null} Image ID or null
   */
  extractImageId(url) {
    if (!url) return null;
    // Look for the ID after /aida/
    // e.g. .../aida/ANOJjBvDHkMPkL0sPm68gNZePFHg0VOLy0wXyD2ywDtM8gTUCQdRReS6AcVrIkMsn-2c7uqStgZw_iEOajE6poS-3xjOzFJVT9_LIbsN6NIhfPJlvHL_RM1-2j3VRu9LvFQXuJRs_--r_udjvcc93It2VYYh8M1fa1u4wsw1zcPpNjSyAnwZrLV_IgxY50eFitm7woU42Ie4xPNWL2_OyTQ49CwbCDxQHkXdzooQP-yQ9-E8oEbWz0n4vk-zfTo=s400
    const match = url.match(/\/aida\/([^/=]+)/);
    return match ? match[1] : null;
  },

  /**
   * Convert text to a slug for filenames
   * @param {string} text - Text to slugify
   * @returns {string} Slugified text
   */
  slugify(text) {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')     // Replace spaces with -
      .replace(/[^\w\-]+/g, '') // Remove all non-word chars
      .replace(/\-\-+/g, '_');  // Replace multiple - with single -
  },

  /**
   * Extract image URLs from message element
   * @param {Element} element - Message element
   * @returns {Array} Array of image URLs
   */
  extractImageReferences(element) {
    const images = [];

    // Look for image preview divs
    const imageContainers = element.querySelectorAll('[style*="background-image"]');

    imageContainers.forEach(container => {
      const style = container.getAttribute('style');
      // Extract URL from background-image style
      const urlMatch = style.match(/url\(&quot;([^&]+)&quot;\)/);
      if (urlMatch && urlMatch[1]) {
        images.push(urlMatch[1]);
      }
    });

    // Also look for regular img tags
    const imgTags = element.querySelectorAll('img:not([alt="Stitch avatar"])');
    imgTags.forEach(img => {
      const src = img.getAttribute('src');
      if (src && !src.includes('stitch-avatar')) {
        images.push(src);
      }
    });

    return images;
  },

  /**
   * Extract text while preserving some formatting
   * @param {Element} element - Element to extract from
   * @returns {string} Formatted text
   */
  extractTextWithFormatting(element) {
    // Use a simpler, more reliable approach
    // Process the element recursively to maintain structure

    const processNode = (node, depth = 0) => {
      let result = '';

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        // Only add non-empty text
        if (text.trim()) {
          result += text;
        }
        return result;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return result;
      }

      const tagName = node.tagName.toLowerCase();

      // Handle different HTML elements
      switch (tagName) {
        case 'p':
          // Paragraph - add double newline before and after
          if (node.textContent.trim()) {
            result += '\n\n' + Array.from(node.childNodes).map(child => processNode(child, depth)).join('');
          }
          break;

        case 'br':
          result += '\n';
          break;

        case 'ul':
        case 'ol':
          // List - process each list item
          result += '\n';
          Array.from(node.children).forEach(child => {
            if (child.tagName.toLowerCase() === 'li') {
              result += processNode(child, depth + 1);
            }
          });
          break;

        case 'li':
          // List item - add bullet point
          const listContent = Array.from(node.childNodes).map(child => processNode(child, depth)).join('').trim();
          if (listContent) {
            result += '\n- ' + listContent;
          }
          break;

        case 'strong':
        case 'b':
          // Bold - wrap with **
          const boldText = Array.from(node.childNodes).map(child => processNode(child, depth)).join('').trim();
          result += '**' + boldText + '**';
          break;

        case 'em':
        case 'i':
          // Italic - wrap with *
          const italicText = Array.from(node.childNodes).map(child => processNode(child, depth)).join('').trim();
          result += '*' + italicText + '*';
          break;

        case 'code':
          // Inline code - wrap with `
          const codeText = node.textContent;
          result += '`' + codeText + '`';
          break;

        case 'pre':
          // Code block - wrap with ```
          const preText = node.textContent;
          result += '\n```\n' + preText + '\n```\n';
          break;

        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          // Headings
          const level = parseInt(tagName[1]);
          const headingText = Array.from(node.childNodes).map(child => processNode(child, depth)).join('').trim();
          result += '\n\n' + '#'.repeat(level) + ' ' + headingText + '\n';
          break;

        default:
          // For other elements, just process children
          result += Array.from(node.childNodes).map(child => processNode(child, depth)).join('');
      }

      return result;
    };

    const text = processNode(element);

    // Clean up excessive newlines and trim
    return text
      .replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive newlines
      .trim();
  },

  /**
   * Extract timestamp from element if available
   * @param {Element} element - Message element
   * @returns {string|null} ISO timestamp or null
   */
  extractTimestamp(element) {
    // Look for time elements or timestamp data
    const timeElement = element.querySelector('time');
    if (timeElement) {
      const datetime = timeElement.getAttribute('datetime');
      if (datetime) return datetime;
    }

    // Look for data-timestamp attribute
    const dataTimestamp = element.getAttribute('data-timestamp');
    if (dataTimestamp) return dataTimestamp;

    return null;
  },

  /**
   * Check if we're on a Stitch project page
   * @returns {boolean} True if on a Stitch project page
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
