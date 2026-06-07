# Changelog — v0.7.0

**Released:** 2026-06-07
**Theme:** Guided Onboarding And Accessibility

## Delivered mechanics

- [v0.7.0-M1] Guided tutorial overlay: step-based overlay with Next/Back/Close, covering landlord selection, card selection, legal play, pass, hint, scoring, and match progression
- [v0.7.0-M2] Contextual action coach: status guidance highlights player's current legal options during play
- [v0.7.0-M3] Keyboard accessibility: core buttons reachable by shortcuts (T/F1/H/P/N/Space/B/Left/Right), shortcut labels in help/tutorial
- [v0.7.0-M4] Persistent session statistics: hands played, matches, wins, best score — viewable and resettable from UI

## Added systems / scenes / assets

- Tutorial overlay panel with navigation and keyboard shortcuts
- Stats panel with Reset Stats button
- Modal blocker pattern for tutorial (consistent with help/settings blockers)
- ComfyUI backend for asset generation with proxy bypass and checkpoint auto-detection
- 6 new unit tests + 14 E2E tests

## Known limitations

- Reference screenshots for scene_main are missing (regenerate via /gm-asset step 3)
