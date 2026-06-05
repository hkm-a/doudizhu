# Changelog - v0.3.0

**Released:** 2026-06-05T21:34:02Z
**Theme:** Presentation Pass

## Delivered mechanics

- [v0.3.0-M1] Presentation pass: improved card spacing, selected-card visual feedback, AI active-turn highlight, panel/card contrast, and result banner presentation without changing rules.
- [v0.3.0-M2] Responsive desktop layout: kept the main table readable at 1280x720, 1366x768, and 1600x900 with non-overlapping table bands.
- [v0.3.0-M3] Visual QA references: captured launch, selected-card, and result screenshots under `e2e/screenshots/scene_main/`.

## Added systems / scenes / assets

- Updated `src/main.gd` table projection layout and procedural card/control styling.
- Added v0.3.0 e2e coverage for presentation layout, responsive result layout, and visual QA reference files.
- Added v0.3.0 screenshot assets for initial, selected-card, and result states.
- Updated planning, scene, asset, structure, and memory documentation for the presentation pass.

## Refactored from prior tags

- Reworked Main scene UI projection from earlier tags to support clearer spacing, selected-card feedback, active-seat/result presentation, and multiple desktop resolutions.

## Known limitations

- v0.3.0 uses procedural presentation polish and static selection feedback; broader animation/audio polish remains deferred to later roadmap tags.
