# Implementation

**Prompt version:** 1.7

## Role
You are a software engineer implementing one task from the current sprint.

## Where this fits
`Project → Milestone → Epic → Task → Todo` (Sprint is a time-boxed slice of Tasks, not a strict hierarchy layer). This phase operates on a single Task, from a single Epic, within the current Sprint, and is also where the Todo level is created: before writing any code, break the Task into a short checklist of Todos, then work through them.

## Objective
Implement exactly one task from `project-docs/claude-docs/sprints/sprint-{{n}}.md`, correctly and to the project's standards, and nothing more.

## Module Design-First Strategy (default under Milestone 2/3+ structure; ask-once opt-in otherwise)

If the project follows this template's default milestone structure (`6-implementation-plan/1-implementation-plan.md` step 1 — Milestone 2 is UI-only across all modules, Milestone 3+ layers on backend per module), this strategy applies automatically to every module: skip the question below, since the module's `<Module> — UI Design` and `<Module> — Backend/API` epics were already planned as separate epics in different milestones. Go straight to step 1 below the first time a module's UI Design epic is started.

Otherwise (project used a fully vertical milestone structure, one milestone per module covering UI and backend together): before starting the **first** task of an epic that has a UI component, and only if `epics.md`'s **Design Status** field for that epic is still blank, ask the developer — in plain language, regardless of auto/autonomous mode (this is the developer's design judgment call, not a technical ambiguity auto mode is meant to skip):

> "For [module name], do you want to build all its pages first with sample/fake data so you can review the design before we build the real API and backend? Or build the UI and backend together as we go?"

If the developer **declines**, set Design Status to `Approved` immediately (nothing to gate) and proceed with the normal single-task flow below, unmodified. If the developer **accepts**, follow this instead:

1. **Split this module's remaining work into two tasks** (an explicit exception to the usual "don't split UI from backend" rule — see `6-implementation-plan/1-implementation-plan.md`'s Task Breakdown exception note): `<Module> — UI Design` and `<Module> — Backend/API`. Update `task-list.md` accordingly if it wasn't already planned this way.
2. **Build every page in the module** (List, Create, Edit, and any others documented in `docs-kit/5-modules/<module>/9-ui.md`) using static/mock data — shaped to match the already-approved `docs-kit/2-database/` and `docs-kit/3-api/` documents, not guessed, so it doesn't need rework later. Do not wire any real API/business logic yet. **All inter-page navigation must be real and working**, against a shared mock dataset used consistently across every page — List → Detail, List → Add/Create, List → Edit, Detail → Edit, and back again, all via actual routes/links/buttons, not disconnected standalone screens. Clicking a specific row in the List must land on that same row's data in Detail/Edit, not placeholder content. Only the backend/API call is stubbed — "no real API" does not mean "no real navigation."
   - **Building the shared mock dataset:** use a faker library (e.g. `@faker-js/faker` for JS/TS stacks, or the equivalent for this project's stack — check `docs-kit/1-project/4-tech-stack.md`) for generic, domain-agnostic fields — person names, emails, avatars, phone numbers, addresses, dates. Do **not** use faker for anything domain-specific to this module — task/project titles, statuses, business-rule-driven values, domain terminology — those must be realistic and derived from the SoT/BRD (same rule as the seed/demo-data task in `6-implementation-plan/1-implementation-plan.md` step 3), written by hand if faker can't produce them, never generic placeholder strings like "Test Item 1."
   - Generate the dataset once, store it in one shared fixture/mock module the pages import from — List, Detail, and Edit all read the same fixture by ID, so navigating between them shows consistent data, not independently randomized values per page.
   - **List and Detail/Edit pages render pre-filled from this shared dataset.** The Create/Add page stays empty by default — it's a blank form, not pre-filled with fake data, since that's what "create" means.
3. **Set the epic's Design Status to `Pending Review`.** Before asking for review, run a quick automated accessibility check (per `docs-kit/4-ui/7-accessibility.md`'s stated compliance target) against the full linked page set — same principle as `9-sync-docs/2-module-completion-review.md`'s automated a11y check, just moved earlier to the cheapest possible point, before backend work is sunk into the module. Mention any findings alongside the pages, don't silently fix or silently ignore them. Then **start the app's local dev server** and give the developer the URL/page(s) to open — the review in the next step means the developer actually opening these pages in a real browser, not approving off a text description or chat summary of what was built.
4. **Ask for review**, plainly: does this match what they need, or does something need to change? The developer's review means clicking through the real navigation paths in their own browser — List→Detail→Edit→back, Create→List, etc. — not just looking at each page in isolation. If changes are requested, make them and show the pages again. **Repeat this step until the developer is satisfied** — there's no fixed number of review rounds.
5. **Once satisfied, set Design Status to `Approved`** and ask the developer what's next:
   > "[Module]'s design is approved. Do you want to (1) build the real backend/API for this module now, or (2) move on to designing the next module's pages first?"
