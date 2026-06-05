# Doudizhu

**Tag:** v0.3.0

## Dimension: 2D

## Input Actions

This tag is mouse-driven through UI buttons and card controls. No custom `project.godot` input actions are required for v0.3.0.

v0.3.0 is a presentation pass over the existing Doudizhu model and ECS boundary. It does not add new components or systems; the table projection in `src/main.gd` now handles clearer spacing, selection feedback, active/result styling, and common desktop viewport sizes.

| Action | Keys |
|--------|------|
| ui_accept | Enter / Space (Godot default, optional button activation) |
| mouse_select | Mouse Left (handled by Control input) |

## Component Registry

### Core Components

| Component | Field | Type | Default | Description |
|-----------|-------|------|---------|-------------|
| C_NodeRef | node | Node | null | Scene node bound to an ECS entity when a UI projection exists |
| C_Position2D | position | Vector2 | Vector2.ZERO | Optional 2D table/layout position for projected card nodes |

### Game Components

| Component | Field | Type | Default | Description |
|-----------|-------|------|---------|-------------|
| C_Card | rank | int | 0 | Rank order from 3 through jokers |
| C_Card | suit | String | "" | Suit label or joker type |
| C_Card | card_id | int | -1 | Unique id for stable selection and sorting |
| C_Hand | cards | Array | [] | Ordered card ids held by a seat |
| C_PlayerSeat | seat_index | int | 0 | 0 human, 1 AI left, 2 AI right |
| C_PlayerSeat | display_name | String | "" | Human-readable seat label |
| C_PlayerSeat | is_human | bool | false | Whether the seat is player-controlled |
| C_Role | role | String | "undecided" | landlord, farmer, or undecided |
| C_RoundState | phase | String | "setup" | setup, landlord, play, result |
| C_RoundState | winner_side | String | "" | landlord, farmers, or empty before result |
| C_TurnState | current_seat | int | 0 | Seat whose action is active |
| C_TurnState | initiative_seat | int | -1 | Seat allowed to lead any play |
| C_TurnState | consecutive_passes | int | 0 | Passes since the last valid play |
| C_TrickState | cards | Array | [] | Card ids in the active trick |
| C_TrickState | play_type | String | "" | single, pair, triple, bomb, joker_bomb |
| C_TrickState | primary_rank | int | -1 | Rank used for comparison |
| C_TrickState | owner_seat | int | -1 | Seat that made the active trick |
| C_BottomCards | cards | Array | [] | Three bottom cards before landlord assignment |
| C_Selection | selected_cards | Array | [] | Human-selected card ids |
| C_Message | text | String | "" | Current status or validation message |
| C_AIProfile | strategy | String | "smallest_legal" | v0.1.0 AI behavior |

### Tag Components

| Tag | Purpose |
|-----|---------|
| T_HumanSeat | Identifies the player seat |
| T_AISeat | Identifies AI seats |
| T_TableUI | Identifies UI projection entity |
| T_NewRoundRequested | Marks that a new hand should start on next logic tick |

## System Schedule

### Phase: Setup

| Order | System | Reads | Writes | Creates Node | Requires Node |
|-------|--------|-------|--------|--------------|---------------|
| 1 | RoundSetupSystem | C_RoundState | C_Card, C_Hand, C_PlayerSeat, C_BottomCards, C_TurnState, C_Message | — | — |

### Phase: Input

| Order | System | Reads | Writes | Creates Node | Requires Node |
|-------|--------|-------|--------|--------------|---------------|
| 10 | UIInputSystem | C_RoundState, C_TurnState, C_Hand | C_Selection, C_Message, T_NewRoundRequested | — | — |

### Phase: Logic

| Order | System | Reads | Writes | Creates Node | Requires Node |
|-------|--------|-------|--------|--------------|---------------|
| 20 | LandlordSystem | C_RoundState, C_PlayerSeat, C_BottomCards, C_Hand | C_Role, C_Hand, C_TurnState, C_Message | — | — |
| 30 | CardRulesSystem | C_Card, C_Selection, C_TrickState | C_Message | — | — |
| 40 | PlaySystem | C_RoundState, C_TurnState, C_Selection, C_Hand, C_TrickState | C_Hand, C_TrickState, C_TurnState, C_Message | — | — |
| 50 | PassSystem | C_RoundState, C_TurnState, C_TrickState | C_TurnState, C_TrickState, C_Message | — | — |
| 60 | HintSystem | C_Hand, C_TrickState, C_TurnState | C_Selection, C_Message | — | — |
| 70 | AISystem | C_AIProfile, C_Hand, C_TrickState, C_TurnState | C_Hand, C_TrickState, C_TurnState, C_Message | — | — |
| 80 | ResultSystem | C_Hand, C_Role | C_RoundState, C_Message | — | — |

### Phase: Materialization

| Order | System | Reads | Writes | Creates Node | Requires Node |
|-------|--------|-------|--------|--------------|---------------|
| 90 | TableProjectionSystem | C_PlayerSeat, C_Role, C_Hand, C_Selection, C_BottomCards, C_TrickState, C_TurnState, C_Message, C_RoundState | C_NodeRef | Control/Card controls | Main UI root |

### Phase: Cleanup

| Order | System | Reads | Writes | Creates Node | Requires Node |
|-------|--------|-------|--------|--------------|---------------|
| 99 | NewRoundCleanupSystem | T_NewRoundRequested | C_RoundState, C_Selection, C_Message | — | — |

## Scene Markers

| Marker Type | Components | Notes |
|-------------|------------|-------|
| TableUIRootMarker | T_TableUI, C_NodeRef | Main scene UI root for projection |

## Entity Archetypes

### Human Seat
- C_PlayerSeat, C_Hand, C_Role, T_HumanSeat

### AI Seat
- C_PlayerSeat, C_Hand, C_Role, C_AIProfile, T_AISeat

### Round Controller
- C_RoundState, C_TurnState, C_TrickState, C_BottomCards, C_Message

### Card
- C_Card

### Table UI
- T_TableUI, C_NodeRef

## Node Projection

| System | When Component Added | Node Created | Parent |
|--------|----------------------|--------------|--------|
| TableProjectionSystem | T_TableUI / C_NodeRef | Control containers for seats, hand, trick, actions, result | Main root |
| TableProjectionSystem | C_Hand card ids | Button/Control card faces | PlayerHand or TrickArea |
| TableProjectionSystem | C_Message | Label text update | Status area |

## Build Order

1. Pure card/deck model and rule helpers.
2. ECS component definitions.
3. Pure round and turn flow systems.
4. AI and hint helpers.
5. Main UI projection and button/card event wiring.
6. Result/replay flow.
7. gdUnit coverage and deterministic test setup.
8. E2E coverage for the playable loop.

## Asset Hints

- Procedural card face controls (56x78 px baseline, rank/suit text and color).
- Procedural table background (green felt-like flat or subtle texture).
- Procedural panels/buttons/status labels.
