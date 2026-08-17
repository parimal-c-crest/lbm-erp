# Prompts Library — How Claude Should Run This Folder

## Purpose

This is a reusable, project-agnostic prompt library. To start a new project: copy `project-docs/docs-templates/` and `project-docs/prompts/` as-is into the new project, then run `1-discovery/1-project-setup.md` first.

Every folder's files are numbered **locally**, starting at 1 (or matching `docs-templates/`'s own numbering inside `3-document-generate/`) — always refer to a prompt by its full folder-qualified path (e.g. `8-implementation/1-implement-task.md`), never by a bare number alone, since the number only means something within its own folder.

**Inserting a new document into an existing sequence:** prefer appending at the end of its category (highest number + 1) over inserting in the middle. If a new document genuinely belongs in the middle of an existing sequence, don't renumber every file after it — that breaks every cross-file "Next Step" reference pointing at those files. Instead, insert it as `<N>a-name.md` (matching the sub-step numbering convention already used inside instructions, e.g. `4a.`, `6a.`) and re-point just the two adjacent files' "Next Step" lines. A whole-category renumber is a last resort, reserved for a genuine restructure (like `7-cross-cutting/` splitting out of `1-project/`/`6-development/`), not routine document additions.

```text
project-docs/prompts/
├── README.md
├── GLOSSARY.md               plain-language definitions of this workflow's vocabulary (SoT, Epic, RAID, batch, etc.)
├── 1-discovery/              setup, requirements elicitation, SoT collection, design creation, project analysis, gap
│                             analysis (now including a per-document gap sweep across all templates), plus on-demand
│                             change-request handling
├── 2-document-plan/          map the taxonomy onto this project, dependency order
├── 3-document-generate/      one BATCH prompt per category, drafts every document in that category in one run.
│   │                         02-database/03-api/04-ui run in parallel once 01-project is done (no dependency
│   │                         between them); 07 runs last. 05-modules and 06-development's late wave are NOT
│   │                         part of this upfront batch — see "Just-in-time module documentation" below.
│   ├── 01-project/               project.md            (1 batch file, covers 4 documents)
│   ├── 02-database/               database.md           (1 batch file, covers 4 documents)
│   ├── 03-api/                     api.md                (1 batch file, covers 10 documents)
│   ├── 04-ui/                       ui.md                 (1 batch file, covers 8 documents)
│   ├── 05-modules/                   modules.md            (1 batch file, JIT-triggered per module, covers 11 documents)
│   ├── 06-development/                 development.md       (1 batch file; early wave upfront, late wave JIT per module)
│   └── 07-cross-cutting/                 cross-cutting.md      (1 batch file, generated LAST — see note below, covers 2 documents)
├── 4-document-review/        review/promote a whole category's/module's batch at once, then a final full-tree sweep
├── 5-update-sot/             promote approved docs into the Source of Truth
├── 6-implementation-plan/    Milestone → Epic → Task breakdown
├── 7-sprint-planning/        select the next sprint's work (including the JIT module-doc gate, step 2a), generate its HTML page, retro the last sprint
├── 8-implementation/         implement, review, test, one task at a time
├── 9-sync-docs/              bring docs-kit back in line with what was actually built, then a per-epic design/data-flow/docs-vs-code review plus a required user browser acceptance check
├── 10-release/                release a completed milestone, then maintenance + incident response
├── 11-dashboard/               on-demand: generate a static HTML progress view (documentation-generation status, plus Milestones/Epics/Tasks/Sprints)
└── 12-maintenance/            on-demand, POST-LAUNCH ONLY: triage an incoming item, scoped new-feature discovery, routine upkeep
```

## Just-in-time module documentation

Under this template's default flow, `3-document-generate/05-modules/modules.md` and `06-development/development.md`'s late wave are **not** generated upfront with the rest of the docs-kit. They're deferred until a module's work is actually about to start, triggered by `7-sprint-planning/1-sprint-planning.md` step 2a the first time that module's `<Module> — UI Design` or `<Module> — Backend/API` epic is a sprint candidate. This spreads module documentation across the project's real build timeline instead of front-loading all of it — a module untouched for months doesn't get written months early.

