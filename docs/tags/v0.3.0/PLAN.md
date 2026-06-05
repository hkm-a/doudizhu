# Game Plan: Doudizhu

**Tag:** v0.3.0

## Game Description

Doudizhu is a 2D desktop card game where one human player completes a readable Doudizhu hand against two AI players. v0.3.0 keeps the v0.2.0 expanded-rule hand loop and improves table presentation, selected-card feedback, active-turn readability, result presentation, and desktop-window layout behavior.

## Tag Mechanics

- [v0.3.0-M1] Presentation pass: improve card spacing, selected-card visual feedback, AI active-turn highlight, panel/card contrast, and result banner presentation without changing rules.
- [v0.3.0-M2] Responsive desktop layout: keep the main table readable at 1280x720, 1366x768, and 1600x900; preserve non-overlap between AI panels, trick/status/action bands, and the player hand.
- [v0.3.0-M3] Visual QA references: capture reference screenshots for launch, selected-card, and result states.

## Inherited Mechanics

- [v0.2.0-M1] Expanded non-special combinations: three-with-one, three-with-pair, straights, consecutive pairs, and airplane without wings work through Play, Hint, and AI candidate search.
- [v0.1.0-M1] Round setup: starting a hand shuffles a 54-card deck, deals 17 cards to each player, reserves 3 bottom cards, and enters landlord selection with visible player hand and AI card counts.
- [v0.1.0-M2] Landlord selection: the player can call or decline landlord; the game assigns one landlord, grants bottom cards to that seat, updates role labels, and enters play phase.
- [v0.1.0-M3] Card selection: clicking cards toggles selected state with visible lift/highlight feedback and preserves sorted hand order.
- [v0.1.0-M4..M8] Core legal play, pass flow, Hint, AI turns, result, and replay remain playable and covered by inherited e2e tests.

## Playable Unit

- **Player experience:** Launch the game into the same full-rule hand loop, read the table more easily, see selected cards lift and highlight, identify AI active turns, and get a clearer win/loss result banner.
- **Unit outcome:** The hand loop remains complete and replayable; presentation changes do not regress v0.1.0/v0.2.0 gameplay.
- **Scenes involved:** Main

| Mechanic | Player operation / content | Expected effect | Required visible content | Evidence |
|----------|----------------------------|-----------------|--------------------------|----------|
| [v0.3.0-M1] | Select a card and play through table states | Cards remain readable; selected card lifts/highlights; active AI panels use an amber border | Player hand, trick panel, status, AI panels, action buttons | `e2e/test_v0_3_0_M1_presentation_layout.py`; screenshots |
| [v0.3.0-M2] | Launch at common desktop resolutions | Layout bands remain ordered and non-overlapping | AI panels above hand; trick/status/action above hand; cards inside viewport | `e2e/test_v0_3_0_M2_responsive_result_layout.py` |
| [v0.3.0-M3] | Capture launch, selected, and result states | Visual QA has stable references for comparison | `e2e/screenshots/scene_main/v0_3_0_*.png` | screenshot files |

## Risk Tasks

### 1. Control layout overlap
- **Why isolated:** Godot `Control` anchors and container sizing can silently stretch panels or leave stale child names during same-frame UI rebuilds.
- **Approach:** Pin manually positioned controls to top-left anchors, size panels explicitly, and remove children before `queue_free()` during UI refresh.
- **Verify:** e2e layout assertions and screenshots prove AI panels do not cover the hand and cards stay in viewport.

### 2. Result presentation clarity
- **Why isolated:** Result UI overlays the center table and can conflict with the action bar if replay controls are duplicated.
- **Approach:** Style the result banner with a clear bordered panel and keep replay inside the result banner.
- **Verify:** e2e result-banner geometry check and result screenshot.

## Main Build

| Task | Game Mechanic Function | Player-Facing Outcome | Affected Systems / Scenes / UI | Integration Point | Verify |
|------|------------------------|-----------------------|--------------------------------|-------------------|--------|
| P01 | Responsive table layout | UI remains readable at common desktop sizes | `src/main.gd` | Main scene layout pass | e2e |
| P02 | Card visual polish | Hand spacing, selected state, and rank contrast improve | `src/main.gd` | Player hand refresh | e2e + screenshots |
| P03 | Active/result feedback | AI active seat and result state are clearer | `src/main.gd` | Seat refresh and result banner | e2e + screenshots |
| P04 | Visual QA references | Future evaluation can compare stable scene captures | `e2e/screenshots/scene_main/` | godot-e2e screenshot capture | screenshot review |

## Systems & Components

| System | Components (reads) | Components (writes) | Purpose |
|--------|--------------------|---------------------|---------|
| DoudizhuGame | hands, trick, turn state | hands, trick, turn state, message | Existing gameplay model, unchanged by v0.3.0 |
| Main UI projection | game state | Control nodes | Render responsive table, cards, actions, status, and result state |
| CardRules | card dictionaries | classification dictionaries | Inherited v0.2.0 rule support |

## Assets Needed

- No bitmap card/table art is required for v0.3.0.
- New visual QA screenshots are required and stored under `e2e/screenshots/scene_main/`.

## Runtime Asset Assignments

| Task / Mechanic | Visible Content | Asset Row / Path | Runtime Size | Verification |
|-----------------|-----------------|------------------|--------------|--------------|
| P01-P03 / [v0.3.0-M1..M2] | Procedural table panels, cards, status/action UI, result banner | procedural/UI text | Scales from 1280x720 baseline | e2e layout checks |
| P04 / [v0.3.0-M3] | Launch, selected-card, result reference screenshots | `e2e/screenshots/scene_main/v0_3_0_*.png` | 1280x720 | visual inspection |

## Verify

- Headless build passes.
- gdUnit suite passes.
- Inherited v0.1.0 and v0.2.0 e2e suite passes.
- v0.3.0 layout e2e tests pass.
- Screenshots exist for launch, selected-card, and result states.
- Visual inspection confirms no AI panel/card/action/status overlap at 1280x720.

## Task Status

| # | Task | Status | Notes |
|---|------|--------|-------|
| P01 | Responsive table layout | verified | e2e checks 1280x720, 1366x768, and 1600x900. |
| P02 | Card visual polish | verified | Selected card lift/highlight and in-viewport hand cards covered by e2e and screenshots. |
| P03 | Active/result feedback | verified | AI panels and result banner styled; result geometry tested. |
| P04 | Visual QA references | verified | Launch, selected, and result screenshots captured in `e2e/screenshots/scene_main/`. |
