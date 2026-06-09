# Structure: v0.9.1 Drag-to-Select Cards

**Tag:** v0.9.1

## Component Registry

### v0.9.1 Components

| Component | Field | Type | Default | Description |
|-----------|-------|------|---------|-------------|
| DragSelectionState | drag_start_pos | Vector2 | Vector2.ZERO | Where drag started |
| DragSelectionState | drag_active | bool | false | Whether a drag is in progress |
| DragSelectionState | drag_reverse | bool | false | Whether drag went backwards (deselect mode) |

## System Schedule

### Phase: Input

| Order | System | Reads | Writes | Purpose |
|-------|--------|-------|--------|---------|
| 1 | DragSelectionSystem | DragSelectionState | Game selected_cards | Mouse drag card selection |

## Scene Markers

| Marker Type | Components | Notes |
|-------------|------------|-------|
| PlayerHandMarker | — | Procedural UI, drag input on hand_area |

## Build Order

1. DragSelectionState component
2. Drag input handler on hand_area (gui_input)
3. Integration with game.toggle_selection
4. Unit tests

## Asset Hints

- No new assets needed — purely input behavior change
