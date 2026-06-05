# Game Plan: Doudizhu

**Tag:** v0.4.0

## Game Description

Doudizhu is a 2D desktop card game where one human player completes a readable Doudizhu hand against two AI players. v0.4.0 keeps the v0.3.0 presentation and expanded-rule hand loop, then improves AI choices, Hint usefulness, and in-game usability feedback so the player better understands what happened and what to do next.

## Tag Mechanics

- [v0.4.0-M1] Lower-cost Hint selection: Hint prefers the cheapest legal response that beats the active trick, avoids bombs/joker bomb unless required, and explains the chosen play type in status text.
- [v0.4.0-M2] Improved AI choice policy: AI uses the same low-cost candidate scoring for follow and lead decisions, avoids wasting bombs on ordinary tricks when alternatives exist, and records a readable reason for its visible recent play.
- [v0.4.0-M3] Hand summary panel: the player can read a compact summary of singles, pairs, triples, bombs, chain opportunities, and remaining card count during play.
- [v0.4.0-M4] Rule/help affordance: a lightweight rules/help view explains supported combinations, initiative/pass rules, Hint behavior, and result conditions without leaving the Main scene.

## Inherited Mechanics

- [v0.3.0-M1] Presentation pass: improved card spacing, selected-card feedback, AI active-turn highlight, panel/card contrast, and result banner presentation remain intact.
- [v0.3.0-M2] Responsive desktop layout: Main remains readable at 1280x720, 1366x768, and 1600x900 without overlapping AI panels, trick/status/action bands, or player hand.
- [v0.3.0-M3] Visual QA reference screenshots remain available for launch, selected-card, and result states.
- [v0.2.0-M1] Expanded non-special combinations: three-with-one, three-with-pair, straights, consecutive pairs, and airplane without wings work through Play, Hint, and AI candidate search.
- [v0.1.0-M1] Round setup: starting a hand shuffles a 54-card deck, deals 17 cards to each player, reserves 3 bottom cards, and enters landlord selection with visible player hand and AI card counts.
- [v0.1.0-M2] Landlord selection: the player can call or decline landlord; the game assigns one landlord, grants bottom cards to that seat, updates role labels, and enters play phase.
- [v0.1.0-M3] Card selection: clicking cards toggles selected state with visible lift/highlight feedback and preserves sorted hand order.
- [v0.1.0-M4..M8] Core legal play, pass flow, Hint, AI turns, result, and replay remain playable and covered by inherited e2e tests.

## Playable Unit

- **Player experience:** Launch the full-rule hand loop, use Hint to get a better low-cost response, watch AI make less wasteful plays, inspect a compact hand summary, open rules/help, and still complete/replay a hand.
- **Unit outcome:** The complete hand loop remains playable and replayable; AI and player assistance feel more understandable without changing supported Doudizhu rules.
- **Scenes involved:** Main

| Mechanic | Player operation / content | Expected effect | Required visible content | Evidence |
|----------|----------------------------|-----------------|--------------------------|----------|
| [v0.4.0-M1] | Click Hint when following a trick and when leading | Selected cards are the lowest-cost legal candidate; status names the play type and cost rationale | Selected hand cards, status text with Hint explanation | New e2e + gdUnit candidate-scoring tests |
| [v0.4.0-M2] | Let AI respond to ordinary and high-value tricks | AI plays low-cost legal responses and avoids bombs unless needed; recent play includes reason text | AI panel recent play/reason, card count change, current trick | New e2e + gdUnit AI policy tests |
| [v0.4.0-M3] | Read the hand summary during play | Summary updates after deal, selection, play, and new round | Summary panel/label with counts and opportunities | New e2e layout/content test |
| [v0.4.0-M4] | Open and close rules/help from the action area | Supported rules and flow are visible without leaving Main; gameplay resumes unchanged | Help button, help panel, close action, readable rules text | New e2e UI test |

## Risk Tasks

### 1. Candidate scoring must not break legality
- **Why isolated:** AI/Hint policy changes can accidentally choose illegal combinations or compare against the wrong active trick.
- **Approach:** Keep `CardRules.classify` and `can_beat` as the legality gate; add scoring after legal candidate generation.
- **Verify:** gdUnit tests cover scoring order for singles, pairs, chains, bombs, joker bomb, lead state, and follow state.

### 2. Help/summary UI must not crowd the table
- **Why isolated:** v0.3.0 established non-overlap at common desktop sizes; new labels and help controls can regress that.
- **Approach:** Add compact summary/help controls to existing bands and use an overlay/modal for longer help text.
- **Verify:** e2e checks at 1280x720 and result/play states prove no hand/action/status overlap.

