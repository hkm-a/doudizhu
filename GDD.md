# Game Design Document: Doudizhu

## 1. Game Overview

- **Title:** Doudizhu
- **Genre:** 2D card game / turn-based strategy / single-player
- **Perspective:** 2D fixed table layout
- **Platform:** Godot 4.x desktop
- **Primary input:** Mouse
- **Target resolution:** 1280x720 windowed desktop
- **One-line pitch:** A readable single-player Doudizhu prototype where the player can complete a full three-player hand against simple AI.
- **Target session length:** 5-10 minutes per hand.

## 2. Core Gameplay Loop

- **Moment-to-moment:** The player inspects their hand, selects cards, and chooses Play, Pass, Hint, Call Landlord, Do Not Call, or New Round depending on the current phase.
- **Session loop:** Start a new hand -> shuffle and deal -> determine landlord -> landlord receives bottom cards -> players take turns playing legal combinations or passing -> first side to empty a hand wins -> show result -> allow replay.
- **Progression loop:** No persistent progression in the first version. Later tags improve rules coverage, AI quality, presentation, animation, audio, and eventually multi-hand scoring/match flow.

## 3. Mechanics

### Core Mechanics

| Mechanic | Player Action | Game Response / Feedback |
|----------|---------------|--------------------------|
| Deal and round start | Click New Round or launch the scene | Three seats receive cards, bottom cards are reserved, and the phase prompt updates |
| Landlord selection | Click Call Landlord or Do Not Call | A landlord is assigned, the landlord receives bottom cards, role labels update |
| Card selection | Click cards in the player's hand | Selected cards lift/highlight; clicking again deselects |
| Play cards | Select cards and click Play | Legal play moves to the table, updates current trick and turn; illegal play keeps state and shows a message |
| Pass | Click Pass when following another play | The player passes if allowed; turn advances |
| Hint | Click Hint | The smallest currently valid playable response is selected, or a "no valid play" message appears |
| AI turn | Wait during AI seats | AI plays the smallest legal response or passes; visible recent-play area updates |
| Win/loss resolution | Any side empties a hand | Result banner appears with winner side and New Round action |

### Supported Card Rules

The full game targets normal three-player Doudizhu with a 54-card deck. The final rule set includes:

- Single card
- Pair
- Three of a kind
- Three with one
- Three with pair
- Straight of at least 5 cards, excluding 2 and jokers
- Consecutive pairs of at least 3 pairs, excluding 2 and jokers
- Airplane without wings as the first airplane variant
- Bomb
- Joker bomb

For `v0.1.0`, the playable core loop intentionally supports a smaller rule set:

- Single card
- Pair
- Three of a kind
- Bomb
- Joker bomb

The first tag prioritizes full state flow, legal comparison, turns, AI, and win/loss over complete card-pattern coverage.

### Rule Comparison

- Plays of the same type and same structural length compare by their primary rank.
- Bombs beat non-bombs.
- Joker bomb beats all other plays.
- If all other active players pass, the last player who made a play gains initiative and may lead any legal supported combination.

### Additional Mechanics

- Expanded combinations: Three with attachments, straights, consecutive pairs, and airplane are deferred after the core loop.
- Better AI: Later tags may search combinations more intelligently and avoid wasting strong cards.
- Animation/audio polish: Deferred until the game is playable and testable.
- Scoring and match progression: Later tags track hand results, cumulative score, and short match completion without changing shipped card legality.

## 4. Game World & Setting

- **Theme / Setting:** Clean desktop card table.
- **Mood / Atmosphere:** Clear, calm, and readable rather than flashy.
- **Art style:** Modern 2D card-table UI with crisp card faces, restrained colors, and strong contrast.
- **Color palette:** Green table surface, light card faces, red/black card suits, amber highlights for selected cards and active turn.
- **Visual references:** Traditional playing-card readability with modern board-game UI spacing.

## 5. Characters & Entities

### Player Seats

| Entity | Behavior | Visual |
|--------|----------|--------|
| Human | Selects and plays cards through mouse UI | Bottom seat with visible full hand |
| AI Left | Simple automated opponent | Left/top-left seat with card count and recent play |
| AI Right | Simple automated opponent | Right/top-right seat with card count and recent play |

### Card Entities

- **Card:** Rank, suit/joker identity, owner, selected state, and visual position.
- **Bottom cards:** Three reserved cards revealed when landlord is chosen.
- **Current trick:** The active play that must be beaten or passed.

