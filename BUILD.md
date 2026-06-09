# Build Log

## 2026-06-07 - v0.8.0 Release

- Implemented v0.8.0 features: card animations, particle effects, improved AI, localization, save/load, asset replacement.
- Fixed bottom cards area bug: HBoxContainer stretched card buttons vertically from 108 to 120 pixels, causing card image distortion. Added `size_flags_vertical = SIZE_SHRINK_BEGIN` to `_card_button`.
- Verified: e2e card tests 7/7 passed; all card sizes at correct 78x108.
- Exported Windows desktop exe via Godot headless export.

## 2026-06-05 - v0.4 Build

- Implemented low-cost move scoring, richer hint status, AI reason text, hand summary, and in-scene rules help.
- Added focused gdUnit coverage for candidate scoring, hint text, AI reason text, and hand summary.
- Added e2e coverage for help modal open/close.
- Verification: headless Godot build passed; gdUnit4 19/19 passed; e2e 16/16 passed.
## 2026-06-06 - v0.5 Build

- Added procedural `AudioController` for semantic SFX/music events with mute, music, volume, and debug state.
- Integrated select/play/pass/invalid/landlord/result/restart audio events into Main.
- Added compact Audio settings controls and a Quit affordance on the result banner.
- Added gdUnit coverage for audio event history, mute/music, volume, and bounded history.
- Verification: headless build passed; `tools/run_verify.py` passed with gdUnit 23/23; existing e2e suite passed 19/19.
