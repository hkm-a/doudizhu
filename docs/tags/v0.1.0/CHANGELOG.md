# Changelog - v0.1.0

**Released:** 2026-06-05T19:13:35Z
**Theme:** Core Hand Loop

## Delivered mechanics

- [v0.1.0-M1] Round setup deals a 54-card deck into three 17-card hands plus 3 bottom cards and enters landlord selection.
- [v0.1.0-M2] Landlord selection assigns roles, grants bottom cards, and enters play.
- [v0.1.0-M3] Card selection toggles visible lift/highlight feedback while preserving hand order.
- [v0.1.0-M4] Core legal play supports singles, pairs, triples, bombs, and joker bombs with invalid-play rejection.
- [v0.1.0-M5] Trick comparison and pass flow advance turns and reset initiative after passes.
- [v0.1.0-M6] Hint selects the smallest legal supported response or reports no valid play.
- [v0.1.0-M7] AI turns play or pass automatically with visible recent play and count updates.
- [v0.1.0-M8] Result and replay show a win/loss banner and start a fresh hand.

## Added systems / scenes / assets

- Added Doudizhu card/rule and round-flow model coverage.
- Added ECS component data for hands, seats, roles, round state, selection, trick state, turn state, and messages.
- Added `S_RoundFlow` shell system for ECS integration.
- Added the `Main` gameplay scene with procedural table, cards, panels, action buttons, status text, result banner, and replay.
- Added procedural UI assets only; no bitmap assets are required for this tag.
- Added 10 gdUnit4 unit tests and 9 e2e tests covering mechanics and the full playable loop.

## Refactored from prior tags

- None. This is the first shipped tag.

## Known limitations

- Expanded Doudizhu combinations such as straights, consecutive pairs, three-with-one, three-with-pair, and airplane are deferred to v0.2.0.
- Presentation polish, animation, audio, and improved AI are deferred to later roadmap tags.
