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
