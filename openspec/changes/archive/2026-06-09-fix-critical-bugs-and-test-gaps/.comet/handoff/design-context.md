# Comet Design Handoff

- Change: fix-critical-bugs-and-test-gaps
- Phase: design
- Mode: compact
- Context hash: e9eda12f032b0f190c7466d77ae665379eb94758d87ed97b5cfca2f7fdbc8d02

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/fix-critical-bugs-and-test-gaps/proposal.md

- Source: openspec/changes/fix-critical-bugs-and-test-gaps/proposal.md
- Lines: 1-45
- SHA256: 2b2681382a771251af12c52f2425b66400b496aa16b405a490c413a436958c15

```md
# Proposal: Fix Critical Bugs and Test Gaps

## Why

A comprehensive gap analysis revealed 4 CRITICAL issues, 11 MAJOR issues, and 11 MINOR issues affecting the Doudizhu game's reliability, testability, and maintainability.

**CRITICAL issues blocking quality:**
1. Turn timer never executes — `_process_turn_timer` is never called because `_process` method doesn't exist
2. Landlord selection logic — "Do Not Call" should trigger AI call check, not immediately assign landlord
3. `C_AIDifficulty` component is dead code with buggy logic, never instantiated
4. Localization fallback strings differ from shipped EN `.tres` strings

**Test gaps:**
- Core `DoudizhuGame` methods (`play_selected`, `pass_turn`, `resolve_landlord`, `_shuffle`) have zero unit tests
- e2e test coverage missing for drag-to-select (v0.9.1)
- Save/load functionality has insufficient test coverage

## What

1. **Fix critical bugs** — Timer execution, landlord selection logic, remove dead code, fix localization
2. **Add unit tests** — Core DoudizhuGame methods, AI decision helpers, save/load
3. **Update documentation** — Fix tag inconsistencies in SCENES.md, STYLE.md, ASSETS.md, MEMORY.md
4. **Minor cleanups** — Remove print() from tests, add constants for magic numbers

## Scope

**Included:**
- Fix the 4 critical bugs identified in analysis
- Add unit tests for DoudizhuGame core methods
- Update document tags to v0.9.1
- Remove dead code (C_AIDifficulty, S_RoundFlow placeholder)
- Fix localization fallback consistency

**Excluded:**
- Refactoring main.gd (too large — separate change)
- AI improvement (deferred to v0.8.0 hard AI implementation)
- New game features

## Acceptance Scenarios

1. **Turn timer works** — Timer counts down during AI turns and player turns
2. **Landlord selection correct** — "Do Not Call" triggers AI check, only assigns landlord when all decline
3. **Unit test count increased** — At least 5 new test files covering core DoudizhuGame methods
4. **No dead code** — C_AIDifficulty.gd and S_RoundFlow.gd removed or properly integrated
5. **Documentation consistent** — All tag headers show v0.9.1 or current
```

## openspec/changes/fix-critical-bugs-and-test-gaps/design.md

- Source: openspec/changes/fix-critical-bugs-and-test-gaps/design.md
- Lines: 1-17
- SHA256: 013555d6142af552d3d5b19a21bd0242c0e4a8c23b5dfcd0ee90143b0c026e11

```md
# Design: Fix Critical Bugs and Test Gaps

## Approach

Fix 4 critical bugs (timer, landlord selection, dead code, localization), add unit tests for core DoudizhuGame methods, update documentation.

## Key Decisions

1. **Remove C_AIDifficulty and S_RoundFlow** — dead code with bugs, no references
2. **TDD for test additions** — write failing tests first
3. **Small commits per task** — one commit per fix
4. **No main.gd refactoring** — out of scope, separate change

## Risk Mitigation

- Run all unit tests + headless build after each commit
- Review e2e tests to ensure no regression from landlord logic fix
```

## openspec/changes/fix-critical-bugs-and-test-gaps/tasks.md

- Source: openspec/changes/fix-critical-bugs-and-test-gaps/tasks.md
- Lines: 1-100
- SHA256: 161a4ba565f720d55498a2f7d81976ce9acc49cd3d1e993553b809c31e0c7403

[TRUNCATED]

```md
# Tasks: Fix Critical Bugs and Test Gaps

## Task Checklist

- [ ] T01: Fix timer not executing — add `_process(delta)` to main.gd
- [ ] T02: Fix landlord selection logic — AI check after player decline
- [ ] T03: Remove dead code — delete C_AIDifficulty.gd and S_RoundFlow.gd
- [ ] T04: Fix localization fallback consistency
- [ ] T05: Update STRUCTURE.md — remove deleted components/systems
- [ ] T06: Update documentation tags — SCENES.md, STYLE.md, ASSETS.md, MEMORY.md
- [ ] T07: Update openspec/base spec — remove dead ECS components
- [ ] T08: Add unit tests for DoudizhuGame core methods
- [ ] T09: Add unit tests for landlord selection
- [ ] T10: Fix test_joker_comparison.gd — add class_name, remove print()
- [ ] T11: Verify headless build passes
- [ ] T12: Commit all changes

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

```

Full source: openspec/changes/fix-critical-bugs-and-test-gaps/tasks.md

