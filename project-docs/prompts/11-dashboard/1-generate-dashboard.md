# Generate: Progress Dashboard (output: dashboard.html)

**Prompt version:** 2.2

## Role
You are a delivery lead producing a visual, at-a-glance progress report for a developer who doesn't want to read raw markdown tables to know where the project stands.

## On-demand, not linear
Run this any time — after a sprint planning session, after a batch of tasks complete, or whenever the user just wants to look at current status. It never blocks or gates any other phase, and no other phase depends on it having run. Regenerate from scratch every run; never hand-edit `dashboard.html` — it is a derived view, not a source of truth.

## Scope — markdown-sourced only, not a code-verification tool
Every number and status on this dashboard comes from `project-docs/claude-docs/`'s own tracking files — never from reading the actual application source code (no parsing route files for live endpoints, no counting test files, no diffing claimed-done tasks against real implementation). This dashboard is exactly as trustworthy as the markdown files a developer keeps current — if `task-list.md` says a task is `Done` but the code doesn't actually do that, this dashboard has no way to know. That's a deliberate scope boundary, not an oversight: keeping this prompt markdown-only means it works from the very start of a project (before any code exists) and never needs guardrails around what source-code paths it's allowed to touch.

## Objective
Read every plan/sprint/review file under `project-docs/claude-docs/` and produce one self-contained static HTML file the developer can open directly in a browser (no server, no build step) — a stat-tile summary, documentation progress, a sprint-by-sprint plan table, a nested Milestone → Epic → Task breakdown, and an open-blockers section, all in one page.

## Inputs
- `project-docs/claude-docs/plan/documentation-plan.md` — every category/module and document this project needs, plus any explicitly-skipped ones with their stated reason
- `project-docs/claude-docs/drafts/<category>/[<module-slug>/]` — which documents currently have a draft (folder presence per file, not content)
- `project-docs/claude-docs/gap-analysis/review-log.md` — latest verdict per document (Approved / Approved with minor edits / Rejected)
- `project-docs/approved-docs/docs-kit/<category>/[<module-slug>/]` — which documents are actually promoted/approved (folder presence per file)
- `project-docs/claude-docs/plan/milestone-status.md` — milestone list + status
- `project-docs/claude-docs/plan/epics.md` — epic list, milestone assignment, status, story-point estimate if tracked, Design Status if used
- `project-docs/claude-docs/plan/task-list.md` — task list, epic assignment, status, estimate, file/folder footprint
- `project-docs/claude-docs/sprints/sprint-*.md` — every sprint file, its goal, status, and ordered task list (plus parallel-safe batch grouping and Assigned To, if used)
- `project-docs/claude-docs/plan/raid-log.md` — open Risks/Assumptions/Issues/Dependencies
- `project-docs/claude-docs/plan/tech-debt-register.md` — outstanding tech debt
- `project-docs/claude-docs/plan/lifecycle-dashboard.md`, if present — reuse its rollup numbers rather than recomputing from scratch if it's already current
- `project-docs/claude-docs/plan/intake-log.md`, if present — post-launch triage history
- `CLAUDE.md` / `sot-docs/index.md` — project name

## Instructions

