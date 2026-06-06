# Scenes: Doudizhu

**Tag:** v0.5.0
**Theme:** Audio And Finish

## Scene List

| Scene | Path | Purpose | Current Tag Changes |
|-------|------|---------|---------------------|
| Main | `scenes/main.tscn` / procedural Main UI | Complete Doudizhu table, help, summary, result, replay | Add compact audio/settings controls, optional settings overlay, restart/quit affordance, and audio debug hooks |

## Main Scene Layout

v0.5.0 keeps the v0.4.0 table composition and adds only compact finish controls.

| Region | Anchor / Placement | Current Contents | v0.5.0 Additions | Constraint |
|--------|--------------------|------------------|------------------|------------|
| Top/side panels | existing AI panel bands | AI roles, counts, recent play/reason | no required change | Must stay readable at 1280x720 |
| Center table | existing trick/status area | current trick, bottom cards, status | sound-triggered status may remain text-only | Do not cover trick cards |
| Summary/status band | above action/hand area | hand summary, status | no required change | Summary remains compact |
| Action bar | bottom-right above hand | Call/Decline/Play/Pass/Hint/Help | Settings/Audio button if it fits | Buttons remain reachable and non-overlapping |
| Settings overlay/panel | small modal or anchored panel | not present before v0.5.0 | SFX toggle, Music toggle, optional volume preset, Close | Must clamp inside viewport and preserve round state |
| Result banner | center overlay | win/loss, New Round | restart/quit affordance if not already covered | Result/replay remains prominent |
| Player hand | bottom-center | sorted cards, selection lift/highlight | select SFX only; no layout change | All cards remain visible/fanned |

## Interaction Flows

### [v0.5.0-M1] Action SFX

1. Player clicks a card.
2. Main toggles card selection and requests `select` SFX.
3. Player clicks Play/Pass or attempts invalid play.
4. Main/game state changes as before and requests `play`, `pass`, or `invalid` SFX.
5. On landlord assignment and result, Main requests the matching semantic SFX.

### [v0.5.0-M2] Optional Music

1. Player opens Settings/Audio.
2. Player toggles Music.
3. Quiet loop starts/stops or mutes/unmutes immediately.
4. Closing settings returns to the same round state.

### [v0.5.0-M3] Audio Settings

1. Player opens Settings/Audio.
2. Player toggles SFX/Music or chooses volume preset if implemented.
3. UI reflects state immediately.
4. Subsequent actions respect the setting.

### [v0.5.0-M4] Restart/Quit Flow

1. Player reaches result or opens settings/help action area.
2. New Round/Restart resets the round without stale selected cards, trick state, or audio setting loss.
3. Quit is visible as a clear exit affordance if implemented; in headless/e2e it may expose a safe `request_quit` state instead of terminating the test process.

## Asset Bindings

| Element | Asset Row / Path | Runtime Size | Contract |
|---------|------------------|--------------|----------|
| SFX feedback | procedural_audio_sfx / procedural | short event streams | Distinct event feedback, testable without speakers |
| Quiet music | procedural_audio_music / procedural | low-volume loop | Optional and lower priority than SFX |
| Settings controls | procedural_panels_buttons / procedural | compact panel/button set | Readable labels, immediate toggle feedback |
| Restart/quit controls | procedural_panels_buttons / procedural | existing result/action scale | Clear and non-overlapping |

## Acceptance Criteria

- Main launches into a playable hand with all inherited UI visible.
- Settings/Audio can be opened and closed without changing round state.
- SFX and music toggles visibly update and affect subsequent audio event state.
- Select/play/pass/invalid/result actions remain fast and trigger observable audio events.
- Restart/New Round clears gameplay state while preserving audio setting state for the scene/session.
- No v0.5.0 control overlaps cards, summary, status, help, AI panels, or result banner at supported desktop sizes.