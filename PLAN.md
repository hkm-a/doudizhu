# Plan: v0.8.0 Animation, AI, Localization & Save

**Tag:** v0.8.0

## Game Description

A polished single-player Doudizhu prototype with smooth card animations, improved AI opponents, multilingual UI, and persistent game state. The player experiences a full hand with visual feedback, smarter AI, and the ability to save and resume.

## Tag Mechanics

- [v0.8.0-M1] Card animations: 200-400ms flight animation when playing cards, bounce/elevation effect on card selection in player hand.
- [v0.8.0-M2] Particle effects: bomb explosion particles, red explosion effect for joker bombs on the table.
- [v0.8.0-M3] Improved AI: two difficulty levels (normal plays basic strategy, hard uses card memory and farmer coordination).
- [v0.8.0-M4] Localization: full Chinese and English UI support with auto-detect language and manual toggle in settings.
- [v0.8.0-M5] Save/load: persist current hand state (hands, trick, phase, scores, statistics) to JSON file; restore on reload.
- [v0.8.0-M6] Asset replacement: AI-generated card faces, card back, and table background images via ComfyUI.
- [v0.8.0-M7] Audio rework: retooled SFX matching new visual polish (card select, play, pass, invalid, result, bomb, save/load).

## Inherited Mechanics

- [v0.7.0-M1..M4] Tutorial overlay, contextual coach, keyboard shortcuts, persistent session statistics remain intact.
- [v0.6.0-M1..M4] Hand scoring, cumulative match score, match completion, and score summary UI remain intact.
- [v0.5.0-M1..M4] Audio feedback, optional music, settings controls, restart/quit flow, and final consistency remain intact.
- [v0.4.0-M1..M4] Improved hints, AI reasons, hand summary, and rule/help affordance remain visible and stable.
- [v0.3.0-M1..M3] Presentation, responsive layout, and visual QA baselines remain readable.
- [v0.2.0-M1] Expanded non-special combinations continue to work through Play, Hint, and AI candidate search.
- [v0.1.0-M1..M8] Round setup, landlord selection, card selection, legal play, pass, hint, AI turns, result, and replay remain the gameplay foundation.

## Playable Unit

The player launches the game, optionally loads a saved hand, plays through a full hand with smooth card animations and particle effects for bombs, plays against improved AI at chosen difficulty, and sees the result in their preferred language. The player can save progress mid-session and reload later.

| Mechanic | Player operation / content | Expected effect | Required visible content | Evidence |
|----------|----------------------------|-----------------|--------------------------|----------|
| [v0.8.0-M1] | Click Play button to play cards; click cards to select | Cards fly from hand to table with 200-400ms animation; selected cards bounce/elevate | Animated card flight, selected card elevation | E2E animation timing assertion + screenshot |
| [v0.8.0-M2] | Play a bomb or joker bomb | Explosion particles appear on table; red explosion for joker bomb | Particle effect overlay on trick area | Screenshot with particles + visual QA |
| [v0.8.0-M3] | Start a hand; choose normal or hard AI difficulty in settings | AI plays with appropriate strategy level; hard AI coordinates as farmers | Settings panel with difficulty selector; AI plays match difficulty | E2E difficulty toggle + gameplay observation |
| [v0.8.0-M4] | Change language in settings panel | All UI strings update immediately to selected language | Settings panel shows language options; UI reflects change | E2E language toggle assertion |
| [v0.8.0-M5] | Save game from settings; reload on next launch | Current hand state saved to JSON; restored on reload | Save confirmation message; continue prompt on launch | E2E save/load flow + file content check |
| [v0.8.0-M6] | Play with AI-generated card art | Cards display generated images instead of procedural rendering | Card faces, card back, table background show art | Screenshot comparison + visual QA |
| [v0.8.0-M7] | Play cards, select, pass, see result | SFX plays matching the action (select tick, play whoosh, bomb crack, result sting) | Audio feedback on every action | E2E audio state check + manual verification |

## Risk Tasks

### 1. Card Animation System
- **Why isolated:** Requires tween/animation timing, transform tracking, and event coordination without blocking the game loop
- **Approach:** Use AnimationPlayer for flight paths; card selection uses Control tween for bounce effect
- **Systems:** AnimationSystem (manages card flight tweens, selection bounce)
- **Components:** CardAnimationState (position, target, progress, selected)
- **Verify:**
  - Flight animation completes in 200-400ms range
  - Card selection bounce is visible but doesn't block input
  - Animation doesn't interfere with game state transitions
  - No visual glitches during animation

### 2. AI Improvement (Card Memory + Coordination)
- **Why isolated:** Card memory requires tracking played cards; farmer coordination needs decision logic changes
- **Approach:** Hard AI maintains a set of seen cards; coordinates with farmer seat when not landlord; saves bombs for critical moments
- **Systems:** ImprovedAISystem (card memory, farmer coordination, bomb management)
- **Components:** CardMemory (set of seen cards), AIDifficulty (enum: normal/hard), FarmerCoordinationState
- **Verify:**
  - Hard AI avoids wasting bombs unnecessarily
  - Farmer AI plays higher cards when landlord has initiative
  - Normal AI still plays basic strategy
  - Difficulty setting affects AI behavior consistently

