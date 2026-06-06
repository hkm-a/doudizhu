# Scenes: Doudizhu

**Tag:** v0.6.0
**Theme:** Scoring And Match Progression

## Scene List

| Scene | Path | Purpose | Current Tag Changes |
|-------|------|---------|---------------------|
| Main | `scenes/main.tscn` / procedural Main UI | Complete Doudizhu table, help, summary, audio/settings, result, replay | Add compact scoreboard, score delta result summary, New Hand, and New Match progression controls |

## Main Scene Layout

v0.6.0 keeps the inherited table and adds a compact score layer.

| Region | Anchor / Placement | Current Contents | v0.6.0 Additions | Constraint |
|--------|--------------------|------------------|------------------|------------|
| Top/side panels | existing AI panel bands | AI roles, counts, recent play/reason | optional score beside each seat if compact | Must stay readable at 1280x720 |
| Center table | existing trick/status area | current trick, bottom cards, status | no required score overlay during active play | Do not cover trick cards |
| Scoreboard band | compact row near summary/status or top center | not present before v0.6.0 | Player/AI-left/AI-right totals, hand count, match target | Must not push hand/action buttons offscreen |
| Summary/status band | above action/hand area | hand summary, status, hint rationale | short score status only if space allows | Summary remains compact |
| Action bar | bottom-right above hand | Call/Decline/Play/Pass/Hint/Help/Settings | New Hand appears after result; New Match appears after match end | Buttons remain reachable and non-overlapping |
| Settings/help overlays | existing clamped overlays | audio/settings/help content | no required change | Scoreboard remains readable or safely covered by modal |
| Result banner | center overlay | win/loss, New Round/restart | hand score delta, cumulative totals, match winner when reached | Result remains prominent |
| Player hand | bottom-center | sorted cards, selection lift/highlight | no layout change | All cards remain visible/fanned |

## Interaction Flows

### [v0.6.0-M1] Hand Scoring

1. A hand reaches result through normal play or test helper.
2. The result owner/side and landlord seat are sent to score logic once.
3. Score logic computes a simple delta.
4. Result banner shows winner side and score changes.

### [v0.6.0-M2] Cumulative Match Score

1. Player clicks New Hand after a hand result.
2. Card, trick, selection, and turn state reset for the new hand.
3. Score totals and hands played remain visible.
4. The next hand adds another score delta after completion.

### [v0.6.0-M3] Match Completion

1. Score totals reach target score or hand-count cap.
2. Result banner changes from hand result to match result.
3. New Match is clearly available.
4. New Match clears cumulative scores and starts a fresh match/hand.

### [v0.6.0-M4] Score Summary UI

1. During play, scoreboard shows compact totals.
2. At result, score summary expands enough to show delta and totals.
3. Help/settings can still open and close without losing match state.
4. Audio/settings controls remain reachable.

## Asset Bindings

| Element | Asset Row / Path | Runtime Size | Contract |
|---------|------------------|--------------|----------|
| Scoreboard band | procedural_scoreboard_ui / procedural | compact viewport-relative row | Totals readable, no overlap with cards/actions |
| Result score summary | procedural_panels_buttons / procedural | existing result overlay scale | Delta and totals clear without hiding winner text |
| New Hand/New Match controls | procedural_panels_buttons / procedural | existing button scale | Reset boundary is clear and reachable |

## Acceptance Criteria

- Main launches into a playable hand with inherited UI and audio/settings intact.
- Scoreboard shows all three seat totals and hands played in a compact readable form.
- Completing a hand applies one score delta and displays it in the result summary.
- New Hand resets card play state but preserves cumulative match score.
- New Match clears cumulative score and starts a fresh progression session.
- Score UI does not overlap cards, summary, status, help, settings, AI panels, audio controls, or result banner at supported desktop sizes.
