# Plan: Doudizhu

**Tag:** v0.5.0
**Theme:** Audio And Finish
**Status:** GDD/planning complete; ready for asset/build pipeline.

## Tag Mechanics

- [v0.5.0-M1] Audio feedback: card select, legal play, pass, invalid play, landlord assignment, and result states produce concise sound feedback without delaying gameplay.
- [v0.5.0-M2] Optional quiet music: a low-volume looping table ambience/music layer can be toggled independently from sound effects and never masks card/action feedback.
- [v0.5.0-M3] Audio settings: the player can mute/unmute effects and music, adjust volume presets if feasible, and the choice applies immediately during the current hand.
- [v0.5.0-M4] Restart/quit flow and final consistency: result/replay, restart, and quit affordances are clear; final layout/accessibility/test coverage remains stable across the complete shipped mechanic set.

## Inherited Mechanics

- [v0.4.0-M1] Lower-cost Hint selection with status rationale remains legal and useful.
- [v0.4.0-M2] Improved AI choice policy and concise AI reason text remain visible.
- [v0.4.0-M3] Hand summary remains readable and updates during play.
- [v0.4.0-M4] Rule/help affordance remains openable, readable, and closable without losing game state.
- [v0.3.0-M1] Presentation pass remains intact: card spacing, selected-card feedback, active-turn highlight, panel/card contrast, and result banner presentation.
- [v0.3.0-M2] Responsive desktop layout remains readable at 1280x720, 1366x768, and 1600x900 without overlapping AI panels, trick/status/action bands, summary/help UI, or player hand.
- [v0.3.0-M3] Visual QA reference screenshots remain available for launch, selected-card, and result states.
- [v0.2.0-M1] Expanded non-special combinations work through Play, Hint, and AI candidate search.
- [v0.1.0-M1..M8] Round setup, landlord selection, card selection, core legal play, pass flow, Hint, AI turns, result, and replay remain playable and covered by inherited tests.

## Playable Unit

- **Player experience:** Launch the polished desktop prototype, play a complete hand with readable cards/help/summary, hear immediate feedback for select/play/pass/invalid/result events, optionally toggle quiet music/effects, and restart or quit cleanly.
- **Unit outcome:** The full Doudizhu prototype feels finished enough for local desktop play: complete hand loop, usable assistance, audio feedback, settings, replay, and final consistency checks all work together.
- **Scenes involved:** Main

| Mechanic | Player operation / content | Expected effect | Required visible/audible content | Evidence |
|----------|----------------------------|-----------------|----------------------------------|----------|
| [v0.5.0-M1] | Select cards, play, pass, attempt invalid play, finish a hand | Each action triggers the appropriate short SFX and no sound blocks turn progression | SFX bus activity/test hook, unchanged visible state transitions | gdUnit audio event tests + e2e action-flow test |
| [v0.5.0-M2] | Toggle music while playing | Quiet loop starts/stops or mutes/unmutes immediately and stays below SFX priority | Music toggle state, optional bus/test hook | gdUnit + e2e settings test |
| [v0.5.0-M3] | Change audio settings during a hand | Effects/music preferences apply immediately and persist for the current scene/session | Settings controls, status or button state feedback | gdUnit + e2e settings test |
| [v0.5.0-M4] | Use result replay, restart, and quit/help/settings affordances | Player can restart without stale state and quit/exit flow is clear; inherited UI remains readable | Result/restart/quit controls, no overlap at desktop sizes | e2e full-loop and layout regression tests |

## Risk Tasks

### 1. Audio must be testable without relying on speakers
- **Why isolated:** Headless CI cannot prove audible output by listening.
- **Approach:** Route all game audio requests through a small audio controller with observable debug state/event history and Godot audio bus configuration.
- **Verify:** gdUnit checks event names, mute/music state, volume application, and no duplicate spam for repeated selection toggles.

### 2. Audio controls must not crowd the v0.4.0 UI
- **Why isolated:** Summary/help/action controls already use the bottom/status bands.
- **Approach:** Add compact Settings/Audio controls inside the existing action/help area or a small settings overlay; clamp text and keep default view minimal.
- **Verify:** e2e checks 1280x720 and result/play states for non-overlap.

