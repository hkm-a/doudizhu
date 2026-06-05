# Assets: Doudizhu

## Visual Style Source

Visual prompt language lives in `STYLE.md`.

## Asset Table

| # | Tag | Name | Type | Size | Generation Params | File Path | Status |
|---|-----|------|------|------|-------------------|-----------|--------|
| 1 | v0.1.0 | procedural_card_faces | procedural_ui | 56x78 px baseline | Godot Control rectangles with rank/suit text and suit color | procedural | READY |
| 2 | v0.1.0 | procedural_table_background | procedural_ui | 1280x720 | Flat/subtle green table Control background | procedural | READY |
| 3 | v0.1.0 | procedural_panels_buttons | procedural_ui | viewport-relative | Godot Control panels/buttons/labels | procedural | READY |

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
| **Total** | — | | **$0.00** | |

## Post-Processing Notes

- No post-processing required for v0.1.0.
