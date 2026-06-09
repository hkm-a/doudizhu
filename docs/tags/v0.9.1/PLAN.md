# Plan: v0.9.1 Drag-to-Select Cards

**Tag:** v0.9.1

## Game Description

Player can drag mouse across the fan hand to select multiple cards at once instead of clicking each card individually.

## Tag Mechanics

- v0.9.1-M1: Drag-to-select cards — mouse drag across overlapping hand cards selects/deselects all cards the drag rect intersects

## Inherited Mechanics

- v0.9.0-M1..M6: Deal animation, fan layout, AI delay, turn timer, enhanced SFX, bottom cards remain intact
- All previous tags carry forward

## Playable Unit

Player starts a round, watches cards deal with animation, selects multiple cards by dragging across the fan (or clicking individually), plays cards, and sees result.

## Risk Tasks

| Task | Risk | Mitigation |
|------|------|------------|
| Drag-to-select | Overlapping fan cards need hit-testing during drag | Check rect intersection with each card button's global position |

## Main Build

1. Add mouse drag detection on hand_area via `gui_input` callback
2. Track drag start position and compute drag rect
3. During drag, highlight cards intersecting the drag rect
4. On drag release, apply selection changes
5. Visual feedback during drag (semi-transparent overlay or card highlight)

## Systems & Components

| System | Components | Purpose |
|--------|-----------|---------|
| DragSelectionSystem | DragStartPos, DragRect, DragActive | Track drag state and compute intersected cards |

## Verify

- [ ] Mouse drag across fan selects all intersected cards
- [ ] Drag in reverse (release before start) deselects intersected cards
- [ ] Click still works as before
- [ ] Drag during non-interaction phase does nothing
- [ ] All 54 e2e tests pass
- [ ] Headless build succeeds

## Task Status

| Task | Status |
|------|--------|
| v0.9.1-M1: Drag-to-Select Cards | verified |
