# Document Index: Doudizhu

## Cross-Tag (live, accumulating)

- `GDD.md` — Game Design Document and design source of truth.
- `ROADMAP.md` — Tag-by-tag release plan.
- `STYLE.md` — Visual prompt and UI style guide.
- `ASSETS.md` — Cross-tag asset manifest and visual asset contract.
- `MEMORY.md` — Cross-tag discoveries and gotchas, created when needed by later stages.

## Current-Tag (v0.6.0)

- `PLAN.md` — v0.6.0 task breakdown, mechanics, playable unit, verification expectations, and task status.
- `STRUCTURE.md` — v0.6.0 architecture and system/component plan.
- `SCENES.md` — v0.6.0 scene and UI layout contract.

## Per-Tag Archives

- `docs/tags/<Tag>/` — Immutable archives created by `$gm-finalize` after a tag ships.

## Pipeline Records

- `.godotmaker/stage.jsonl` — Stage event log for the current tag.
- `.godotmaker/evaluation.json` — Latest evaluator verdict once `$gm-evaluate` runs.
- `GAP.md` — Temporary gap-fix task list once `$gm-fixgap` runs.

## Runtime / Test Areas

- `src/` — Game code created by `$gm-build` workers.
- `test/` — gdUnit tests created by `$gm-build`.
- `e2e/` — End-to-end tests maintained by `$gm-evaluate`.
- `assets/` — Concrete asset files created or collected by `$gm-asset` when required.
- `references/` — Scene reference images created by `$gm-asset`.
