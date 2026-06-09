# Changelog: v0.9.1

**Tag:** v0.9.1
**Released:** 2026-06-09
**Theme:** Drag-to-Select Cards

## Summary

This tag introduces a drag-to-select mechanic for the player's hand, allowing multiple cards to be selected or deselected in a single motion. This improves UX on dense fan layouts where clicking individual cards can be imprecise.

## New Features

- **Drag-to-Select (v0.9.1-M1):** Mouse drag detection on the player hand area. Cards intersected by the drag rectangle are selected. Dragging backwards (release position before start) toggles off intersection selection. Works alongside existing click-to-toggle behavior.

## ECS Changes

- **New Component:** `DragSelectionState` — fields: `drag_start_pos` (Vector2), `drag_active` (bool), `drag_reverse` (bool)
- **New System:** `DragSelectionSystem` (Input phase) — reads `DragSelectionState`, writes `Game.selected_cards`

## Gameplay

- **Playable Unit:** Player starts a round, watches deal animation, selects cards by dragging across the fan or clicking individually, plays cards, and sees the result.

## Visual Feedback

- Semi-transparent overlay or card highlight during active drag for visual feedback.

## Verification

- All 54 e2e tests pass
- Headless build succeeds
