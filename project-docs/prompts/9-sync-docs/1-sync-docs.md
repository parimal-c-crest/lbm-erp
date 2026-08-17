# Documentation Sync

**Prompt version:** 1.1

## Role
You are the documentation owner ensuring the `docs-kit` deliverable set still matches what was actually built.

## Objective
Update all affected documents under `project-docs/approved-docs/docs-kit/` so they accurately reflect the implementation that just passed code review and testing, closing the loop between code and the Source of Truth.

## Parameters
- `task_id` (required) — the tested, approved task.

## Inputs
- The tested, approved implementation for `task_id`.
- Documents under `project-docs/approved-docs/docs-kit/` related to this change (`3-api/`, `2-database/`, `6-development/`, `5-modules/<module>/`, `4-ui/`).
- Any deviations between the original documents and what was actually implemented (check the implementation and review notes for these).

## Instructions
1. Identify every document under `docs-kit/` whose content is now stale because of this implementation (e.g., `docs-kit/3-api/1-api-design.md` whose endpoint signature changed, `docs-kit/2-database/2-erd.md` whose column was renamed, `docs-kit/5-modules/<module>/4-schema.md` whose flow changed).
2. Draft the update in `project-docs/claude-docs/drafts/<category>/[<module>/]<template-filename>` (same as `3-document-generate/`) so it goes through review before touching `docs-kit/` directly.
3. Update each affected document to match reality — not what was planned, but what was actually built and tested.
4. Where the implementation deviated from the original design, record why (briefly) so future readers understand the change wasn't accidental drift.
5. Update `docs-kit/4-ui/` documents if the change affects behavior visible to end users.
6. **If this task's change reflects (or reverses) a cross-cutting decision** — a rule that applies beyond this one module (e.g. a role's access scope, a naming convention, a shared enum) — don't stop at updating this module's own doc. Search every other `docs-kit/5-modules/<module>/` and cross-cutting document (`3-api/3-authorization.md`, `4-ui/1-navigation.md`, etc.) for the old assumption and update each one the same day, with a dated note explaining the change. A decision made once and only written into the module that happened to trigger it is exactly how the same stale-permissions bug ends up getting independently rediscovered in three or four other modules later.
7. Route the updated drafts through `project-docs/prompts/4-document-review/1-document-review.md` (scoped to just this document's path) before they land back in `docs-kit/`, then `project-docs/prompts/5-update-sot/1-update-sot.md` to fold them back into the Source of Truth.
8. **Keep `CLAUDE.md` and `sot-docs/index.md` lean.** Both get read at the start of every session (per `prompts/README.md`'s session-start recap), so their size is a fixed cost paid every session, forever — a bloated file compounds across the life of a long project. While syncing, check whether either has accumulated stale detail (superseded decisions, completed one-off notes that no longer need repeating, verbose history better left to `sot-docs/changelog.md`) and prune it. This isn't a scheduled task — do it opportunistically whenever this prompt runs and something stale is noticed, not on a fixed cadence.

## Output
- Updated documents in `project-docs/approved-docs/docs-kit/` (via the review/SoT-update flow).
- `project-docs/sot-docs/changelog.md` entry noting the sync.

## Guardrails
- Documentation sync isn't optional cleanup — an approved task isn't fully done until this step runs.
- Never edit files under `project-docs/approved-docs/docs-kit/` directly outside the draft → review → promote flow, even for a "quick fix."
- Don't let "implementation is the real source of truth now" become an excuse to skip updating the written docs; both must agree.
- A cross-cutting decision that only gets written into the one module that triggered it is not actually synced — it's a gap waiting to be independently rediscovered in every other affected module.

## Completion Checklist
- [ ] All affected `docs-kit/` documents identified
- [ ] Draft updates written and routed through review
- [ ] Deviations from original design explained
- [ ] Updates promoted into `docs-kit/` and SoT updated
- [ ] `CLAUDE.md`/`sot-docs/index.md` checked for stale content worth pruning

## Next Step
Return to `project-docs/prompts/8-implementation/1-implement-task.md` for the next task. Once every epic in the active milestone is `Complete`, that prompt will tell you to run `project-docs/prompts/10-release/1-release.md`.
