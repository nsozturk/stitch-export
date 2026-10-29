# AGENTS.md — Stitch Export

Contract for coding agents (Claude Code, Codex, Gemini CLI, Cursor, Antigravity, OpenCode) working
on this repository.

Stitch Export is a free, open-source Chrome extension for Google Stitch that exports every project —
screens, images, design systems and the full chat history — to ZIP archives and LLM-ready JSON
(Claude, ChatGPT), locally in your browser.

## Layout

| Path | Role |
|---|---|
| `manifest.json` | MV3 manifest. `version` is the single source of the version number. |
| `background.js` | Service worker: batch / single-project ZIP pipeline, badge, context menu. Loads `libs/jszip.min.js` and `utils/formatters.js` with `importScripts`. |
| `content.js` | Injected on Stitch pages: Export Chat button and dialog (JSON or ZIP). |
| `popup/` | Popup UI: format picker, Export Conversation / This Project / All Projects, progress, cancel. |
| `utils/extractor.js` | Single-conversation extraction from the page (used by Export JSON). |
| `utils/formatters.js` | Claude Code / OpenAI / Custom / simple formatters (shared by page and service worker). |
| `utils/downloader.js` | JSON download + toast notifications in the page. |
| `docs/index.html` | GitHub Pages portal. `docs/stores/` is the Chrome Web Store launch guide. |

No build step, no npm dependencies.

## Stitch internals the export depends on

All calls are `POST /_/Nemo/data/batchexecute?rpcids=<id>&f.sid=<FdrFJe>&rt=c` from a logged-in
`stitch.withgoogle.com` tab, with `at=<SNlM0e>` (both tokens read from the page HTML). Responses are
`rt=c` chunks; the line starting with `[["wrb.fr","<id>"` holds a JSON string at `[0][2]`.

| RPC | Returns | Notes |
|---|---|---|
| `A7f2qf` | Project list: `inner[0]` = `[["projects/<id>", title\|null, …], …]` | Parse JSON, never regex: titles contain escapes and can be `null`. |
| `ErneX` | Final screens of a project: `inner[0]` = screen instances | `sc[1][2]` HTML URL (contribution.usercontent.google.com) may be missing: those are image-only screens; `sc[0][2]` is the lh3 image URL. |
| `dNS8Mc` | Chat turns (`…/sessions/<id>` entries) | Text at `turn[4][1][1]` **or** `turn[4][0][1]`; design system at `turn[4][0][3]` = `["assets/<id>", null, [name, null, markdown\|null, tokens]]`; generated screens at `turn[4][0][0][0]`. |

lh3 image URLs without a size suffix return a 286 px preview; append `=s0` for the original.

## Verifying a change

1. `node --check background.js content.js popup/popup.js utils/*.js`
2. Load unpacked at `chrome://extensions`, press ↻ after every change, refresh Stitch tabs.
3. Run Export All and a single-project ZIP, then check the ZIP: project count equals the dashboard
   count, `chat.json` turn count, every `file` reference exists, images are full size, and every
   `conversation.<format>.json` parses. Compare screen ids with the official Stitch MCP API
   (`list_screens`) when available.

Silent drops are the main failure mode of this codebase: measure counts against ground truth instead
of trusting that "it exported".

## Rules

- Keep processing local: no new hosts, analytics or remote code. A new host permission is a Chrome
  Web Store review risk; justify it in `docs/stores/ChromeWebStore/06-privacy-permissions/`.
- Bump `manifest.json` `version` and add a `CHANGELOG.md` entry for every Store upload.
- English for code, comments, docs and commit messages.
- Never commit exported ZIPs, `tmp/` or debug scratch files (see `.gitignore`).
