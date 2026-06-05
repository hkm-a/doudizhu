# Assets: Doudizhu

## Visual Style Source

Visual prompt language lives in `STYLE.md`.

## Asset Table

| # | Tag | Name | Type | Size | Generation Params | File Path | Status |
|---|-----|------|------|------|-------------------|-----------|--------|
| 1 | v0.1.0 | procedural_card_faces | procedural_ui | 56x78 px baseline | Godot Control rectangles with rank/suit text and suit color | procedural | READY |
| 2 | v0.1.0 | procedural_table_background | procedural_ui | 1280x720 | Flat/subtle green table Control background | procedural | READY |
| 3 | v0.1.0 | procedural_panels_buttons | procedural_ui | viewport-relative | Godot Control panels/buttons/labels | procedural | READY |
| 4 | v0.3.0 | main_initial_reference | screenshot | 1280x720 | godot-e2e viewport capture after launch | `e2e/screenshots/scene_main/v0_3_0_01_initial.png` | READY |
| 5 | v0.3.0 | main_selected_reference | screenshot | 1280x720 | godot-e2e viewport capture after landlord call and card selection | `e2e/screenshots/scene_main/v0_3_0_02_selected.png` | READY |
| 6 | v0.3.0 | main_result_reference | screenshot | 1280x720 | godot-e2e viewport capture after forced result | `e2e/screenshots/scene_main/v0_3_0_03_result.png` | READY |

## Visual Asset Contract

| Tag | Scene / Mechanic | Visible Object | Asset Row / Path | Runtime Size | Visual Role | Readability Requirement | Source |
|-----|------------------|----------------|------------------|--------------|-------------|-------------------------|--------|
| v0.1.0 | Main / [v0.1.0-M1] | Player hand and AI counts | procedural_card_faces / procedural | Cards about 56x78 px | Establish dealt state | Player card ranks readable; AI counts clear | procedural |
| v0.1.0 | Main / [v0.1.0-M2] | Role labels and bottom cards | procedural_card_faces / procedural | 3 cards plus labels | Show landlord assignment | Landlord/farmer roles and bottom-card reveal clear | procedural |
| v0.1.0 | Main / [v0.1.0-M3] | Selected card state | procedural_card_faces / procedural | Card lift/highlight | Show chosen cards | Selected cards distinguishable in screenshot | procedural |
| v0.1.0 | Main / [v0.1.0-M4] | Current trick and invalid message | procedural_card_faces / procedural; UI text | Center table area | Show legal/illegal play outcome | Trick cards and status text readable | procedural/UI |
| v0.1.0 | Main / [v0.1.0-M5] | Active turn and pass state | procedural_panels_buttons / procedural | Seat panels and status row | Explain turn flow | Active seat and pass/status text visible | procedural/UI |
| v0.1.0 | Main / [v0.1.0-M6] | Hint-selected cards or no-play message | procedural_card_faces / procedural; UI text | Bottom hand/status | Show assistance result | Hint outcome visible without log lookup | procedural/UI |
| v0.1.0 | Main / [v0.1.0-M7] | AI recent play and count change | procedural_card_faces / procedural; UI text | AI panel | Make AI turns observable | Recent play/count visible in screenshot sequence | procedural/UI |
| v0.1.0 | Main / [v0.1.0-M8] | Result banner and New Round button | procedural_panels_buttons / procedural; UI text | Center overlay | Show completion and replay | Winner side and replay action prominent | procedural/UI |
| v0.3.0 | Main / [v0.3.0-M1] | Selected card and improved table spacing | `e2e/screenshots/scene_main/v0_3_0_02_selected.png` | 1280x720 | Reference selected-card presentation | Highlight/lift and hand readability clear | screenshot |
| v0.3.0 | Main / [v0.3.0-M2] | Responsive table layout | procedural_panels_buttons / procedural | 1280x720, 1366x768, 1600x900 | Keep table bands non-overlapping | AI panels, trick, status, actions, and hand do not overlap | e2e |
| v0.3.0 | Main / [v0.3.0-M3] | Launch and result visual references | `e2e/screenshots/scene_main/v0_3_0_01_initial.png`; `e2e/screenshots/scene_main/v0_3_0_03_result.png` | 1280x720 | Visual QA comparison baseline | Status, roles, hand, and result banner readable | screenshot |
| v0.4.0 | Main / [v0.4.0-M1] | Hint explanation status text | procedural_panels_buttons / procedural | Status band | Explain selected play type and low-cost rationale | Text wraps/clamps without covering cards or buttons | procedural/UI |
| v0.4.0 | Main / [v0.4.0-M2] | AI recent play reason | procedural_panels_buttons / procedural | AI panel recent row | Make AI choice readable | Reason text is concise and readable inside seat panels | procedural/UI |
| v0.4.0 | Main / [v0.4.0-M3] | Hand summary | procedural_panels_buttons / procedural | Compact summary band/panel | Show hand composition and opportunities | Counts and chain opportunities readable at 1280x720 | procedural/UI |
| v0.4.0 | Main / [v0.4.0-M4] | Rules/help panel | procedural_panels_buttons / procedural | Clamped overlay/panel | Explain supported combinations and flow | Help text wraps, close action is visible, table remains non-overlapping | procedural/UI |

## Animated Sprites

No animated sprites are required for v0.1.0.

## Audio

No audio assets are required for v0.1.0. Audio is deferred to a later tag.

## Budget Tracking

| Asset | Tag | Tool | Cost | Notes |
|-------|-----|------|------|-------|
| procedural_card_faces | v0.1.0 | Godot UI | $0.00 | No image generation |
| procedural_table_background | v0.1.0 | Godot UI | $0.00 | No image generation |
| procedural_panels_buttons | v0.1.0 | Godot UI | $0.00 | No image generation |
| v0.3.0 reference screenshots | v0.3.0 | godot-e2e | $0.00 | Runtime captures only |
| v0.4.0 help and summary UI | v0.4.0 | Godot UI | $0.00 | No image generation |
| **Total** | — | | **$0.00** | |

## Post-Processing Notes

- No post-processing required for v0.1.0.
- No post-processing required for v0.3.0 screenshots.
- No post-processing required for v0.4.0 procedural UI text.
