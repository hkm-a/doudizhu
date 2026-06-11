# Design Doc: Doudizhu Complete Rewrite (v2.0)

**Date:** 2026-06-10
**Status:** Approved
**Change:** Full project rewrite — delete existing code, rebuild from scratch

---

## 1. Architecture Overview

Three-layer architecture with clear boundaries:

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (ui/*.gd) — UI building, layout,       │
│  refresh, callbacks, animations          │
├─────────────────────────────────────────┤
│         Game Engine Layer               │
│  (engine/*.gd) — state machine, rules,  │
│  bidding, card comparison, scoring       │
├─────────────────────────────────────────┤
│           Data Layer                    │
│  (data/*.gd) — card model, constants,   │
│  deck, shuffle, deal                     │
└─────────────────────────────────────────┘
```

**Principles:**
- Engine layer has zero Godot node references — pure data model
- UI is a read-only view of engine state
- All state mutations go through engine methods, never from UI directly
- ECS (gecs) removed — no longer needed for pure game logic

---

## 2. Data Layer (`data/`)

### `card.gd` — Card Data Model

```gdscript
enum Rank { THREE=3, FOUR, FIVE, SIX, SEVEN, EIGHT, NINE, TEN, JACK, QUEEN, KING, ACE, TWO, JOKER_SMALL, JOKER_BIG }
enum Suit { SPADES, HEARTS, DIAMONDS, CLUBS }
```

- Each card identified by `id: int (0-53)`
- `id % 13` → rank, `id / 13` → suit
- Id 52, 53 are jokers (no suit)
- Rank ordering: 3 < 4 < ... < K < A < 2 < JokerSmall < JokerBig

### `deck.gd` — Deck Management

- Seeded Fisher-Yates shuffle via `RandomNumberGenerator`
- Deal: 17 cards per player, 3 bottom cards
- Hands sorted by rank after deal

---

## 3. Rules Engine (`engine/rules/`)

### `classifier.gd` — Card Pattern Recognition

Recognizes all 10 standard Dou Dizhu patterns:

| Pattern | Structure | Example |
|---------|-----------|---------|
| Single | 1 card | `7` |
| Pair | 2 same rank | `KK` |
| Triple | 3 same rank | `AAA` |
| Triple+1 | 3+1 | `AAA+7` |
| Triple+2 | 3+pair | `AAA+KK` |
| Straight | >=5 consecutive (no 2/jokers) | `5-6-7-8-9` |
| Consecutive Pairs | >=3 consecutive pairs (no 2/jokers) | `55-66-77` |
| Airplane | >=2 consecutive triples | `555-666` |
| Airplane+Wings | Airplane+singles/pairs | `555-666+7+KK` |
| Bomb | 4 same rank | `JJJJ` |
| Rocket | Big Joker + Small Joker | `BJ+SJ` |

### `comparer.gd` — Pattern Comparison

- Same type + same structural length → compare by primary rank
- Bombs beat non-bombs
- Rocket beats everything
- Initiative player can lead any legal pattern

### `validator.gd` — Legal Play Validation

- On player's turn, compute **all** legal plays from current hand
- Cached until hand changes (performance optimization)
- Returns empty set if no legal play available

---

## 4. Game Engine (`engine/`)

### `doudizhu_engine.gd` — State Machine

```
Phases: setup → bidding → deal-bottom → play → result
```

- Pure data: holds hands, roles, bids, tricks, scores
- No Godot node references
- Thread-safe for future multiplayer extension

### `bidding_system.gd` — Bidding Logic

- 3 players take turns calling 1/2/3 points or pass
- Subsequent bids must be higher than previous
- If all pass, default player becomes landlord
- 15-second timer per player
- AI bid strategy based on hand quality (presence of 2s, jokers, bombs)

### `play_system.gd` — Play Logic

- `play_selected(cards)` → validate, apply, advance turn
- `pass_turn()` → only allowed when not in initiative
- 2 consecutive passes → last player regains initiative
- Win condition: any player's hand is empty

### `scoring.gd` — Score Tracking

- Landlord win: landlord +2, farmers -1 each
- Farmer win: each farmer +1, landlord -2
- Bomb multiplier: x2 per bomb, x4 for rocket
- Match tracking: cumulative scores, hand history

---

## 5. AI System (`engine/ai/`)

### `ai_strategy.gd` — Strategy Interface

```gdscript
func get_play(engine, hand, current_trick, has_initiative) -> Array[Dictionary]:
    pass  # returns cards to play or empty for pass

func get_bid(engine, hand, current_highest_bid) -> int:
    pass  # returns 1/2/3 or 0 for pass
```

### `ai_normal.gd` — Normal AI Implementation

**Bidding:**
- Has 2 or Joker → call 2 or 3
- Has bomb → call 1
- Otherwise → pass

**Playing (initiative):**
- Lead smallest single, pair, or triple
- Save bombs for critical moments

**Playing (following):**
- Beat with smallest legal response
- Farmers: pressure landlord, let partner lead
- Landlord: play strategically to finish first

---

## 6. Presentation Layer (`ui/`)

### Files

| File | Role |
|------|------|
| `ui_builder.gd` | Creates all UI nodes (buttons, panels, card displays) |
| `ui_layout.gd` | Calculates positions, scales, fan layout |
| `ui_refresh.gd` | Syncs UI state from engine state every frame |
| `ui_callbacks.gd` | Handles user input (click, drag, keyboard) |
| `ui_animation.gd` | Card flight animations, selection bounce, bomb particles |

### New UI Components

1. **Bidding buttons:** Call 1 / Call 2 / Call 3 / Pass
2. **Crown icon** on landlord seat panel
3. **Bidding countdown timer** (15s per player)
4. **Rich status messages** showing phase, landlord, hand count
5. **Score panel** with bomb multiplier display

### UI-Engine Communication

```gdscript
# UI reads engine state (read-only)
engine.current_phase      # "bidding" | "play" | "result"
engine.current_seat       # active player index
engine.player_bid         # current bid amount
engine.hand_cards         # player hand array

# UI calls engine methods (state mutation)
engine.call_bid(points)
engine.play_cards(card_ids)
engine.pass_turn()
```

---

## 7. File Structure

```
src/
├── main.gd                    # Entry point, assembles layers
├── data/
│   ├── card.gd                # Card data model + constants
│   └── deck.gd                # Shuffle + deal
├── engine/
│   ├── doudizhu_engine.gd     # Core engine (state machine)
│   ├── bidding_system.gd      # Bidding logic
│   ├── play_system.gd         # Play/follow/initiative logic
│   ├── scoring.gd             # Score tracking
│   ├── rules/
│   │   ├── classifier.gd      # Pattern recognition
│   │   ├── comparer.gd        # Pattern comparison
│   │   └── validator.gd       # Legal play validation
│   └── ai/
│       ├── ai_strategy.gd     # AI strategy interface
│       └── ai_normal.gd       # Normal AI implementation
├── ui/
│   ├── ui_builder.gd
│   ├── ui_layout.gd
│   ├── ui_refresh.gd
│   ├── ui_callbacks.gd
│   └── ui_animation.gd
├── utils/
│   ├── ai_utils.gd            # AI helper tools
│   ├── localization_utils.gd  # i18n
│   └── save_load_utils.gd     # Save/load
└── audio_controller.gd

test/                          # Unit tests
e2e/                           # End-to-end tests
assets/                        # Game assets
```

### Removed Files (from v0.9.1)

- `src/card_rules.gd` → split into `rules/classifier.gd` + `rules/comparer.gd` + `rules/validator.gd`
- `src/doudizhu_game.gd` → split into `engine/doudizhu_engine.gd` + `engine/bidding_system.gd` + `engine/play_system.gd`
- `src/main_ui_*.gd` → renamed to `ui/ui_*.gd`
- `src/components/` → removed (no longer need ECS for game logic)
- `src/systems/` → removed (no longer need ECS for game logic)

---

## 8. Bidding System Detail

### Flow

```
Deal complete
  ↓
[Seat 0] → Bid 1/2/3 or Pass
  ↓
[Seat 1] → Bid higher than current, or Pass
  ↓
[Seat 2] → Bid higher than current, or Pass
  ↓
Highest bidder → Landlord, receives 3 bottom cards
  ↓
Play phase begins
```

### Bidding State Machine

```gdscript
enum BidPhase { PENDING, CALLED, PASSED, ENDED }
```

- `PENDING`: waiting for first bid
- `CALLED`: someone has bid, subsequent bids must be higher
- `PASSED`: current player passes
- `ENDED`: landlord determined

### AI Bidding Strategy

- Hand has 2 or Joker → bid 2 or 3 (confident)
- Hand has bomb → bid 1 (willing but cautious)
- Otherwise → pass

### Timer

- 15 seconds per player during bidding
- Timeout → auto pass

---

## 9. Implementation Phases

| Phase | Files | Days | Dependencies |
|-------|-------|------|-------------|
| A — Data Layer | `data/card.gd`, `data/deck.gd` | 1 | None |
| B — Rules Engine | `rules/classifier.gd`, `rules/comparer.gd`, `rules/validator.gd` | 2 | A |
| C — Game Engine | `engine/doudizhu_engine.gd`, `bidding_system.gd`, `play_system.gd`, `scoring.gd` | 2 | B |
| D — AI System | `ai/ai_strategy.gd`, `ai/ai_normal.gd` | 1 | C |
| E — Presentation | `ui/ui_builder.gd`, `ui_layout.gd`, `ui_refresh.gd`, `ui_callbacks.gd` | 2 | C, D |
| F — Integration | E2E tests, bug fixes, polish | 1 | E |

**Total: ~9 workdays**

---

## 10. Key Improvements Over v0.9.1

| Area | v0.9.1 | v2.0 |
|------|--------|------|
| **Card patterns** | 5 types (single, pair, triple, bomb, rocket) | 10 types (all standard) |
| **Bidding** | Simple call/decline | 1/2/3 point system |
| **Rules engine** | Monolithic `card_rules.gd` | Split into classifier/comparer/validator |
| **Architecture** | Tight coupling between UI and game state | Clean 3-layer separation |
| **AI** | Basic greedy | Structured strategy interface |
| **Scoring** | Basic +2/-1 | Multiplier system with bomb tracking |
| **Code organization** | `main_ui_*.gd` scattered | `ui/` module with single responsibility |
| **ECS usage** | gecs for game logic (misuse) | gecs only for visual effects (correct use) |