### 3. AI reason text must stay concise
- **Why isolated:** Long recent-play explanations can overflow AI panels.
- **Approach:** Store short reason strings and clamp/autowrap panel text within existing seat panel dimensions.
- **Verify:** e2e asserts reason labels are visible and bounded.

## Main Build

| Task | Game Mechanic Function | Player-Facing Outcome | Affected Systems / Scenes / UI | Integration Point | Verify |
|------|------------------------|-----------------------|--------------------------------|-------------------|--------|
| P01 | Candidate scoring helper | Hint/AI can rank legal plays by low cost and bomb conservation | `src/card_rules.gd`, `test/test_card_rules.gd` | `CardRules.find_*` helpers | gdUnit |
| P02 | Hint explanation | Player sees why Hint selected cards | `src/doudizhu_game.gd`, `src/main.gd` | Hint button/status refresh | gdUnit + e2e |
| P03 | AI policy and reason text | AI responses feel less wasteful and visible reasons explain play/pass | `src/doudizhu_game.gd`, AI panel UI | `_ai_step`, recent play display | gdUnit + e2e |
| P04 | Hand summary | Player can scan hand composition and chain opportunities | `src/doudizhu_game.gd`, `src/main.gd` | Main scene refresh | e2e |
| P05 | Rule/help affordance | Player can read supported combinations and flow rules in scene | `src/main.gd` | Action/help UI overlay | e2e + visual QA |
| P06 | Regression coverage | Prior mechanics remain stable | `test/`, `e2e/` | Existing suite | gdUnit + e2e |

## Systems & Components

| System | Components (reads) | Components (writes) | Purpose |
|--------|--------------------|---------------------|---------|
| CardRules | card dictionaries, active trick | scored candidate dictionaries | Generate and score legal candidates for Hint and AI |
| DoudizhuGame | hands, trick, turn state | selected cards, recent play reasons, hand summary, message | Apply improved Hint/AI policy and expose usability text |
| Main UI projection | game state, summary/help text | Control nodes | Render hand summary, help affordance, and AI reason text |

## Assets Needed

- No bitmap card/table art is required for v0.4.0.
- New UI text/panel affordances are procedural Godot Controls.
- Updated visual QA screenshots may be captured during evaluation if the Main scene layout changes.

## Runtime Asset Assignments

| Task / Mechanic | Visible Content | Asset Row / Path | Runtime Size | Verification |
|-----------------|-----------------|------------------|--------------|--------------|
| P02 / [v0.4.0-M1] | Hint explanation status text | procedural/UI text | Status band, clamped width | e2e |
| P03 / [v0.4.0-M2] | AI recent play reason | procedural/UI text | AI panel recent row | e2e |
| P04 / [v0.4.0-M3] | Hand summary panel/label | procedural_panels_buttons / procedural | Compact panel near status/action bands | e2e + visual QA |
| P05 / [v0.4.0-M4] | Rules/help panel | procedural_panels_buttons / procedural | Modal/overlay within 1280x720 viewport | e2e + visual QA |

## Verify

- Headless build passes.
- gdUnit suite passes, including candidate scoring, Hint selection, AI policy, and hand summary helpers.
- Inherited v0.1.0, v0.2.0, and v0.3.0 e2e suite passes.
- v0.4.0 e2e tests cover Hint explanation, AI reason text, hand summary, and help open/close behavior.
- Visual inspection confirms summary/help additions do not overlap action buttons, cards, status, AI panels, or result banner at 1280x720.

## Task Status

| # | Task | Status | Notes |
|---|------|--------|-------|
| P01 | Candidate scoring helper | verified | `CardRules` legal candidate scoring added; gdUnit covers bomb conservation and required bomb override. |
| P02 | Hint explanation | verified | Hint status keeps inherited `Hint:` prefix and adds low-cost rationale; gdUnit/e2e pass. |
| P03 | AI policy and reason text | verified | AI uses scored candidates, conserves bombs in fixture, and exposes concise reason text; gdUnit/e2e pass. |
| P04 | Hand summary | verified | Summary text reports count groups and chains; gdUnit/e2e pass. |
| P05 | Rule/help affordance | verified | Help button, modal blocker, close action, and rules text added in Main scene; headless/e2e pass. |
| P06 | Regression coverage | verified | Headless build passes; gdUnit 19/19 and e2e 16/16 pass. |
