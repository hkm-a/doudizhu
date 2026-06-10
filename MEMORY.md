# Memory: Doudizhu

## Current Tag

- Tag: v0.9.1 (shipped as git tag v0.9.1)
- Theme: Drag-to-Select Cards
- Status: main.gd refactor completed (668 lines, 62% reduction from 1775). 6 module files created. test_fan_layout fixed. 1 new bug found in card_rules.gd (Array/Array[Dictionary] type mismatch).

## Decisions

- main.gd (1776 lines) has been flagged for refactoring but deferred due to tight coupling with game state, debug methods, and e2e fixtures. Splitting requires extracting ~80+ methods across 5+ modules while preserving all public debug_ and simulate_ signatures. Future high-priority task.

## Decisions

- v0.7.0+: ComfyUI backend added to `tools/asset_gen.py`. Use `--model comfyui:default` (or `comfyui:default` in `asset_image_model`) to generate images via local ComfyUI at `127.0.0.1:8188`. Configure via env vars: `COMFYUI_HOST`, `COMFYUI_PORT`, `COMFYUI_WORKFLOW`, `COMFYUI_NEGATIVE_PROMPT`, `COMFYUI_TIMEOUT`. Default workflow is `tools/comfyui/default_txt2img.json`.

- v0.8.0 M5: Card assets use `CardAssets` static utility — preloads all 56 card images + back + table bg into memory at startup. Missing files return null and fall back to procedural rendering (`.label` text, `ColorRect` background). Card ID mapping: `rank_index*4 + suit_index` where ranks=3-15, suits=[S,H,C,D]; id=52=red_joker, id=53=black_joker. Two assets missing: `card_k_clubs.png`, `table_bg.png` — handled gracefully.

- v0.6.0 scoring is owned by `ScoreState`; apply result scoring through stable `DoudizhuGame.result_key` values so UI refreshes cannot double-count a hand. New Hand clears only last delta/card state, while New Match clears cumulative totals and applied-result guards.
- v0.6.0 target-score completion is based on positive score reaching the target, not losing seats reaching a negative absolute value.
- v0.6.0 result banner uses a wider compact panel with one-row result actions; layout tests validate score summary plus three controls at supported desktop sizes.
- v0.6.0 P08: Settings modal child buttons mirror modal visibility with focus_mode; set SFX/Music/Volume/Close to FOCUS_NONE while hidden and FOCUS_ALL while open to satisfy UI G8.
- v0.1.0 uses procedural UI for cards, table, panels, buttons, and labels.
- No bitmap image, animation, or audio assets are required for v0.1.0.
- The first playable unit supports singles, pairs, triples, bombs, and joker bombs; v0.2.0 expands this with three attachments, chains, and airplane without wings.
- E2E coverage is split by mechanic ID plus one full playable-loop test.

## M04 - Save/Load Game State

- SaveLoadUtils is a static class — `save_game(game, score_state, audio)` takes components directly, not `self`.
- GDScript typed arrays (`Array[int]`, `Array[String]`) reject plain `Array` assignment; must construct with explicit type annotation like `var arr: Array[int] = [int(a), int(b)]`.
- `JSON.stringify` in Godot 4 converts integers to floats; comparisons may fail if checking `1` vs `1.0`.
- `LocalizationUtils` lacks `class_name` — must be preloaded to avoid headless parse errors.
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
- GDScript typed arrays (`Array[Dictionary]`, `Array[int]`) reject untyped `Array` assignment from operations like `.slice()`, `+` concatenation, or dictionary lookups. Remove type annotations when the RHS is untyped.

## Reviewer Triage Log

No reviewer findings were rejected or skipped for v0.1.0, v0.2.0, or v0.3.0.

### v0.7.0 Build Review (ACCEPTED — added P08, P09 tasks)
- **Minor: Tutorial lacks modal blocker** — Tutorial panel can be opened while game is playable underneath. Add a ColorRect blocker behind tutorial. (ACCEPTED → P08)
- **Minor: T-key inconsistency** — T opens AND closes tutorial, while Escape closes any panel. Consistent toggle behavior preferred. (ACCEPTED → P08)
- **Minor: Stats reset boundary implicit** — `reset_match()` doesn't reset `last_delta`; relies on `start_new_hand()` called after it. Acceptable by construction. (SKIP — minor)
- **Minor: ComfyUI checkpoint cache unconventional** — Uses `_generate_comfyui._checkpoints` module-level attr. Unusual Python idiom but works. (SKIP — minor)
- **Minor: e2e test gap** — 19 unit tests pass but no e2e tests for tutorial/keyboard/stats flows. (ACCEPTED → P09)
- **Minor: Shortcut tests assert false** — hint/pass/play shortcut tests confirm shortcuts return false when game state is not in play phase. Valid minimal pass but shortcuts never tested when they should succeed. (SKIP — will be covered by e2e)

