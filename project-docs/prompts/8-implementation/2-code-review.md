# Code Review

**Prompt version:** 1.0

## Role
You are a senior engineer reviewing a completed task's implementation before it's considered done.

## Objective
Review the code produced for a task for correctness, quality, standards compliance, security, and performance, and either approve it or send it back with specific, actionable feedback.

## Parameters
- `task_id` (required) — the task just implemented via `1-implement-task.md`.

## Inputs
- The diff/commit for `task_id`.
- `project-docs/claude-docs/tasks/{{task_id}}-todos.md` — the Todo checklist for this task.
- The task's source documentation under `project-docs/approved-docs/docs-kit/`.
- `CLAUDE.md` and `docs-kit/6-development/` (standards, conventions, architecture).

## Instructions
1. Confirm every Todo in `{{task_id}}-todos.md` is checked off; if not, send it back rather than reviewing an incomplete task.
2. Confirm the implementation actually satisfies the task's documented acceptance criteria — re-check against the source doc in `docs-kit/`, not just the code's apparent intent.
3. Check code quality: readability, naming, structure, adherence to existing patterns in the codebase, no dead code or leftover debug artifacts.
4. Check standards compliance against `CLAUDE.md` / `docs-kit/6-development/3-coding-standards.md` (formatting, conventions, architecture boundaries).
5. Check for security issues relevant to the change (input validation, auth/authz checks per `docs-kit/3-api/2-authentication.md` and `3-authorization.md`, secrets handling, injection risks).
6. Check for obvious performance issues (N+1 queries, unnecessary loops, unbounded data loads) given the scale implied by the requirements.
7. Check scope: does the diff contain only this task's change, or did unrelated changes sneak in?
8. Produce a verdict: **Approved**, **Approved with minor fixes** (apply if trivial), or **Changes requested** (specific list, each tied to a file/line where possible).
8a. If the review surfaces a real shortcut, known limitation, or deferred cleanup that's being accepted rather than fixed now (e.g. "this works but doesn't scale past N records, revisit later"), log it to `project-docs/claude-docs/plan/tech-debt-register.md` rather than letting it live only in this review's notes where it'll never resurface.
9. If **Changes requested**: set the task's status back to `In Progress` in the sprint file and `task-list.md`, then recompute its Epic status in `epics.md` and the sprint's own status per the canonical rollup rule in `6-implementation-plan/1-implementation-plan.md`'s "Status Tracking" section — a task bouncing back out of `Done` can pull its Epic and Sprint back from `Complete` to `In Progress`, and that must show immediately, not just get fixed on the next unrelated task update.

## Output
- Review verdict appended to `project-docs/claude-docs/tasks/{{task_id}}-review.md`.
- If changes requested, task status in the sprint file and `task-list.md` set back to `In Progress` with the fix list attached, and Epic/Sprint status recomputed accordingly.

## Guardrails
- Don't approve code that doesn't meet its documented acceptance criteria, regardless of code quality.
- Be specific — "improve error handling" is not actionable; "handle the null case at line 42 before dereferencing" is.
- If changes are requested, never leave Epic/Sprint status showing `Complete` on the strength of a task that just got sent back.

## Completion Checklist
- [ ] Todo checklist confirmed complete
- [ ] Correctness verified against `docs-kit/` requirements
- [ ] Quality, standards, security, performance checked
- [ ] Verdict recorded; task status updated accordingly
- [ ] Epic/Sprint status recomputed if the task was sent back

## Next Step
If changes were requested, they get fixed and this prompt re-run before proceeding. Once approved, run `project-docs/prompts/8-implementation/3-generate-tests.md` next.
