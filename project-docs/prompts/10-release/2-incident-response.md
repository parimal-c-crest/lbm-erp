# Incident Response

**Prompt version:** 1.2

## Role
You are the on-call engineer responding to a live production incident.

## When to run this
Any time production is degraded or down — not scheduled, not part of the linear phase sequence. Run this the moment an incident is noticed, regardless of what else is in progress (a sprint, implementation, anything) — don't route an active outage through `12-maintenance/1-triage.md` first, go straight here; triage exists for everything that isn't this urgent. This is separate from `1-release.md §8`'s rollback step, which handles a failed release verification during a release itself — this phase handles incidents discovered at any other time, including well after a successful release.

## Objective
Stabilize production first, understand what happened second, and leave behind a record that prevents silent recurrence — in that order.

## Inputs
- Whatever signaled the incident: an error report, a monitoring alert, a user report, a failed smoke test.
- `docs-kit/6-development/10-debugging-guide.md` — diagnostic approach and tooling.
- `docs-kit/6-development/7-deployment-strategy.md` — rollback procedure, environment layout.
- Recent deploys/changes (`CHANGELOG.md`, recent commits) — most incidents trace to something that changed recently.
- Current production monitoring/logs, if available.

## Instructions

### Stabilize
1. Assess severity and impact first: what's broken, who's affected, is data at risk. Don't start root-causing before you know whether the priority is "fix now" or "understand first."
2. If a recent deploy is the likely cause, roll back per `docs-kit/6-development/7-deployment-strategy.md`'s rollback procedure before investigating further — restoring service takes priority over understanding the exact cause.
3. If rollback isn't applicable (e.g. a data issue, an external dependency failure, not a code regression), apply the most direct mitigation available (feature flag off, restart, scale, block a specific abusive input) to restore service, even if it's not yet a permanent fix.
4. Communicate status as you go if anyone else is affected/watching — don't go dark mid-incident.

### Diagnose
5. Once service is stable, find the actual root cause — check logs, recent changes, and reproduce if possible. Don't close the incident on a guess.
6. Determine whether this is a code defect, a documentation/spec gap (the implementation matched the docs, but the docs were wrong), an infrastructure issue, or an external dependency failure — this determines where the fix belongs.

### Fix and prevent recurrence
7. If it's a code defect: route it as a new task into `project-docs/claude-docs/plan/task-list.md` under the relevant epic, to go through the normal `8-implementation/` loop — don't hotfix silently outside the normal implementation → review → test path unless the severity genuinely requires an emergency exception (and if so, still run `2-code-review.md` on it after the fact, not instead of).
8. If it's a documentation/spec gap: route it through `9-sync-docs/1-sync-docs.md` so `docs-kit/` gets corrected, same as any other implementation-reveals-a-gap case.
9. If it's infrastructure/deployment: update `docs-kit/6-development/7-deployment-strategy.md` or `8-containerization.md` (via the normal document-review flow, `4-document-review/1-document-review.md`) so the next deploy doesn't repeat it.
10. **Trace back to the originating task.** Find the task(s) in `task-list.md` that built the broken behavior — if this incident is a code defect (not infra/external), it means that task's `9-sync-docs/2-module-completion-review.md` either didn't run, ran before this bug was introduced by a later change, or missed it. Note in the incident record which case it was: if the review ran and missed it, that's a signal the review itself needs sharpening (add what was missed as an explicit thing to check, in that epic's own notes at minimum); if it never ran, that epic's `Complete` status was invalid and should be flagged.
11. Write an incident record: what broke, impact/duration, root cause, what fixed it, what prevents recurrence, and the traceback from step 10.

## Output
- `project-docs/claude-docs/incidents/{{incident_id}}.md` — timeline, impact, root cause, resolution, prevention follow-up, and the traceback to the originating task/epic.
- New task(s) in `task-list.md` for any code/infra fix that isn't already done.
- Documentation corrections routed through the normal review flow, if the incident revealed a doc gap.

## Guardrails
- Restore service before you fully understand the cause — don't let root-causing delay mitigation when users are actively affected.
- Never silently patch production outside the normal implementation/review path except under genuine emergency, and even then, review it after the fact.
- Don't close an incident without a written record — an incident that isn't documented is one that will repeat with no institutional memory of it.
- Don't blame-assign in the incident record — focus on what happened and what changes, same principle as `7-sprint-planning/2-retrospective.md`.

## Completion Checklist
- [ ] Service restored (rollback or direct mitigation)
- [ ] Root cause identified, not guessed
- [ ] Fix routed to the correct place (task list / sync-docs / deployment doc update)
- [ ] Traced back to the originating task/epic and its `9-sync-docs/2-module-completion-review.md` status
- [ ] Incident record written to `project-docs/claude-docs/incidents/{{incident_id}}.md`
- [ ] Anyone affected/watching was kept informed during the incident

## Next Step
If a code fix was routed to `task-list.md`, it enters the normal cycle: `7-sprint-planning/1-sprint-planning.md` (or straight into the current sprint if urgent) → `8-implementation/1-implement-task.md` → onward as usual. No incident-specific next phase — production resumes its normal cadence once the record is written.
