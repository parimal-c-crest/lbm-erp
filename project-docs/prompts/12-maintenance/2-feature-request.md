# New Feature (post-launch, scoped discovery)

**Prompt version:** 1.0

## Role
You are a business analyst / delivery lead onboarding one genuinely new capability into a project that has already shipped at least one milestone — running discovery, documentation, and planning scoped to just this feature, not the whole project again.

## When to run this
On-demand, routed here by `project-docs/prompts/12-maintenance/1-triage.md` (lane 6 — the requested capability isn't described anywhere in `docs-kit/`, in any form) or invoked directly once the same is confirmed.

## Why this exists, and why it isn't just "re-run discovery"
`10-release/1-release.md`'s original Next Step pointed new features back at `1-discovery/3-sot-review.md`. Followed literally, that chain re-runs project analysis, gap analysis, and the documentation plan for the **entire** project, then regenerates every category — the right flow for a brand-new project, wildly disproportionate for adding one feature to a shipped one. This prompt is the correctly-scaled replacement: it does real discovery and real gap analysis, just bounded to the new feature's actual footprint instead of the whole taxonomy.

## Parameters
- `feature_description` (required) — what's being requested, in the stakeholder's own words, plus whatever material backs it up (ticket, email thread, meeting notes).

## Inputs
- `project-docs/sot-docs/index.md` and `project-docs/claude-docs/analysis/module-list.md` — to judge whether this is a new module or an extension of existing ones.
- `project-docs/claude-docs/gap-analysis/decisions-log.md` — every locked cross-cutting decision this feature must respect, not re-decide.
- `project-docs/claude-docs/plan/documentation-plan.md` — the project's full document history, to append to rather than replace.
- `project-docs/approved-docs/docs-kit/` — what already exists, so this feature is written as an addition to it, not in ignorance of it.

## Instructions
1. **Intake the material.** Append `feature_description` and any supporting material to `project-docs/sot-docs/raw/`, dated. Add **only the new entries** to `project-docs/sot-docs/index.md` — this is not a full `3-sot-review.md` re-run; the rest of the index stays untouched.
2. **Scope the feature.** Against `module-list.md`, decide: is this a genuinely new module (gets its own `5-modules/<slug>/` full 11-document set), or an extension/modification of one or more existing modules (only the specific documents that change get touched)? State the decision and why — this determines everything that follows.
3. **Scoped gap analysis.** Run the equivalent of `1-discovery/6-gap-analysis.md`'s steps, bounded to this feature: missing requirements, conflicts with what's already approved, and — critically — the cross-cutting decisions inventory check against the **existing** `decisions-log.md`. If this feature needs a new cross-cutting decision (a new role, a new shared enum value, an extension to an existing status lifecycle), append it there as a new dated ADR — never start a second, parallel decisions log. If it needs to *change* an existing locked decision rather than add to it, stop — that's a requirement change, hand back to `1-triage.md` for `1-discovery/7-change-request.md` instead, this prompt is for genuinely new capability only.
4. **Delta documentation plan.** Append a new, clearly dated section to `project-docs/claude-docs/plan/documentation-plan.md` (do not replace or renumber the existing plan) listing only the documents this feature adds or changes, each marked with its dependency/parallel-safety annotation exactly as the original plan does. If the feature is a new module, this is that module's usual 11-document entry; if it's an extension, list only the specific existing documents each category's batch file needs to regenerate (scoped to just those files, per each batch file's own "to regenerate a single document" note).
5. **Generate.** For a new module: run `3-document-generate/05-modules/modules.md` for it. For an extension: run each affected category's batch file, scoped to just the changed document(s) — never regenerate a whole category for a feature that touches one or two of its documents.
6. **Review and promote.** `4-document-review/1-document-review.md`, scoped the same way generation was — one module, or the specific documents touched.
7. **Update the Source of Truth.** `5-update-sot/1-update-sot.md`, as usual.
8. **Plan the implementation.** Run `6-implementation-plan/1-implementation-plan.md` scoped to a **new milestone** covering this feature (or this batch of features, if several were queued together) — see that prompt's own "Re-run after launch" note. This keeps the existing release flow (release notes, version bump, UAT sign-off) working exactly as it does for the original milestones.
9. From there, the sprint and implementation loop proceeds exactly as it does for any milestone.

## Output
- New/updated raw material under `sot-docs/raw/`, indexed incrementally in `sot-docs/index.md`.
- New ADR(s) in `decisions-log.md`, if the feature required one.
- A dated delta section in `documentation-plan.md`.
- New or updated documents in `docs-kit/` via the normal draft → review → promote flow, scoped to just this feature.
- A new milestone in `milestone-status.md` with its own epics and tasks.

## Guardrails
- Never regenerate a whole category for a feature that touches only one or two of its documents.
- Never create a second `decisions-log.md`, `documentation-plan.md`, or `module-list.md` — every one of these is a single running file the whole project shares; this prompt appends to them, it doesn't fork them.
- If step 3 finds the feature actually contradicts an already-approved document rather than extending it, stop and route back to `1-discovery/7-change-request.md` via `1-triage.md` — that flow, not this one, is built to trace and update everything a contradiction touches.
- Don't skip the cross-cutting decisions check because "it's just one feature" — a new feature is exactly how an undocumented cross-cutting decision (a new role, a new status value) usually first appears.

## Completion Checklist
- [ ] Feature material captured in `sot-docs/raw/` and indexed incrementally
- [ ] New-module-vs-extension decision made and stated
- [ ] Scoped gap analysis run, including the cross-cutting decisions check against the existing log
- [ ] Delta documentation plan appended, not replacing the original
- [ ] Only the affected documents generated/regenerated, not a whole category
- [ ] Reviewed, promoted, and synced to SoT through the normal flow
- [ ] New milestone created for this feature (or feature batch) with its own epics/tasks

## Next Step
`7-sprint-planning/1-sprint-planning.md` for the new milestone, then the normal sprint/implementation/release cycle. If this feature turns out to affect production behavior immediately (rare, but possible for a fast-tracked item), route any resulting incident through `10-release/2-incident-response.md` as usual — that lane doesn't change based on how the feature got built.
