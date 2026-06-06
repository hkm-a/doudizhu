# Changelog — v0.6.0

**Released:** 2026-06-06T12:30:15Z
**Theme:** Scoring And Match Progression

## Delivered mechanics

- [v0.6.0-M1] Hand-level scoring for landlord-vs-farmers outcomes using a simple base score.
- [v0.6.0-M2] Cumulative player, AI-left, and AI-right scores across a short match.
- [v0.6.0-M3] Match completion state with winner display and fresh-match restart.
- [v0.6.0-M4] Score summary UI for hand winner, score delta, cumulative scores, hands played, and match winner.

## Added systems / scenes / assets

- Added match-state score tracking and reset boundaries to the main gameplay loop.
- Added score summary/result UI affordances for New Hand, New Match, and Quit flows.
- Added v0.6.0 E2E coverage for scoring, cumulative match totals, match completion, and score UI.
- Added evaluator screenshot evidence for the main scene score summary layout.

## Refactored from prior tags

- Updated inherited result replay and restart-flow E2E tests to account for match progression UI and reset semantics.
- Compacted result banner/settings-modal focus behavior so previous UI flows remain usable with the expanded score summary.

## Known limitations

- None.
