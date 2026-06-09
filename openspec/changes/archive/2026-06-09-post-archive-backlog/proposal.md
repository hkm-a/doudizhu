# Proposal: Post-Archive Backlog Fixes (v0.10.0)

**Problem:** After archiving v0.8.0 and v0.9.1, three backlog items remain unaddressed:

1. **SFX Rework** — ASSETS.md marks all v0.8.0 audio SFX as `DEFERRED`. The game falls back to procedural/no audio.
2. **e2e Test Coverage Gaps** — Several tags missing e2e tests:
   - v0.7.0 M2: `test_v0_7_0_M2_contextual_coach.py` does not exist
   - v0.8.0: No playable-loop test for v0.8.0 cards+animations
3. **main.gd Size** — 1746 lines, single responsibility violation. Needs architectural split.

**Proposal:**

### v0.10.0-A: Procedural SFX Fallback (Patch-level)
Since user hasn't provided new audio files, implement fallback procedural SFX using Godot's `AudioStreamGenerator` or `OWC` (oscillator-based) audio to produce satisfying procedural sounds for all 8 SFX types listed in GDD:
- Card select: short high-frequency click
- Play cards: medium sweep
- Pass: quiet tick
- Invalid: gentle buzz
- Bomb: low-frequency crash
- Joker bomb: explosion-like with sweep
- Result win/loss: ascending/descending tones
- Save/load: confirmation chirp

**Impact:** No asset file dependencies. Works headlessly. Improves testability.

### v0.10.0-B: e2e Test Gap Fill
- Create `test_v0_7_0_M2_contextual_coach.py` for tutorial action coach
- Create `test_v0_8_0_M7_audio_sfx.py` coverage validation (verify SFX system exists even with procedural fallback)
- Update `e2e/` test suite to cover v0.8.0 animation+save combined flow

### v0.10.0-C: main.gd Refactor
Split `main.gd` (1746 lines) into modular subsystems:

```
src/
  main.gd                  (entry point, ~200 lines)
  main_ui_builder.gd       (UI construction, _build_ui, layout)
  main_ui_layout.gd        (responsive layout, _layout_ui)
  main_ui_refresh.gd       (_refresh, _refresh_seat, etc.)
  main_ui_callbacks.gd     (button handlers, shortcuts)
  main_debug.gd            (all debug_* methods)
```

**Impact:** Each file under 400 lines. Maintains backward compatibility. No game behavior changes.

**Risk:** Refactoring a 1746-line script has high coupling risk. Mitigation: keep public API surface stable, run full test suite before/after.

**Decision:** Split into two Comet changes:
1. **Immediate fix:** v0.10.0-A (SFX) + v0.10.0-B (e2e) — low risk, quick win
2. **Deferred:** v0.10.0-C (main.gd refactor) — high risk, separate change

**Acceptance Criteria:**
- [ ] Procedural SFX plays for all 8 audio events
- [ ] All e2e tests pass (37 tests)
- [ ] `test_v0_7_0_M2_contextual_coach.py` exists and passes
- [ ] main.gd line count under 1000
- [ ] Headless build succeeds
- [ ] All unit tests pass
