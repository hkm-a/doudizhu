# Roadmap: Doudizhu

## SemVer convention

- **MAJOR** (vX.0.0): core gameplay loop changes.
- **MINOR** (v0.X.0): a new playable module or substantial system added.
- **PATCH** (v0.X.Y): focused corrections after a shipped tag.

The first tag is always `v0.1.0`. Each tag must ship a player-experienced playable unit with a reachable completion, fail, or exit state.

---

## v0.1.0 — Core Hand Loop

**Expected player experience**
- Launch the game into a readable Doudizhu table.
- Complete one simplified-rule hand against two AI players.
- Select cards, call or decline landlord, play supported legal combinations, pass, use hint, see AI actions, and reach a win/loss result.
- Start a new hand from the result state.

**Features / mechanics**
- 54-card deck, shuffle, deal 17 cards to each player, and reserve 3 bottom cards.
- Landlord phase with player Call Landlord / Do Not Call buttons and simple AI fallback.
- Simplified supported play types: single, pair, three of a kind, bomb, joker bomb.
- Legal play validation and comparison, including bombs and initiative after passes.
- Simple AI that plays the smallest legal response or passes.
- Table UI with visible player hand, AI card counts, current trick, status messages, active turn, result, hint, and replay.
- Unit tests for card model, deck, rule recognition/comparison, turn flow, and AI decision helpers.

## v0.2.0 — Expanded Doudizhu Rules

**Expected player experience**
- Play hands using the core non-special Doudizhu combinations beyond the v0.1.0 subset.
- Use hints and AI responses for more realistic card patterns.

**Features / mechanics**
- Add three-with-one and three-with-pair.
- Add straights and consecutive pairs, excluding 2 and jokers.
- Add airplane without wings.
- Expand comparison, hint, AI, and unit tests for the new combinations.

## v0.3.0 — Presentation Pass

**Expected player experience**
- Play the same full-rule hand with clearer card table presentation and smoother feedback.

**Features / mechanics**
- Improve card layout, spacing, selection states, active-turn highlight, and result presentation.
- Add simple card movement/selection animation if feasible.
- Add reference screenshots for visual QA.
- Improve responsive behavior for 1280x720 and common desktop window sizes.

## v0.4.0 — AI And Usability

**Expected player experience**
- Play against less naive opponents and get more useful player assistance.

**Features / mechanics**
- Improve AI leading and following choices.
- Improve hint selection so it prefers useful low-cost legal responses.
- Add basic round statistics or hand summary.
- Add player-facing rule/help affordances if needed.

## v0.5.0 — Audio And Finish

**Expected player experience**
- Play a polished desktop prototype with audiovisual feedback and final consistency checks.

**Features / mechanics**
- Add card select/play/pass/invalid/result sound effects.
- Add optional quiet gameplay music.
- Add settings for audio volume and restart/quit flow if needed.
- Final pass on visual consistency, accessibility, and test coverage.
## v0.6.0 — Scoring And Match Progression

**Expected player experience**
- Play multiple hands in one session with visible cumulative score.
- Understand who won each hand, how the landlord/farmer side affected scoring, and when a short match ends.
- Start a fresh match after the match result without losing existing hand-loop polish.

**Features / mechanics**
- Add per-hand scoring for landlord-vs-farmers outcome using a simple base score.
- Track cumulative player, AI-left, and AI-right scores across a short best-of/target-score match.
- Add match summary UI showing hand winner, score delta, cumulative scores, hands played, and match winner.
- Add New Hand and New Match affordances with clear state reset boundaries.
- Preserve all shipped rules, AI, presentation, help, summary, and audio behavior while extending post-hand progression.


## v0.7.0 — Guided Onboarding And Accessibility

**Expected player experience**
- Learn the table, phases, legal-action expectations, scoring, and match flow through an optional guided tutorial.
- Receive concise contextual guidance while playing without changing the shipped Doudizhu rules.
- Use keyboard-accessible controls for common actions and understand shortcuts from the UI.
- View lightweight lifetime/session statistics and reset them intentionally.

**Features / mechanics**
- Add a step-based tutorial overlay with Next, Back, and Close controls.
- Add a contextual action coach for landlord selection, player initiative, follow/pass decisions, result, and match-ended states.
- Add or validate keyboard shortcuts for tutorial/help/hint/pass/play and related core controls.
- Track persistent session statistics for hands, matches, player-side wins, landlord/farmer wins, and best score.
- Preserve scoring, match progression, audio/settings, help, AI, rules, and layout behavior from prior tags.

## v0.8.0 — Animation, AI, Localization & Save

**Expected player experience**
- Watch smooth card animations during play: flying cards when played, bounce effects when selected.
- See particle effects for bombs and joker bombs (red explosion for joker bombs).
- Play against smarter AI with two difficulty levels: normal AI plays basic strategy, hard AI uses memory and coordinates as farmers.
- Use the game in Chinese or English with full UI localization.
- Save and reload the current hand state along with settings, scores, and statistics.
- Experience retooled sound effects that match the new visual style.
- Replace procedural card art with AI-generated images through ComfyUI.

**Features / mechanics**
- Card animations: 200-400ms flight animation when playing cards, bounce/elevation on selection.
- Particle effects: bomb explosion particles, red explosion for joker bombs.
- Audio rework: retune SFX to match the new visual polish (card select, play, pass, invalid, result).
- Improved AI: two difficulty levels (normal, hard) — hard AI uses card memory, defensive play, and farmer coordination.
- Localization: Chinese and English support, UI string externalization, auto-detect language with manual toggle.
- Save/load: persist current hand state (hands, trick, phase, scores, statistics) to file; restore on reload.
- Save settings: persist audio volume, language preference, and other user settings.
- Progress tracking: record streaks, best score, and session statistics alongside saved state.
- Asset replacement: generate card face images, card back, and background via ComfyUI (NetaYume model).

## v0.9.1 — Drag-to-Select

**Expected player experience**
- Select multiple cards at once by dragging mouse across the fan hand instead of clicking each card individually.

**Features / mechanics**
- Mouse drag detection on player hand area with visual feedback.
- Cards intersected by drag rect get selected (or deselected if drag goes backwards).
- Works alongside existing click-to-toggle selection.
