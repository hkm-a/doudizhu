# Changelog: v0.8.0

## [0.8.0] — Animation, AI, Localization & Save

> **Release date:** 2026-06-09

A major polish update introducing visual animations, smarter AI opponents, bilingual UI, persistent save/load, and AI-generated card art.

### Added
- Card flight animations (200-400ms) when playing cards, with selection bounce/elevation effect
- Bomb and joker bomb particle explosion effects on the trick area (red explosion for joker bombs)
- Improved AI with two difficulty levels: Normal (basic strategy) and Hard (card memory, farmer coordination, bomb management)
- Full Chinese (Simplified) and English localization with auto-detect and manual language toggle in settings
- Save/load game state to JSON — persists hands, trick, phase, scores, statistics, and user settings
- AI-generated card faces (54 cards + 2 jokers), card back, and table background via ComfyUI (NetaYume model)
- Bomb explosion particle sprites (`bomb_explosion.png`, `joker_bomb_explosion.png`)

### Changed
- Replaced procedural card rendering with AI-generated card images
- Replaced procedural table background with AI-generated green felt texture
- Enhanced AI decision-making: Hard AI tracks seen cards, coordinates as farmers, and plays strategically with bombs

### Skipped
- Audio rework (M06) — SFX files not available; procedural audio remains unchanged

### Fixed
- Fixed ComfyUI asset import issues for card and texture assets
