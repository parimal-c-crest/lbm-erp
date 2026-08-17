# Generate: All Development Documents (6-development, batch)

**Prompt version:** 1.3

## Role
You are a technical writer / architect generating the full `6-development/` documentation set — all 10 documents — at professional quality, using the project's own templates as the required structure.

## Objective
Fill all 10 templates under `project-docs/docs-templates/6-development/templates/` and write the result to `project-docs/claude-docs/drafts/6-development/`, mirroring the template filenames exactly.

This is the only `6-development` prompt — it covers all 10 documents, run as **two waves** (see below), not one flat pass. To regenerate a single document, re-run this prompt but scope the relevant instruction below (and the write) to just that one file instead of the full sweep.

## Two waves — different triggers, not just a size split
Unlike the other batched categories, `6-development/`'s 10 documents split into two groups with different generation cadences:
- **Early wave** (`1-development-environment.md`, `2-folder-structure.md`, `3-coding-standards.md`, `4-git-workflow.md`, `8-containerization.md`, `9-ci-cd.md`) — no dependency on modules, generated once, upfront, as soon as `1-project/` is approved, in parallel with `02-database/`, `03-api/`, `04-ui/`, as part of `2-document-plan/1-documentation-plan.md`'s upfront batch.
- **Late wave** (`5-implementation-workflow.md`, `6-testing-strategy.md`, `7-deployment-strategy.md`, `10-debugging-guide.md`) — references a specific module's real structure. Under the default just-in-time flow, this wave is **scoped and regenerated per module**, triggered by `7-sprint-planning/1-sprint-planning.md` step 2a immediately after that module's `05-modules/modules.md` is approved — not a single global run waiting for every module to finish. Each module's late-wave content gets appended to (or merged into) the existing late-wave documents rather than each module producing a separate copy — these four documents describe the project's implementation/testing/deployment/debugging approach as a whole, informed by each module as it's built, not once per module.

Run this prompt once for the early wave (6 documents, one confirmation, upfront). Run it again for the late wave (4 documents, one confirmation) every time step 2a's gate reaches that step for a newly-documented module — first run creates the four late-wave documents from that first module's structure; later runs update them to fold in each subsequent module as it's documented. Each wave-run is still one batch, one confirmation — the split is structural, not a reintroduction of per-document stops.

## Resuming an interrupted run
If a previous run of either wave stopped partway through, don't restart that wave from its first document. Check `project-docs/claude-docs/drafts/6-development/` for which documents already exist — resume from the next missing document in that wave's set, in numeric order, not from scratch.

## Prerequisites — stop and report if missing
- Early wave: `project-docs/approved-docs/docs-kit/1-project/` fully generated and approved.
- Late wave: the one module named by `7-sprint-planning/1-sprint-planning.md` step 2a is complete under `project-docs/claude-docs/drafts/5-modules/<module-slug>/` (or approved under `project-docs/approved-docs/docs-kit/5-modules/<module-slug>/`) — if that module isn't there yet, name it and wait rather than generating the late wave against it. Unlike the old model, this wave does **not** wait for every module in `module-list.md` — only for the one module currently triggering it.

## Inputs
- The 10 templates in `project-docs/docs-templates/6-development/templates/` (`1-development-environment.md` → `10-debugging-guide.md`) and `project-docs/docs-templates/6-development/README.md`.
- `project-docs/sot-docs/index.md` and the raw SoT documents it links to.
- `project-docs/claude-docs/analysis/project-summary.md`, `module-list.md`, `business-rules-summary.md`, `workflow-summary.md`.
- `project-docs/claude-docs/gap-analysis/gap-analysis-report.md`, `clarification-questions.md`, `decisions-log.md`.
- `project-docs/claude-docs/plan/documentation-plan.md` for this category's declared dependencies.
- Late wave only: the one module named by the triggering gate, under `project-docs/claude-docs/drafts/5-modules/<module-slug>/` or `approved-docs/docs-kit/5-modules/<module-slug>/`, plus (on a second-or-later trigger) the late wave's own existing drafted/approved content from prior modules, to fold this module into rather than overwrite.

