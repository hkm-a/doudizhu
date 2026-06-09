# Design: Post-Archive Backlog Fixes (v0.10.0)

## Part A: Procedural SFX Fallback

### AudioFallback System
- Create `src/audio_fallback.gd` with `class_name AudioFallback`
- Uses `AudioServer` bus management + `OWC` oscillator-based sounds
- Each SFX type is a Callable that triggers oscillator envelope
- Compatible with existing `AudioController` interface

### Supported Events
1. select - short high-frequency click (800Hz, 50ms)
2. play - medium sweep (600Hz->300Hz, 120ms)
3. pass - quiet tick (400Hz, 30ms)
4. invalid - gentle buzz (200Hz, 150ms)
5. bomb - low-frequency crash (80Hz->40Hz, 300ms)
6. joker_bomb - explosion sweep (200Hz->20Hz, 500ms)
7. result_win - ascending tones (300Hz->900Hz, 200ms)
8. result_loss - descending tones (600Hz->100Hz, 250ms)

### Integration
- Replace hardcoded `audio_controller.play_event("...")` calls with fallback
- Check if real audio files exist; if not, use procedural fallback
- Fallback volume scales with existing `audio_controller.volume_preset`

## Part B: e2e Test Gap Fill

### test_v0_7_0_M2_contextual_coach.py
- Test: Tutorial action coach displays contextual guidance
- Steps: Open tutorial -> verify step titles match landlord/play/scoring -> verify navigation

### Enhanced existing tests
- Add procedural SFX existence check to `test_v0_8_0_M7_audio_sfx.py`

## Part C: main.gd Refactor

### File Split Strategy
Each extracted file becomes a module with clear responsibilities. main.gd becomes a thin coordinator.

**Architecture:**
```
main.gd (entry point, ~200 lines)
  ├── AudioController (preloaded)
  ├── AudioFallback (new, for procedural SFX)
  ├── ScoreState (preloaded)
  ├── AnimationSystem (preloaded)
  ├── SaveLoadUtils (preloaded)
  ├── LocalizationUtils (preloaded)
  ├── CardAssets (preloaded)
  ├── AIUtils (preloaded)
  │
  ├── _build_ui() -> delegates to _UIBuilder
  ├── _layout_ui() -> delegates to _UILayout
  ├── _refresh() -> delegates to _UIRefresh
  ├── button handlers -> delegates to _UICallbacks
  ├── debug methods -> delegates to _UIDebug
```

### Refactoring Rules
1. No behavior changes - extract methods first, verify tests pass, then refactor further
2. All debug_* methods must remain on main.gd or be delegated without changing signatures
3. All simulate_* methods remain on main.gd for e2e compatibility
4. Each extracted file is `extends RefCounted` with static utility methods
5. No new signals or properties added to main.gd during refactor

### Extracted Modules

**main_ui_builder.gd** - Static utility for UI construction
- All `_build_ui` method and helpers (`_seat_panel`, `_action_button`, `_create_continue_dialog`, `_card_button`, `_card_style`, etc.)

**main_ui_layout.gd** - Static utility for responsive layout
- All `_layout_ui` method and helpers (`_layout_seat_content`, `_pin_top_left`, `_card_size`)

**main_ui_refresh.gd** - Static utility for state refresh
- `_refresh`, `_refresh_seat`, `_refresh_bottom_cards`, `_refresh_trick`, `_refresh_hand`, `_refresh_actions`, `_refresh_settings_ui`, `_refresh_result_action_focus`

**main_ui_callbacks.gd** - Button event handlers
- `_on_*_pressed` methods, shortcut handling, `_play_result_audio_if_needed`

**main_debug.gd** - Debug and simulation helpers
- All `debug_*` methods, `simulate_*` methods

### Refactor Phases
1. **Phase 1:** Create `main_ui_layout.gd` (lowest risk - pure layout math, no game state)
2. **Phase 2:** Create `main_ui_refresh.gd` (medium risk - has game state access)
3. **Phase 3:** Create `main_ui_builder.gd` (higher risk - many helper methods)
4. **Phase 4:** Create `main_ui_callbacks.gd` (medium risk - button handlers)
5. **Phase 5:** Create `main_debug.gd` (medium risk - debug/sim methods)
6. **Phase 6:** Update `main.gd` to delegate to all modules
