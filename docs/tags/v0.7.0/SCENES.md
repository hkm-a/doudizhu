# Scenes: v0.7.0 Guided Onboarding And Accessibility

## Scene Inventory

| Scene / Root | Type | v0.7.0 Role | Expected Change |
|--------------|------|-------------|-----------------|
| `Main` | Main playable table | Host tutorial, coach, shortcut, and stats controls | Extend existing procedural UI only |
| Tutorial overlay | Panel/Control group | Step through onboarding content | New procedural panel in `src/main.gd` or helper builder |
| Stats panel | Panel/Control group | Show lifetime counters and Reset Stats | New compact procedural panel or expandable section |
| Help/settings panels | Existing controls | Continue to explain rules/audio/settings | May link to Tutorial; should not be replaced |
| Result/match banner | Existing controls | Show score and stats updates after hand/match end | Preserve v0.6.0 score summary while adding stats cues |

## Main Table Layout Intent

- Keep the central card table, AI panels, current trick, player hand, and action row in their current relative positions.
- Add a compact Tutorial button near Help/Settings or as part of the top utility row.
- Add shortcut labels to action buttons only if they fit; otherwise include them in help/tutorial text.
- Place persistent stats in a collapsible or compact side/top panel to avoid crowding the scoreboard.
- Tutorial overlay should appear above the table with enough margins that card state remains partially visible.

## Interaction States

| State | Visible v0.7.0 UI | Player Actions |
|-------|-------------------|----------------|
| Landlord selection | Coach text explains Call/Decline; Tutorial available | Call, decline, open tutorial, keyboard shortcut if mapped |
| Player initiative | Coach text explains selecting a lead combination | Select cards, Hint, Play, Tutorial |
| Player must follow | Coach text explains beating active trick or passing | Select response, Hint, Pass, Play, Tutorial |
| AI turn | Coach text indicates waiting and recent AI reason | Tutorial/help/settings only |
| Hand result | Score summary plus stats increment cue | New Hand, New Match if ended, Tutorial, Stats |
| Match ended | Match winner plus stats summary | New Match, Reset Stats, Tutorial |

## E2E Scene Hooks

- Prefer stable text hooks for Tutorial, Next, Back, Close, Stats, Reset Stats, New Hand, New Match, and any debug stats accessors.
- Avoid relying on pixel positions for tutorial navigation when text/locator hooks are available.
- Keep screenshot checks focused on overlap/readability after adding the overlay and stats panel.

