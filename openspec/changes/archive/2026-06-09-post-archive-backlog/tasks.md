# Tasks: Post-Archive Backlog Fixes (v0.10.0)

## Phase 1: Procedural SFX (low risk, quick win)

| # | Task | Risk | Status |
|---|------|------|--------|
| A1 | Create `src/audio_fallback.gd` with `class_name AudioFallback` | Low | pending |
| A2 | Implement 8 procedural SFX events (select, play, pass, invalid, bomb, joker, result_win, result_loss) | Low | pending |
| A3 | Integrate fallback into `src/main.gd` and `src/audio_controller.gd` | Medium | pending |
| A4 | Verify SFX toggle/volume controls still work with fallback | Low | pending |

## Phase 2: e2e Test Gap Fill (low risk)

| # | Task | Risk | Status |
|---|------|------|--------|
| B1 | Create `e2e/test_v0_7_0_M2_contextual_coach.py` for tutorial action coach | Low | pending |
| B2 | Verify all existing e2e tests still pass after A1-A4 | Medium | pending |
| B3 | Run `pytest e2e/` and confirm all tests pass | Low | pending |

## Phase 3: main.gd Refactor (medium-high risk, separate commits)

### Phase 3a: Layout module (lowest risk)
| # | Task | Risk | Status |
|---|------|------|--------|
| C1a1 | Create `src/main_ui_layout.gd` - extract `_layout_ui`, `_layout_seat_content`, `_pin_top_left`, `_card_size` | Low | pending |
| C1a2 | Update `main.gd` to delegate layout calls | Medium | pending |
| C1a3 | Run headless build + unit tests | Medium | pending |

### Phase 3b: Refresh module (medium risk)
| # | Task | Risk | Status |
|---|------|------|--------|
| C1b1 | Create `src/main_ui_refresh.gd` - extract `_refresh` and all `_refresh_*` methods | Medium | pending |
| C1b2 | Update `main.gd` to delegate refresh calls | Medium | pending |
| C1b3 | Run headless build + unit tests | Medium | pending |

### Phase 3c: Builder module (higher risk)
| # | Task | Risk | Status |
|---|------|------|--------|
| C1c1 | Create `src/main_ui_builder.gd` - extract `_build_ui` and all helper methods | High | pending |
| C1c2 | Update `main.gd` to delegate builder calls | Medium | pending |
| C1c3 | Run headless build + unit tests | Medium | pending |

### Phase 3d: Callbacks module (medium risk)
| # | Task | Risk | Status |
|---|------|------|--------|
| C1d1 | Create `src/main_ui_callbacks.gd` - extract all `_on_*_pressed` methods | Medium | pending |
| C1d2 | Create `src/main_ui_shortcuts.gd` - extract `_handle_shortcut`, `_press_visible_button`, `_unhandled_key_input` | Medium | pending |
| C1d3 | Update `main.gd` to delegate callback calls | Medium | pending |
| C1d4 | Run headless build + unit tests | Medium | pending |

### Phase 3e: Debug module (medium risk)
| # | Task | Risk | Status |
|---|------|------|--------|
| C1e1 | Create `src/main_debug.gd` - extract all `debug_*` and `simulate_*` methods | Medium | pending |
| C1e2 | Update `main.gd` to delegate debug calls | Medium | pending |
| C1e3 | Run headless build + unit tests | Medium | pending |

### Phase 3f: Final cleanup
| # | Task | Risk | Status |
|---|------|------|--------|
| C1f1 | Verify `main.gd` line count < 1000 | Low | pending |
| C1f2 | Run full e2e test suite | Medium | pending |
| C1f3 | Final headless build verification | Low | pending |

## Verify

- [ ] All 8 procedural SFX events work
- [ ] SFX toggle and volume controls work with fallback
- [ ] All e2e tests pass (37 tests)
- [ ] `test_v0_7_0_M2_contextual_coach.py` exists and passes
- [ ] `main.gd` line count < 1000
- [ ] Headless build succeeds
- [ ] All unit tests pass
- [ ] No behavior changes (e2e playable loop test passes)
