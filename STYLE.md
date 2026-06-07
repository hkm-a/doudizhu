# Style: v0.7.0 Guided Onboarding And Accessibility

## Visual Direction

v0.7.0 should feel like a polished teaching layer over the existing table, not a new visual theme. Use the established procedural panels, button styles, colors, and spacing from the shipped prototype.

## Tutorial Overlay

- Use a single high-contrast panel with title, step count, concise body text, and Next/Back/Close buttons.
- Keep each step short: one concept, one player action, one observable table area.
- Avoid modal dead-ends; Close must always be visible and keyboard reachable.
- Dim or frame content subtly if feasible, but do not require new bitmap art.

## Coach Text

- Write in direct action language: “Select a combination to lead,” “Beat the active pair or Pass,” “Use Hint to find the cheapest legal response.”
- Keep coach messages to one or two short clauses so the status area remains readable.
- Prefer accurate minimal guidance over long rules explanations; deeper rules stay in Help/Tutorial.

## Keyboard And Accessibility

- Include readable shortcut hints where space allows, such as `H` for Hint or `T` for Tutorial.
- Maintain button focus visibility and avoid placing focus on hidden controls.
- Preserve color contrast introduced in presentation tags.
- Do not rely only on color to communicate selected cards, active turn, or disabled actions.

## Stats Presentation

- Use compact labels: Hands, Matches, Player Wins, Landlord Wins, Farmer Wins, Best Score.
- Show reset as an explicit action with confirmation text or clear status feedback.
- Keep stats visually secondary to the active hand and score summary.

## Asset Policy

- Use procedural UI only for this tag.
- Do not introduce decorative icons unless the asset pipeline is explicitly updated.
- If generated assets are requested later, add them to `ASSETS.md` with tag `v0.7.0` before creation.
