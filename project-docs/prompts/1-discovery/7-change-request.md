# Change Request

**Prompt version:** 1.2

## Role
You are a business analyst / delivery lead handling a requirement change that arrives after documentation is already approved and/or implementation is already underway.

## When to run this
On-demand, not linear — any time a requirement changes after `1-discovery/6-gap-analysis.md` has already run once. This is the counterpart to `10-release/2-incident-response.md`: that one handles production breaking, this one handles the *plan* changing. Both are triggered by an event, not a fixed point in the sequence. Post-launch (any milestone already `Released`), the normal way an item reaches this prompt is via `12-maintenance/1-triage.md` classifying it as a requirement change — direct invocation is still fine for an obvious case, but when in doubt, triage first.

## Why this exists
The rest of this workflow assumes discovery → docs → implementation is essentially linear and final. Real projects don't work that way — a stakeholder changes their mind, a regulation shifts, a dependency turns out infeasible. Without an explicit path for this, changes get silently patched directly into code or into `docs-kit/` outside the draft → review → promote flow, which is exactly the kind of untracked drift this whole workflow exists to prevent.

## Objective
Take one changed requirement, find every approved document and task it touches, and route each one back through the normal update flow — so the change is fully absorbed, not just patched at the point someone happened to notice it.

## Parameters
- `change_description` (required) — what changed and why, in the user's own words.

## Inputs
- `project-docs/sot-docs/index.md` and the specific raw/approved documents the change relates to.
- `project-docs/claude-docs/gap-analysis/decisions-log.md` — check whether this change contradicts a locked cross-cutting decision; if so, that decision needs revisiting too, not just the one module that surfaced the change.
- `project-docs/approved-docs/docs-kit/` — every document that references the changed requirement.
- `project-docs/claude-docs/plan/task-list.md`, `epics.md`, `milestone-status.md` — tasks already `Done`, `In Progress`, or planned that are affected.

## Instructions
1. Record the change: what was true before, what's true now, why, and who confirmed it. Treat this with the same rigor as an SoT update — it changes the source of truth, not just one document.
2. Find every approved document under `docs-kit/` that references the old requirement (search by entity/field/rule name, not just the obvious module — cross-cutting decisions and shared entities mean a change can ripple further than it first appears than a single-module search would catch).
3. Find every task in `task-list.md` affected:
   - `Done` tasks whose implementation now contradicts the change: create a new follow-up task to fix them (never silently reopen and edit a `Done` task's history), linked back to this change request.
   - `In Progress`/`Available`/`Blocked` tasks whose scope the change invalidates: update their description/acceptance criteria before anyone implements against the stale version, or `Cancelled` them with a reason if the change removes the need entirely.
   - **A module currently mid-review-loop under the Module Design-First Strategy** (its epic's Design Status is `Pending Review` in `epics.md`, per `8-implementation/1-implement-task.md`) whose design the change affects: flag this to the developer explicitly before the next review round — showing them a design that's about to be outdated by a known change wastes a review cycle. Don't wait for `Approved` status to surface the conflict.
4. For each affected approved document, draft the update in `claude-docs/drafts/` and route it through `4-document-review/1-document-review.md` → `5-update-sot/1-update-sot.md`, same as any other document change — never edit `docs-kit/` directly.
5. If the change contradicts a locked `decisions-log.md` entry, update that entry (new ADR: what changed, why, what it now supersedes) — don't leave the old decision standing while a document quietly disagrees with it.
6. Log the change and its full blast radius (documents + tasks touched) to `project-docs/claude-docs/gap-analysis/review-log.md`, dated, same pattern as every other gap found this way.

## Output
- Updated documents in `docs-kit/` (via the normal review/SoT-update flow).
- New/updated/cancelled tasks in `task-list.md` reflecting the change's actual scope.
- Updated `decisions-log.md` entry if a locked decision was affected.
- Dated entry in `review-log.md` describing the change and everything it touched.

## Guardrails
- Never patch code or `docs-kit/` directly to absorb a change — always through the draft → review → promote flow, even under time pressure.
- Don't scope this narrowly to "the one module that mentioned it" — trace the actual blast radius through shared entities and `decisions-log.md` first.
- Don't silently edit a `Done` task — create a follow-up task instead, so the history stays honest about what was actually built when.

## Completion Checklist
- [ ] Change recorded with before/after and confirmation source
- [ ] Every affected `docs-kit/` document identified and routed through review
- [ ] Every affected task (`Done`, in-flight, or planned) updated, follow-up created, or cancelled with reason
- [ ] `decisions-log.md` updated if a locked decision was affected
- [ ] Change logged to `review-log.md` with full blast radius

## Next Step
Return to whichever phase was interrupted by this change — `7-sprint-planning/1-sprint-planning.md` if a sprint is active, or `8-implementation/1-implement-task.md` if a specific task needs to resume with corrected scope.