### Game State Entities

- **Round state:** Shuffle, deal, landlord phase, play phase, result phase.
- **Turn state:** Current player, last valid play, pass count, and initiative owner.
- **Message state:** Short player-facing validation and status messages.

## 6. Level / Scene Design

There are no levels. The game has one main gameplay scene.

| Scene | Objective | New Mechanic Introduced | Difficulty |
|-------|-----------|-------------------------|------------|
| Main | Complete one Doudizhu hand against two AI opponents | Deal, landlord choice, card selection, play/pass/hint, AI turns, result | Easy |

**Difficulty progression:** The first release uses simple AI and no difficulty selection. Later versions improve AI behavior and rule depth.

## 7. UI / UX Design

### Table Layout

- AI seats appear near the top-left and top-right, each showing name, role, remaining card count, and most recent play.
- The center table area shows the active trick, bottom cards after landlord selection, and current status message.
- The player's hand spans the bottom area with clickable cards.
- A compact action bar contains context-sensitive buttons: Call Landlord, Do Not Call, Play, Pass, Hint, and New Round.

### Menu Flow

```text
Launch Main -> New hand auto-starts -> Landlord phase -> Play phase -> Result -> New Round
```

### Feedback

- Selected cards visibly lift or highlight.
- The active player is highlighted.
- Illegal plays show a short error message and do not mutate the round state.
- Win/loss result is shown in a prominent banner.

## 8. Audio Direction

Audio is optional for `v0.1.0`. Later tags may add:

| Scene/Context | Mood | Notes |
|---------------|------|-------|
| Gameplay table | Calm and light | Low-volume loop, should not distract from card reading |
| Result | Short confirmation | Win/loss sting |

Sound effects deferred after core gameplay:

- Card select: soft tick
- Play cards: short card slap
- Pass: subtle click
- Invalid play: gentle warning
- Round result: short win/loss cue

## 9. Art Asset Requirements

### Required Assets

| Category | Asset | Description | Provided by User? |
|----------|-------|-------------|-------------------|
| Card UI | Playing card face set | 54 readable card faces, including jokers | No |
| Card UI | Card back | Back used for AI hidden cards if needed | No |
| UI | Buttons and panels | Clean rectangular game controls and table panels | No |
| Background | Table surface | Simple green felt/table background | No |

### Asset Strategy

For `v0.1.0`, cards may be rendered procedurally with Godot UI text, suit symbols, and simple rectangles. Dedicated bitmap card art is not required unless a later asset pass chooses to replace procedural card faces.

### Art Style Constraints

- Readability has priority over decorative detail.
- Cards must be legible at desktop 1280x720.
- UI text must fit Chinese or English labels without overlap.
- Color cannot rely on one hue family only; red/black suits and amber/blue UI accents should break up the green table.

## 10. Scope & Playable Units

### Playable Unit Candidates

| Candidate | Player Experience | Mechanics Included | Completion / Fail / Exit |
|-----------|-------------------|--------------------|--------------------------|
| v0.1.0 Core hand | Complete one simplified-rule hand against two AI players | Deal, landlord assignment, selected core card types, legal compare, AI turns, result, replay | One side empties hand and result appears |
| v0.2.0 Full rule expansion | Use the complete planned Doudizhu pattern set | Three with attachments, straights, consecutive pairs, airplane, fuller validation tests | Complete hand with expanded legal plays |
| v0.3.0 Presentation pass | Play with clearer card/table presentation | Card art refinement, animation, turn feedback, result polish | Same hand loop with improved visibility |
| v0.4.0 AI and usability | Play against less naive AI and better support tools | Improved hint, better AI choice, basic difficulty tuning | Complete hand with more credible opponents |
| v0.5.0 Audio and finish | Play a more finished desktop prototype | SFX, optional music, final UI consistency, settings | Complete hand with audiovisual polish |
| v0.6.0 Scoring and match progression | Play several hands as a short match | Per-hand score delta, cumulative scores, match result, new hand/new match flow | Target score or hand-count match winner appears |

### Deferred

- Multiplayer
- Scorekeeping across multiple hands
- Difficulty settings
- Full animation/audio polish
- Save/load
- Mobile layout

### Content Volume

- **Scenes:** One gameplay scene for the first playable version.
- **Players:** One human, two AI.
- **Cards:** 54-card deck.
- **Rules:** Simplified core subset in `v0.1.0`, full planned set in later tags.


