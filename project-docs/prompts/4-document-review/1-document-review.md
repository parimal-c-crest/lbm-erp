# Document Review & Approval (batch)

**Prompt version:** 2.2

## Role
You are a senior reviewer quality-checking a batch of generated documents — everything one `3-document-generate/` batch prompt just produced for one category or one module — before any of it becomes part of the official `docs-kit` deliverable set.

## Objective
Review every draft in `project-docs/claude-docs/drafts/<scope>/` (a category folder like `3-api/`, or one module folder like `5-modules/<module-slug>/`) for completeness, quality, template compliance, and consistency with the rest of the documentation set, then promote each individually into `project-docs/approved-docs/docs-kit/<scope>/` or send it back with specific fixes. Reviewed together, in one sitting — the judgment and the verdict are still per document, only the review sitting is batched.

## Parameters
- `scope` (required) — a folder under `project-docs/claude-docs/drafts/`, e.g. `3-api`, or `5-modules/<module-slug>`. Every document currently in that folder is reviewed in this run.
- To review/regenerate just one document instead of a whole batch, scope this prompt to that single file's path (e.g. `project-docs/claude-docs/drafts/3-api/2-authentication.md`) — same instructions below, applied to one file.

## Inputs
- Every draft under `project-docs/claude-docs/drafts/<scope>/`.
- The templates each was generated from: `project-docs/docs-templates/<category>/templates/<template-filename>`.
- `project-docs/sot-docs/index.md` and the SoT documents each should trace back to.
- Other already-approved documents under `project-docs/approved-docs/docs-kit/` the batch must stay consistent with.
- `project-docs/claude-docs/gap-analysis/gap-analysis-report.md` and `decisions-log.md`.

## Instructions
1. For each document in the batch, in the same numeric order it was generated:
   a. Check template compliance: does it follow the structure and required sections of its template?
   b. Check completeness: does it cover everything its entry in `documentation-plan.md` calls for? Any `[NEEDS INPUT]` markers still open?
   c. Check traceability: does every requirement/rule/decision cite a SoT source or a recorded assumption? Flag anything unsourced.
   d. Check quality: is it clear, unambiguous, and free of internal contradictions?
2. **Within-batch consistency check** (this is the main advantage of reviewing the batch together, not one document at a time): does terminology, scope, and any shared data (entity names, field names, status/enum values) match consistently *across every document in this batch*, not just against already-approved documents from other categories? A same-category inconsistency (e.g. doc 3 naming a field differently than doc 7 in the same batch) is exactly what a one-at-a-time review before doc 7 even existed would miss — catch it here instead.
3. **Cross-batch consistency check:** does terminology, scope, and any shared data also match documents already approved under `project-docs/approved-docs/docs-kit/` from other categories?
4. **Decisions-log compliance:** for anything any draft in this batch states that's actually a cross-cutting decision (role/permission scope, a shared enum's allowed values, an ID/naming convention, a reused status lifecycle), confirm it *matches* `decisions-log.md` exactly rather than independently restating or subtly diverging from it. If a draft makes a cross-cutting call that isn't in `decisions-log.md` yet, reject it and send it back — that decision needs to be added to the shared log first (loop back to `1-discovery/6-gap-analysis.md` if needed), not decided ad hoc inside one document.
5. For each document individually, produce a review verdict: **Approved**, **Approved with minor edits** (list them and apply if trivial), or **Rejected** (list specific, actionable fixes required). One document failing doesn't block the rest of the batch — approve and promote what passes, reject only what doesn't. If `project-docs/claude-docs/gap-analysis/review-log.md` doesn't exist yet (this is the first batch reviewed in the project), create it with a short header row first — its absence on this first run isn't an error.
6. **Record a confidence summary per document**: count how many statements are `[Source: ...]`-cited, how many are `[Assumption: ...]`-labeled, and confirm zero open `[NEEDS INPUT]` remain (a document with any open one can't be Approved per the guardrail below). Across 100+ documents in a real project, this one-line count per document (e.g. "18 sourced, 4 assumptions, 0 open") is what lets a human reviewer prioritize which approved documents most need their own read, instead of treating all of them as equally trustworthy.
7. For every document Approved (or Approved-with-minor-edits, after applying them), move it from `project-docs/claude-docs/drafts/<category>/...` to `project-docs/approved-docs/docs-kit/<category>/...` (same relative path, creating the category subfolder if it doesn't exist yet).
8. **Write or update `project-docs/approved-docs/docs-kit/<category>/README.md`** (or `docs-kit/5-modules/<module-slug>/README.md` for a module) whenever this step promotes into that folder for the first time, or adds a document to it later. Content: the category's stated purpose (adapt from `project-docs/docs-templates/<category>/README.md`'s own Purpose line — rewrite its `templates/<file>` paths to the flat `docs-kit/<category>/<file>` paths actually used here, don't copy verbatim) plus a table of every document currently promoted in this folder with a one-line description each. This is a light orientation file for someone opening `docs-kit/<category>/` directly, not a deliverable in its own right — keep it current as documents get added, don't let it go stale.
9. For every document Rejected, leave it in `project-docs/claude-docs/drafts/` and hand the fix list back — regenerate it by re-running the category/module's `3-document-generate/` batch file, scoped to just that one document (see that file's own "to regenerate a single document" note).

## Output
- One review verdict per document, all recorded in `project-docs/claude-docs/gap-analysis/review-log.md` (append one entry per document: document, date, verdict, confidence summary, notes) in a single pass covering the whole batch.
- Every Approved (or Approved-with-minor-edits) document moved into `project-docs/approved-docs/docs-kit/<category>/`.
- `project-docs/approved-docs/docs-kit/<category>/README.md` (or the module-slug equivalent) created or updated to reflect what's now in that folder.
- A short summary in the response: how many of the batch were Approved, Approved-with-minor-edits, and Rejected, with the rejected ones' fix lists.

## Guardrails
- Do not approve a document with open `[NEEDS INPUT]` markers.
- Do not silently edit substantive content during review — minor edits only (typos, formatting, phrasing); anything else goes back to the category/module's `3-document-generate/` batch file.
- Never place an approved document inside `project-docs/docs-templates/` — it belongs in `project-docs/approved-docs/docs-kit/`.
- A rejection in one document is not a rejection of the whole batch — approve/promote the rest independently.

## Completion Checklist
- [ ] Every document in the batch checked for template compliance, completeness, traceability, quality
- [ ] Within-batch consistency checked across all documents in this scope, not just against other categories
- [ ] Cross-batch consistency checked against already-approved documents from other categories
- [ ] Decisions-log compliance checked for every cross-cutting statement in the batch
- [ ] One verdict + confidence summary recorded per document in the review log
- [ ] Every Approved document moved into `project-docs/approved-docs/docs-kit/<category>/`
- [ ] `docs-kit/<category>/README.md` (or module-slug equivalent) created/updated to match what's now promoted
- [ ] Rejected documents' fix lists handed back, scoped to just those documents

## Next Step
Repeat `3-document-generate/<category or module>` → this prompt for every remaining category/module in `documentation-plan.md`. Once **every** document across every category and module is approved, run `project-docs/prompts/4-document-review/2-documentation-review.md` — the final full-tree consistency sweep — next.
