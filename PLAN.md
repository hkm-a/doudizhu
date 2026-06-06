# Plan: Doudizhu

**Tag:** v0.6.0
**Theme:** Scoring And Match Progression
**Status:** Build in progress; worker implementing scoring and match progression.

## Tag Mechanics

- [v0.6.0-M1] Hand scoring: every completed hand produces a deterministic landlord-vs-farmers score delta with a clear base-score rule.
- [v0.6.0-M2] Cumulative match score: player, AI-left, and AI-right scores persist across hands in the current match session.
- [v0.6.0-M3] Match completion: a short target-score or hand-count match reaches a visible match winner and offers New Match.
- [v0.6.0-M4] Score summary UI: result and table views show hand winner, score delta, cumulative score, hands played, and match state without crowding existing controls.

## Inherited Mechanics

- [v0.5.0-M1..M4] Audio feedback, optional music, settings controls, restart/quit flow, and final consistency remain intact.
- [v0.4.0-M1..M4] Improved hints, AI reasons, hand summary, and rule/help affordance remain visible and stable.
- [v0.3.0-M1..M3] Presentation, responsive layout, and visual QA baselines remain readable.
- [v0.2.0-M1] Expanded non-special combinations continue to work through Play, Hint, and AI candidate search.
- [v0.1.0-M1..M8] Round setup, landlord selection, card selection, legal play, pass, hint, AI turns, result, and replay remain the gameplay foundation.

## Playable Unit

The player launches Main, completes one or more hands, sees score deltas applied after each hand, continues with New Hand until the short match target is reached, then sees a match result and can start a New Match.

## Acceptance Matrix

| Mechanic | Player Scenario | Expected Result | Observable Evidence | Verify |
|----------|-----------------|-----------------|---------------------|--------|
| [v0.6.0-M1] | Finish a hand as landlord or farmer side | Winning side receives positive score and losing side receives negative score | Result summary shows winner side and delta | gdUnit score tests + e2e result test |
| [v0.6.0-M2] | Start another hand after a result | Cumulative scores and hand count persist while card state resets | Scoreboard updates, new hand is playable | gdUnit + e2e multi-hand test |
| [v0.6.0-M3] | Reach target score or configured hand count | Match result appears and New Match is available | Match winner text and reset control | gdUnit match-state tests + e2e |
| [v0.6.0-M4] | Open help/settings, play, and view result | Score UI stays readable and does not overlap inherited UI | Layout assertions/screenshots at desktop sizes | e2e layout regression |

## Risk Tasks

### 1. Scoring must be simple and explainable
- **Why isolated:** Full Doudizhu scoring can include multipliers that would expand scope and confuse this tag.
- **Approach:** Use a simple base-score model: landlord win awards both farmer seats negative points and landlord positive combined points; farmer win awards each farmer positive points and landlord negative combined points.
- **Verify:** Unit tests cover landlord win, farmer win, player as landlord, player as farmer, and zero stale deltas after New Match.

### 2. Match state must reset separately from hand state
- **Why isolated:** Existing New Round logic resets a hand; v0.6.0 needs New Hand to preserve score and New Match to clear score.
- **Approach:** Add a dedicated score/match state owner and explicit reset methods.
- **Verify:** E2E completes result -> New Hand -> score persists, then New Match -> score clears.

### 3. Score UI must not crowd polished controls
- **Why isolated:** v0.5.0 already added audio/settings/restart controls.
- **Approach:** Use a compact scoreboard band or side panel row with short labels and defer advanced details to result summary.
- **Verify:** Layout checks at 1280x720, 1366x768, and 1600x900.

## Main Build

| Task | Game Mechanic Function | Player-Facing Outcome | Affected Systems / Scenes / UI | Integration Point | Verify |
|------|------------------------|-----------------------|--------------------------------|-------------------|--------|
| P01 | Score model and calculator | Hand result has clear point delta | `src/score_state.gd` or equivalent helper | Result phase after winner side is known | gdUnit |
| P02 | Match progression state | Multiple hands accumulate score and reach match end | `src/doudizhu_game.gd`, `src/main.gd`, score helper | New Hand / New Match flow | gdUnit + e2e |
| P03 | Result score summary | Player understands why scores changed | `src/main.gd` result UI | Existing result banner/projection | e2e |
| P04 | Compact scoreboard UI | Cumulative score is visible during play | `src/main.gd` procedural Controls | Existing summary/status/table bands | e2e + ui-review |
| P05 | Reset boundary tests | New Hand preserves match score; New Match clears it | `test/`, `e2e/` | Existing replay/restart handlers | gdUnit + e2e |
| P06 | Regression coverage | Rules, AI, audio, help, and layout remain stable | `test/`, `e2e/` | Existing full-loop suites | gdUnit + e2e |

## Systems & Components

| System | Components (reads) | Components (writes) | Purpose |
|--------|--------------------|---------------------|---------|
| ScoreState / ScoreController | winner side, landlord seat, hand count, match target | cumulative seat scores, last hand delta, match winner | Track deterministic scoring and match completion |
| DoudizhuGame | round result and roles | optional score event/match state hook | Preserve card gameplay while exposing hand completion to scoring |
| Main UI projection | game state, score state, settings/help state | scoreboard, result summary, New Hand/New Match controls | Present progression without disturbing card play |

## Assets Needed

- No bitmap image assets are required for v0.6.0.
- Scoreboard and result summary use existing procedural UI panels/buttons/text.
- If icons or decorative badges become necessary, report them as missing first; do not invent file paths.
## Build Fix Tasks

| Task | Source | Status | Fix Scope | Verify |
|------|--------|--------|-----------|--------|
| P07 | Reviewer major UI finding | pending | Increase or compact `src/main.gd` result banner layout so five-line score summary plus New Hand/New Match/Quit controls fit without overflow at supported desktop sizes | gdUnit + ui-review |

