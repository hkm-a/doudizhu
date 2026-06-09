# Style: v0.8.0 Animation, AI, Localization & Save

## Visual Direction

v0.8.0 introduces AI-generated card art and smooth card animations over the existing polished procedural UI. The table should feel like a premium desktop card game with visual feedback for every action.

## Card Art Style

- **Card faces:** AI-generated via ComfyUI (NetaYume model). Readable suit/rank indicators with decorative but unobtrusive backgrounds. Consistent style across all 54 cards.
- **Card back:** Matching AI-generated design for AI hidden cards.
- **Table background:** AI-generated green felt texture, subtle pattern, high contrast with card faces.
- **Color palette:** Green table surface, light card faces with AI-generated decorative elements, red/black card suits, amber highlights for selected cards.

## Card Animation Style

- **Flight animation:** 200-400ms smooth linear or ease-out motion from hand to table. Cards maintain rotation and scale during flight.
- **Selection bounce:** Subtle scale up (1.05x) and vertical offset when selecting cards in hand. Returns to normal on deselect.
- **Bomb explosion:** Particle burst overlay on trick area. Red color for joker bombs, standard color for regular bombs.
- **Visual feedback:** Every action (select, play, pass, invalid, result, save/load) has matching SFX and visual cue.

## Localization Style

- **Chinese (Simplified):** All UI strings in Simplified Chinese. Font fallback for Chinese characters.
- **English:** All UI strings in English. Same layout, text length considerations.
- **Consistency:** Identical layout across languages. No overflow or overlap due to text length differences.
- **Settings panel:** Language toggle with clear language names (中文/English).

## Settings Panel

- **AI difficulty selector:** Two options — Normal (basic strategy) and Hard (card memory, farmer coordination).
- **Language toggle:** Chinese/English selector.
- **Save/load buttons:** Clear labels, confirmation messages on save/load.

## Asset Policy

- AI-generated assets replace procedural card rendering.
- SFX files retooled to match new visual polish.
- Procedural UI elements (buttons, panels, score summary) remain procedural for sharpness.