6. **If the developer picks "next module's design,"** repeat this whole flow (steps 1–5) for that module. Multiple modules can have `Approved` designs waiting for backend at once — that's expected, not an error.
7. **If the developer picks "build backend now,"** and more than one module currently has an `Approved` design with no backend yet, ask which one to build first — don't assume the most recently designed one.
8. **Before starting a module's Backend/API task, check `project-docs/claude-docs/plan/dependencies.md`.** If this module's backend depends on another module's backend/schema that isn't done yet, tell the developer plainly and don't start — either build the prerequisite module's backend first, or confirm with the developer how they want to proceed. Design-phase work has no such restriction (pages can be designed in any order); this dependency check applies only when backend work is about to begin.
9. Once a module's Backend/API task starts, follow the normal Instructions below for that task, same as any other. **The pages built in step 2 must become dynamic, driven by the real backend and its actual business logic — not the static fixture.** Replace every page's import of the shared mock dataset with real API calls (list/detail/create/edit/delete all hit the real endpoints); remove the fixture import from these pages entirely once done, don't leave it wired in alongside the real calls or as a fallback. List/Detail/Edit must reflect whatever the real backend actually returns (including real validation errors, real empty states, real pagination if applicable) — not the fixed shape the mock data happened to have. The fixture file itself can stay in the codebase for tests/seed-data reuse (per the seed/demo-data task, `6-implementation-plan/1-implementation-plan.md` step 3) — it just stops being what the UI renders from.

This strategy works the same way with multiple developers on the project: one developer can be mid-review-loop designing Module B's pages while another builds Module A's already-approved backend at the same time — different files, no shared dependency, same parallel-safety rules as the rest of this workflow.

## Inputs
- `{{task_id}}` — the next unstarted task in the current sprint file, in the order `7-sprint-planning/1-sprint-planning.md` laid out.
- The task's source document(s) under `project-docs/approved-docs/docs-kit/` (e.g. `docs-kit/5-modules/<module>/8-api.md`, `docs-kit/2-database/1-database-design.md`).
- `CLAUDE.md` and `docs-kit/6-development/` (coding standards, conventions, architecture, folder structure, git workflow).
- Existing codebase.

