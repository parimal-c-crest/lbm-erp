# Sprint Planning

**Prompt version:** 1.4

## Role
You are a delivery lead planning the next sprint from the existing task backlog.

## Where this fits
`Project → Milestone → Epic → Task → Todo`, with Sprint as a time-boxed slice that pulls Tasks from one or more Epics — but always from a single active Milestone. This phase enforces that: only one milestone is ever "in progress" at a time, per `milestone-status.md`.

## A note on Sprint 1
Sprint 1 of a new milestone conventionally covers baseline scaffolding for that milestone's slice — folder structure (backend, frontend), environment/config wiring, base routing — before feature-specific epics (e.g. login, dashboard) start. Note: by default Milestone 1 itself is tech-stack/environment install (`6-implementation-plan/1-implementation-plan.md §1`) and doesn't need this note. From Milestone 2 onward under the default structure — Milestone 2 is UI-only across all modules on static/mock data, Milestone 3+ layers real backend onto one module at a time — each of those milestones' epics should already be ordered so any of its own scaffolding lands in that milestone's Sprint 1, not skipped ahead of the feature/module work that depends on it.

## Objective
Determine the active milestone, then select, prioritize, and commit a specific set of tasks from that milestone's epics to the upcoming sprint, respecting dependencies and capacity.

