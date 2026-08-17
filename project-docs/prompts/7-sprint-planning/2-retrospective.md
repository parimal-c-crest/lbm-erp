# Sprint Retrospective

**Prompt version:** 1.1

## Role
You are a delivery lead running a short retrospective on the sprint that just finished, before planning the next one.

## When to run this
After a sprint's status rolls up to `Complete` (per `8-implementation/1-implement-task.md`), and before running `1-sprint-planning.md` for the next sprint.

## Objective
Capture what actually happened in the sprint that just finished — what went well, what didn't, what should change — so the next sprint benefits from it instead of repeating the same friction silently.

## Inputs
- The completed sprint file: `project-docs/claude-docs/sprints/sprint-{{n}}.md`.
- `project-docs/claude-docs/plan/task-list.md` — actual vs. estimated effort, any task that was Blocked at some point.
- `project-docs/claude-docs/tasks/{{task_id}}-review.md` files from this sprint — recurring code-review feedback is a signal worth surfacing here, not just fixing task-by-task.
- Any `[NEEDS INPUT]`/`[Assumption]` markers in `docs-kit/` that turned out to be wrong or costly during this sprint's implementation.

## Instructions
1. Go through the sprint's tasks and note: which finished roughly on estimate, which ran significantly over/under, and why (genuinely harder than scoped, blocked on something external, scope crept mid-task, etc.).
2. Note any task that got `Blocked` at any point during the sprint, even if it's `Done` now — a task that had to be blocked and unblocked is a signal, not a non-event.
3. Look for repeated patterns across code reviews this sprint (e.g. the same category of fix requested more than once) — that's worth calling out as a process/standards gap, not just noise.
4. Note any place the documentation (`docs-kit/`) turned out to be wrong, ambiguous, or missing something the team only discovered while implementing — confirm it got routed through `9-sync-docs/1-sync-docs.md`; if it wasn't, flag it now rather than losing it.
4a. Log any new risk, issue, or unresolved dependency surfaced this sprint into `project-docs/claude-docs/plan/raid-log.md`, and any deliberate shortcut/workaround taken to hit the sprint into `tech-debt-register.md` — a shortcut that isn't written down anywhere is one nobody will ever schedule time to fix.
4b. **SoT freshness check.** Ask: did anything discovered or decided this sprint make `sot-docs/raw/` or an approved `docs-kit/` document stale — not wrong-and-already-fixed, but genuinely no longer matching reality and nobody's filed a change for it yet? Long projects drift between formal update points; this is the recurring moment that catches it. If something's stale, don't fix it here — route it through `1-discovery/7-change-request.md`.
5. Ask: is the current sprint length/capacity assumption still right, given how this sprint actually went? Don't change it silently — surface it as a recommendation for the next `1-sprint-planning.md` run.
6. Write up 2-4 concrete takeaways — each one specific enough to actually change something next sprint (e.g. "estimate database-migration tasks 1.5x higher — every one ran over this sprint"), not vague sentiment ("communication could be better").
7. Keep this short — a sprint retro for a solo/small team should take minutes to write, not become its own project.

## Output
- `project-docs/claude-docs/sprints/sprint-{{n}}-retro.md` — what went well, what didn't, concrete takeaways for next sprint (per step 6), and any capacity/estimate adjustment recommendation (step 5).
- `project-docs/claude-docs/plan/raid-log.md` and `tech-debt-register.md` updated with anything new surfaced this sprint (step 4a).

## Guardrails
- Don't turn this into blame-assignment — the point is process signal, not scoring individual tasks.
- Don't produce vague, non-actionable takeaways — every item should imply a specific change to how the next sprint is planned or worked.
- This phase doesn't re-open or re-implement anything from the finished sprint — issues found belong in the task backlog (`task-list.md`) as new tasks, or as an explicit input to the next `1-sprint-planning.md` run, not fixed here.

## Completion Checklist
- [ ] Task effort (estimate vs. actual) reviewed for the finished sprint
- [ ] Any `Blocked` tasks during the sprint noted, even if now `Done`
- [ ] Repeated code-review feedback patterns identified, if any
- [ ] Documentation gaps discovered during the sprint confirmed as routed through `9-sync-docs/`
- [ ] SoT freshness checked; anything stale routed through `1-discovery/7-change-request.md`
- [ ] 2-4 concrete, actionable takeaways written
- [ ] `sprint-{{n}}-retro.md` written

## Next Step
Check `project-docs/claude-docs/plan/milestone-status.md`. If the active milestone is `Complete`, run `project-docs/prompts/10-release/1-release.md` next. Otherwise, run `project-docs/prompts/7-sprint-planning/1-sprint-planning.md` for the following sprint — it should read this retro's takeaways before selecting the next batch of tasks.
