# Changelog

All notable changes to Stitch Export. Versions follow the `version` field in `manifest.json`.

## 1.3.0 — 2026-10-29

Verified end to end on a live account with 117 projects, 1,294 chat turns and 1,369 screens:
every screen the official Stitch API lists (1,327 of 1,327) is now in the ZIP.

### Added
- **Export This Project (ZIP)** on a project page, in the popup and in the in-page Export dialog
  ("Export ZIP (with images)"). One ZIP with the project's screens, image screens, a full-size
  picture of every HTML screen, design systems, chat history and the conversation.
- **Formatted conversation in every ZIP**: each project folder gets `conversation.<format>.json`
  in the format picked in the popup (Claude Code, OpenAI ChatGPT or Custom). Before, the format
  only changed the ZIP file name.
- **Format picker on the Stitch dashboard**, so Export All can use any format.
- **Design systems**: design-system turns are exported as `design-systems/turn-NNN-<name>.md`
  (DESIGN.md), with name and color tokens kept in `chat.json`.
- Batch progress view explains that the export can take a few minutes, that the background Stitch
  tab must stay open, and that closing the popup is safe.

### Fixed
- **Missing projects**: the project list parser skipped titles with special characters (such as
  `&`) and untitled projects — 9 of 117 projects were never exported.
- **Missing chat replies**: 42 assistant replies stored in a second response shape and 88
  design-system turns were exported empty.
- **Missing image screens**: screens that are generated images (no HTML file) were dropped —
  103 screens. They are now saved as the image itself, at original resolution instead of the
  286 px preview.
- **Export All did nothing after Cancel**: a cancel during start-up left the run stuck, and the
  popup stayed on "Cancelled by user".
- **Custom JSON format** threw an error: its formatter was never implemented.
- The dashboard showed a "Not on Stitch" warning although Export All works there.
- Popup footer showed `v1.0.0`; it now reads the version from the manifest. Exported JSON
  `exporter_version` does the same.
- A single failed download no longer drops a file silently: downloads retry once, and a failed
  screenshot never drops its HTML screen.

## 1.2.0 — 2026-05-15

- Batch export rewritten on Stitch's own API: about 30 seconds for 70+ projects (24× faster).
- One background tab, 10 parallel API calls, 6 parallel HTML downloads.
- Rich chat export: generated screens and follow-up suggestions per turn.
- New ZIP layout: `screens/`, `history/turn-NNN-*/`, `chat.json`.
- Toolbar badge with the project count; refreshed icons.

## 1.1.0

- Batch export of all projects (UI automation).

## 1.0.0

- Initial public release: export a Stitch conversation to Claude Code or OpenAI JSON.
