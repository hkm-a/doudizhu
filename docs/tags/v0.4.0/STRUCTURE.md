# Doudizhu

**Tag:** v0.4.0

## Dimension: 2D

## Input Actions

v0.4.0 remains mouse-driven through UI buttons and card controls. No custom `project.godot` input actions are required.

| Action | Keys |
|--------|------|
| ui_accept | Enter / Space (Godot default, optional button activation) |
| mouse_select | Mouse Left (handled by Control input) |

## Architecture Delta

v0.4.0 keeps the existing single-scene Doudizhu model and procedural UI. The main architecture change is policy and usability data flowing through the existing model:

- `CardRules` gains legal candidate scoring helpers.
- `DoudizhuGame` uses scored candidates for Hint and AI, stores concise AI reason text, and exposes hand-summary/help content.
- `Main` renders the new summary/help/reason text through Control nodes without introducing new scenes.

No new ECS component files are required unless build work chooses to materialize the new text fields as components. Existing component and system files remain valid.

## Component Registry

### Existing Components

| Component | Field | Type | Default | v0.4.0 Use |
|-----------|-------|------|---------|------------|
| C_Hand | cards | Array[int] | [] | Source for candidate scoring and hand summary |
| C_Message | text | String | "" | Source for Hint explanation and validation messages |
| C_PlayerSeat | seat_index/display_name/is_human | mixed | existing defaults | Seat identity for AI reason display |
| C_Role | role | String | "undecided" | Help/result context and side labels |
| C_RoundState | phase/winner_side | mixed | existing defaults | Help/result visibility and replay flow |
| C_Selection | selected_cards | Array[int] | [] | Hint-selected card ids |
| C_TrickState | cards/play_type/primary_rank/owner_seat | mixed | existing defaults | Active trick for scoring legal responses |
| C_TurnState | current_seat/initiative_seat/consecutive_passes | mixed | existing defaults | Determines lead/follow scoring and pass availability |

### Data Added In Model Layer

| Data | Owner | Type | Purpose |
|------|-------|------|---------|
| hint_reason | DoudizhuGame | String | Human-readable explanation for selected Hint cards |
| ai_reasons | DoudizhuGame | Array[String] | Short reason for each AI play/pass visible in seat panel |
| hand_summary | DoudizhuGame helper output | Dictionary/String | Counts singles, pairs, triples, bombs, and chains |
| help_visible | Main UI | bool | Whether the rules/help panel is open |

## System Schedule

### Phase: Logic

| Order | System | Reads | Writes | Purpose |
|-------|--------|--------|--------|---------|
| 30 | CardRules candidate scoring | Hand cards, active trick, initiative | Scored legal candidates | Rank legal plays by low cost, chain quality, and bomb conservation |
| 40 | HintSystem | Scored candidates, turn state | C_Selection, C_Message, hint_reason | Select best player response and explain it |
| 70 | AISystem | Scored candidates, turn state | Hands, trick, turn state, ai_reasons, message | Choose less wasteful AI plays and explain them |
| 90 | TableProjectionSystem | Game state, summary/help/reason text | Control nodes | Render summary, help, AI recent reason, and existing table UI |

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

| UI Area | Node Created/Updated | Parent | v0.4.0 Contract |
|---------|----------------------|--------|-----------------|
| AI panels | Recent/reason labels | AILeftPanel/AIRightPanel | Show latest play/pass plus concise reason without overflow |
| Status band | StatusMessage | Main root | Show Hint explanation and validation messages |
| Summary area | HandSummary label/panel | Main root near status/action bands | Stay compact and readable at 1280x720 |
| Help affordance | HelpButton + HelpPanel | Action bar/Main overlay | Open/close supported rules and flow text without scene transition |
| Player hand | Card buttons | PlayerHand | Existing selected-card feedback remains unchanged |

## Build Order

1. Add pure candidate scoring helpers to `CardRules`.
2. Add gdUnit scoring tests for low-cost response, bomb conservation, and lead/follow behavior.
3. Update `DoudizhuGame.hint()` and `_ai_step()` to use scored candidates and store reason text.
4. Add hand summary helpers and unit coverage.
5. Add summary/help/reason UI nodes in `src/main.gd`.
6. Add v0.4.0 e2e coverage for Hint, AI reason, summary, and help overlay.
7. Run full headless, gdUnit, lint, and e2e verification.

## Asset Hints

- Use existing procedural panels/buttons and text labels.
- Keep help text compact; if the content grows, use a constrained `PanelContainer` with wrapped labels rather than adding a new scene.
