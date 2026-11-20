# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project uses [Semantic Versioning](https://semver.org/).

## [1.2.0] - 2026-11-20

First public release.

### Added

- Dockable CEP panel for Premiere Pro (`Window > Extensions > OpenCode`).
- Streaming chat against the local OpenCode service, including thinking
  blocks, text deltas, tool calls and live plan cards.
- Inline question forms with string, number, integer, boolean, multiselect,
  external-link and conditional (`when`) fields.
- Inline permission prompts with Allow once / Always / Deny.
- Premiere project awareness: project name and path, active sequence,
  sequence list with frame rates, and the project panel bin/clip tree.
  Click any item to insert its name into the message.
- Automatic project-folder following (`app.project.path`) with a manual
  override in Settings.
- Optional project-context chip that prefixes each message with a short
  project summary.
- Session sidebar with date grouping and search, per-folder history.
- Model picker, slash commands (`/init`, `/undo`, ...), stop button,
  token/cost status line.
- Change browser for the current session (per-file diffs), file browser and
  reveal-in-explorer helpers.
- `install.ps1` (junction + CEP `PlayerDebugMode`), `uninstall.ps1` and
  `build.ps1` for release packaging.

### Fixed

- Busy state is derived from the last message, so Send/Stop no longer stick.
- Deltas arriving after a mid-stream resync are patched into loaded messages
  instead of being dropped.
- Optimistic user messages are deduplicated against the server echo.
- Question cards refresh from the server instead of merging stale forms.
- Form validation honours min/max, minItems/maxItems, length and pattern.
- Only the newest `todowrite` call renders as a plan card.
- Failed tool calls show the error message in the tool card.
- Slash commands no longer receive the project context as their arguments.
- Changes sheet shows a clear message when there is no session yet.
