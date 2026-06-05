# Scene Descriptions: Doudizhu

**Tag:** v0.3.0

## Scene: Main

- **Type:** gameplay
- **Resolution reference:** 1280x720
- **Layout:** responsive desktop table UI with edge-anchored player hand and centered trick/status/action bands
- **Background:** Procedural green table surface with restrained contrast; no bitmap background required
- **Mood:** Clear, calm, readable desktop card table

### Elements

| Element | Position | Size | Description |
|---------|----------|------|-------------|
| Table background | full viewport | 100%w x 100%h | Green table surface behind all UI |
| AI Left panel | top-left | up to 28%w x 132 scaled px | Seat name, role, card count, active marker, recent play |
| AI Right panel | top-right | up to 28%w x 132 scaled px | Seat name, role, card count, active marker, recent play |
| Bottom cards area | top-center | 3 scaled card widths | Three bottom cards, hidden before landlord and visible after assignment |
| Current trick area | center | 46%w, clamped | Most recent valid play as procedural card faces plus owner label |
| Status message | center-below trick | 62%w, clamped | Current phase, validation errors, and AI/pass messages |
| Player hand | bottom-center | viewport width minus margins | Human cards sorted horizontally; selected cards lift/highlight |
| Action bar | bottom-right above hand | clamped to viewport margins | Context buttons for Call Landlord, Do Not Call, Play, Pass, Hint |
| Result banner | center overlay | scaled 440x142 px | Win/loss result and New Round action during result phase |

### Asset bindings

| Element | Asset Row / Path | Runtime Size | Visual Contract |
|---------|------------------|--------------|-----------------|
| Table background | procedural | 1280x720 | Must not reduce card/text contrast |
| AI panels | procedural/UI text | 24%w x 18%h | Counts and role labels readable in screenshot |
| Bottom cards | procedural card UI | 3 cards, about 56x78 px each | Cards visibly hidden/revealed by phase |
| Current trick cards | procedural card UI | about 56x78 px each | Rank/suit readable at center table scale |
| Status message | UI text | 60%w x 6%h | Error/status text fits without overlap |
| Player hand cards | procedural card UI | about 56x78 px each, compressed if needed | All hand cards visible or consistently fanned; selected state obvious |
| Action buttons | UI text/procedural | 42%w x 8%h | Buttons fit labels and enable/disable by phase |
| Result banner | UI text/procedural panel | 46%w x 18%h | Winner side and replay action prominent |
| v0.3.0 reference screenshots | `e2e/screenshots/scene_main/v0_3_0_*.png` | 1280x720 | Launch, selected-card, and result states captured for visual QA |

### Acceptance criteria

- Main scene shows AI Left and AI Right panels, a center trick/status area, bottom player hand area, and action bar.
- [v0.1.0-M1] is visible through dealt player cards, AI card counts, bottom-card placeholders, and landlord status prompt.
- [v0.1.0-M2] is visible after landlord choice through role labels and revealed/granted bottom card state.
- [v0.1.0-M3] is visible when selected cards lift or highlight in the bottom hand.
- [v0.1.0-M4] is visible when the current trick updates or an invalid-play status appears.
- [v0.1.0-M5] is visible through active turn marker and pass/status labels; full reset behavior is exercised dynamically.
- [v0.1.0-M6] is visible through auto-selected cards or a no-valid-play status.
- [v0.1.0-M7] is visible through AI recent play text/card display and card count changes.
- [v0.1.0-M8] is visible through a result banner and New Round button.
- No text overlaps action buttons, cards, or seat panels at 1280x720.
- [v0.3.0-M1] Card spacing, selected-card highlight/lift, panel contrast, and result banner are visible in screenshots.
- [v0.3.0-M2] AI panels, trick, status, action bar, and hand do not overlap at 1280x720, 1366x768, or 1600x900.
- [v0.3.0-M3] Reference screenshots exist for launch, selected-card, and result states under `e2e/screenshots/scene_main/`.

### Transitions

- Launch -> Main: new hand starts automatically.
- Result banner New Round -> Main: reset same scene into a fresh hand.
