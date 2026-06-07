# Assets: v0.7.0 Guided Onboarding And Accessibility

| Tag | Asset | Type | Status | Purpose | Notes |
|-----|-------|------|--------|---------|-------|
| v0.1.0 | Procedural card faces | Procedural UI | READY | Display playing cards | Replaced by AI-generated images in v0.8.0 |
| v0.1.0 | Procedural card back | Procedural UI | READY | AI hidden cards | Replaced by AI-generated image in v0.8.0 |
| v0.1.0 | Table background | Procedural UI | READY | Green felt table surface | Replaced by AI-generated image in v0.8.0 |
| v0.3.0 | Card selection animation | Animation | READY | Visual feedback for card selection | Enhanced in v0.8.0 with bounce effect |
| v0.5.0 | SFX (select, play, pass, invalid, result) | Audio | READY | Audio feedback for actions | Reworked in v0.8.0 to match new visual style |
| v0.6.0 | Score summary UI | Procedural UI | READY | Display cumulative match score | Unchanged |
| v0.7.0 | Tutorial panel | Procedural UI | READY | Display guided onboarding steps | Unchanged |
| v0.7.0 | Stats panel | Procedural UI | READY | Display lifetime/session statistics | Unchanged |
| v0.7.0 | Shortcut labels | Text | READY | Explain keyboard-accessible actions | Unchanged |
| v0.8.0 | Card faces (54 cards + 2 jokers) | Image | MISSING | AI-generated card art via ComfyUI | NetaYume model, 200x300px, 56 files |
| v0.8.0 | Card back | Image | MISSING | AI-generated card back via ComfyUI | 200x300px, 1 file |
| v0.8.0 | Table background | Image | MISSING | AI-generated green felt texture via ComfyUI | 1280x720px, 1 file |
| v0.8.0 | Bomb explosion | Image | MISSING | Particle effect sprite for regular bombs | 128x128px, 1 file |
| v0.8.0 | Joker bomb explosion | Image | MISSING | Red particle effect sprite for joker bombs | 128x128px, 1 file |
| v0.8.0 | SFX rework (select, play, pass, invalid, bomb, joker, result, save) | Audio | DEFERRED | Retooled SFX matching new visual polish | User-provided or AI-generated |

## Missing Assets

No bitmap, audio, or external art assets are required for v0.7.0.

## Notes

- Reuse the existing procedural UI style and audio assets from earlier tags.
- If future tutorial icons, badges, or illustrations are requested, add explicit MISSING rows with tag `v0.7.0` before generating or importing them.