### 3. Final polish must not change shipped rules
- **Why isolated:** v0.5.0 is a finish tag, not a rules expansion.
- **Approach:** Keep `CardRules.classify` and `CardRules.can_beat` as untouched legality gates except for tests proving no regression.
- **Verify:** Existing gdUnit/e2e suites remain green; no new combination types are added.

## Main Build

| Task | Game Mechanic Function | Player-Facing Outcome | Affected Systems / Scenes / UI | Integration Point | Verify |
|------|------------------------|-----------------------|--------------------------------|-------------------|--------|
| P01 | Audio controller/test hooks | Sound feedback is centralized, muteable, and observable in tests | `src/audio_controller.gd` or Main-owned helper; `project.godot` buses if needed | Main event calls for select/play/pass/invalid/result | gdUnit |
| P02 | Action SFX integration | Selecting, playing, passing, invalid actions, landlord assignment, and result states feel responsive | `src/main.gd`, `src/doudizhu_game.gd` if event names are exposed | Existing button/card handlers and game-state transitions | gdUnit + e2e |
| P03 | Quiet music layer | Optional non-intrusive music/ambience can be toggled during play | Audio controller, Main settings UI | Settings toggle and scene lifecycle | gdUnit + e2e |
| P04 | Audio/settings UI | Player can mute effects/music and see current state without leaving Main | `src/main.gd`, procedural Controls | Action/help/settings area or overlay | e2e + ui-review |
| P05 | Restart/quit final flow | Replay/restart/quit affordances are clear and do not leave stale game state | `src/main.gd`, round reset helpers | Result banner, settings/help controls | e2e |
| P06 | Final regression coverage | All shipped mechanics remain stable with audio/settings added | `test/`, `e2e/` | Existing suite plus v0.5 tests | gdUnit + e2e |

## Systems & Components

| System | Components (reads) | Components (writes) | Purpose |
|--------|--------------------|---------------------|---------|
| AudioController | game event names, settings state | audio players/buses, debug event history | Play procedural SFX/music and expose deterministic test state |
| DoudizhuGame | hands, trick, turn state | unchanged gameplay state plus optional event names | Preserve rule/turn state while exposing moments that Main can sonify |
| Main UI projection | game state, settings state, summary/help text | Control nodes and audio requests | Render compact settings/restart/quit controls and trigger audio feedback |

## Assets Needed

- No bitmap image assets are required for v0.5.0.
- Audio uses procedural/generated-in-engine tones or code-created streams, so no external audio file is required unless the build phase chooses to add one explicitly.
- If external audio becomes necessary, report it as a missing asset first; do not invent paths.

## Scene / UI Requirements

| Scene | Current-tag additions | Notes |
|-------|----------------------|-------|
| Main | Audio/settings controls, optional settings overlay, restart/quit affordance, audio debug/test hooks | Must preserve existing card table, help, summary, status, action, and result layout |

## Acceptance Criteria

- Headless Godot build passes.
- gdUnit passes, including audio-controller/settings/event tests.
- e2e suite passes, including v0.5 audio/settings/restart/quit coverage and inherited mechanic coverage.
- Audio can be disabled and music can be toggled without changing game rules or blocking actions.
- No new UI overlaps at 1280x720, 1366x768, or 1600x900.
- Final evaluation can approve the tag without adding new bitmap assets.

## Task Status

| # | Task | Status | Notes |
|---|------|--------|-------|
| P01 | Audio controller/test hooks | verified | `AudioController` added with procedural SFX/music streams, mute/music/volume state, and debug event history; gdUnit passes. |
| P02 | Action SFX integration | verified | Main card/action/landlord/result/restart paths emit semantic audio events; headless and E2E regression pass. |
| P03 | Quiet music layer | verified | Music toggle starts/stops a quiet procedural loop and is independently testable from SFX; gdUnit passes. |
| P04 | Audio/settings UI | verified | Compact Audio settings panel exposes SFX, Music, and Volume controls; existing E2E layout regression passes. |
| P05 | Restart/quit final flow | verified | Result banner includes Quit, restart clears modal state while preserving audio controller behavior, and debug quit state is exposed. |
| P06 | Final regression coverage | verified | `tools/run_verify.py` passes with 23/23 gdUnit; existing e2e suite passes 19/19. Evaluator owns new v0.5 E2E additions. |