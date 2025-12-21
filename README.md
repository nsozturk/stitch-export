# Stitch Export - Chrome Extension

Export Stitch conversations from https://stitch.withgoogle.com as JSON in LLM-friendly formats.

## Features

- Export to Claude Code or OpenAI ChatGPT formats
- Export via toolbar popup, in-page header button, or context menu
- Adds an Export button directly to the Stitch project header
- Local-only processing (no data leaves your browser)

## Screenshots

![Popup with export formats](assets/screenshot_1.png)

![Export success and JSON output](assets/screenshot_2.png)

## Installation (Developer Mode)

1. Open `chrome://extensions/`
2. Enable Developer Mode (top-right)
3. Click "Load unpacked"
4. Select this folder (`stitch-export-extension`)

## Usage

### Popup
1. Open a Stitch project page: `https://stitch.withgoogle.com/projects/{PROJECT_ID}`
2. Click the Stitch Export icon
3. Choose a format and export

### In-page button
1. Open a Stitch project page
2. Click the "Export" button in the header
3. Choose a format and export

### Context menu
1. Right-click on a Stitch project page
2. Select "Export Stitch Conversation"

## Export Formats

### Claude Code (example)
```json
{
  "conversation": {
    "title": "Project Title",
    "created_at": "2025-11-27T...",
    "updated_at": "2025-11-27T...",
    "messages": [
      {"role": "user", "content": "...", "timestamp": "..."},
      {"role": "assistant", "content": "...", "timestamp": "..."}
    ]
  },
  "metadata": {
    "source": "stitch.withgoogle.com",
    "project_id": "...",
    "export_date": "...",
    "format": "claude_code"
  }
}
```

### OpenAI ChatGPT (example)
```json
{
  "messages": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "metadata": {
    "source": "stitch.withgoogle.com",
    "project_id": "...",
    "export_date": "...",
    "format": "openai_chat"
  }
}
```

## Permissions

- `activeTab` and `scripting`: read the Stitch page content
- `contextMenus`: add a right-click export option
- `downloads`: save the JSON export
- Host permission for `https://stitch.withgoogle.com/*`

## Privacy

- No data is sent to external servers
- All processing stays in the browser
- Exports are saved locally

## Development

No build step required. Load the folder in Developer Mode and refresh the Stitch page after changes.

## License

MIT. See `LICENSE`.

## Disclaimer

Unofficial extension and not affiliated with Google or Stitch.
