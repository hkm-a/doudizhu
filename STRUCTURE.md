# Structure: v0.7.0 Guided Onboarding And Accessibility

## Target Architecture

v0.7.0 should keep the card-rule engine unchanged and layer tutorial, coach, keyboard, and stats behavior around existing game state projection. New state should be small, deterministic, and unit-testable.

## Proposed File Responsibilities

| Path | Responsibility | Notes |
|------|----------------|-------|
| `src/main.gd` | Wire tutorial/stats UI, input shortcuts, and coach text into the existing procedural table | Keep UI additions compact and avoid changing rule logic here |
| `src/tutorial_state.gd` | Store tutorial steps, current index, navigation, and visibility | Prefer pure methods so gdUnit can verify step order and bounds |
| `src/stats_state.gd` | Track lifetime/session stats, match stats, best score, persistence, and reset behavior | Guard against double-counting the same hand result; tests should inject memory/temp storage instead of real `user://` data |
| `project.godot` | Add or validate input actions for tutorial/help/hint/play/pass/stat reset as needed | Use input-mapper conventions if modifying actions |
| `test/` | Add focused gdUnit tests for tutorial bounds, coach text, and stats counting | Do not duplicate broad e2e flows in unit tests |
| `e2e/` | Add tutorial, keyboard, and stats smoke flows | Keep existing full-loop test as the primary regression path |

## State Boundaries

| State | Preserved Across New Hand | Preserved Across New Match | Reset Control |
|-------|---------------------------|----------------------------|---------------|
| Current card hand | No | No | New Hand / New Match |
| Match score | Yes | No | New Match |
| Tutorial current step | Yes, unless closed | Yes, unless closed | Close Tutorial |
| Lifetime stats | Yes | Yes | Reset Stats |
| Audio/settings preferences | Yes | Yes | Existing settings controls |

## Integration Notes

- Tutorial should read from current game phase for captions but should not mutate game state except its own visibility/index.
- Coach text should be generated from existing phase/action data and remain short enough to fit the current status area.
- Stats should be updated only when the score-result seam reports a newly applied hand result, not from every UI redraw.
- Keyboard shortcuts should call the same functions as visible buttons so mouse and keyboard behavior cannot diverge.
- UI changes should preserve readable desktop layouts at 1280x720, 1366x768, and 1600x900.

## Verification Focus

- Tutorial open/next/back/close works from landlord, play, result, and match-ended phases.
- Coach text changes when the player has initiative versus when they must beat an active trick.
- Stats count each hand once, ignore duplicate result keys, and reset only through Reset Stats.
- Keyboard shortcuts match button behavior without activating hidden/invalid actions.

