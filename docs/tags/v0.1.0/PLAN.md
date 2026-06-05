# Game Plan: Doudizhu

**Tag:** v0.1.0

## Game Description

Doudizhu is a 2D desktop card game where one human player completes a simplified but full-flow Doudizhu hand against two AI players. The first playable unit prioritizes a reliable round state machine, readable card-table UI, legal core card plays, simple AI, result resolution, and replay.

## Tag Mechanics

- [v0.1.0-M1] Round setup: starting a hand shuffles a 54-card deck, deals 17 cards to each player, reserves 3 bottom cards, and enters landlord selection with visible player hand and AI card counts.
- [v0.1.0-M2] Landlord selection: the player can call or decline landlord; the game assigns one landlord, grants bottom cards to that seat, updates role labels, and enters play phase.
- [v0.1.0-M3] Card selection: clicking cards in the human hand toggles selected state with visible lift/highlight feedback and preserves sorted hand order.
- [v0.1.0-M4] Core legal play: the player can play single, pair, three of a kind, bomb, or joker bomb; illegal or unsupported selections leave state unchanged and show a readable error.
- [v0.1.0-M5] Trick comparison and pass flow: players must beat the active trick unless they have initiative; legal passes advance turn, and when all opponents pass the last player to play gains initiative.
- [v0.1.0-M6] Hint: clicking Hint selects the smallest currently legal supported response, or shows that no valid play is available.
- [v0.1.0-M7] AI turns: AI seats automatically play the smallest legal supported response or pass, with recent play and card counts visible.
- [v0.1.0-M8] Result and replay: when any seat empties its hand, the game shows landlord/farmer win or loss and offers a New Round action.

## Playable Unit

- **Player experience:** Launch the game, receive cards, resolve landlord, play a simplified Doudizhu hand against two AI seats, see table state update after each action, reach a win/loss result, and start another hand.
- **Unit outcome:** A side empties a hand and a result banner appears; the player can start a new hand.
- **Scenes involved:** Main

| Mechanic | Player operation / content | Expected effect | Required visible content | Evidence |
|----------|----------------------------|-----------------|--------------------------|----------|
| [v0.1.0-M1] | Start scene or click New Round | New hand enters landlord phase | Player hand, AI counts, bottom-card placeholders, status prompt | gdUnit flow tests; e2e scene assertion |
| [v0.1.0-M2] | Click Call Landlord / Do Not Call | Landlord assigned and bottom cards granted | Role labels, bottom cards, play prompt | gdUnit state-machine tests; e2e click assertion |
| [v0.1.0-M3] | Click player cards | Selected cards visibly lift/highlight | Bottom hand with selected state | e2e click assertion; screenshot |
| [v0.1.0-M4] | Select supported/unsupported card groups and Play | Legal groups play; illegal groups show error and keep state | Center trick area, error/status label | gdUnit rule tests; e2e action test |
| [v0.1.0-M5] | Play or pass through a trick | Turn advances and initiative resets after passes | Active turn marker, pass/recent-play labels | gdUnit turn tests; e2e turn assertion |
| [v0.1.0-M6] | Click Hint | Legal response selected or no-play message appears | Selected cards or message | gdUnit hint tests; e2e hint assertion |
| [v0.1.0-M7] | Wait for AI turns | AI plays or passes automatically | AI recent play, AI card count changes | gdUnit AI tests; e2e async assertion |
| [v0.1.0-M8] | Finish hand and click New Round | Result shown, then new hand starts | Result banner, New Round button | gdUnit completion tests; e2e replay assertion |

- **Review focus:** Reviewers should inspect rule recognition/comparison, turn-state mutation, AI progression, UI event binding, and that illegal input cannot mutate the round.

## Risk Tasks