## Main Build

### Build Tasks

| Task | Game Mechanic Function | Player-Facing Outcome | Affected Systems / Scenes / UI | Integration Point | Verify |
|------|------------------------|-----------------------|--------------------------------|-------------------|--------|
| R1 | Card animation system (flight + selection bounce) | Smooth card animations during play | AnimationSystem, CardAnimationState, Main table | Connects to Play button handler and card selection | Animation timing + visual check |
| R2 | Bomb/joker bomb particle effects | Visual explosion feedback on bombs | ParticleSystem, BombEffectComponent, Trick area | Triggers when bomb play is validated | Screenshot + visual QA |
| M01 | AI difficulty selector in settings | Player chooses normal or hard AI | Settings panel, ImprovedAISystem, AIDifficulty | Integrated into settings save/load flow | E2E toggle + gameplay observation |
| M02 | Hard AI: card memory, farmer coordination, bomb management | Smarter AI plays more strategically | ImprovedAISystem, CardMemory, AIDifficulty | Replaces basic AI decision in doudizhu_game.gd | E2E difficulty-specific gameplay |
| M03 | Localization: Chinese/English UI strings | All UI displays in selected language | i18n system, external string files, settings panel | Loads language file at runtime | E2E language toggle assertion |
| M04 | Save/load: persist hand state, scores, settings | Player can save and resume game | SaveLoadSystem, JSON serializer, settings panel | Auto-save after result; manual save from settings | E2E save/load flow + file check |
| M05 | AI-generated card assets via ComfyUI | Cards display generated art | Asset pipeline, card texture replacement | Replaces procedural card rendering | Screenshot + visual QA |
| M06 | Audio rework: retooled SFX | Sound effects match new visual polish | Audio system, SFX files, volume controls | Connected to all card/actions | Manual verification + E2E audio check |

### Systems & Components

| System | Components (reads) | Components (writes) | Purpose |
|--------|--------------------|---------------------|---------|
| AnimationSystem | CardAnimationState | CardAnimationState | Manage card flight tweens and selection bounce |
| ParticleSystem | BombEffectComponent | — | Trigger bomb/joker bomb explosion effects |
| ImprovedAISystem | CardMemory, AIDifficulty, FarmerCoordinationState | AIDifficulty | Enhanced AI decision-making with memory and coordination |
| SaveLoadSystem | Game state, Settings | Save data (JSON) | Persist and restore hand state, scores, statistics, settings |
| LocalizationSystem | Current language, String resources | Current language | Externalize UI strings for Chinese/English |

### Assets Needed

- AI-generated card face set: 54 cards (including jokers), generated via ComfyUI with NetaYume model
- AI-generated card back: single image for AI hidden cards
- AI-generated table background: green felt texture
- SFX files: retooled card select, play, pass, invalid, bomb, joker bomb, result, save/load sounds

### Runtime Asset Assignments

| Task / Mechanic | Visible Content | Asset Row / Path | Runtime Size | Verification |
|-----------------|-----------------|------------------|--------------|--------------|
| R1/M01 / [v0.8.0-M1] | Card flight animation, selection bounce | procedural animation (CSS tweens) | 200-400ms animation time | E2E timing assertion |
| R2 / [v0.8.0-M2] | Bomb explosion, joker bomb red explosion | assets/img/bomb_explosion.png, assets/img/joker_bomb_explosion.png | 128x128 | Screenshot + visual QA |
| M05 / [v0.8.0-M6] | Card faces, card back, table background | assets/img/card_*.png (54 cards), assets/img/card_back.png, assets/img/table_bg.png | 200x300 per card | Screenshot + visual QA |
| M06 / [v0.8.0-M7] | SFX files | assets/audio/*.ogg | Variable | Manual verification |

### Verify

- Animation timing 200-400ms for card flight
- Bomb particle effects visible and non-blocking
- Hard AI uses card memory and coordinates as farmer
- Language toggle updates all UI strings immediately
- Save/load preserves game state accurately
- AI-generated cards are readable and visually consistent
- SFX plays correctly on all actions
- No regressions in existing mechanics
- E2E tests pass for all new features

## Task Status

| # | Task | Status | Notes |
|---|------|--------|-------|
| R1 | Card animation system (flight + selection bounce) | pending | |
| R2 | Bomb/joker bomb particle effects | pending | |
| M01 | AI difficulty selector in settings | pending | |
| M02 | Hard AI: card memory, farmer coordination, bomb management | pending | |
| M03 | Localization: Chinese/English UI strings | pending | |
| M04 | Save/load: persist hand state, scores, settings | pending | |
| M05 | AI-generated card assets via ComfyUI | pending | |
| M06 | Audio rework: retooled SFX | pending | |
