# Structure: Doudizhu

**Tag:** v0.5.0
**Theme:** Audio And Finish

## Scope

v0.5.0 adds audio feedback, optional quiet music, compact audio/settings controls, and final restart/quit consistency. It must not expand Doudizhu rule recognition or rewrite shipped card-flow behavior.

## Architecture Decisions

- Centralize all sound playback behind an `AudioController`-style node/helper so headless tests can inspect requested events without relying on real speakers.
- Keep SFX event names semantic (`select`, `play`, `pass`, `invalid`, `landlord`, `result_win`, `result_loss`) rather than tied to specific generated waveforms.
- Prefer procedural/generated-in-engine tones over external audio files to keep the finish tag self-contained.
- Keep settings UI compact and reuse the existing Main scene procedural Control style.
- Preserve ECS/gameplay separation: scene tree remains UI/menus/audio; gameplay state stays in existing model/rules classes.

## Current Tag Systems

| System / Helper | File | Reads | Writes / Emits | Purpose | Tasks |
|-----------------|------|-------|----------------|---------|-------|
| AudioController | `src/audio_controller.gd` or equivalent Main child/helper | semantic audio event names, mute/music settings | `AudioStreamPlayer` state, debug event history, bus/volume state | Centralize SFX/music playback and test hooks | P01, P02, P03 |
| MainAudioProjection | `src/main.gd` | UI/game events, settings control state | calls AudioController, updates settings controls | Connect card/action/result/settings UI to audio feedback | P02, P03, P04 |
| RestartQuitProjection | `src/main.gd` | result state, round state | restart/new-round/quit affordance state | Make final restart/quit flow clear and regression-testable | P05 |

## Existing Systems Touched

| Existing System | File | Allowed Change | Guardrail |
|-----------------|------|----------------|-----------|
| CardRules | `src/card_rules.gd` | No planned functional change; tests may assert regression stability | Do not add new combination types in v0.5.0 |
| DoudizhuGame | `src/doudizhu_game.gd` | Expose event moments or state needed for audio/restart tests if Main cannot infer them cleanly | Keep `classify`/`can_beat` legality gate unchanged |
| Main UI | `src/main.gd` | Add settings/audio/restart/quit controls and audio event calls | No overlap with summary/help/action/status/hand areas |

## Data / State

| State | Owner | Lifetime | Test Visibility |
|-------|-------|----------|-----------------|
| SFX enabled | AudioController/Main settings | scene/session | debug getter or public method for e2e/gdUnit |
| Music enabled | AudioController/Main settings | scene/session | debug getter or public method for e2e/gdUnit |
| Last audio events | AudioController | bounded in-memory history | gdUnit/e2e assertions |
| Restart/quit affordance state | Main UI | current scene | e2e locator/button state |

## Procedural Audio Plan

- SFX should be short, distinct, and quiet by default: select tick, legal play chime, pass soft tap, invalid low buzz, landlord/result accent.
- Music/ambience should be optional, low-volume, and non-essential; if procedural looping is too risky, implement a muted-by-default placeholder with a clear testable toggle rather than blocking the tag on composition.
- All audio must route through a controllable bus or player set so mute/toggle tests can assert state deterministically.

## Tests Required

| Test Area | Expected Coverage |
|-----------|-------------------|
| Unit | Audio event dispatch, mute/music setting application, no rule regression in card legality tests |
| E2E | Selecting/playing/passing/invalid action triggers observable audio event state; settings toggles update state; restart/replay remains clean |
| Layout | Settings/restart/quit controls do not overlap existing Main scene layout at supported desktop sizes |

## Out of Scope

- Expert Doudizhu AI.
- New card combination types.
- Network multiplayer.
- Release packaging/export installers.
- Required external audio library licensing work.