### 1. Card rule recognition and comparison
- **Why isolated:** Doudizhu combinations are easy to encode incorrectly; even the v0.1.0 subset must be deterministic and well tested before UI wiring.
- **Approach:** Implement pure rule helpers for card rank mapping, grouped counts, play classification, and comparison. Keep unsupported combinations explicitly invalid.
- **Systems:** CardRulesSystem or equivalent pure helper used by the play-flow system.
- **Components:** Card, CardCollection, PlayCandidate, TrickState.
- **Verify:**
  - Unit tests cover singles, pairs, triples, bombs, joker bomb, invalid selections, comparison edge cases, and bomb overrides.
  - Unsupported future patterns return invalid in v0.1.0.
  - No UI or random state required for rule tests.

### 2. Turn state machine
- **Why isolated:** Landlord assignment, initiative, passes, AI turns, and win detection can easily desynchronize.
- **Approach:** Implement pure flow transitions that accept explicit player actions or AI intents and return the next immutable or controlled mutable round state.
- **Systems:** RoundFlowSystem, TurnSystem, AISystem.
- **Components:** RoundState, PlayerState, TrickState, TurnState, RoleState.
- **Verify:**
  - Unit tests cover deal counts, landlord receives bottom cards, legal play turn advance, pass reset after two passes, AI pass/play, and win/loss detection.
  - Deterministic seeded setup exists for tests.

## Main Build

### Build Tasks

| Task | Game Mechanic Function | Player-Facing Outcome | Affected Systems / Scenes / UI | Integration Point | Verify |
|------|------------------------|-----------------------|--------------------------------|-------------------|--------|
| R1 | Implement and test core card rules | Player legal plays are accepted and invalid selections are rejected | Card data, rule helper/system, tests | Used by Play and Hint actions | gdUnit card-rule suite |
| R2 | Implement and test round/turn state machine | The hand progresses through deal, landlord, play, pass, AI, result | RoundFlowSystem, TurnSystem, AISystem, tests | Drives all UI actions | gdUnit flow suite |
| M01 | Create ECS component data for cards, players, round, turn, tricks, selection, and UI message state | Runtime state is explicit and queryable | `src/components/*`, component registry | Supports systems and tests | Component class load tests |
| M02 | Implement deck/deal setup | New hand appears with correct card counts | Deck helper/system, Main scene state setup | New Round/start scene | Unit test plus e2e visible counts |
| M03 | Implement landlord controls and role assignment | Player can resolve landlord phase | LandlordSystem, UI action bar | Call/Do Not Call buttons | Unit + e2e click test |
| M04 | Implement hand selection and sorting | Player can choose cards clearly | SelectionSystem, Main UI hand area | Card click handlers | E2E card selection test |
| M05 | Implement Play/Pass/Hint actions | Player can progress through a trick | PlaySystem, HintSystem, Message UI | Action bar buttons | Unit + e2e action tests |
| M06 | Implement simple AI turn executor | AI seats visibly play/pass | AISystem, turn scheduler, AI recent-play UI | After human/AI turn advance | Unit + e2e async test |
| M07 | Implement table UI projection | The game is readable and scannable | Main scene UI, projection systems | ECS state to Control nodes | Screenshot/e2e assertions |
| M08 | Implement result and replay | A completed hand resolves and can restart | ResultSystem, New Round button | Empty-hand detection | Unit + e2e replay test |

### Systems & Components

| System | Components (reads) | Components (writes) | Purpose |
|--------|--------------------|---------------------|---------|
| RoundSetupSystem | RoundState | PlayerState, HandState, BottomCards, TurnState, MessageState | Create a deterministic new hand |
| LandlordSystem | RoundState, PlayerState, BottomCards | RoleState, HandState, TurnState, MessageState | Resolve landlord phase |
| SelectionSystem | HandState, SelectionState | SelectionState | Toggle player card selection |
| CardRulesSystem | PlayCandidate, TrickState | RuleResult | Classify and compare supported plays |
| PlaySystem | SelectionState, HandState, TrickState, TurnState, RuleResult | HandState, TrickState, TurnState, MessageState | Apply human legal/illegal play |
| PassSystem | TrickState, TurnState | TurnState, TrickState, MessageState | Apply legal pass and initiative reset |
| HintSystem | HandState, TrickState, TurnState | SelectionState, MessageState | Select smallest legal supported response |
| AISystem | HandState, TrickState, TurnState | HandState, TrickState, TurnState, MessageState | Execute AI play/pass decisions |
| ResultSystem | HandState, RoleState | RoundState, MessageState | Detect winner and expose replay state |
| TableProjectionSystem | PlayerState, HandState, TrickState, TurnState, MessageState | NodeRef/UI state | Render table UI from ECS state |