## Inputs
- `project-docs/claude-docs/plan/milestone-status.md`
- `project-docs/claude-docs/plan/milestones.md` and `epics.md`
- `project-docs/claude-docs/plan/task-list.md` (including each task's file/folder footprint and status)
- `project-docs/claude-docs/plan/dependencies.md`
- Sprint length and capacity (ask the user if not already known). For a solo developer, capacity is just "how many tasks feel right for this sprint." **For multiple developers**, ask who's on the project this sprint and get each person's rough capacity — the sprint's total capacity is the sum, but tasks still get assigned to individual names, not left as an unowned pool (see step 4a).
- Status of the previous sprint, if any (`project-docs/claude-docs/sprints/`)
- The previous sprint's retro, if one exists (`project-docs/claude-docs/sprints/sprint-{{n-1}}-retro.md`, from `2-retrospective.md`) — its takeaways and any capacity/estimate adjustment recommendation should inform this sprint's planning, not just get filed away.
- `project-docs/claude-docs/plan/raid-log.md` and `tech-debt-register.md`, if they exist.

## Instructions
0. **Check for a previous sprint's retro first.** If `project-docs/claude-docs/sprints/sprint-{{n-1}}-retro.md` exists and hasn't been applied yet, read its takeaways before doing anything else — an estimate-adjustment or process recommendation from the retro should actually change how this sprint gets planned (step 4's prioritization, step 2's capacity), not just be acknowledged.
1. **Determine the active milestone.** Read `milestone-status.md`:
   - If a milestone is already `In Progress`, that's the active one.
   - If none is `In Progress`, take the next milestone in build order whose status is `Not Started`, set it to `In Progress`, and use it as the active milestone.
   - If the current `In Progress` milestone has every one of its epics marked `Complete` in `epics.md` (read epic status, not raw tasks — epics.md is kept in sync with task-list.md by `8-implementation/`), mark the milestone `Complete` in `milestone-status.md` and tell the user to run `10-release/1-release.md` for it. **Do not** advance to the next milestone until this one's status is `Released` — stop here and wait rather than planning a sprint against the next milestone.
2. Confirm sprint length and available capacity with the user if not already stated.
2a. **Just-in-time module documentation gate.** Under this template's default flow, `<Module> — UI Design` and `<Module> — Backend/API` epics no longer get their module documentation generated upfront in `3-document-generate/05-modules/`— it's deferred until the module's epic is actually about to enter a sprint. For every epic in the active milestone that's a candidate for this sprint (has `Available` tasks or, more likely at this point, no tasks yet because its module was never documented), check `project-docs/approved-docs/docs-kit/5-modules/<module-slug>/` for that module. If it doesn't exist or isn't fully approved, stop before pulling candidate tasks for that epic and run, in order:
   1. `project-docs/prompts/3-document-generate/05-modules/modules.md`, scoped to just this module.
   2. `project-docs/prompts/4-document-review/1-document-review.md`, scoped to this module.
   3. `project-docs/prompts/3-document-generate/06-development/development.md`, late wave, scoped to this module only (not the old "wait for every module" condition — see that prompt's updated Prerequisites).
   4. `project-docs/prompts/4-document-review/1-document-review.md` again, scoped to that late-wave slice.
   5. `project-docs/prompts/5-update-sot/1-update-sot.md`, to fold this module's newly-approved documents into `sot-docs/index.md` before planning derives tasks from them.
   6. Re-run `project-docs/prompts/6-implementation-plan/1-implementation-plan.md`, scoped to just this module's epic(s), to derive its real task list — it was created as an empty/TBD shell when the milestone was first planned, precisely so this step has an epic to attach tasks to.
   7. Return here and continue sprint planning for that epic, now that it has real, `Available` tasks.

   If the epic is `<Module> — UI Design` (this module's first touch, Milestone 2), don't wait for the normal sprint cycle to pick up its task — hand off immediately to `project-docs/prompts/8-implementation/1-implement-task.md` for it, which builds the module's static/mock-data pages per its Module Design-First Strategy. Once the developer approves those pages (Design Status `Approved`), come back here to finish planning the rest of this sprint's tasks. If the epic is `<Module> — Backend/API` (module already has its UI from an earlier sprint), no special hand-off — its tasks just enter the normal candidate pool in step 3 below.

   Skip this step entirely for an epic whose module docs are already approved (e.g. every epic after the first sprint that touched it) — proceed straight to step 3 for it.
3. Pull candidate tasks from `project-docs/claude-docs/plan/task-list.md` that belong to the active milestone's epics, are `Available` (not `Cancelled`), and are unblocked (dependencies already completed or in this sprint in valid order).
4. Prioritize by: dependency-unblocking value (tasks that unblock the most other work first — scaffolding/setup tasks are almost always highest priority for exactly this reason, see the Sprint 1 note above), epic priority within the milestone, and estimated effort vs. remaining capacity.
5. Confirm the selected scope fits capacity — don't overcommit; leave a small buffer.
6. **Definition of Ready** — for each selected task, confirm all of: (a) clear description and acceptance criteria, traceable to a specific `docs-kit/` section; (b) no open `[NEEDS INPUT]` marker in the doc(s) it's built from; (c) every dependency it needs is already `Done` or scheduled earlier in this same sprint; (d) file/folder footprint is at least roughly known; (e) **if it's a `<Module> — Backend/API` task under the Module Design-First Strategy (`8-implementation/1-implement-task.md`), its epic's Design Status is `Approved`, not blank or `Pending Review`.** A task failing any of these isn't ready — flag it for clarification now, don't let it enter the sprint and stall mid-implementation instead.
6a. Review `raid-log.md` for any open Risk/Issue/Dependency that affects this milestone's active epics — an unresolved one materially changes priority (e.g. a blocking external dependency should pull its unblocking task forward). Review `tech-debt-register.md` for any item worth pulling into this sprint given available capacity — don't let it sit indefinitely just because it's not user-facing.
6b. **If more than one developer is working this sprint**, group the selected tasks into parallel-safe batches using each task's file/folder footprint from `task-list.md`: tasks in different batches (no shared files, no dependency between them) can be worked simultaneously by different developers; tasks in the same batch must go to one developer, in order. Assign each task to a specific developer by name in the sprint file's **Assigned To** column — don't leave multiple developers to pull from one unowned list, since that's exactly what causes two people to grab the same task. A developer who finishes early pulls the next `Available` task from a *different* batch than whatever's still in progress, not the next line in a single shared queue.
7. Order the selected tasks within the sprint by dependency (a task never appears before something it depends on within the same sprint) — within each developer's assigned batch, not necessarily across the whole sprint.
8. Record the sprint goal in one sentence.
9. Initialize the sprint's own `status` field to `Not Started` in the sprint file — this is a rollup over its tasks, kept current by `8-implementation/1-implement-task.md` and `2-code-review.md` the same way `epics.md` is (see "Status Tracking" in `6-implementation-plan/1-implementation-plan.md`).

## Output
- `project-docs/claude-docs/sprints/sprint-{{n}}.md` — sprint goal, milestone + epic references, sprint **status** (`Not Started` / `In Progress` / `Complete`), ordered task list with IDs, status column, and **Assigned To** column (blank if solo developer, a specific name if multiple), start/end dates (if used). If multiple developers, group the task list visibly by parallel-safe batch, not one flat queue.
- Updated `project-docs/claude-docs/plan/milestone-status.md` if the active milestone changed or was marked `Complete`
- `project-docs/claude-docs/plan/raid-log.md` and `tech-debt-register.md` updated if this run's review changed priorities or pulled an item into scope

## Guardrails
- Never plan a sprint against a milestone other than the current active one.
- Never select a task whose dependencies aren't done or already scheduled earlier in this same sprint.
- Don't silently rewrite acceptance criteria here — flag gaps back to the task list / requirements instead.
- Don't schedule feature tasks in Sprint 1 ahead of the scaffolding tasks they depend on.
- `project-docs/claude-docs/plan/` and `sprints/` should be committed to version control alongside code (`6-implementation-plan/1-implementation-plan.md § Keeping plan files recoverable`) — this file is part of that load-bearing state.

## Completion Checklist
- [ ] Previous sprint's retro (if any) read and its takeaways actually applied, not just noted
- [ ] Active milestone determined from `milestone-status.md`
- [ ] Just-in-time module documentation gate (step 2a) run for any candidate epic whose module docs weren't already approved
- [ ] Milestone marked `Complete` and release flagged if this run found all its epics Complete
- [ ] Sprint goal defined
- [ ] Every selected task passes Definition of Ready (step 6) — none entered the sprint with an open `[NEEDS INPUT]` or an unmet dependency
- [ ] Task selection respects dependencies and capacity, stays within the active milestone
- [ ] Tasks ordered by dependency within the sprint
- [ ] Sprint backlog file created with its own status initialized to `Not Started`

## Next Step
Run `project-docs/prompts/7-sprint-planning/3-generate-sprint-page.md` next — it generates a one-page HTML view of this sprint. That prompt then hands off to `project-docs/prompts/8-implementation/1-implement-task.md`, which works through this sprint's tasks in order, one at a time.
