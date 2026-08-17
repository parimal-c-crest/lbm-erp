# Module Completion Review

**Prompt version:** 1.3

## Role
You are a QA/design lead running the closing gate on a module before its epic can be marked `Complete` — the check that catches what per-task unit/integration tests structurally cannot.

## Why this exists
Three classes of real bugs kept slipping through per-task reviews on this project, each only found by accident (a user's ad hoc screenshot comparison, an E2E test written for something else entirely):
- **Visual/UX drift from the design source** — screenshots under `sot-docs/design/screenshots/` (and any live reference deployment) were never systematically compared against the built UI; gaps only surfaced when a user asked for a one-off comparison.
- **Cross-module data flow breakage** — a field one module's own docs specified (e.g. "Project Name" on the intake form) was never built, so a downstream module (Projects 360) was permanently unreachable in real usage, even though both modules' own test suites were green in isolation.
- **Docs describing things that were never implemented** — `docs-kit` referenced a table/feature since the first draft, but no task ever actually built it, and nothing flagged the doc-vs-code gap until a later task happened to need it.

This prompt exists so those three checks happen once per module, on a schedule, instead of only when a user happens to ask.

## Objective
For one epic (module) whose tasks are all `Done`, verify: (1) the built UI matches the design source, including interaction-only states; (2) the module's data actually flows to/from every module its own docs say it connects to; (3) every claim in this module's `docs-kit` documents is backed by real, working code. Fix genuine gaps found; log everything.

## Parameters
- `epic_id` (required) — a `<Module> — Backend/API` epic (or a module's single epic under a fully vertical structure) whose tasks are all `Done` in `task-list.md`. **Not** a `<Module> — UI Design` epic — that epic's completion gate is the Design Status review loop in `8-implementation/1-implement-task.md`, not this prompt; running this review against mock-only pages would check data-flow and docs-vs-code against code that doesn't exist yet. Also not applicable to non-module epics (Environment Setup, App Shell/Chrome, the standing Maintenance epic) — those have no `5-modules/` documentation to check against, and complete once their tasks are Done. See `6-implementation-plan/1-implementation-plan.md`'s Status Tracking rule for the full breakdown by epic type.

## Inputs
- The running application (local dev servers) for `epic_id`'s module.
- `project-docs/sot-docs/design/screenshots/` — the relevant screenshot(s) for this module, per `design-source.md`.
- The live reference deployment, if one exists (check `CLAUDE.md` / `sot-docs/index.md` for a URL) — screenshots alone miss anything only reachable by interaction (drawers, hover states, modals, feeds that only render after a click).
- `project-docs/approved-docs/docs-kit/5-modules/<module>/` (all 11 documents) and any `2-database/`, `3-api/`, `4-ui/` sections this module touches.
- This module's upstream producers and downstream consumers — read `dependencies.md` and each connected module's own docs to know what data is supposed to flow where.

## Instructions

### 1. Design fidelity
0. Run an automated accessibility check (axe-core or equivalent, per `docs-kit/4-ui/7-accessibility.md` §16) against this module's built screens. This is a fast, mechanical check — no reason it should only get done once at the very end of a milestone; a module with unresolved automated a11y violations isn't done, the same as one with unresolved lint errors.
1. Screenshot the module's built screens (local dev server) and, if a live reference exists, that deployment's equivalent screens — including states only reachable by interacting (opening a drawer/modal, clicking a row, expanding a section), not just the initial page load.
2. Compare against `sot-docs/design/screenshots/` and the live reference side by side.
3. Categorize every visible difference as either (a) a genuine bug/completeness gap — something the design source or this module's own approved docs call for but the code doesn't do — or (b) an already-decided MVP scope reduction documented elsewhere in `docs-kit`. Only fix (a). Never "fix" (b) — that would silently reverse a prior explicit decision. If unsure which category something falls into, check `gap-analysis/review-log.md` and the module's own docs for a prior decision before treating it as a bug.

### 2. Cross-module data flow trace
4. From `dependencies.md` and this module's `1-module.md`, list every upstream module that must produce data this module consumes, and every downstream module that consumes data this module produces.
5. For each link, trace it live: create/use real data in the upstream module, confirm it actually appears correctly in this module (not just that both modules' own isolated tests pass). If a downstream module was already built earlier, also confirm this module's output actually reaches it.
6. Any broken link found here is a real bug regardless of whether either module's own test suite is green — fix it, and add (or extend) an E2E test that exercises the full chain so it can't silently regress.

### 3. Docs-vs-code consistency
7. Read every claim in this module's `docs-kit/5-modules/<module>/` documents (schema fields, endpoints, business rules, permissions, UI elements) and confirm each one is backed by real code, not just a plan that was never executed.
8. Flag anything documented but never built. Small items: fix now. Anything sizable (e.g. a whole missing audit trail): don't silently bolt it onto this review — log it explicitly as a known gap with a recommendation for a dedicated task, the same way the `activity_log` gap was handled.

### 4. User browser acceptance — required before this epic can be marked Complete
9. Once checks 1–3 above pass clean (or all found gaps are fixed/logged), start the module's local dev server with its **real** backend wired up — not mock data — and hand off to the user for a manual functional pass: create, edit, list, and delete real records through the actual UI, exactly as an end user would.
10. This is a live-browser check by the user, not a description or summary from Claude — same expectation as the Module Design-First Strategy's static-page review (`8-implementation/1-implement-task.md` step 3–4), but now testing real behavior (data actually persists, list/detail/edit reflect real state, validation errors are real, not shortcuts a mock could paper over).
11. **If the user reports anything wrong, fix it and ask them to re-check.** Repeat until the user explicitly confirms the module works from their perspective — there's no fixed number of rounds, same as the design-review loop earlier in this module's life.
12. Record the user's confirmation (date, one line) in the `review-log.md` entry from Output below — this confirmation is what step 9's "Next Step" gate checks for, not just Claude's own checks passing.

## Output
- Fixes for every genuine (category-a) gap found, each with the same rigor as a normal task: code fix, all four checks (lint/typecheck/test/build) on both packages, an E2E pass covering the fix.
- A dated section appended to `project-docs/claude-docs/gap-analysis/review-log.md` covering all four checks for this module (design fidelity, data-flow trace, docs-vs-code, and the user's live-browser functional confirmation), even if nothing was found — a clean pass is worth recording too, so this module isn't re-audited from scratch next time.
- `project-docs/claude-docs/plan/task-list.md`'s relevant task note(s) updated per the established pattern.
- Any sizable, deliberately-deferred gap logged with a recommendation, not silently fixed or silently dropped.

## Guardrails
- Never "fix" a difference from the screenshot/reference that's actually a documented prior scope decision.
- A live reference deployment (if one exists) is a second, richer comparison source than static screenshots — it can show interaction-only states a page-load screenshot cannot. Use both; don't skip the live check just because the static screenshot already matched.
- Don't let this review turn into a redesign — only fix what the design source or this module's own approved docs actually called for.
- This review runs once per **Backend/API** module epic (or a module's single epic under a fully vertical structure), after all its tasks are `Done`, before the epic can be marked `Complete` in `epics.md` — not per-task, not against the module's UI Design epic, and not skippable "because the module already looked fine in the screenshots reviewed for an earlier module."
- **Never mark this epic `Complete` on checks 1–3 passing alone.** The user's live-browser functional confirmation (check 4) is a required, separate condition — per `6-implementation-plan/1-implementation-plan.md`'s Status Tracking rule, an automated-clean pass with no recorded user confirmation is not yet `Complete`.

## Completion Checklist
- [ ] Automated accessibility check run against this module's built screens, violations fixed or explicitly logged
- [ ] Built UI (including interaction-only states) compared against design screenshots and any live reference
- [ ] Every visible difference categorized as bug vs. documented scope decision; only bugs fixed
- [ ] Every upstream/downstream data-flow link for this module traced live, not just assumed from green per-module tests
- [ ] Every claim in this module's `docs-kit` documents confirmed backed by real code
- [ ] All fixes pass lint/typecheck/test/build on both packages plus a real E2E pass
- [ ] Local dev server started with the real backend, handed to the user for a live functional pass
- [ ] User explicitly confirmed the module works from their perspective, after any reported issues were fixed and re-checked
- [ ] Dated review-log.md entry written, including the user's confirmation (even if no gaps found)
- [ ] task-list.md task note(s) updated

## Next Step
Once checks 1–3 pass clean (or all found gaps are fixed/logged) **and** the user has explicitly confirmed the module's real functionality in their browser (check 4), the epic can be marked `Complete` in `epics.md`. Return to `project-docs/prompts/7-sprint-planning/1-sprint-planning.md` — it picks the next module's epic next (triggering that module's own just-in-time documentation gate, step 2a, if it hasn't been touched yet), or, once every epic in the active milestone is `Complete`, tells you to run `project-docs/prompts/10-release/1-release.md`.
