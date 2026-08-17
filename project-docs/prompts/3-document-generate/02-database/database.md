# Generate: All Database Documents (2-database, batch)

**Prompt version:** 1.2

## Role
You are a technical writer / architect generating the full `2-database/` documentation set — all 4 documents — at professional quality, using the project's own templates as the required structure.

## Objective
Fill all 4 templates under `project-docs/docs-templates/2-database/templates/` and write the result to `project-docs/claude-docs/drafts/2-database/`, mirroring the template filenames exactly.

This is the only `2-database` prompt — it covers all 4 documents in one run. To regenerate a single document, re-run this prompt but scope the relevant instruction below (and the write) to just that one file instead of the full sweep.

## Resuming an interrupted run
If a previous run of this prompt stopped partway through, don't restart from document 1. Check `project-docs/claude-docs/drafts/2-database/` for which of the 4 documents already exist — resume from the next missing document, in the same numeric order, not from scratch.

## Prerequisites — stop and report if missing
- `project-docs/approved-docs/docs-kit/1-project/` fully generated and approved, specifically `4-tech-stack.md` — the approved database engine this entire category depends on. If `4-tech-stack.md` doesn't state a database engine, stop and ask rather than defaulting to any template's placeholder engine.

## Inputs
- The 4 templates in `project-docs/docs-templates/2-database/templates/` (`1-database-design.md` → `4-database-standards.md`) and `project-docs/docs-templates/2-database/README.md`.
- `project-docs/sot-docs/index.md` and the raw SoT documents it links to.
- `project-docs/claude-docs/analysis/project-summary.md`, `module-list.md`, `business-rules-summary.md`, `workflow-summary.md`.
- `project-docs/claude-docs/gap-analysis/gap-analysis-report.md`, `clarification-questions.md`, `decisions-log.md`.
- `project-docs/claude-docs/plan/documentation-plan.md` for this category's declared dependencies.
- `project-docs/approved-docs/docs-kit/1-project/4-tech-stack.md` — required before writing any document in this batch.

## Instructions
1. Process the 4 documents **in numeric order** (`1-database-design.md` → `4-database-standards.md`) — each later document depends on the ones before it, never the reverse:
   - `2-erd.md` diagrams the entities/relationships/primary-key strategy `1-database-design.md` just approved — don't redesign the schema here.
   - `3-migration-strategy.md` rolls out the schema approved in `1-database-design.md` and `2-erd.md`.
   - `4-database-standards.md` formalizes the naming conventions, primary key strategy, and constraints already approved in `1-database-design.md` — must not contradict them.
2. For each document: read its template fully first — headings/structure are the contract, do not restructure. Read the earlier documents this batch has already drafted in `project-docs/claude-docs/drafts/2-database/` that it depends on (per the order above), plus any approved dependency from another category in `project-docs/approved-docs/docs-kit/`, before writing it.
3. **Database engine and any tooling are project-specific, not fixed by any template.** Every template's own placeholder engine name (e.g. "PostgreSQL") and any engine-specific defaults shown (UUID vs auto-increment primary keys, constraint-enforcement caveats, index/backup syntax, migration-tool syntax) are illustrative example content only. Always use the engine actually decided in `1-project/4-tech-stack.md`, and adapt every engine-specific detail across all 4 documents to that engine — consistently, not just within one document. If `4-tech-stack.md` doesn't name a framework migration tool, `3-migration-strategy.md` must describe a custom versioned-script approach instead of assuming one exists.
4. Every requirement, rule, or design decision must trace back to a SoT source or a recorded decision/assumption — cite inline, e.g. `[Source: project-docs/sot-docs/raw/brd.md §6]` or `[Assumption: gap-analysis N2]`.
5. **Never silently assume.** Where detail is insufficient, note it as an open question while drafting — don't write a guessed value into the document yet. Once this document is otherwise fully drafted, stop and ask the user every open question for it together, in one plain-language round (not as separate interruptions per question). Only write the final content after the user answers: use their real answer if given; if they explicitly say to use your own judgment, write `[Assumption: ...]` — a deferred call the user actually approved, not a silent guess. Reserve `[NEEDS INPUT: ...]` for something genuinely blocking even after asking (the user doesn't know either, needs to check something first) — not a substitute for asking in the first place.
6. Write each completed document directly to `project-docs/claude-docs/drafts/2-database/<template-filename>`, creating folders as needed. Never modify `project-docs/docs-templates/`.
7. Keep terminology, the database engine, and the primary key strategy consistent across all 4 documents in this batch.

## Output
- `project-docs/claude-docs/drafts/2-database/1-database-design.md` … `4-database-standards.md`

## Guardrails
- Don't skip a document; if something genuinely doesn't apply, still create the file with an explicit "Not Applicable — reason" note rather than omitting it.
- Never write into `project-docs/docs-templates/`.
- Never let `2-erd.md`, `3-migration-strategy.md`, or `4-database-standards.md` restate a different engine, entity list, or primary key strategy than `1-database-design.md` already established in this same batch.
- If `4-tech-stack.md` isn't approved yet, stop and name it rather than guessing the engine.

## Completion Checklist
- [ ] `1-project/4-tech-stack.md` confirmed approved before starting
- [ ] All 4 documents present, in numeric order
- [ ] Database engine matches `4-tech-stack.md` (not any template's placeholder engine), consistently across all 4 documents
- [ ] Migration tooling in `3-migration-strategy.md` matches what `4-tech-stack.md` actually specifies
- [ ] All content traceable to SoT, an approved document, or a labeled assumption
- [ ] Open `[NEEDS INPUT]` markers collected and listed for the user
- [ ] No `[Assumption: ...]` was written without first asking the user and getting an explicit "use your judgment" response
- [ ] Terminology consistent across all 4 documents

## Next Step
`2-database/` drafts are complete. Run `project-docs/prompts/4-document-review/1-document-review.md` scoped to `2-database` next — nothing here is promoted into `approved-docs/docs-kit/` until it does. Once `2-database/` is approved, `3-api/`, `4-ui/`, and `6-development/`'s early wave can all run in parallel — start with `project-docs/prompts/3-document-generate/03-api/api.md`, `project-docs/prompts/3-document-generate/04-ui/ui.md`, and/or `project-docs/prompts/3-document-generate/06-development/development.md` (early wave).
