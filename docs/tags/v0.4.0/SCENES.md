# Scene Descriptions: Doudizhu

**Tag:** v0.4.0

## Scene: Main

- **Type:** gameplay
- **Resolution reference:** 1280x720
- **Layout:** responsive desktop table UI from v0.3.0, plus compact hand summary and in-scene help affordance
- **Background:** Procedural green table surface with restrained contrast; no bitmap background required
- **Mood:** Clear, calm, readable desktop card table with better player guidance

### Elements

| Element | Position | Size | Description |
|---------|----------|------|-------------|
| Table background | full viewport | 100%w x 100%h | Green table surface behind all UI |
| AI Left panel | top-left | up to 28%w x 132 scaled px | Seat name, role, card count, active marker, recent play, concise AI reason |
| AI Right panel | top-right | up to 28%w x 132 scaled px | Seat name, role, card count, active marker, recent play, concise AI reason |
| Bottom cards area | top-center | 3 scaled card widths | Three bottom cards, hidden before landlord and visible after assignment |
| Current trick area | center | 46%w, clamped | Most recent valid play as procedural card faces plus owner label |
| Status message | center-below trick | 62%w, clamped | Current phase, validation errors, Hint explanation, and AI/pass messages |
| Hand summary | above or beside action/status band | compact, clamped | Counts and opportunity summary for player hand |
| Player hand | bottom-center | viewport width minus margins | Human cards sorted horizontally; selected cards lift/highlight |
| Action bar | bottom-right above hand | clamped to viewport margins | Context buttons for Call Landlord, Do Not Call, Play, Pass, Hint, Help |
| Help panel | centered overlay or anchored modal | clamped within viewport | Supported combinations, initiative/pass rules, Hint behavior, result conditions, close action |
| Result banner | center overlay | scaled 440x142 px | Win/loss result and New Round action during result phase |

### Asset bindings

| Element | Asset Row / Path | Runtime Size | Visual Contract |
|---------|------------------|--------------|-----------------|
| Table background | procedural | 1280x720 | Must not reduce card/text contrast |
| AI panels | procedural/UI text | 24%w x 18%h | Counts, role labels, recent play, and reason text readable |
| Bottom cards | procedural card UI | 3 cards, about 56x78 px each | Cards visibly hidden/revealed by phase |
| Current trick cards | procedural card UI | about 56x78 px each | Rank/suit readable at center table scale |
| Status message | UI text | 60%w x 6%h | Error/status/Hint explanation text fits without overlap |
| Hand summary | procedural/UI text | compact band/panel | Counts and opportunities readable without covering hand/actions |
| Player hand cards | procedural card UI | about 56x78 px each, compressed if needed | All hand cards visible or consistently fanned; selected state obvious |
| Action buttons | UI text/procedural | 42%w x 8%h | Buttons fit labels and enable/disable by phase, including Help |
| Help panel | procedural/UI text | clamped overlay | Supported rules readable; close action visible; table resumes unchanged |
| Result banner | UI text/procedural panel | 46%w x 18%h | Winner side and replay action prominent |

### Acceptance criteria

- Main scene shows AI Left and AI Right panels, center trick/status area, bottom player hand area, action bar, hand summary, and Help affordance.
- [v0.4.0-M1] is visible when Hint selects a low-cost legal play and status text explains the selected play type/rationale.
- [v0.4.0-M2] is visible through AI recent play/reason text and card count/trick changes after AI turns.
- [v0.4.0-M3] is visible through a hand summary that updates after deal, play, and new round.
- [v0.4.0-M4] is visible through an openable/closable Help panel explaining supported combinations, initiative/pass rules, Hint behavior, and result conditions.
- Inherited v0.1.0/v0.2.0/v0.3.0 mechanics remain visible through dealt cards, landlord roles, selected-card feedback, trick/status updates, pass/hint/AI flow, result banner, replay, and non-overlapping desktop layout.
- No text overlaps action buttons, cards, hand summary, help panel, status, or seat panels at 1280x720.
- AI reason and help text must wrap or clamp inside their containers.

### Transitions

- Launch -> Main: new hand starts automatically.
- Help button -> Help panel: opens help overlay/panel without changing round state.
- Help close -> Main: closes help overlay/panel and resumes the same round state.
- Result banner New Round -> Main: reset same scene into a fresh hand.