## Instructions
1. Within each wave, process its documents in numeric order — later documents in the same wave reference earlier ones in that wave, never the reverse.
2. For each document: read its template fully first — headings/structure are the contract, do not restructure. Read the earlier documents this batch (or an earlier wave of this same batch) has already drafted in `project-docs/claude-docs/drafts/6-development/` that it depends on, plus any approved dependency from another category in `project-docs/approved-docs/docs-kit/`, before writing it.
3. Every requirement, rule, or design decision must trace back to a SoT source or a recorded decision/assumption — cite inline, e.g. `[Source: project-docs/sot-docs/raw/brd.md §6]` or `[Assumption: gap-analysis N2]`.
4. **Never silently assume.** Where detail is insufficient, note it as an open question while drafting — don't write a guessed value into the document yet. Once this document is otherwise fully drafted, stop and ask the user every open question for it together, in one plain-language round (not as separate interruptions per question). Only write the final content after the user answers: use their real answer if given; if they explicitly say to use your own judgment, write `[Assumption: ...]` — a deferred call the user actually approved, not a silent guess. Reserve `[NEEDS INPUT: ...]` for something genuinely blocking even after asking (the user doesn't know either, needs to check something first) — not a substitute for asking in the first place.
5. Keep terminology and standards consistent across all 10 documents, both within a wave and across the two waves.
6. Write each completed document directly to `project-docs/claude-docs/drafts/6-development/<template-filename>`, creating folders as needed. Never modify `project-docs/docs-templates/`.
7. **Late wave, on a second-or-later trigger:** don't regenerate these 4 documents from scratch — read the existing drafted/approved versions first and update them to fold in the newly-documented module's structure (e.g. `5-implementation-workflow.md` gains this module's implementation notes, `6-testing-strategy.md` gains its testing approach), preserving what earlier modules already contributed. Treat this as an incremental update, the same principle `05-modules/modules.md` already applies to later modules referencing earlier-approved ones.

## Output
- Early wave: `project-docs/claude-docs/drafts/6-development/1-development-environment.md`, `2-folder-structure.md`, `3-coding-standards.md`, `4-git-workflow.md`, `8-containerization.md`, `9-ci-cd.md`.
- Late wave: `project-docs/claude-docs/drafts/6-development/5-implementation-workflow.md`, `6-testing-strategy.md`, `7-deployment-strategy.md`, `10-debugging-guide.md` — created on the first module that triggers this wave, updated in place on every subsequent module.

## Guardrails
- Don't skip a document; if something genuinely doesn't apply, still create the file with an explicit "Not Applicable — reason" note rather than omitting it.
- Never write into `project-docs/docs-templates/`.
- Never generate the late wave for a module whose own `05-modules/` documentation isn't done yet — stop and name what's missing instead. Unlike the old model, this is a per-module check, not a whole-`module-list.md` one.
- On a second-or-later trigger, don't silently overwrite an earlier module's already-folded-in content — this is an update, not a regeneration.
- If a dependency document outside this batch (e.g. `1-project/`) doesn't exist yet in `project-docs/approved-docs/docs-kit/`, stop and name it rather than guessing its content.

## Completion Checklist
- [ ] Correct wave's prerequisites confirmed before starting that wave
- [ ] All 6 early-wave documents present, in numeric order (first run)
- [ ] All 4 late-wave documents present, in numeric order, and current for the triggering module (first run creates them, later runs update them)
- [ ] All content traceable to SoT, an approved document, or a labeled assumption
- [ ] Open `[NEEDS INPUT]` markers collected and listed for the user
- [ ] No `[Assumption: ...]` was written without first asking the user and getting an explicit "use your judgment" response
- [ ] Terminology and standards consistent across both waves and across every module folded into the late wave so far

## Next Step
After the early wave: run `project-docs/prompts/4-document-review/1-document-review.md` scoped to `6-development` (early-wave documents) — nothing here is promoted into `approved-docs/docs-kit/` until it does. `4-ui/` and `3-api/` continue in parallel.
After the late wave: run `project-docs/prompts/4-document-review/1-document-review.md` scoped to `6-development` (late-wave documents) next — this is step 2a.4 of the just-in-time gate in `7-sprint-planning/1-sprint-planning.md`, which then continues to a scoped `6-implementation-plan/1-implementation-plan.md` re-run before returning to sprint planning. Check `module-list.md`: **only if every module it lists is now approved under `docs-kit/5-modules/`** (i.e. this was the last module), run `project-docs/prompts/3-document-generate/07-cross-cutting/cross-cutting.md` next instead of returning to sprint planning — the cross-cutting category still runs exactly once, last, after everything else, since its two documents (NFR, threat model) cross-check decisions made across every other category including every module. Otherwise, return to sprint planning as normal; cross-cutting waits for a future module to be the one that finishes the set.
