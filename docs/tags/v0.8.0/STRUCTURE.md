# Structure: v0.8.0 Animation, AI, Localization & Save

**Tag:** v0.8.0

## Component Registry

### v0.8.0 Components

| Component | Field | Type | Default | Description |
|-----------|-------|------|---------|-------------|
| CardAnimationState | target_position | Vector2 | Vector2.ZERO | Target position for card flight animation |
| CardAnimationState | progress | float | 0.0 | Animation progress (0.0 to 1.0) |
| CardAnimationState | animation_type | String | "idle" | Type: "flight" or "bounce" |
| CardAnimationState | duration | float | 0.3 | Animation duration in seconds |
| BombEffectState | effect_type | String | "" | "bomb" or "joker_bomb" |
| BombEffectState | position | Vector2 | Vector2.ZERO | Explosion center position |
| BombEffectState | active | bool | false | Whether explosion is playing |
| AIDifficulty | level | int | 1 | 0=normal, 1=hard |
| AIDifficulty | card_memory_active | bool | false | Whether AI tracks seen cards |
| CardMemory | seen_cards | Array | [] | List of cards already played |
| FarmerCoordination | role | int | 0 | 0=landlord, 1=farmer-left, 2=farmer-right |
| SaveState | hands | Dictionary | {} | Player/AI hand card IDs |
| SaveState | trick | Array | [] | Current trick cards |
| SaveState | phase | String | "" | Current game phase |
| SaveState | scores | Dictionary | {} | Cumulative scores |
| SaveState | statistics | Dictionary | {} | Session statistics |
| SaveState | settings | Dictionary | {} | Audio, language settings |
| Localization | current_language | String | "zh" | Current UI language |

## System Schedule

### Phase: Game Logic

| Order | System | Reads | Writes | Purpose |
|-------|--------|-------|--------|---------|
| 1 | ImprovedAISystem | CardMemory, AIDifficulty, FarmerCoordinationState | Game phase decisions | Enhanced AI with memory and coordination |

### Phase: Animation

| Order | System | Reads | Writes | Purpose |
|-------|--------|-------|--------|---------|
| 10 | AnimationSystem | CardAnimationState | Card positions, scales | Card flight and selection bounce |
| 11 | ParticleSystem | BombEffectState | Particle effects | Bomb/joker bomb explosions |

### Phase: Save/Load

| Order | System | Reads | Writes | Purpose |
|-------|--------|-------|--------|---------|
| 20 | SaveLoadSystem | SaveState, Game state | JSON file | Persist and restore game state |

## Scene Markers

| Marker Type | Components | Notes |
|-------------|------------|-------|
| MainTableMarker | — | Procedural UI, no ECS needed |
| SettingsPanelMarker | — | Procedural UI for settings |

## Build Order

1. Component definitions (CardAnimationState, BombEffectState, AIDifficulty, CardMemory, SaveState, Localization)
2. AnimationSystem (card flight + selection bounce)
3. ParticleSystem (bomb explosions)
4. ImprovedAISystem (card memory, farmer coordination)
5. SaveLoadSystem (JSON serialization)
6. LocalizationSystem (external string files)
7. ComfyUI asset generation pipeline
8. Audio rework (SFX files)
9. Integration wiring + gdUnit tests

## Asset Hints

- AI-generated card faces (54 cards + 2 jokers, 200x300px each)
- AI-generated card back (200x300px)
- AI-generated table background (1280x720px)
- SFX files: card select, play, pass, invalid, bomb, joker bomb, result, save/load