### 1. Documentation status
Determine each planned document's status per `documentation-plan.md`'s list: `Not Started` (no draft file yet) → `Drafted` (file exists in `claude-docs/drafts/`, no verdict yet in `review-log.md`, or its latest verdict is `Rejected` and still awaiting a fix) → `Approved` (file exists in `approved-docs/docs-kit/`, matching `review-log.md`'s latest verdict). Use `review-log.md`'s *latest* entry per document — a document rejected once and later re-reviewed Approved is `Approved`. A document `documentation-plan.md` marked skipped-with-reason is `Not Applicable`, excluded from completion math entirely (not counted as incomplete). Compute per category (and per module under `5-modules/`): document count and % complete (`Approved` / (planned − Not Applicable)).

### 2. Implementation status
Parse Task/Epic/Sprint/Milestone status per the rollup rule already defined in `6-implementation-plan/1-implementation-plan.md`'s "Status Tracking" section — don't invent a different status model. Task: `Available` / `Claimed` / `In Progress` / `Blocked` / `Done` / `Cancelled`. Epic/Sprint: `Not Started` / `In Progress` / `Complete`. Milestone: `Not Started` / `In Progress` / `Complete` / `Released`. If `task-list.md`/`epics.md` carry point estimates, weight completion percentages by points; otherwise weight by plain count — state which one this run used, once, near the top of the page (don't make the developer guess whether a percentage is point-weighted or count-weighted).

### 3. Build the page, top to bottom

**Header.** Project name (from `CLAUDE.md`/`sot-docs/index.md`), one-line subtitle ("Delivery Progress"), generation timestamp, and the list of source files this run actually read (e.g. "Sources: documentation-plan.md, review-log.md, epics.md, task-list.md, sprint-1.md … sprint-4.md, raid-log.md, tech-debt-register.md" — so a developer can tell at a glance whether a file they just edited was picked up). No branch/commit info — this dashboard doesn't touch git or source code (see Scope above).

**Stat tiles** (a row of compact cards, the page's main at-a-glance layer):
- **Overall Delivery** — % complete, point- or count-weighted per step 2, with a one-line subtext stating which and the raw fraction (e.g. "38 of 90 points done").
- **Documentation** — % of planned documents Approved, subtext with the raw fraction (e.g. "34 of 49 documents").
- **Sprints** — completed / total sprints in the plan, subtext naming the current in-progress one if any.
- **Tasks** — Done / non-cancelled tasks, subtext breaking out In Progress / Blocked counts.
- **Open Blockers** — count of open RAID items with type Risk or Issue, plus any task/epic currently `Blocked` (dedupe if a RAID entry and a blocked task are clearly the same thing) — subtext naming how many are new since the last-noted review, if `raid-log.md` dates support that, otherwise omit the subtext rather than inventing a number.
- Every tile: number first (large), label, one-line subtext in smaller/muted text — no tile without a subtext explaining what it's counting or where it's derived from.

**Documentation section.** One row per category (and per module under `5-modules/`, grouped under a "Modules" sub-heading) — name, progress bar (% Approved), count summary ("7 Approved / 2 Drafted / 1 Not Started"), `Not Applicable` documents excluded from the bar and the counts, not shown as a drag on either. If `documentation-plan.md` doesn't exist yet, render this whole section as a single line: "Not started — run `1-discovery/1-project-setup.md`."

**Sprint plan table.** One row per sprint, columns: `#` | Sprint (name + goal, truncated) | Progress (inline bar, %) | Status (badge) | Notes. Notes column carries the sprint's real blocking context in plain language, drawn from the sprint file's own status/task notes and any `raid-log.md`/`tech-debt-register.md` entries that name this sprint — e.g. "Depends on Sprint 1's schema" or "3 tasks blocked on an external design reference" — not a generic restatement of the status badge. A `Not Started` sprint whose dependency is a still-`Blocked` earlier sprint should say so explicitly in Notes, not just show 0%.

**Epics, Milestones & Tasks** (this kit's hierarchy is Milestone → Epic → Task → Todo — no separate Feature/Story layer; don't invent one). Section header states total counts (e.g. "5 milestones · 14 epics · 62 tasks · 90 points"), with filter controls (All / Done / In Progress / Not Started, plus a text filter) if the page includes JS for that (fine to include — this is display filtering only, not the write-back interactivity the guardrails below still forbid).
- One collapsible row per milestone, in build order: name, status badge, progress bar (% epics complete), epic/task/point counts, expandable to its epics.
- Nested under each milestone: one row per epic — name, status badge, progress bar (% tasks done), task count summary ("7 Done / 2 In Progress / 1 Blocked / 4 Available"), "lands in Sprint N" if `task-list.md`/sprint files make that traceable. If the epic has a non-blank **Design Status** (Module Design-First Strategy, `epics.md`), show it as its own badge next to the progress bar so a fully-designed-but-backend-pending module reads as real progress, not stalled. Expandable to its tasks.
- Nested under each epic: one row per task — ID, short description, status badge, point estimate if tracked, **Assigned To** if the sprint/task-list file has that column (omit for solo-developer projects). Blocked tasks show their blocking reason inline (from `task-list.md`'s notes), not just the badge.

**Legend.** One line defining each status badge's meaning in this kit's own terms — `Done` = task marked Done in `task-list.md`, `In Progress` = actively claimed, `Blocked` = stuck per a noted reason, `Available`/`Not Started` = not yet claimed, `Cancelled` = no longer wanted (excluded from all completion math). Keep this to what the markdown files actually represent — don't imply a stronger guarantee (like "verified by tests") that this markdown-only dashboard can't back up.

**Blockers.** One entry per open `raid-log.md` Risk/Issue/Dependency and open `tech-debt-register.md` item worth surfacing prominently, plus any task/epic sitting at `Blocked`. Write each as a real sentence with whatever concrete detail the source file actually contains (what's blocked, why, since when if dated) — not a bare one-line restatement of the RAID entry's title. Group or order by severity/impact if the source files indicate it, otherwise by how many downstream items depend on it. If a blocker is a guess/inference beyond what the source files literally state, don't include it — this section reports what's recorded, it doesn't invent additional analysis.

**Scoring method** (short footer section, plain language). State exactly how the two main percentages were computed this run: which weighting was used (point vs. count, per step 2), what counts as "done" for a task (`task-list.md` status = `Done`), what's excluded (`Cancelled` tasks, `Not Applicable` documents), and one line flagging that every number here traces back to hand-maintained markdown, not verified against running code — so a developer reading the page knows exactly how much to trust each figure without having to ask.

**Maintenance section** (only if `project-docs/claude-docs/plan/intake-log.md` exists — omit this whole section for a project still in its first, pre-launch milestone). One row per lane (Incident / Requirement change / New feature / Defect / Doc-code drift / Routine upkeep): count of items ever routed there, and count still open (cross-reference `task-list.md` for lane-generated tasks not yet `Done`, or the relevant approval/completion signal for the other lanes). This gives a fully-released project a live view of current post-launch activity instead of a dashboard that reads as a static 100% forever once the first milestone ships.

**Footer.** "Generated by `11-dashboard/1-generate-dashboard.md` from the files listed in the header · re-run any time for a current view." No claim of build-time/CI automation — this is a Claude-run, on-demand regeneration, say so plainly rather than implying an automated pipeline that doesn't exist here.

### 4. Visual/technical requirements
- Status → color mapping, used consistently for every badge, progress-bar segment, and stat tile: `Done`/`Complete`/`Released`/`Approved` = green, `In Progress`/`Drafted` = blue, `Blocked`/`Rejected` = red, `Available`/`Not Started` = grey, `Claimed` = amber, `Cancelled`/`Not Applicable` = strikethrough grey (excluded from all progress-bar math, but still listed where relevant).
- Fully self-contained: inline `<style>` and `<script>` only, no CDN links, no external fonts/images — must open correctly from a plain double-click, offline, no dev server.
- Support both light and dark viewing via `prefers-color-scheme`.
- Read-only and static — filtering/expanding sections via inline JS is fine (display-only), but no edit forms, no write-back. Status changes happen by editing the source markdown and re-running this prompt.
- **Auto-refresh while open, without losing what's expanded.** Include `<meta http-equiv="refresh" content="300">` (plain reload, works even with JS disabled) so a browser tab left open on `dashboard.html` picks up a newer version automatically if this prompt gets re-run in the background, instead of the developer having to remember to hit refresh. 300 seconds (5 minutes) is the default — the content only changes when this prompt is re-run, which is rarely faster than that, so a shorter interval would mostly reload nothing. If the user asks for a different interval, use that instead. Because the reload is a real page reload, it would otherwise collapse every expanded milestone/epic row and clear the text filter — pair the meta refresh with a small inline `<script>` that, on every expand/collapse toggle and filter-text change, writes the current set of expanded row IDs and the filter text to `sessionStorage`, and on page load reads them back and re-applies them before the user notices — so a reload during reading is invisible rather than disruptive (`sessionStorage` survives the meta-refresh reload since it's the same tab, unlike `localStorage` there's no need to worry about it persisting across unrelated tabs/sessions). This is display-only state restoration, not the write-back interactivity the guardrails below still forbid. Note near the footer, in one line, that the page auto-refreshes, at what interval, and that expanded rows/filters are preserved across it — so the behavior isn't a silent surprise mid-read.
- Write to `project-docs/claude-docs/plan/dashboard.html`, overwriting any previous version.

## Output
- `project-docs/claude-docs/plan/dashboard.html` — regenerated in full each run.
- After writing the file, tell the user its full path and how to view it: open `project-docs/claude-docs/plan/dashboard.html` directly in any browser (double-click it, or drag it into a browser window) — no server or build step needed. State the path explicitly every time.

## Guardrails
- Never read or parse actual application source code (routes, tests, implementation files) — every figure comes from `project-docs/claude-docs/` markdown only. If a developer wants code-verified metrics, that's a different, explicitly-scoped tool, not this prompt.
- Never hand-edit an existing `dashboard.html` incrementally — always regenerate from the current source files so it can't drift from what `documentation-plan.md`/`review-log.md`/`task-list.md`/`epics.md`/`milestone-status.md` actually say.
- Never write into `project-docs/docs-templates/` or treat this file as a deliverable under `approved-docs/docs-kit/` — it's a working view, same tier as `lifecycle-dashboard.md`.
- Don't add write/edit interactivity — status changes belong in the source markdown, not the HTML.
- Don't pull in any external script/style/font — must render correctly with no network access.
- Don't state or imply a number is more certain than its source file supports — a blocker/status sourced from a stale or thin markdown entry should read as such, not be dressed up with invented specificity.

## Completion Checklist
- [ ] `documentation-plan.md`, every category's/module's drafts and approved folders, and `review-log.md` read fresh
- [ ] Every milestone, epic, task, and sprint file read fresh (not from memory of an earlier run)
- [ ] Weighting method (point vs. count) decided and stated on the page, not left ambiguous
- [ ] All 5 stat tiles present, each with a subtext explaining its number
- [ ] Sprint plan table has real, specific Notes per row, not generic restatements of the status badge
- [ ] Blockers section reports only what source files state, nothing inferred beyond them
- [ ] Scoring method section states weighting, done-criteria, and the markdown-only trust boundary
- [ ] Status colors and rollup math match `6-implementation-plan/1-implementation-plan.md`'s Status Tracking rules (implementation) and this file's own Not Started/Drafted/Approved model (documentation)
- [ ] File is self-contained (no external requests) and readable in both light and dark OS themes
- [ ] Auto-refresh present at the stated interval, and expanded rows/filter text survive it via `sessionStorage`
- [ ] Written to `project-docs/claude-docs/plan/dashboard.html`

## Next Step
None — this is a terminal, on-demand utility. Re-run it whenever the user wants an updated view.
