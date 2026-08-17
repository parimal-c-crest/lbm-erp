# Routine Upkeep (dependencies, security patches, tech debt)

**Prompt version:** 1.0

## Role
You are a maintainer handling work that keeps a shipped project healthy without changing what it does for a user — dependency bumps, security patches, and paying down previously-accepted tech debt.

## When to run this
On-demand, routed here by `project-docs/prompts/12-maintenance/1-triage.md` (lane 5 — no user-visible behavior change) or invoked directly for a known routine item (a dependency's security advisory, a scheduled tech-debt pull-in).

## Objective
Turn one upkeep item into a task (or small set of tasks) that goes through the normal implementation loop, and regenerate documentation only where the change actually invalidates something already approved — not by default.

## Parameters
- `upkeep_description` (required) — what needs updating and why (a dependency + CVE, an expiring tool version, a `tech-debt-register.md` entry being pulled in).

## Inputs
- `project-docs/claude-docs/plan/tech-debt-register.md` — for debt pull-in items, the original entry: what was deferred, why, and what accepting it now costs to fix.
- `project-docs/approved-docs/docs-kit/1-project/4-tech-stack.md`, `6-development/1-development-environment.md`, `8-containerization.md`, `9-ci-cd.md` — the documents most likely to reference specific versions/tools this kind of change touches.
- `project-docs/claude-docs/plan/task-list.md` — where the resulting task(s) get added.

## Instructions
1. Confirm this item is genuinely behavior-neutral — if working through it turns up an actual behavior change (a major version bump that drops a feature the app relies on, a security fix that requires an API contract change), stop and route it back through `1-triage.md` instead; it isn't routine anymore.
2. Create one task (or a small set, if the item naturally splits) under the standing **Maintenance** epic in `task-list.md`, scoped and estimated like any other task, referencing the specific dependency/tool/debt-register entry it addresses.
3. Implement through the normal `8-implementation/1-implement-task.md` → `2-code-review.md` → `3-generate-tests.md` loop — upkeep work gets the same review and test rigor as feature work, not a shortcut.
4. **Check whether any approved document now states something false.** A version bump only invalidates documentation if a document actually names the old version/tool/approach explicitly — check `1-project/4-tech-stack.md`, `6-development/1-development-environment.md`, `8-containerization.md`, and `9-ci-cd.md` specifically, since those are the ones most likely to. If one does, regenerate **only that document**, via its category's batch file scoped to just that file (per that file's own "to regenerate a single document" note), then `4-document-review/1-document-review.md` on it.
5. If this item resolves a `tech-debt-register.md` entry, mark it resolved there with the date and what changed, rather than leaving it listed as outstanding after the fix ships.

## Output
- Task(s) under the Maintenance epic, implemented and reviewed through the normal loop.
- Any invalidated document regenerated and re-approved — only if actually invalidated, not as a default step.
- `tech-debt-register.md` updated if this resolved a listed item.

## Guardrails
- Don't manufacture documentation churn to look thorough — a dependency bump that changes no documented behavior touches no file under `docs-kit/` at all.
- Don't skip code review or tests because the change "is just a version bump" — routine upkeep still goes through the full implementation loop.
- If step 1 finds real behavior change hiding inside what looked like routine upkeep, stop and re-route through `1-triage.md` rather than continuing here.

## Completion Checklist
- [ ] Confirmed genuinely behavior-neutral before proceeding
- [ ] Task(s) created under the Maintenance epic
- [ ] Implemented through the normal `8-implementation/` loop, review and tests included
- [ ] Documentation checked for invalidation; regenerated only where actually invalidated
- [ ] `tech-debt-register.md` updated if applicable

## Next Step
Back to the normal sprint cadence — this task competes for a sprint slot like any other Maintenance-epic task, via `7-sprint-planning/1-sprint-planning.md`, unless it's urgent enough (an active security advisory) to justify claiming it immediately per `8-implementation/1-implement-task.md`'s own claiming rules.
