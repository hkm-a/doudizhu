# Changelog - v0.2.0

**Released:** 2026-06-05T19:44:45Z
**Theme:** Expanded Doudizhu Rules

## Delivered mechanics

- [v0.2.0-M1] Added expanded non-special Doudizhu combinations: three-with-one, three-with-pair, straights, consecutive pairs, and airplane without wings.
- Chains now reject 2 and jokers.
- Expanded combinations compare by matching type and length, with existing bomb and joker bomb overrides preserved.
- Hint and AI candidate search can produce expanded legal responses.

## Added systems / scenes / assets

- Extended `CardRules` classification, comparison, and smallest-legal search.
- Added deterministic runtime fixture hooks for expanded-rule e2e coverage.
- Added gdUnit coverage for expanded combinations, invalid chains, comparison length checks, and expanded hint search.
- Added e2e coverage for Hint and Play following an active straight.
- No new scenes or visual assets were required.

## Refactored from prior tags

- Extended the v0.1.0 card-rule helper instead of adding a parallel rules path, so Play, Hint, and AI continue to share one legality gate.

## Known limitations

- Airplane with wings and four-with-two remain outside the v0.2.0 roadmap scope.
