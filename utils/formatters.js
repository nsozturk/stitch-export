/**
 * Stitch Export Format Converters
 * Converts extracted conversation data to various LLM-compatible formats
 */

const StitchFormatters = {
  /**
   * Convert to Claude Code format
   * @param {Object} conversationData - Raw extracted conversation data
   * @returns {Object} Claude Code formatted data
   */
  toClaudeCodeFormat(conversationData) {
    if (!conversationData || !conversationData.messages) {
      throw new Error('Invalid conversation data');
    }

    return {
      conversation: {
        title: conversationData.projectTitle || 'Stitch Export',
        created_at: conversationData.timestamp,
        updated_at: conversationData.timestamp,
        messages: conversationData.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        }))
      },
      metadata: {
        source: 'stitch.withgoogle.com',
        project_id: conversationData.projectId,
        export_date: new Date().toISOString(),
        format: 'claude_code',
        message_count: conversationData.messages.length,
        exporter_version: '1.0.0'
      }
    };
  },

  /**
   * Convert to OpenAI ChatGPT format
   * @param {Object} conversationData - Raw extracted conversation data
   * @returns {Object} OpenAI ChatGPT formatted data
   */
  toOpenAIFormat(conversationData) {
    if (!conversationData || !conversationData.messages) {
      throw new Error('Invalid conversation data');
    }

    return {
      messages: conversationData.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      metadata: {
        source: 'stitch.withgoogle.com',
        project_id: conversationData.projectId,
        project_title: conversationData.projectTitle,
        export_date: new Date().toISOString(),
        format: 'openai_chat',
        message_count: conversationData.messages.length,
        exporter_version: '1.0.0'
      }
    };
  },

  /**
   * Convert to simple JSON format (basic backup)
   * @param {Object} conversationData - Raw extracted conversation data
   * @returns {Object} Simple JSON formatted data
   */
  toSimpleFormat(conversationData) {
    if (!conversationData || !conversationData.messages) {
      throw new Error('Invalid conversation data');
    }

    return {
      project: {
        id: conversationData.projectId,
        title: conversationData.projectTitle,
        url: window.location.href,
        export_date: new Date().toISOString()
      },
      conversation: conversationData.messages,
      stats: {
        total_messages: conversationData.messages.length,
        user_messages: conversationData.messages.filter(m => m.role === 'user').length,
        assistant_messages: conversationData.messages.filter(m => m.role === 'assistant').length
      }
    };
  },

  /**
   * Format conversation data based on selected format type
   * @param {Object} conversationData - Raw extracted conversation data
   * @param {string} formatType - Format type ('claude', 'openai', or 'simple')
   * @param {string} formatType - Format type ('claude', 'openai', 'simple', or 'custom')
   * @param {Object} options - Optional formatting options, especially for 'custom' format
   * @returns {Object} Formatted data
   */
  format(conversationData, formatType = 'claude', options = {}) {
    switch (formatType.toLowerCase()) {
      case 'claude':
      case 'claude_code':
        return this.toClaudeCodeFormat(conversationData);

      case 'openai':
      case 'chatgpt':
      case 'openai_chat':
        return this.toOpenAIFormat(conversationData);

      case 'simple':
      case 'json':
        return this.toSimpleFormat(conversationData);

      case 'custom':
        return this.toCustomFormat(conversationData, options);

      default:
        console.warn(`Unknown format type: ${formatType}, defaulting to Claude Code format`);
        return this.toClaudeCodeFormat(conversationData);
    }
  },

  /**
   * Generate filename for export
   * @param {Object} conversationData - Conversation data
   * @param {string} formatType - Format type
   * @returns {string} Filename
   */
  generateFilename(conversationData, formatType) {
    const projectId = conversationData?.projectId || 'unknown';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const format = formatType.toLowerCase().replace('_', '-');

    return `stitch-export-${projectId}-${format}-${timestamp}.json`;
  },

  /**
   * Validate conversation data structure
   * @param {Object} conversationData - Data to validate
   * @returns {boolean} True if valid
   */
  validate(conversationData) {
    if (!conversationData) {
      console.error('Conversation data is null or undefined');
      return false;
    }

    if (!Array.isArray(conversationData.messages)) {
      console.error('Messages is not an array');
      return false;
    }

    if (conversationData.messages.length === 0) {
      console.error('No messages found');
      return false;
    }

    // Validate each message
    for (const msg of conversationData.messages) {
      if (!msg.role || !msg.content) {
        console.error('Invalid message structure:', msg);
        return false;
      }

      if (!['user', 'assistant', 'system'].includes(msg.role)) {
        console.warn('Unexpected message role:', msg.role);
      }
    }

    return true;
  },

  /**
   * Get format information
   * @param {string} formatType - Format type
   * @returns {Object} Format metadata
   */
  getFormatInfo(formatType) {
    const formats = {
      claude: {
        name: 'Claude Code Format',
        description: 'Structured format compatible with Claude Code conversation exports',
        extension: '.json',
        mimeType: 'application/json'
      },
      openai: {
        name: 'OpenAI ChatGPT Format',
        description: 'Format compatible with OpenAI Chat Completion API',
        extension: '.json',
        mimeType: 'application/json'
      },
      simple: {
        name: 'Simple JSON Format',
        description: 'Basic JSON format for backup and custom processing',
        extension: '.json',
        mimeType: 'application/json'
      }
    };

    return formats[formatType.toLowerCase()] || formats.claude;
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StitchFormatters;
}

if (typeof window !== 'undefined') {
  window.StitchFormatters = StitchFormatters;
}
