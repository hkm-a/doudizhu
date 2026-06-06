# Visual Style: Doudizhu

## Style Anchor

Clean modern desktop card-table UI with readable procedural playing cards.

## Prompt Suffix

Use crisp card-game UI composition, high-contrast card faces, restrained green table surface, and clear red/black suit readability. Keep decoration minimal and leave generous spacing for labels, buttons, and card ranks.

## UI / Asset Rules

- Prioritize legibility of card rank, suit, role labels, counts, and action buttons at 1280x720.
- Use green as table grounding only; break it with white cards, red/black suits, amber active highlights, and neutral panels.
- Cards should have stable dimensions and selected state should be visible without shifting neighboring layout.
- Buttons should use simple rectangular Control styling with clear enabled/disabled states.
- Help, summary, and AI reason text should stay compact and utilitarian; prefer short labels and wrapped panel text over decorative callouts.
- Avoid large ornamental backgrounds that compete with card faces.

## Avoid

- Dark, blurred, or atmospheric table images that reduce readability.
- One-note green-only palette.
- Oversized decorative hero/landing layout.
- Tiny card text or cramped hand spacing that cannot be inspected in screenshots.

## Reference Notes

- v0.1.0 uses procedural UI instead of required bitmap card art.
- Future asset generation should match the procedural readability established in v0.1.0.
- v0.4.0 keeps the procedural style and adds guidance text; no bitmap assets are required.
