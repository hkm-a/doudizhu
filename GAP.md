# Gap Plan

## Source Evaluation

- Result: N/A (first fixgap — no evaluation.json exists yet)
- Iteration: N/A
- Generated at: 2026-06-09T03:45:00Z

## Source Verify

- verify_report.json ts: 2026-06-09T03:42:55Z

## Critical Issues

### C1. Add missing debug helper methods to main.gd for v0.8.0/v0.9.1 tests
- **Source:** verify_report.json
- **Finding:** 36 unit tests fail with "Invalid call. Nonexistent function" errors in main.gd. Missing methods: `debug_bottom_cards_revealed`, `simulate_call_landlord`, `debug_deal_anim_active`, `_start_deal_animation`, `debug_drag_select_active`, `simulate_toggle_card_index`, `_calculate_fan_positions`, `debug_turn_timer_panel_visible`, `_process_turn_timer`, `_turn_timer_label_bottom`, `turn_timer_remaining`
- **Acceptance blocker:** Unit tests cannot exercise v0.8.0 and v0.9.1 features without these debug hooks exposed on main.gd (the test root node is a Control referring to res://scenes/main.tscn)
- **Affected files/systems:** `src/main.gd`
- **Fix approach:** Add the missing debug accessor/trigger methods to main.gd. These are test-only helpers: `debug_bottom_cards_revealed()` returns bool, `simulate_call_landlord()` calls game.resolve_landlord(false), `debug_deal_anim_active()` returns bool, `_start_deal_animation()` is called by tests to trigger deal animation, `debug_drag_select_active()` returns drag state, `simulate_toggle_card_index(card_id)` calls game.toggle_selection, `_calculate_fan_positions()` returns array of positions, `debug_turn_timer_panel_visible()` returns timer panel visibility, `_process_turn_timer(elapsed)` processes timer tick, `_turn_timer_label_bottom` property access, `turn_timer_remaining` setter/getter. Group related methods and add to main.gd.

### C2. Fix test_ai_policy_conserves_bomb assertion failure
- **Source:** verify_report.json
- **Finding:** test_round_model.gd:65-66: Expecting 'true' but was 'false' for AI bomb conservation logic
- **Acceptance blocker:** AI policy system incorrectly handles bomb conservation in v0.8.0 hard AI
- **Affected files/systems:** `test/test_round_model.gd`, `src/utils/ai_utils.gd` or `src/systems/s_round_flow.gd`
- **Fix approach:** Investigate the test fixture and AI decision logic. The test expects `true` for "conserved bomb" but got `false`. Check ai_utils.gd bomb conservation heuristic and the test setup.

### C3. Fix test_settings_modal_children_focus_mode assertion
- **Source:** verify_report.json
- **Finding:** test_score_state.gd:111: Expecting 0 but was 2 (focus_mode values)
- **Acceptance blocker:** Settings modal button focus_mode not correctly set to FOCUS_NONE when hidden per MEMORY.md v0.6.0 P08
- **Affected files/systems:** `src/score_state.gd`, `src/main.gd` (settings panel children focus management)
- **Fix approach:** The test expects settings modal child buttons to have focus_mode=0 (FOCUS_NONE) when hidden. Check `_refresh_settings_ui()` and settings button initialization — buttons may have focus_mode=2 (FOCUS_ALL) when they should be FOCUS_NONE.

## Major Issues

### J1. Static check reports AutomationServer autoload missing
- **Source:** verify_report.json
- **Finding:** `checks.static_check.issues[]`: "AutomationServer autoload missing in project.godot"
- **Acceptance blocker:** check_project.py may be using wrong path to read project.godot, or the autoload uid reference may be broken
- **Affected files/systems:** `project.godot`
- **Fix approach:** Verify project.godot line 23: `AutomationServer="*uid://xefj2bc8qx2x2"`. The autoload exists. The check_project.py script may have a bug — investigate and fix if the uid reference is broken, or document as false positive.

## Task Status

| # | Task | Source | Status | Notes |
|---|------|--------|--------|-------|
| C1 | Add missing debug helper methods to main.gd | verify | pending | |
| C2 | Fix test_ai_policy_conserves_bomb assertion | verify | pending | |
| C3 | Fix test_settings_modal_children_focus_mode | verify | pending | |
| J1 | Static check AutomationServer autoload false positive | verify | pending | |
