# Plan: v0.7.0 Guided Onboarding And Accessibility

## Tag Goal

Make the shipped Doudizhu prototype easier to learn and safer to play by adding an optional guided tutorial overlay, contextual next-action prompts, keyboard-friendly controls, and lightweight persistent match statistics without changing card rules.

## Player Experience

A new player can open Tutorial from the table, step through landlord selection, card selection, legal play, pass, hint, scoring, and match progression explanations, then continue playing normally. Returning players can dismiss guidance, use keyboard shortcuts for core controls, and see compact lifetime stats for completed hands and matches.

## Tag Mechanics

- [v0.7.0-M1] Guided tutorial overlay: a non-blocking, step-based overlay explains the current phase, table areas, supported combinations, scoring, New Hand, and New Match controls with Next/Back/Close actions.
- [v0.7.0-M2] Contextual action coach: during play, concise status guidance highlights the player's current legal options, including when to call landlord, select cards, beat the active trick, pass, or use Hint.
- [v0.7.0-M3] Keyboard accessibility: core buttons can be reached and activated by keyboard shortcuts, selected-card actions remain clear, and help/tutorial controls expose readable shortcut labels.
- [v0.7.0-M4] Persistent session statistics: completed hands and matches update lightweight stats such as hands played, matches completed, player-side wins, landlord wins, farmer wins, and best cumulative score; stats can be viewed and reset from the UI.

## Inherited Mechanics

- [v0.6.0-M1..M4] Hand scoring, cumulative match score, match completion, and score summary UI remain intact.
- [v0.5.0-M1..M4] Audio feedback, optional music, settings controls, restart/quit flow, and final consistency remain intact.
- [v0.4.0-M1..M4] Improved hints, AI reasons, hand summary, and rule/help affordance remain visible and stable.
- [v0.3.0-M1..M3] Presentation, responsive layout, and visual QA baselines remain readable.
- [v0.2.0-M1] Expanded non-special combinations continue to work through Play, Hint, and AI candidate search.
- [v0.1.0-M1..M8] Round setup, landlord selection, card selection, legal play, pass, hint, AI turns, result, and replay remain the gameplay foundation.

## Playable Unit

The player launches Main, opens Tutorial, follows several guided steps, plays a hand with contextual guidance available, completes scoring/match progression, sees persistent stats update, and can reset stats or start a new match.

## Acceptance Matrix

| Mechanic | Player Scenario | Expected Result | Observable Evidence | Verify |
|----------|-----------------|-----------------|---------------------|--------|
| [v0.7.0-M1] | Open Tutorial from the table and step through it | Overlay advances, retreats, closes, and does not corrupt game state | Tutorial title/body/step controls are visible and stable | e2e tutorial navigation + ui-review |
| [v0.7.0-M2] | Reach landlord, play, follow, and result phases | Guidance text matches the current phase and available player actions | Coach/status text changes with phase and active trick | gdUnit phase-guide tests + e2e smoke |
| [v0.7.0-M3] | Use keyboard shortcuts for help/tutorial/hint/pass/play where valid | Shortcuts activate the same handlers as buttons and show readable labels | UI labels and action results match button behavior | e2e keyboard interactions + input mapping check |
| [v0.7.0-M4] | Finish hands/matches, restart, and reset stats | Stats persist across New Hand/New Match in the running app and reset only on Reset Stats | Stats panel values update predictably | gdUnit stats tests + e2e stats flow |

## Risk Tasks

### 1. Tutorial overlay must not block core controls unexpectedly
- **Why isolated:** The game already has help/settings/result panels; another overlay can cause focus and z-order regressions.
- **Approach:** Use a single tutorial panel with explicit Close and predictable keyboard focus; never intercept gameplay unless visible.
- **Verify:** E2E opens/closes tutorial in landlord, play, and result phases, then continues the game.

### 2. Guidance must reflect actual game state
- **Why isolated:** Incorrect coaching is worse than no coaching and can desync from legal-play rules.
- **Approach:** Generate coach text from phase, active player, initiative, active trick, selected cards, and score/match state instead of hard-coded scene assumptions.
- **Verify:** Unit tests cover landlord, player initiative, must-beat, no-selection, legal selection, pass, result, and match-ended guidance.

### 3. Stats must update once per completed hand
- **Why isolated:** Result UI can refresh many times and New Hand/New Match reset boundaries differ.
- **Approach:** Record stats only after the existing score-result seam confirms a newly applied hand result; guard with a result key or score hand count, not every UI projection.
- **Verify:** Tests ensure repeated UI refresh does not double-count, persistence uses isolated test storage, and Reset Stats does not reset match score unless explicitly intended.

## Main Build

| Task | Status | Game Mechanic Function | Player-Facing Outcome | Affected Systems / Scenes / UI | Integration Point | Verify |
|------|--------|------------------------|-----------------------|--------------------------------|-------------------|--------|
| P01 | completed | Tutorial model/controller | Player can step through onboarding | `src/main.gd` (TUTORIAL_STEPS, tutorial_index, tutorial_visible) embedded via `_on_tutorial_*` and shortcut keys | Main table overlay controls | gdUnit + e2e |
| P02 | completed | Tutorial UI panel | Tutorial is readable and dismissible | `src/main.gd` procedural Controls | Help/settings/table overlay stack | e2e + ui-review |
| P03 | completed | Contextual coach text | Player receives phase-appropriate next-action guidance | `src/main.gd`, game/score helpers | Existing status/help projection | gdUnit + e2e |
| P04 | completed | Keyboard shortcuts | Common actions are reachable without mouse | `src/main.gd` `_handle_shortcut` method | Existing button callbacks | input-mapper + e2e |
| P05 | completed | Persistent stats state | Hands and matches update compact lifetime stats | `src/score_state.gd` (stats_* fields) | Newly applied score result | gdUnit |
| P06 | completed | Stats UI/reset | Player can view and clear stats | `src/main.gd` procedural Controls (stats_panel, stats_reset_button) | Existing scoreboard/settings/help area | e2e + ui-review |
| P07 | completed | Regression coverage | Rules, score, audio, layout, and prior tests remain stable | `test/test_main.gd` (19 tests), `test/` | Existing verification suites | gdUnit + e2e |
| P08 | completed | Tutorial modal blocker | Tutorial overlay blocks interaction with underlying game elements | `src/main.gd` — add `tutorial_blocker` ColorRect | Tutorial panel | e2e + ui-review |
| P09 | completed | E2E tests for v0.7.0 | Tutorial navigation, keyboard shortcuts, and stats flows tested end-to-end | `e2e/` (3 test files, 14 test functions) | Playable unit path | e2e smoke |

## Systems & Components

| System | Components (reads) | Components (writes) | Purpose |
|--------|--------------------|---------------------|---------|
| TutorialState / TutorialController | current step, game phase, visibility | tutorial index, visible flag | Keep onboarding navigation deterministic and testable |
| CoachTextBuilder | game phase, selected cards, active trick, score/match state | guide string | Present accurate contextual next-action guidance |
| StatsState | hand result, match result, player side, scores | lifetime counters, best score | Track lightweight session statistics with reset boundary |
| Main UI projection | game state, score state, tutorial/stats state | overlay, shortcut labels, stats panel | Present onboarding/accessibility without changing rules |

## Assets Needed

- No bitmap image assets are required for v0.7.0.
- Tutorial, shortcut, and stats affordances use existing procedural UI panels/buttons/text.
- If iconography becomes necessary, log it as missing in `ASSETS.md`; do not invent asset paths.


