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
| v0.8.0 | Card faces (54 cards + 2 jokers) | Image | GENERATED | AI-generated card art via Agnes API | 200x300px, 56 files, assets/img/card_*.png |
| v0.8.0 | Card back | Image | GENERATED | AI-generated card back via Agnes API | 200x300px, 1 file, assets/img/card_back.png |
| v0.8.0 | Table background | Image | GENERATED | AI-generated green felt texture via Agnes API | 1920x1080px, 1 file, assets/img/table_bg.png |
| v0.8.0 | Bomb explosion | Image | GENERATED | Particle effect sprite via Agnes API | 256x256px, 1 file, assets/img/bomb_explosion.png |
| v0.8.0 | Joker bomb explosion | Image | GENERATED | Red particle effect sprite via Agnes API | 256x256px, 1 file, assets/img/joker_bomb_explosion.png |
| v0.8.0 | SFX rework (select, play, pass, invalid, bomb, joker, result, save) | Audio | DEFERRED | Retooled SFX matching new visual polish | User-provided or AI-generated |

## Missing Assets

v0.8.0 audio SFX: User must provide retooled sound effects (select, play, pass, invalid, bomb, joker bomb, result, save/load).

## Notes

- Reuse the existing procedural UI style and audio assets from earlier tags.
- If future tutorial icons, badges, or illustrations are requested, add explicit MISSING rows with tag `v0.7.0` before generating or importing them.
