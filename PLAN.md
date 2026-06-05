# Game Plan: Doudizhu

**Tag:** v0.2.0

## Game Description

Doudizhu is a 2D desktop card game where one human player completes a readable Doudizhu hand against two AI players. v0.2.0 keeps the shipped v0.1.0 hand loop and expands the supported non-special card combinations so hints, AI responses, and legal-play validation feel closer to real Doudizhu.

## Tag Mechanics

- [v0.2.0-M1] Three attachments: support three-with-one and three-with-pair classification, comparison, hint selection, and AI play.
- [v0.2.0-M2] Chains: support straights and consecutive pairs while excluding 2 and jokers from chain membership.
- [v0.2.0-M3] Airplane without wings: support consecutive triples without attachments, excluding 2 and jokers.
- [v0.2.0-M4] Expanded play integration: player Play, Hint, and AI turns can use the expanded combinations without regressing the v0.1.0 loop.

## Inherited Mechanics

- [v0.1.0-M1] Round setup: starting a hand shuffles a 54-card deck, deals 17 cards to each player, reserves 3 bottom cards, and enters landlord selection with visible player hand and AI card counts.
- [v0.1.0-M2] Landlord selection: the player can call or decline landlord; the game assigns one landlord, grants bottom cards to that seat, updates role labels, and enters play phase.
- [v0.1.0-M3] Card selection: clicking cards in the human hand toggles selected state with visible lift/highlight feedback and preserves sorted hand order.
- [v0.1.0-M4] Core legal play: the player can play single, pair, three of a kind, bomb, or joker bomb; illegal selections leave state unchanged and show a readable error.
- [v0.1.0-M5] Trick comparison and pass flow: players must beat the active trick unless they have initiative; legal passes advance turn and reset initiative after two opponent passes.
- [v0.1.0-M6] Hint: clicking Hint selects the smallest currently legal supported response, or shows that no valid play is available.
- [v0.1.0-M7] AI turns: AI seats automatically play the smallest legal supported response or pass, with recent play and card counts visible.
- [v0.1.0-M8] Result and replay: when any seat empties its hand, the game shows landlord/farmer win or loss and offers a New Round action.

## Playable Unit

- **Player experience:** Launch the game, resolve landlord, play through the same hand loop as v0.1.0, and see expanded legal combinations accepted by Play, Hint, and AI when available.
- **Unit outcome:** The hand can still reach win/loss result and replay; expanded combinations can be used during the hand without breaking turn flow.
- **Scenes involved:** Main

| Mechanic | Player operation / content | Expected effect | Required visible content | Evidence |
|----------|----------------------------|-----------------|--------------------------|----------|
| [v0.2.0-M1] | Select or receive hint for three-with-one / three-with-pair | Combination is accepted when legal and compared by triple rank | Center trick area and status text show the played cards | gdUnit card-rule tests |
| [v0.2.0-M2] | Select or receive hint for straight / consecutive pairs | Chains compare only against same type and same length; chains containing 2/jokers are rejected | Hint selection or invalid-play status remains readable | gdUnit card-rule tests; e2e straight follow test |
| [v0.2.0-M3] | Select or receive hint for airplane without wings | Consecutive triples are accepted and compared by highest triple rank | Center trick/status area shows the play outcome | gdUnit card-rule tests |
| [v0.2.0-M4] | Use Hint and Play on an expanded-rule fixture | UI selects and plays an expanded straight response, then AI/pass flow continues | Selected cards, center trick type, hand count, and status update | e2e expanded-rule test |
| [v0.1.0-M1..M8] | Existing hand-loop operations | Existing setup, landlord, selection, core play, pass, hint, AI, result, and replay still pass | Existing table UI remains readable | inherited e2e suite |

- **Review focus:** Reviewers should inspect rule classification/comparison, chain length matching, exclusion of 2/jokers from chains, hint/AI candidate ordering, and that expanded rule support does not regress inherited hand flow.

## Risk Tasks

### 1. Expanded combination recognition
- **Why isolated:** Doudizhu chain and attachment rules are easy to over-accept, especially around 2/jokers and mismatched lengths.
- **Approach:** Keep classification pure in `CardRules`, encode only roadmap-scoped combinations, and require same type plus same length for chain comparison.
- **Verify:**
  - Unit tests cover three-with-one, three-with-pair, straight, consecutive pairs, airplane without wings, invalid chains containing 2/jokers, and length mismatch comparison.

### 2. Hint and AI candidate generation
- **Why isolated:** Hint/AI must generate expanded combinations without choosing illegal or unrelated groups.
- **Approach:** Generate candidate groups from sorted hands and reuse `classify` + `can_beat` as the single legality gate.
- **Verify:**
  - Unit and e2e tests prove the smallest legal expanded straight response can be selected and played.

## Main Build

| Task | Game Mechanic Function | Player-Facing Outcome | Affected Systems / Scenes / UI | Integration Point | Verify |
|------|------------------------|-----------------------|--------------------------------|-------------------|--------|
| E01 | Add three-with-one and three-with-pair | More realistic triple plays are legal | `CardRules`, tests | Play/Hint/AI legality | gdUnit |
| E02 | Add straights and consecutive pairs | Chain plays can be used and compared | `CardRules`, tests, e2e fixture | Play/Hint/AI legality | gdUnit + e2e |
| E03 | Add airplane without wings | Consecutive triples can be used | `CardRules`, tests | Play/Hint/AI legality | gdUnit |
| E04 | Integrate expanded candidate search | Hint and AI can choose expanded legal responses | `CardRules.find_smallest_legal`, debug fixture, e2e | Main scene action flow | gdUnit + e2e |

## Systems & Components

| System | Components (reads) | Components (writes) | Purpose |
|--------|--------------------|---------------------|---------|
| CardRules | card dictionaries | classification dictionaries | Classify and compare v0.1.0 and v0.2.0 supported combinations |
| DoudizhuGame | hands, trick, turn state | hands, trick, turn state, message | Apply player, hint, pass, AI, result, and replay flow |
| RoundFlowSystem | ECS shell state | ECS shell state | ECS integration placeholder for round flow |
| TableProjectionSystem | game state | Control nodes | Render table UI from game state |

## Assets Needed

- No new visual assets are required for v0.2.0.
- Procedural card faces and table UI from v0.1.0 remain in use.

## Runtime Asset Assignments

| Task / Mechanic | Visible Content | Asset Row / Path | Runtime Size | Verification |
|-----------------|-----------------|------------------|--------------|--------------|
| E01-E04 / [v0.2.0-M1..M4] | Existing procedural cards, status text, trick area, and hand selection | procedural/UI text | Existing card and table sizes | Unit and e2e assertions |

## Verify

- Card-rule unit tests pass for v0.1.0 and v0.2.0 supported combinations.
- Expanded chains reject 2 and jokers.
- Expanded comparisons require same type and same length, except bombs and joker bomb overrides.
- Hint/AI candidate generation can find expanded legal responses.
- Inherited v0.1.0 e2e suite still passes.
- New v0.2.0 e2e expanded straight follow test passes.
- Headless build passes.
- Project verifier passes.

## Task Status

| # | Task | Status | Notes |
|---|------|--------|-------|
| E01 | Three attachments | verified | `CardRules` classifies and compares three-with-one and three-with-pair by triple rank. |
| E02 | Straights and consecutive pairs | verified | Chains exclude 2/jokers and require same length for comparison. |
| E03 | Airplane without wings | verified | Consecutive triples classify and compare by highest triple rank. |
| E04 | Expanded candidate search | verified | `find_smallest_legal` generates expanded responses; e2e verifies straight hint/play integration. |
