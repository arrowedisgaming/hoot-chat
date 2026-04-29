# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Daggerheart Duality Roll**: `/duality` (alias `/dh`) command for 2d12 Hope/Fear action rolls with advantage/disadvantage, Experience dice, and labels. Includes `/hope` and `/fear` single-die variants. Outcome badges (Hope/Fear/Critical) with color-coded display and crit Stress reminder.
- **Saved Commands (Aliases)**: `/alias`, `/aliases`, `/unalias` commands for per-player stored command shortcuts. Aliases expand once on invocation (no recursion). Supports up to 50 aliases per player with validation.
- **Dice+ Integration**: Optional per-player routing of `/roll` and `/duality` commands through the Dice+ 3D dice extension. Toggle with `/dicePlus on|off|status`. Graceful fallback when Dice+ is not installed.
- Plain TypeScript test files for duality roll parsing, alias validation/expansion, and Dice+ result conversion.

### Fixed

- **System message leak into persisted history**: confirmations and errors from `/alias`, `/unalias`, `/dicePlus`, and Dice+ failures were being persisted to room metadata when emitted by the player with the lowest player ID, then rebroadcast to all players on reload. System messages now live in a separate, local-only state (mirroring the existing `/help` pattern) and never reach `OBR.room.setMetadata` or any broadcast channel.