## Instructions
1. **Claim the task first.** If `{{task_id}}` is a `<Module> — Backend/API` task under the Module Design-First Strategy (see above), confirm its epic's Design Status is `Approved` and re-check `dependencies.md` before claiming — don't claim a backend task whose design is still `Pending Review` or whose module dependency isn't ready. **If more than one developer works on this project, `git pull` (or equivalent) on `project-docs/claude-docs/` before doing anything else** — claiming decisions must be made against the latest state, not a stale local copy, since that's the main way two developers could otherwise claim the same task. Open the current sprint file (`project-docs/claude-docs/sprints/sprint-{{n}}.md`). If the sprint file has an **Assigned To** column with your name already on a task, that's the one to take. Otherwise take the next task in its ordered list whose status is `Available` **and, if the sprint is grouped into parallel-safe batches (per `7-sprint-planning/1-sprint-planning.md` step 6b), whose batch isn't already claimed by someone else** — don't pick a task from a batch another developer is mid-way through, even if that specific task's own status still says `Available`. Check `{{task_id}}`'s status in `task-list.md` too — if it's already `Claimed`, `In Progress`, or `Done` (e.g. the plan changed since the sprint was made), stop and confirm with the user before picking a substitute. Also check for an existing branch or open PR named for this task ID (per `docs-kit/6-development/4-git-workflow.md`'s task-ID branch naming rule) — a matching branch means someone else likely already started it even if the status file hasn't caught up yet. Set the task's **Assigned To** field to the claiming developer's name (or keep it as-is if already correctly assigned) in both `task-list.md` and the sprint file, and create your own branch using the task-ID-in-name convention once claimed, so the next developer gets the same signal from you. **Re-check Definition of Ready before claiming** (per `7-sprint-planning/1-sprint-planning.md` step 6) — if something changed since sprint planning and this task no longer meets it (a dependency it needs turned out not actually `Done`, its source doc gained a `[NEEDS INPUT]` from an unrelated change), stop and flag it rather than starting on a task that isn't actually ready. Immediately set it to `In Progress` in both `task-list.md` and the sprint file before doing anything else. If this is the first task touched in the sprint, also set the sprint's own `status` to `In Progress` in the sprint file, and if this is the first task touched in its epic, set the epic's `status` to `In Progress` in `epics.md`.
2. Open the task by `{{task_id}}` and re-read its linked documentation under `docs-kit/` — implement what's documented, not what seems reasonable in the moment. If the task turns out to be no longer wanted (priorities shifted, superseded by another task), set it to `Cancelled` with a one-line reason in the sprint file and `task-list.md`, recompute its Epic/Sprint status per step 9's rollup rule, and stop — don't implement it, and don't leave it `Available`/`In Progress` as a stand-in for "we're not doing this."
3. If the task or its source documentation is ambiguous, stop and ask rather than guessing.
4. Break `{{task_id}}` into a Todo checklist — the concrete steps needed to complete it (typically 3–8 items, e.g. "add migration", "add model", "add endpoint", "wire up validation"). Write this to `project-docs/claude-docs/tasks/{{task_id}}-todos.md` before writing code, with a one-line header tracking progress, e.g. `Status: 0/5 complete`.
5. Implement the task following `CLAUDE.md` and `docs-kit/6-development/` conventions (naming, structure, patterns, style), checking off each Todo and updating the `X/N complete` header as you go. Stay within the file/folder footprint recorded for this task in `task-list.md` where one was recorded — if you find you need to touch something well outside it, say so before proceeding.
6. Keep the change scoped to this task only — do not bundle unrelated fixes or refactors; note them separately instead. If a Todo turns out to be its own task-sized chunk of work, stop and say so rather than silently expanding scope.
7. Write or update tests only if directly needed to confirm this task's behavior (full test generation happens in `3-generate-tests.md`); at minimum, verify the code runs / compiles.
8. Once every Todo is checked off, update the task's status in the sprint file and `task-list.md` (`In Progress` → `Done` / `Blocked`, with notes if blocked).
9. **Roll the status update upward**, per the canonical rollup rule in `6-implementation-plan/1-implementation-plan.md`'s "Status Tracking" section (the single source of truth for how each level's status is computed — don't re-derive or restate the rule here, just apply it): recompute this task's epic status in `epics.md`, and the sprint's own `status` field in the sprint file, rolled up over just this sprint's tasks.
10. **When the sprint's own status rolls up to `Complete`** (every task in it `Done`), tell the user the sprint is finished and that `7-sprint-planning/2-retrospective.md` should run next — **always**, even if this sprint also happened to finish the milestone; a completed milestone is not a reason to skip capturing what was learned. Separately, check whether the active milestone's epics are all `Complete` in `epics.md`. If so, mark the milestone `Complete` in `milestone-status.md` and tell the user that `10-release/1-release.md` is next, after the retro runs. If the epics aren't all done yet, the retro is followed by `7-sprint-planning/1-sprint-planning.md` for the next sprint instead.
11. Commit with a message referencing `{{task_id}}` and a concise description of the change, per `docs-kit/6-development/4-git-workflow.md`.

## Output
- `project-docs/claude-docs/tasks/{{task_id}}-todos.md` — the Todo checklist, all items checked off, header showing `N/N complete`.
- Working code implementing `{{task_id}}`.
- Updated task status in the sprint file and `task-list.md`.
- Updated epic status in `epics.md` and sprint status in the sprint file.
- A commit referencing the task.

## Guardrails
- One task per run. If mid-implementation you discover the task is actually two tasks, say so and split it rather than silently expanding scope.
- Never start a task that's already `Claimed`/`In Progress`/`Done`.
- Never implement a task that isn't part of the current sprint — if it looks urgent, flag it for the *next* sprint-planning pass rather than jumping the queue.
- Don't mark a task Done if any Todo is incomplete or the task doesn't meet its acceptance criteria — mark it Blocked with a clear reason instead.
- Never let Epic or Sprint status drift from what the underlying tasks actually show — update them in the same pass you update the task, not later.
- Don't use `Blocked` as a substitute for `Cancelled` (or vice versa) — `Blocked` means still wanted but stuck; `Cancelled` means no longer wanted.
- `project-docs/claude-docs/plan/` and `sprints/` should be committed to version control alongside code (`6-implementation-plan/1-implementation-plan.md § Keeping plan files recoverable`) — commit the status updates from this task the same as the code.

## Completion Checklist
- [ ] Task claimed (`In Progress`) before any work started, in both the sprint file and `task-list.md`
- [ ] Todo checklist created for the task, fully checked off, header current
- [ ] Task implemented per its documented requirement in `docs-kit/`
- [ ] If this was a `<Module> — Backend/API` task: every page rewired to the real backend, mock-fixture import removed from the UI (fixture may still exist for seed/test reuse, just not rendered from)
- [ ] Code follows `CLAUDE.md` / `docs-kit/6-development/` standards
- [ ] Task status updated to `Done`/`Blocked` in both the sprint file and `task-list.md`
- [ ] Epic status in `epics.md` and sprint status recomputed
- [ ] Milestone/sprint completion checked and flagged if reached
- [ ] Change committed

## Next Step
Run `project-docs/prompts/8-implementation/2-code-review.md` next, on this task.
