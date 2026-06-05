<!-- AUTO-GENERATED from skills/core/_shared/reviewer-finding-triage.md. Do NOT edit this deployed copy — it is overwritten on every publish. Edit the source under skills/core/_shared/ instead. -->

# Reviewer Finding Triage

After the reviewer subagent reports back, the dispatching role
(gm-build / gm-fixgap) decides per finding what to do with it. This doc
defines the decision rules. The reviewer itself does NOT know about the
triage — its job is to find issues and assign severity honestly.
Triage is the dispatching role's responsibility.

## Three options per finding

Every finding gets exactly one of:

- **ACCEPT** — the finding is real and worth fixing. Add a NEW `pending`
  task to the active task file (`PLAN.md` for gm-build, `GAP.md` for
  gm-fixgap).
- **REJECT** — the finding is wrong (false positive). Record the
  decision in `MEMORY.md` under the **Reviewer Triage Log** section.
- **SKIP** — the finding is real but not worth fixing now. Record the
  decision in `MEMORY.md` under the **Reviewer Triage Log** section.

## Defaults (when uncertain)

- **critical / major** → default ACCEPT. Treat REJECT and SKIP as
  exceptions that need justification.
- **minor** → default SKIP. Most minor findings are quirks/notes worth
  remembering but not worth a task.

## Citation requirement

REJECT and SKIP both go to `MEMORY.md`. Whether a citation is required
depends on severity:

| Severity         | REJECT      | SKIP        |
|------------------|-------------|-------------|
| critical / major | **Required**| **Required**|
| minor            | Optional    | Optional    |

A mandatory citation must be ONE of:

- A specific gotcha entry (e.g., `.claude/skills/gecs/gotchas.md` G7)
- A specific Godot/ECS API doc reference
- A prior `MEMORY.md` entry (System Index, prior triage decision, prior
  design decision)
- A `PLAN.md` / `GAP.md` task that already covers the same issue (by
  task ID)

The citation must actually support the decision — do not cite a doc
you have not read or a gotcha that doesn't match.

### Forbidden REJECT reasons (regardless of severity)

- "Code looks correct to me"
- "Worker tested it and it passed"
- "Reviewer is wrong" (without citation)
- "Already verified" (without pointing to the verifier's specific check)

If you cannot satisfy the citation requirement for a critical/major
finding → **ACCEPT**.

## Triage record format

Append to `MEMORY.md` under the **Reviewer Triage Log** section (see
`templates/MEMORY.md`):

```markdown
### {UTC ISO timestamp} — {current Tag from PLAN.md} — {File:Line or area}
- **Finding:** {verbatim from reviewer report}
- **Severity:** critical | major | minor
- **Decision:** REJECT | SKIP
- **Reason:** {1-2 sentence explanation}
- **Citation:** {one of the four allowed types — required for critical/major; "n/a" or omitted for minor}
```

Before writing a new triage entry, scan the existing **Reviewer Triage
Log** section. If the same class of issue was already triaged the same
way, cite that prior entry instead of re-deriving the rationale.

## Why this matters

`/gm-accept` reads the **Reviewer Triage Log**, filters to entries from
the current Tag, and shows every REJECT and SKIP to the user as part of
the tag summary. The user is the final gate — if a triage decision was
wrong, the user picks "Fix issues" and the missed finding goes through
`/gm-fixgap` in the next round.