Because of this, `07-cross-cutting/cross-cutting.md` (which must run after every other category, since it cross-checks decisions made everywhere) can't run as part of the initial upfront batch either — it now waits until the *last* module's JIT documentation cycle completes (`06-development/development.md`'s Next Step checks `module-list.md` for this). In practice, cross-cutting generation moves from "early in the project, before implementation starts" to "whenever the last module gets documented," which for a large multi-milestone project may be much later than before. This is an accepted tradeoff of the JIT model, not an oversight.

The full per-module loop, once its epic is first selected into a sprint: **JIT docs generated → docs reviewed → (if `UI Design`) static/mock pages built with full working navigation, developer-approved after a real browser click-through → (if `Backend/API`) real backend implemented → Claude's code review → Claude's automated module-completion checks (design fidelity, data-flow, docs-vs-code) → user's live-browser functional confirmation, fix-loop until confirmed → epic `Complete` → sprint planning moves to the next module's epic.**

| Folder | File | What it does |
|---|---|---|
| `1-discovery/` | `1-project-setup.md` | Confirm/create the `project-docs/` folder structure and root `CLAUDE.md`. |
| `1-discovery/` | `2-requirements-elicitation.md` | **Conditional.** Only if the user has no written material yet — runs a structured discovery conversation to produce `sot-docs/raw/vision.md`. Skip straight to `3-sot-review.md` if real material already exists. |
| `1-discovery/` | `3-sot-review.md` | Collect and index the Source of Truth into `sot-docs/index.md`. |
| `1-discovery/` | `4-design-creation.md` | **Conditional.** Only if `design-source.md` is `none` and the user wants a real design instead of generic defaults — produces `sot-docs/design/tokens.json` from scratch. |
| `1-discovery/` | `5-project-analysis.md` | Build `claude-docs/analysis/` (project summary, module list, business rules, workflows) from the SoT. |
| `1-discovery/` | `6-gap-analysis.md` | Surface missing/conflicting info as `claude-docs/gap-analysis/`, get blocking questions answered, lock cross-cutting decisions into `decisions-log.md`, and run a per-document/per-template-section gap sweep across all seven categories to catch likely gaps *before* any batch generation starts. |
| `1-discovery/` | `7-change-request.md` | **On-demand, not linear.** Run any time a requirement changes after docs/tasks already exist — finds and updates every affected document and task. |
| `2-document-plan/` | `1-documentation-plan.md` | Produce `claude-docs/plan/documentation-plan.md` — the full generation order. |
| `3-document-generate/01-project/` | `project.md` (1 batch file, 4 documents) | Draft all of `1-project/` in one run into `claude-docs/drafts/`. Runs first, alone. |
| `3-document-generate/02-database/` | `database.md` (1 batch file, 4 documents) | Draft all of `2-database/` in one run. Parallel with `03-api/`, `04-ui/`. |
| `3-document-generate/03-api/` | `api.md` (1 batch file, 10 documents) | Draft all of `3-api/` in one run. Parallel with `02-database/`, `04-ui/`. |
| `3-document-generate/04-ui/` | `ui.md` (1 batch file, 8 documents) | Draft all of `4-ui/` in one run. Parallel with `02-database/`, `03-api/`. |
| `3-document-generate/05-modules/` | `modules.md` (1 batch file, 11 documents per module) | Draft all 11 documents for one module. **Just-in-time**: triggered by `7-sprint-planning/1-sprint-planning.md` step 2a the first time that module's epic is a sprint candidate — not run upfront for every module. |
| `3-document-generate/06-development/` | `development.md` (1 batch file, 10 documents, **two waves**) | Early wave (6 documents) runs once, upfront, parallel with `02`/`03`/`04`. Late wave (4 documents, `5-implementation-workflow.md` on) is **just-in-time**, scoped and updated per module, run immediately after that module's `05-modules/modules.md` is approved (same step 2a trigger) — not a single run waiting for every module. |
| `3-document-generate/07-cross-cutting/` | `cross-cutting.md` (1 batch file, 2 documents) | Draft all of `7-cross-cutting/` in one run. Always **last** — cross-checks decisions made in every other category, including every module. Under the JIT model this means it waits until the *last* module's documentation cycle finishes, not just the other upfront categories. |
| `4-document-review/` | `1-document-review.md` | Review **a whole category's or module's batch of drafts** together, promote each individually into `approved-docs/docs-kit/` or send it back. Run once per category/module, right after its `3-document-generate/` batch finishes — one confirmation, not one per document. Can also be scoped to a single file for a one-off fix. |
| `4-document-review/` | `2-documentation-review.md` | Final full-tree consistency sweep. Run **once**, after every category/module's batch has been through `1-document-review.md` and is approved — for the upfront categories this happens early; for each module's set, whenever that module's JIT cycle completes. |
| `5-update-sot/` | `1-update-sot.md` | Promote approved docs into `sot-docs/index.md`, archive superseded raw material, log to `sot-docs/changelog.md`. |
| `6-implementation-plan/` | `1-implementation-plan.md` | Derive Milestones → Epics from `module-list.md` and the upfront `docs-kit/` categories. Module epics get created with an empty/TBD task list until their JIT documentation cycle fills it in (a scoped re-run of this same prompt, invoked from `7-sprint-planning/1-sprint-planning.md` step 2a). |
| `7-sprint-planning/` | `1-sprint-planning.md` | Determine the active milestone; for any candidate epic whose module isn't documented yet, run the just-in-time module-documentation gate (step 2a) first; then select the sprint's tasks. Run once per sprint. |
| `7-sprint-planning/` | `3-generate-sprint-page.md` | Generate a one-page static HTML view of the sprint just planned. Runs every sprint, right after `1-sprint-planning.md` — not on-demand like `11-dashboard/`. |
| `7-sprint-planning/` | `2-retrospective.md` | Capture what went well/badly in the sprint that just finished. Run once per sprint, after all its tasks are `Done`, before planning the next one. |
| `8-implementation/` | `1-implement-task.md` | Implement the next task in the current sprint. Run once per task. For a `<Module> — UI Design` task, builds fully-navigable static/mock pages and requires a live-browser developer review before Design Status can become `Approved`. |
| `8-implementation/` | `2-code-review.md` | Review one implemented task. Run once per task, right after `1-implement-task.md`. |
| `8-implementation/` | `3-generate-tests.md` | Generate/run tests for one approved task. Run once per task, right after `2-code-review.md`. |
| `9-sync-docs/` | `1-sync-docs.md` | Update `docs-kit/` to match what was actually built for a task. Run once per task, right after `8-implementation/3-generate-tests.md`. |
| `9-sync-docs/` | `2-module-completion-review.md` | Design-fidelity + cross-module data-flow + docs-vs-code consistency check, **plus a required user live-browser functional acceptance check**, for one epic. Run once per epic, after all its tasks are `Done`. The epic can only be marked `Complete` once the user has explicitly confirmed the module works, fix-looping on anything they report wrong — Claude's own automated checks passing is not sufficient by itself. |
| `10-release/` | `1-release.md` | Release a `Complete` milestone; sets up post-release maintenance intake. |
| `10-release/` | `2-incident-response.md` | **On-demand, not linear.** Run any time production breaks, at any point after any release. |
| `11-dashboard/` | `1-generate-dashboard.md` | **On-demand, not linear.** Run any time the user wants an updated visual progress view — regenerates `claude-docs/plan/dashboard.html` (stat tiles, documentation progress per category/module, a sprint plan table, nested Milestone/Epic/Task breakdown, and a blockers section) from the current plan/drafts/review-log/sprint files. Markdown-sourced only — never reads actual application source code. |
| `12-maintenance/` | `1-triage.md` | **On-demand, post-launch only.** Run for any incoming item once at least one milestone is `Released` — classifies it into one of six lanes (incident, requirement change, new feature, non-urgent defect, doc/code drift, routine upkeep) and hands off; never resolves the item itself. Logs every item to `claude-docs/plan/intake-log.md`. |
| `12-maintenance/` | `2-feature-request.md` | **On-demand, post-launch only.** A genuinely new capability, routed here by triage — runs discovery/gap-analysis/documentation-plan/generation scoped to just this feature, then plans it as a new milestone. The correctly-sized replacement for looping a small feature back through full greenfield discovery. |
| `12-maintenance/` | `3-upkeep.md` | **On-demand, post-launch only.** Dependency bumps, security patches, tech-debt pull-in — routed here by triage. Runs through the normal implementation loop under a standing Maintenance epic; regenerates documentation only where a change actually invalidates something already approved. |

**`4-document-review/` holds two different things — don't confuse them:** `1-document-review.md` runs **per category/module batch**, right after each `3-document-generate/` batch finishes, as the draft → review → promote gate — reviewing every document in that batch together, but still recording and promoting each one individually. `2-documentation-review.md` runs **once**, after every planned document is approved — a final cross-document sweep.

## Planning hierarchy (from `6-implementation-plan/` onward)

```
Project
 └── Milestone          (6-implementation-plan/1-implementation-plan.md — one at a time, see milestone-status.md)
      └── Epic           (6-implementation-plan/1-implementation-plan.md — one per module/major capability)
           └── Task           (6-implementation-plan/1-implementation-plan.md defines it; 8-implementation/1-implement-task.md executes it)
                └── Todo            (8-implementation/1-implement-task.md, broken out during implementation)

Sprint (7-sprint-planning/1-sprint-planning.md) is a time-boxed slice: it pulls Tasks
from one or more Epics, but always from a single active Milestone.
```

This workflow runs in sprints — `7-sprint-planning/1-sprint-planning.md` selects a batch of tasks from the active milestone's epics before implementation starts on any of them, rather than picking one task at a time ad hoc. Sprint 1 of a new milestone conventionally covers baseline scaffolding (folder structure, environment/config, base routing) before feature-specific epics — see the note in that prompt.

Status rolls up automatically: `Todo → Task → Epic/Sprint → Milestone`, per the single canonical rollup rule defined in `6-implementation-plan/1-implementation-plan.md`'s "Status Tracking" section — every other phase that touches status (`8-implementation/`, `7-sprint-planning/`) applies that rule rather than restating it. A milestone can't move to `Released` until `10-release/1-release.md` runs and production verification passes; the next milestone's sprint planning can't start until this one is `Released`.

## Required workflow for Claude Code

Whenever a new session starts in a project using this kit (e.g. after `/init`, or when the user asks to generate/continue documentation, plan implementation, or implement code):

1. **Suggest** running the prompts in this folder one by one, in order (see any prompt's "Next Step" section). Do not just start generating or coding.
2. **Wait for the user to agree** before naming or running anything.
3. Once agreed, **state the full folder-qualified path of the next prompt file to run** and **ask for confirmation**.
4. **Do not execute a prompt until the user explicitly gives permission** for that specific one.
5. Once permission is given, run that prompt fully (per its own Inputs/Instructions/Output), then **state the next prompt's path and ask again** — repeat step 3–5 for every remaining prompt.
6. Never skip ahead without asking, even if the next one seems obvious.
7. **Immediately after `/init` (or any prompt run), before ending the turn** — state the next prompt's full folder-qualified path and ask permission, in that same response. No exceptions, even if the turn's main task (e.g. writing `CLAUDE.md`) already feels complete on its own.

This is a confirm-then-execute loop at the level of one prompt **file**, not one document — since v7, the six non-module categories under `3-document-generate/` are each a single batch file covering multiple documents (same pattern `05-modules/modules.md` already used in v6), and `4-document-review/1-document-review.md` reviews a whole category/module's batch together. Running one of these prompts is still one confirmed step; it just produces (or reviews) several documents in that one step instead of one.

**Every batch file's own "Next Step" now names the review step before the next generation prompt** — `4-document-review/1-document-review.md`, scoped to that category/module, always comes first; only once it's approved does the Next Step name the next batch file. Follow each prompt's own Next Step line rather than assuming what comes after — that's what keeps a fresh session (one that hasn't read this whole README) on the correct generate → review → promote → next loop.

**Before running a batch prompt, preview it** (per "Preview before large or multi-file actions" below) — state what it will create/review (document count, what each covers) and get the user's yes, same as any other prompt — then run the whole batch uninterrupted, without a stop between individual documents inside it. This is the *only* stop point for that batch — do not also pause between the individual documents a batch prompt generates or reviews. Two exceptions where a mid-batch stop is expected, not a violation of this rule:
- **A blocking gap** the batch prompt's own guardrails require stopping for (a missing prerequisite document, an ambiguity serious enough to warrant a `[NEEDS INPUT]` the user should resolve before more of the batch is built on top of it).
- **`06-development/development.md`'s two waves** — its early wave and late wave are separated by all of `05-modules/` finishing, so they're necessarily two separate confirmed runs of the same file, not a mid-batch stop.

Within a batch, gaps that don't rise to that level get labeled `[Assumption: ...]`/`[NEEDS INPUT: ...]` inline and the batch keeps going — see "Pre-flight check" and "Asking the user questions" below for how those get surfaced afterward, and `1-discovery/6-gap-analysis.md`'s per-document gap sweep for how many of them get caught even earlier, before the batch starts.

## Pre-flight check: unresolved items before moving on

Every document-generation prompt in this library can leave behind a `[NEEDS INPUT: ...]` marker (something genuinely blocking even after asking) or a `[Assumption: ...]` marker (a judgment call the developer was asked about and explicitly deferred to Claude — see "Never silently assume" in each `3-document-generate/` prompt, since v8: nothing gets written on a guess the developer hasn't already seen and approved). Leaving either buried in a file and just continuing to the next prompt means a later phase (which reads the document, not the conversation it was written in) only discovers them by chance — usually too late, after something downstream was already built on top of the gap.

So: **before starting any prompt**, scan the document(s) it depends on for open `[NEEDS INPUT: ...]` markers, and any `[Assumption: ...]` markers that haven't been explicitly confirmed by the developer yet. If any exist:

1. Stop before running the next prompt.
2. Tell the developer plainly, with the ⚠️ **WARNING** prefix (see "Status prefixes" below), which file and which specific item is unresolved.
3. Ask directly whether they want to resolve it now, or explicitly accept the assumption/gap and proceed anyway.
4. Only continue once the developer has actually responded — don't treat silence or an unrelated reply as approval.

This applies to every phase, not just document generation — `6-implementation-plan/`, `7-sprint-planning/`, and `8-implementation/` all inherit unresolved items from earlier documents, so the same scan-and-warn step applies whenever a phase is about to read a document that could carry one forward.

## Asking the user questions

Every prompt in this library eventually asks the user something — sprint capacity, which design-source option applies, whether to proceed without a missing category, and so on. These questions are answered by the actual developer using the kit, who may not know this workflow's internal vocabulary (SoT, epic rollup, Definition of Ready, etc.) or the tradeoffs behind each option. A question the developer doesn't understand gets rubber-stamped on whichever option is marked recommended, which defeats the point of asking at all. So, whenever a prompt calls for asking the user something:

- State the question in plain language first, then name the technical term if one applies — not the reverse. ("How many days is this sprint, and roughly how many tasks feels realistic to commit to?" not "Confirm sprint capacity.")
- If offering options, explain in one short clause what choosing each one actually means or does — not just a label. A developer should be able to tell the options apart without already knowing the domain.
- If a recommended option exists, say **why** it's recommended in the same breath, not just that it is — "keeps X automated (recommended), or Y if you want manual control over Z" beats "Option A (Recommended)" with no reason attached.
- Don't bury the actual question inside jargon-heavy preamble the developer has to parse before finding out what's being asked.
- If unsure whether a question will land, err toward explaining more, briefly — one extra clarifying clause costs little; a rubber-stamped wrong answer costs a redo later.

## Status prefixes

This chat surface can't render actual text color, so use an icon + bold label instead whenever a response contains a warning, error, skipped/blocked item, or confirmation — it's the practical substitute that still lets a developer scan status at a glance:

- ⚠️ **WARNING:** — a risk or caveat worth double-checking
- 🚫 **SKIPPED:** / **BLOCKED:** — something deliberately not done, or unable to proceed
- ❌ **ERROR:** / **FAILED:** — something broke
- ✅ **DONE:** / **CONFIRMED:** — completed or verified
- ℹ️ **NOTE:** — an informational aside worth flagging

Use these consistently, not decoratively — only when the content actually is that kind of status, not on every line. This is set up once, in the root `CLAUDE.md` (see `1-discovery/1-project-setup.md` step 9), so it's followed from the very first response in a project, not just once this prompts workflow is in use.

## Multiple developers working in parallel

This workflow supports more than one developer on the same project at once — within limits, and only if planned for it explicitly rather than assumed to "just work":

- **One milestone at a time, project-wide.** `milestone-status.md` gates all developers to the same active milestone — there's no working ahead on a later milestone solo while others finish the current one.
- **Sprints assign tasks by name, not just status.** `7-sprint-planning/1-sprint-planning.md` groups the sprint's tasks into parallel-safe batches (using each task's file/folder footprint from `task-list.md`: no shared files + no dependency = safe to run at the same time) and assigns each batch to a specific developer in the sprint file's **Assigned To** column — never leaves a flat unowned queue for multiple people to pull from.
- **Claim against the latest state, every time.** `8-implementation/1-implement-task.md` step 1 requires pulling `project-docs/claude-docs/` before claiming a task, and checking for an existing task-ID-named branch/PR (`docs-kit/6-development/4-git-workflow.md`) as a second signal — narrows, though doesn't fully eliminate, the race window where two developers claim the same task moments apart.
- **A developer who finishes early picks up the next task from their own batch, or an unclaimed batch — never a task from a batch someone else is mid-way through**, even if that specific task shows `Available`.

What this doesn't give you: a hard atomic lock (two people running `1-implement-task.md` at the exact same instant, before either has pushed, can still both claim the same task — the git-pull-first and branch-check steps shrink this window but don't close it to zero), and it doesn't parallelize *within* a single task — one task is still one developer's work.

## Glossary

This workflow uses its own vocabulary (SoT, Epic, RAID, Definition of Ready, status rollup, etc.) that a developer using the kit may not already know. Rather than re-explaining a term differently every time it comes up mid-conversation, point to `project-docs/prompts/GLOSSARY.md` — read it once at the start of a project, and refer back to it (or quote its definition) whenever a term is used with someone unfamiliar with it, instead of inventing a fresh explanation each time.

## Preview before large or multi-file actions

Some prompts write (or review) many files in a single run — every `3-document-generate/` batch file (e.g. `03-api/api.md` writes 10 files; `05-modules/modules.md` writes 11 files per module), every `4-document-review/1-document-review.md` run (reviews a whole category/module's batch together), and `6-implementation-plan/1-implementation-plan.md` (creates a full milestone/epic/task set at once). Before running one of these, tell the developer plainly what's about to be created or reviewed — roughly how many files/documents, covering what — before starting, not only summarizing it afterward. ("This will create 10 documents for `3-api/`: API design, authentication, authorization, query standards, response standards, error handling, dev standards, versioning, OpenAPI spec, and Postman collection. Proceed?") This is the **one** confirmation point for the whole batch — a developer should never be surprised by the size of what just happened, and should never be asked to confirm the same batch again document-by-document once they've said yes here.

## Session-start recap

At the start of a new session in a project already using this kit (not a brand-new one), before asking "what would you like to do," check `project-docs/claude-docs/plan/milestone-status.md`, `epics.md`, and the current `project-docs/claude-docs/sprints/sprint-{{n}}.md`, and give a short plain-language recap of where things stand — active milestone, current sprint, what's in progress/blocked — so the developer isn't the one who has to reconstruct state or go open `dashboard.html` themselves before the conversation can start. Skip this only if the state files don't exist yet (brand-new project, nothing planned).

## Session Boundaries

Long single sessions cost more than the same work split across several — every turn in a long-running session resends its accumulated context, and a session that keeps growing past roughly 150k tokens is well into the expensive range. Splitting deliberately, at the right points, keeps quality identical (nothing about the checklists/guardrails changes) while capping what any one session has to carry.

**Documentation generation.** Default split point is one `3-document-generate/<category>/` batch per session (or one `05-modules/modules.md` module per session) — generate the batch, review it, promote it, then start a fresh session for the next category/module. Continuity comes from files, not conversation memory: a new session reads `CLAUDE.md`, `sot-docs/index.md`, `claude-docs/gap-analysis/review-log.md`, and `claude-docs/plan/documentation-plan.md` to pick up where the last one left off — see "Session-start recap" above and each batch file's own "Resuming an interrupted run" section.

**Implementation.** Default split point is between tasks — after a task's commit and status update (`8-implementation/1-implement-task.md` step 11), before claiming the next one. Keep `1-implement-task.md` and its `2-code-review.md` together in the same session; split after review, not between implement and its own review. If tasks are small and numerous, split between sprints instead (after `7-sprint-planning/2-retrospective.md`) to cut down on how often a session restarts. A milestone is the outer wrapper only, never the split unit itself — Milestone 2/3+ span many sprints, so waiting for a milestone boundary means the session has already grown large by the time it splits. Never split mid-task (uncommitted code, a half-checked Todo list) or mid design-review loop (`8-implementation/1-implement-task.md`'s Module Design-First Strategy) — that state exists only in the conversation, a fresh session can't reconstruct it from files.

**Adaptive trigger, not just static boundaries.** The category/task boundaries above are the default, but they're not a guarantee a session stays small — a category can still run long if its documents are dense, or a task can turn out bigger than expected. If context usage is visibly climbing past roughly 150k tokens before a natural boundary arrives, finish the current document (or the current task's current step) and stop there rather than pushing through to the next scheduled boundary just because it hasn't arrived yet. Record status in the same continuity files either way — the trigger for splitting changes, the handoff mechanism doesn't.

**Keep this to the main session — don't offload to subagents to manage size instead.** Dispatching document generation or task implementation to subagents doesn't solve the context-growth problem, it adds a second cost on top of it (each subagent run is its own set of requests) — this kit's document-generation and implementation prompts are written to run in the main conversation. Splitting the *session*, not delegating the *work*, is the fix here.

## Confirm before overwriting

Anything that replaces an existing file in place — regenerating `dashboard.html`, re-running a document-generation prompt over an already-approved document in `docs-kit/`, re-running a prompt whose output file already exists with real content — must say what's about to be replaced and, if the change is substantive, roughly what's different, before overwriting it. Never silently regenerate over existing content the developer might not expect to lose. This is distinct from the normal draft → review → promote flow (which is expected, repeated overwriting by design) — it's specifically about the developer being told before something they already have gets replaced.

## Plain next-step on errors and guardrail stops

When a prompt's guardrail stops it early (missing dependency document, unclaimed task, unresolved blocker), don't just state what's wrong — state what the developer should concretely do about it. ("`3-api/1-api-design.md` isn't approved yet — run `4-document-review/1-document-review.md` on it first, then retry this prompt" beats "Missing dependency: 3-api/1-api-design.md.") The developer should never have to work out the fix themselves from a bare error description.

## Reporting back after a prompt runs

After executing a prompt, Claude must reply in plain, human-readable language — not just a tool-call log. Every post-run response must clearly state:

1. **What was generated/done** — the output file path(s), and a short summary of what's in it, not just "done".
2. **What was assumed** — call out anything marked `[Assumption: ...]` in the output that the user should sanity-check.
3. **What still needs input** — if the output contains any `[NEEDS INPUT: ...]` markers, list them explicitly and plainly, one by one.
4. **The next prompt path** — state the next prompt's full folder-qualified path and ask permission to run it.

If a prompt's guardrails caused it to stop early (e.g. a missing dependency document, an unclaimed task), say plainly what's missing and what the user needs to do before it can run — don't just report failure.

## Determining "next"

- **Check post-launch status first.** If `project-docs/claude-docs/plan/milestone-status.md` exists and any milestone in it is `Released`, this project is in post-launch mode — see "After launch" above. Start at `12-maintenance/1-triage.md` for any new item, don't fall through to the greenfield bullets below.
- If `project-docs/claude-docs/plan/documentation-plan.md` doesn't exist yet, start at `1-discovery/1-project-setup.md`. From there: run `2-requirements-elicitation.md` only if `sot-docs/raw/` is empty, otherwise skip it. Run `3-sot-review.md`, then `4-design-creation.md` only if the user chose to generate a design from scratch, otherwise skip it. Run `5-project-analysis.md`, `6-gap-analysis.md`, then `2-document-plan/1-documentation-plan.md`, in order.
- **Upfront documentation generation loop** (per category in the plan, excluding `5-modules/` and `6-development/`'s late wave — see below): `3-document-generate/<category>/<batch-file>.md` → `4-document-review/1-document-review.md` (scoped to that category's batch) → repeat for the next category. `02-database/`, `03-api/`, `04-ui/`, and `06-development/`'s early wave have no dependency on each other and can be worked in any order once `01-project/` is approved. Once `01-project`, `02-database`, `03-api`, `04-ui`, and `06-development`'s early wave are all approved, run `5-update-sot/1-update-sot.md` once, then `6-implementation-plan/1-implementation-plan.md` once to establish Milestones/Epics (module epics get an empty/TBD task list at this point — see next bullet) — don't wait for `07-cross-cutting/` or any module documentation first, since both are now deferred (see "Just-in-time module documentation" above).
- **Sprint loop, including the just-in-time module documentation gate**: `7-sprint-planning/1-sprint-planning.md` (once per sprint) — step 2a of that prompt checks every candidate epic for this sprint; if a module epic's docs don't exist yet, it runs `3-document-generate/05-modules/modules.md` (scoped to that module) → `4-document-review/1-document-review.md` (scoped to that module) → `3-document-generate/06-development/development.md` late wave (scoped to that module) → `4-document-review/1-document-review.md` (scoped to that late-wave slice) → `5-update-sot/1-update-sot.md` (folds this module into the SoT) → a scoped re-run of `6-implementation-plan/1-implementation-plan.md` to derive that epic's real tasks — then resumes sprint planning. If that epic is `<Module> — UI Design` (the module's first touch), it also hands off immediately to `8-implementation/1-implement-task.md` to build the module's static/mock pages before returning to finish planning the rest of the sprint. Once the sprint's task list is finalized, run `7-sprint-planning/3-generate-sprint-page.md` (always, every sprint — not on-demand) → **implementation loop** (per task in that sprint): `8-implementation/1-implement-task.md` → `2-code-review.md` → `3-generate-tests.md` → `9-sync-docs/1-sync-docs.md` → back to `8-implementation/1-implement-task.md` for the next task in the sprint. Once every task in an epic is `Done`, run `9-sync-docs/2-module-completion-review.md` once for that epic — it can only mark the epic `Complete` in `epics.md` once its own automated checks pass **and** the user has explicitly confirmed the module's real functionality live in a browser (fix-looping on anything they report wrong first). Once the sprint's tasks are all `Done`, run `7-sprint-planning/2-retrospective.md`, then go back to `1-sprint-planning.md` to plan the next sprint (which will trigger the next module's own JIT documentation gate if a new module's epic is selected) — it will tell you to run `10-release/1-release.md` instead if the milestone is actually `Complete`.
- **Cross-cutting, deferred:** once the *last* module's late-wave update (via the JIT gate above) reports every module in `module-list.md` as approved, that prompt's own Next Step names `3-document-generate/07-cross-cutting/cross-cutting.md` → `4-document-review/1-document-review.md` (scoped) → `4-document-review/2-documentation-review.md` (final full-tree sweep, once) → `5-update-sot/1-update-sot.md` (once). This typically lands late in the project, not right after the upfront categories, under the JIT model.
- **On-demand, outside the linear sequence:** `10-release/2-incident-response.md` runs any time production breaks; `1-discovery/7-change-request.md` runs any time a requirement changes after docs/tasks already exist; `11-dashboard/1-generate-dashboard.md` runs any time the user wants an updated HTML progress view; `12-maintenance/1-triage.md` runs any time a new item comes in post-launch. All four regardless of what else is in progress.
- If unsure which prompts are already done, check `project-docs/approved-docs/docs-kit/` (documentation), `project-docs/claude-docs/plan/task-list.md` and `project-docs/claude-docs/sprints/` (implementation), and `project-docs/claude-docs/plan/milestone-status.md` (release) before naming the next one.

