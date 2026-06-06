# Structure: Doudizhu

**Tag:** v0.6.0
**Theme:** Scoring And Match Progression

## Scope

v0.6.0 adds simple scorekeeping, cumulative match progression, score summary UI, and distinct New Hand/New Match reset boundaries. It must not change shipped card legality, combination recognition, or AI policy except where tests need to observe completed hand results.

## Architecture Decisions

- Keep score logic separate from card-rule logic so `CardRules.classify` and `CardRules.can_beat` remain untouched.
- Use deterministic simple scoring before any advanced Doudizhu multiplier system.
- Treat a hand reset and a match reset as different operations: New Hand clears cards/trick/selection while preserving match score; New Match clears both match score and current hand.
- Keep score UI textual/procedural and compact, reusing existing panel/button style.
- Add test hooks or getters for score state so headless tests do not depend on visual parsing alone.

## Current Tag Systems

| System / Helper | File | Reads | Writes / Emits | Purpose | Tasks |
|-----------------|------|-------|----------------|---------|-------|
| ScoreState / ScoreController | `src/score_state.gd` or equivalent | winner side, landlord seat, seat ids, target settings | cumulative scores, last hand delta, hands played, match winner | Centralize hand scoring and match progression | P01, P02, P05 |
| MainScoreProjection | `src/main.gd` | score state, result state, current phase | scoreboard labels, result score text, New Hand/New Match state | Render progression and connect reset affordances | P03, P04 |
| RoundToScoreBridge | `src/doudizhu_game.gd` or Main result handler | completed hand result, roles | score application request | Apply score exactly once per completed hand | P01, P02 |

## Existing Systems Touched

| Existing System | File | Allowed Change | Guardrail |
|-----------------|------|----------------|-----------|
| CardRules | `src/card_rules.gd` | No planned functional change | Do not add or alter combination rules in v0.6.0 |
| DoudizhuGame | `src/doudizhu_game.gd` | Expose result winner/roles cleanly if not already available; prevent duplicate score application | Keep turn/rule behavior stable |
| Main UI | `src/main.gd` | Add scoreboard, score summary, New Hand/New Match controls | No overlap with hand, trick, help, summary, audio/settings, or result controls |
| AudioController | `src/audio_controller.gd` | Optional result/match sound reuse only | Do not require new external audio assets |

## Data / State

| State | Owner | Lifetime | Test Visibility |
|-------|-------|----------|-----------------|
| Seat score totals | ScoreState | current match | public getter/debug label |
| Last hand delta | ScoreState | until next scored hand/new match | unit/e2e assertion |
| Hands played | ScoreState | current match | public getter/scoreboard |
| Match target | ScoreState/Main config | scene/session | unit test constant/config getter |
| Match winner | ScoreState | when target reached | result banner/e2e locator |
| Score applied flag | RoundToScoreBridge | current hand | unit test to prevent duplicate score |

## Scoring Model

- Base score defaults to 1 point per farmer seat.
- If landlord wins: landlord gains +2, each farmer loses -1.
- If farmers win: each farmer gains +1, landlord loses -2.
- A match ends when a configurable target score is reached or a compact hand-count cap is reached, whichever implementation proves clearer and more testable.
- Advanced multipliers, bidding stakes, spring, and bomb multipliers are deferred beyond v0.6.0.

## Component Registry

No new ECS components are required for v0.6.0 unless the build phase chooses to model score state as ECS data. Existing component classes remain inherited from previous tags.

| Component | File | Current Tag Status |
|-----------|------|--------------------|
| C_Hand | `src/components/c_hand.gd` | inherited |
| C_Message | `src/components/c_message.gd` | inherited |
| C_PlayerSeat | `src/components/c_player_seat.gd` | inherited |
| C_Role | `src/components/c_role.gd` | inherited |
| C_RoundState | `src/components/c_round_state.gd` | inherited |
| C_Selection | `src/components/c_selection.gd` | inherited |
| C_TrickState | `src/components/c_trick_state.gd` | inherited |
| C_TurnState | `src/components/c_turn_state.gd` | inherited |

## System Schedule

| System / Helper | Tick / Trigger | Order | Notes |
|-----------------|----------------|-------|-------|
| DoudizhuGame | existing turn/result flow | before scoring | Produces completed hand winner/roles. |
| RoundToScoreBridge | result transition | once per hand result | Applies score and marks hand scored. |
| ScoreState | event triggered | after result known | Updates totals and match winner. |
| MainScoreProjection | UI refresh | after scoring and on hand/match reset | Refreshes scoreboard and result summary. |

## Tests Required

| Test Area | Expected Coverage |
|-----------|-------------------|
| Unit | Score deltas for landlord/farmer wins, cumulative totals, match target, New Hand/New Match reset boundaries, duplicate application guard |
| E2E | Complete or force hand result, read score summary, start New Hand with score persistence, start New Match with cleared score |
| Regression | Existing rule, AI, hint, help, audio/settings, and responsive layout tests remain green |
