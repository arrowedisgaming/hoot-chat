# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Daggerheart Duality Roll**: `/duality` (alias `/dh`) command for 2d12 Hope/Fear action rolls with advantage/disadvantage, Experience dice, and labels. Includes `/hope` and `/fear` single-die variants. Outcome badges (Hope/Fear/Critical) with color-coded display and crit Stress reminder.
- **Saved Commands (Aliases)**: `/alias`, `/aliases`, `/unalias` commands for per-player stored command shortcuts. Aliases expand once on invocation (no recursion). Supports up to 50 aliases per player with validation.
- **Dice+ Integration**: Optional per-player routing of `/roll` and `/duality` commands through the Dice+ 3D dice extension. Toggle with `/dicePlus on|off|status`. Graceful fallback when Dice+ is not installed.
- **System message formatting**: confirmations, errors, and informational notices render with kind-keyed styling (`success`, `error`, `info`).
- Plain TypeScript test files for duality roll parsing, alias validation/expansion, Dice+ result conversion, the local-only system messages helpers (`test/systemMessages.test.ts`), and closed-panel notification behavior (`test/backgroundNotifications.test.ts`).

### Changed

- **Closed-panel notifications skip Dice+ rolls**: rolls routed through Dice+ already surface their own 3D dice for everyone, so they no longer raise a redundant chat notification popover when the panel is closed. Other players' text and locally-rolled messages still notify as before. Roll messages now carry an optional `source: "dicePlus"` marker, and the notification gate is extracted into a pure, unit-tested `shouldNotify` helper (`src/notify.ts`).

### Fixed

- **Dice+ rolls never posted a value to chat**: command rolls (`/roll`, `/power`, `/duality`, `/hope`, `/fear`) routed through Dice+ rendered the 3D dice but produced no chat message. A refactor had rewired chat publication to the built-in Owlbear dice-tray metadata (`rodeo.owlbear.dice/rollValues`), but Dice+ returns results on its documented `com.hootchat/roll-result` broadcast channel — which it no longer listened to — so the chat path never fired. Restored the result-channel listener (`registerDicePlusListeners` + `sendDicePlusRoll`) while keeping the `source: "dicePlus"` marker and the shared `buildDicePlusDualityData` reconstruction helper.
- **Notification popover 404 on GitHub Pages**: the background script opened the notification popover at the hardcoded site root (`/notification.html`), which does not exist under the `/hoot-chat/` Pages base path. The URL is now built from the Vite base (`import.meta.env.BASE_URL`) via `buildNotificationUrl`, so it resolves correctly in both local and Pages deployments.
- **System message leak into persisted history**: confirmations and errors from `/alias`, `/unalias`, `/dicePlus`, and Dice+ failures were being persisted to room metadata when emitted by the player with the lowest player ID, then rebroadcast to all players on reload. System messages now live in a separate, local-only state (mirroring the existing `/help` pattern) and never reach `OBR.room.setMetadata` or any broadcast channel.