## After launch

Everything above this point assumes a project being built for the first time. Once any milestone in `project-docs/claude-docs/plan/milestone-status.md` shows `Released`, the project has entered post-launch mode, and the entry point changes: don't resume the greenfield chain (`3-document-generate/` → `4-document-review/` → `6-implementation-plan/` from scratch) for new work — start at `12-maintenance/1-triage.md` instead, for **any** incoming item, whether it's a bug report, a feature request, a security patch, or a stakeholder saying the app doesn't do what they expected.

Triage classifies the item into one of six lanes and hands off — see the `12-maintenance/` table rows above for what each does. Three of the six lanes reuse prompts that already existed for a different reason (production incidents, requirement changes, doc/code drift); the other three live in `12-maintenance/` because nothing else in the kit was scoped correctly for them: a brand-new feature needs discovery, but not a full re-run of the whole project's discovery; a routine dependency bump needs a task, but not a documentation regeneration by default; small fixes and everything else need one clear place to land instead of no place at all.

**Milestone convention post-launch.** A batch of new features becomes its own milestone (Milestone 4, 5, …), planned via `6-implementation-plan/1-implementation-plan.md`'s "Re-run after launch" note — this keeps the existing release flow (release notes, version bump, UAT sign-off) working exactly as it does for every earlier milestone, rather than requiring it to be reworked for an open-ended "maintenance milestone" that never completes. Small, non-milestone-worthy fixes go to a standing **Maintenance** epic instead (created once, the first time `1-implementation-plan.md` runs post-launch) — it never gets a milestone of its own and never closes.

