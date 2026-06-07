# Scenes: v0.8.0 Animation, AI, Localization & Save

## Scene Inventory

| Scene / Root | Type | v0.8.0 Role | Expected Change |
|--------------|------|-------------|-----------------|
| `Main` | Main playable table | Host card animations, particle effects, improved AI, localization, save/load | Extend existing procedural UI; add animation hooks |
| Settings panel | Control | AI difficulty, language selection, save/load buttons | Expand with difficulty selector and language toggle |

## Main Table Layout Intent

- Keep the central card table, AI panels, current trick, player hand, and action row in their current relative positions.
- Card animations play over the existing layout without changing positioning.
- Particle effects for bombs overlay the trick area temporarily.
- Settings panel expands to include AI difficulty selector and language toggle.
- AI-generated card images replace procedural card rendering.

## Interaction States

| State | Visible v0.8.0 UI | Player Actions |
|-------|-------------------|----------------|
| Landlord selection | Card animations don't apply yet; AI difficulty shown in settings | Call, decline, open settings |
| Player initiative | Card flight animation when playing; selection bounce | Select cards, Play (with animation), Hint, Pass |
| Player must follow | Bomb/joker explosion particles when bombs played | Play response, Pass |
| AI turn | Improved AI plays with card memory and coordination | Wait, open settings |
| Hand result | SFX result sting plays; score updates | New Hand, New Match, Save game |
| Match ended | Save/load options available | New Match, Reset Stats, Save, Load |

## E2E Scene Hooks

- Prefer stable text hooks for settings panel (difficulty selector, language toggle).
- Animation timing assertions in E2E tests for card flight (200-400ms).
- SFX state checks in E2E for audio rework verification.
