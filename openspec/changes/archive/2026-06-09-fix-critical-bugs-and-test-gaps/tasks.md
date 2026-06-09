# Tasks: Fix Critical Bugs and Test Gaps

## Task Checklist

- [x] T01: Fix timer not executing — add `_process(delta)` to main.gd
- [x] T02: Fix landlord selection logic — AI check after player decline
- [x] T03: Remove dead code — delete C_AIDifficulty.gd and S_RoundFlow.gd
- [x] T04: Fix localization fallback consistency
- [x] T05: Update STRUCTURE.md — remove deleted components/systems
- [x] T06: Update documentation tags — SCENES.md, STYLE.md, ASSETS.md, MEMORY.md
- [x] T07: Update openspec/base spec — remove dead ECS components
- [x] T08: Add unit tests for DoudizhuGame core methods
- [x] T09: Add unit tests for landlord selection
- [x] T10: Fix test_joker_comparison.gd — add class_name, remove print()
- [x] T11: Verify headless build passes
- [x] T12: Commit all changes

## Task Details

### T01: Fix Timer Not Executing

**File:** `src/main.gd`

**Steps:**
1. Locate `_process_turn_timer` method (~line 1584)
2. Add `_process(delta: float)` method that calls `_process_turn_timer(delta)`
3. Ensure timer only runs during active turns (not during result/replay phases)
4. Verify timer display updates correctly

**Verification:** Timer counts down during game play

### T02: Fix Landlord Selection Logic

**File:** `src/main.gd`

**Steps:**
1. Find landlord selection handler (likely in `_on_do_not_call_pressed` or similar)
2. Trace through AI landlord call logic
3. Ensure "Do Not Call" triggers next AI's decision check
4. Only assign random landlord when ALL players decline
5. Add unit test for this logic

**Verification:** After all decline, landlord is randomly assigned (not first AI)

### T03: Remove Dead Code

**Files:** `src/components/c_ai_difficulty.gd`, `src/systems/s_round_flow.gd`

**Steps:**
1. grep for references to `C_AIDifficulty` and `S_RoundFlow`
2. Delete the files if no references found
3. Update STRUCTURE.md to remove entries
4. Commit separately

**Verification:** `grep -r "C_AIDifficulty\|S_RoundFlow" src/` returns no results

### T04: Fix Localization Fallback

**File:** `src/utils/localization_utils.gd`

**Steps:**
1. Read `_defaults()` fallback dictionary
2. Compare with `locales/en.tres` values
3. Sync any discrepancies (especially `"message.win"`)
4. Commit

**Verification:** `_defaults()` values match `.tres` file values

### T05-T7: Documentation Updates

**Files:** `STRUCTURE.md`, `SCENES.md`, `STYLE.md`, `ASSETS.md`, `MEMORY.md`, `openspec/specs/doudizhu/spec.md`

**Steps:**
1. Update all tag headers to v0.9.1
2. Remove dead ECS components from STRUCTURE.md and spec.md
3. Update MEMORY.md — remove outdated asset gap notes
4. Commit

**Verification:** All tag headers consistent

### T08-T10: Add Unit Tests

**Files:** New `test/test_doudizhu_game_core.gd`, `test/test_landlord_selection.gd`; Modified `test/test_joker_comparison.gd`

**Steps:**
1. Create `test_doudizhu_game_core.gd` — test `play_selected()`, `pass_turn()`, `resolve_landlord()`, `_shuffle()`
2. Create `test_landlord_selection.gd` — test AI landlord check after player decline
3. Fix `test_joker_comparison.gd` — add `class_name` + `extends GdUnitTestSuite`, remove print()
4. Run all tests to verify pass

**Verification:** New tests pass, existing tests still pass

### T11-T12: Verify and Commit

**Steps:**
1. Run Godot headless build
2. Run all unit tests
3. Commit with message: `fix: critical bugs, add tests, clean up dead code`

**Verification:** All checks pass