## Standing plan files (initialized once, maintained throughout)

`6-implementation-plan/1-implementation-plan.md` initializes three files that stay live for the rest of the project, not just at planning time: `project-docs/claude-docs/plan/raid-log.md` (Risks/Assumptions/Issues/Dependencies — reviewed every `7-sprint-planning/1-sprint-planning.md` run, appended to by `2-retrospective.md`), `tech-debt-register.md` (deliberate shortcuts accepted rather than fixed — appended to by `2-code-review.md` and `2-retrospective.md`, reviewed for pull-in candidates every sprint), and `lifecycle-dashboard.md` (a one-page status rollup — refreshed by any phase that changes a status it summarizes, most notably `10-release/1-release.md`).

## Lite path for small projects

The full workflow (six-plus-one-category docs-kit, 11 documents per module, 10-phase lifecycle) is sized for a real multi-milestone build. For a small/weekend project, the following is an explicit, sanctioned reduction — not an informal skip, so it doesn't fight the "don't skip ahead without asking" rule:

- Skip `1-discovery/2-requirements-elicitation.md` unless there's truly nothing written down.
- In `2-document-plan/1-documentation-plan.md`, mark `3-api/9-openapi.yaml`/`10-postman-collection.json` and any `5-modules/` document that clearly doesn't apply (e.g. `7-permissions.md` for a single-user tool) as explicitly skipped with a one-line reason — this is already supported by the existing "a category or template may be legitimately absent if the plan explicitly skipped it with a stated reason" rule, just apply it more liberally.
- Collapse `4-document-review/1-document-review.md`'s draft→review→promote gate into a single pass per document for a solo developer working alone — read the draft once, critically, then promote directly, instead of treating review as a separate sitting.
- `raid-log.md`/`tech-debt-register.md`/`lifecycle-dashboard.md` can be a few lines each, updated only when something actually changes, not maintained on a fixed cadence.
- `1-discovery/6-gap-analysis.md`'s per-document, per-template-section gap sweep runs *before* `documentation-plan.md` exists, so it can't yet know which categories/templates this small project will mark Not Applicable — it necessarily walks all seven categories somewhat blind to what'll actually get skipped. For an obviously small project (e.g. no database, no separate UI), a lighter pass is fine: skim section headings rather than reading every template in full for a category you're already fairly sure will end up mostly Not Applicable — just don't skip the walk entirely, since that's how the TypeScript-vs-JavaScript and CSRF-mitigation classes of gap end up surfacing mid-generation instead of upfront.
- Do **not** skip: `1-discovery/6-gap-analysis.md`'s cross-cutting decisions inventory, `9-sync-docs/2-module-completion-review.md`, or the four-checks-plus-E2E rule in `8-implementation/1-implement-task.md` — these are exactly the checks that catch real bugs regardless of project size, and skipping them is what let gaps slip through on the project that prompted adding them in the first place.