### Assets Needed

- Procedural card faces using Control nodes, text labels, suit color, and card rectangles.
- Procedural green table background and panel UI.
- UI text labels and buttons for actions, roles, status, counts, and result.
- **Terrain approach:** N/A.

### Runtime Asset Assignments

| Task / Mechanic | Visible Content | Asset Row / Path | Runtime Size | Verification |
|-----------------|-----------------|------------------|--------------|--------------|
| M02 / [v0.1.0-M1] | Table background, player hand, AI counts | procedural | Full viewport; cards about 56x78 px | Screenshot/e2e visible nodes |
| M03 / [v0.1.0-M2] | Call/Do Not Call buttons and role labels | UI text | Action bar buttons; seat labels | E2E click and label assertion |
| M04 / [v0.1.0-M3] | Selected card highlight/lift | procedural | Card highlight visible at hand scale | Screenshot/e2e position/state assertion |
| M05 / [v0.1.0-M4] | Current trick and error/status message | UI text/procedural cards | Center table area | Unit and e2e assertions |
| M05 / [v0.1.0-M5] | Active turn marker and pass labels | UI text/procedural | Seat marker and status row | E2E assertion |
| M05 / [v0.1.0-M6] | Hint-selected cards or no-play message | procedural/UI text | Hand cards and status label | E2E assertion |
| M06 / [v0.1.0-M7] | AI recent play and card count changes | UI text/procedural cards | AI seat panels | E2E async assertion |
| M08 / [v0.1.0-M8] | Result banner and New Round button | UI text/procedural panel | Center overlay | E2E replay assertion |

### Verify

- Card-rule unit tests pass for supported and invalid combinations.
- Round-flow unit tests pass for deal, landlord, play, pass, AI, result, and replay.
- Player illegal plays do not change hand, trick, turn, or pass state.
- UI remains readable at 1280x720 with no overlapping hand/action/status elements.
- No missing textures are required because v0.1.0 uses procedural UI.
- Gameplay flow matches the v0.1.0 expected player experience.
- DAG check passes for ECS systems.
- All gdUnit tests pass.
- E2E suite can complete landlord selection, at least one legal play, pass/hint interaction, and result/replay path using deterministic setup or simulation hooks.

## Task Status

| # | Task | Status | Notes |
|---|------|--------|-------|
| R1 | Core card rules | verified | `CardRules` covers singles, pairs, triples, bombs, joker bomb, invalid patterns, and comparison tests. |
| R2 | Round/turn state machine | verified | `DoudizhuGame` covers deterministic deal, landlord assignment, play/pass/hint, AI turns, result, and replay. |
| M01 | Component data model | verified | `src/components/` contains gecs component data for round, hands, seats, roles, turn, trick, selection, and message. |
| M02 | Deck/deal setup | verified | New rounds shuffle/deal 17/17/17 plus 3 bottom cards and update visible counts. |
| M03 | Landlord controls | verified | Call/decline buttons assign landlord, grant bottom cards, update roles, and enter play. |
| M04 | Hand selection/sorting | verified | Clickable procedural card buttons toggle selection with lift/highlight while preserving sorted order. |
| M05 | Play/pass/hint actions | verified | Play rejects invalid selections without mutation, Pass advances legal turns, and Hint selects the smallest legal response. |
| M06 | Simple AI executor | verified | AI seats play the smallest legal response or pass, with recent play/count UI updates. |
| M07 | Table UI projection | verified | `scenes/main.tscn` renders procedural table, AI panels, bottom cards, trick/status, action bar, hand, and result banner. |
| M08 | Result/replay | verified | Empty-hand detection shows winner banner and New Round resets the hand. |
