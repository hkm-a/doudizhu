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