## Resuming an interrupted run

For any batch prompt (every `3-document-generate/<category>/<batch-file>.md`, not just `05-modules/modules.md`), a session ending partway through is not a failure state — check what's already been written to the target output folder before regenerating anything. Resume from the next missing item in order; never restart a partially-complete batch from item 1, and never assume a run completed just because the prompt was invoked. Each batch file's own "Resuming an interrupted run" section states this for its category; the mechanism is the same everywhere: check `claude-docs/drafts/<category>/` (or `<category>/<module-slug>/`) for which documents already exist before writing anything.

## Handling a mid-project requirement change

`1-discovery/7-change-request.md` is the on-demand counterpart to `10-release/2-incident-response.md` — that one handles production breaking, this one handles a requirement changing after docs are already approved and/or tasks are already built against it. Run it any time a stakeholder changes their mind, a regulation shifts, or a prior decision turns out wrong — never absorb a real requirement change by silently editing `docs-kit/` or code outside the normal flow, even under time pressure.

## Prompt versioning

Every prompt file (except this README) carries a `**Prompt version:**` line under its title. When a prompt's instructions change meaningfully, bump that file's version. This is what makes it possible to tell whether an in-progress project's `project-docs/prompts/` copy is behind the current template — see `project-docs-template/README.md`'s "Keeping this template current" section for the versioned-copy (`v2`, `v3`, ...) workflow this supports.
