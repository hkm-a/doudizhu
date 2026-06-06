# Memory: Doudizhu

## Current Tag

- Tag: v0.6.0
- Theme: Scoring And Match Progression
- Status: Build verification in progress.

## Decisions

- v0.6.0 scoring is owned by `ScoreState`; apply result scoring through stable `DoudizhuGame.result_key` values so UI refreshes cannot double-count a hand. New Hand clears only last delta/card state, while New Match clears cumulative totals and applied-result guards.
- v0.6.0 target-score completion is based on positive score reaching the target, not losing seats reaching a negative absolute value.
- v0.6.0 result banner uses a wider compact panel with one-row result actions; layout tests validate score summary plus three controls at supported desktop sizes.
- v0.1.0 uses procedural UI for cards, table, panels, buttons, and labels.
- No bitmap image, animation, or audio assets are required for v0.1.0.
- The first playable unit supports singles, pairs, triples, bombs, and joker bombs; v0.2.0 expands this with three attachments, chains, and airplane without wings.
- E2E coverage is split by mechanic ID plus one full playable-loop test.
- v0.2.0 keeps the same procedural UI and expands pure card rules plus Hint/AI candidate search.
- v0.2.0 adds a deterministic debug fixture for e2e coverage of expanded straight follow/play behavior.
- v0.3.0 keeps procedural UI assets and improves table spacing, selected-card highlight/lift, active/result clarity, and responsive desktop layout without changing Doudizhu rules.
- v0.3.0 adds evaluator screenshots for launch, selected-card, and result states under `e2e/screenshots/scene_main/`.
- v0.4.0 should improve choice policy and usability without expanding the supported card-rule set.
- Hint and AI policy changes must keep `CardRules.classify` and `CardRules.can_beat` as the legality gate.

- When image assets are needed, use the user's locally deployed ComfyUI to generate them, do not embed generated images into chat context, and skip image-review/VQA steps unless the user explicitly asks; use generated assets directly and let the user judge acceptance.
- v0.5.0 should finish with procedural/testable audio by default; avoid adding external audio files unless implementation proves they are necessary.

## Known Limitations

- Special combinations beyond the roadmap scope, such as airplane with wings and four-with-two, remain deferred.
- Animation, audio, and improved AI are intentionally deferred to later roadmap tags.
- v0.4.0 improves basic AI policy, but full expert Doudizhu AI and difficulty settings remain out of scope unless the roadmap is updated.

## Reviewer Triage Log

No reviewer findings were rejected or skipped for v0.1.0, v0.2.0, or v0.3.0.

