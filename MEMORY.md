# Memory: Doudizhu

## Current Tag

- Tag: v0.2.0
- Theme: Expanded Doudizhu Rules
- Status: build verification in progress.

## Decisions

- v0.1.0 uses procedural UI for cards, table, panels, buttons, and labels.
- No bitmap image, animation, or audio assets are required for v0.1.0.
- The first playable unit supports singles, pairs, triples, bombs, and joker bombs; v0.2.0 expands this with three attachments, chains, and airplane without wings.
- E2E coverage is split by mechanic ID plus one full playable-loop test.
- v0.2.0 keeps the same procedural UI and expands pure card rules plus Hint/AI candidate search.
- v0.2.0 adds a deterministic debug fixture for e2e coverage of expanded straight follow/play behavior.

## Known Limitations

- Special combinations beyond the roadmap scope, such as airplane with wings and four-with-two, remain deferred.
- Presentation polish, animation, audio, and improved AI are intentionally deferred to later roadmap tags.

## Reviewer Triage Log

No reviewer findings were rejected or skipped for v0.1.0 or v0.2.0.
