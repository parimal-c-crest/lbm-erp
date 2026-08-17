# Final Documentation Review

**Prompt version:** 1.3

## Role
You are a documentation lead doing a final quality pass over the completed `project-docs/approved-docs/docs-kit/` set before it's handed off for implementation.

## Objective
Sweep the entire generated documentation set for cross-document consistency, collect every outstanding `[NEEDS INPUT: ...]` marker into one place, and produce a single handoff summary the user can act on.

## Prerequisites — stop and report if missing
- Read `project-docs/claude-docs/plan/documentation-plan.md` first — it is the authority on what "complete" means for this project, not a fixed assumption that all seven categories exist. It may legitimately mark entire categories as Not Applicable with a stated reason (e.g. no `2-database/`/`3-api/` for a client-side-only app with no backend) — an omitted category with a stated reason in the plan is not a gap.
- Every document the plan actually calls for — every included category's included templates, and `5-modules/<slug>/` for every module in `project-docs/claude-docs/analysis/module-list.md` — must be present in `project-docs/approved-docs/docs-kit/` and show as reviewed/approved in `project-docs/claude-docs/gap-analysis/review-log.md`.

If anything the plan calls for is missing, name exactly what's missing and stop rather than reviewing a partial set as if it were final. Do not flag a category as missing if the plan explicitly skipped it with a reason.

## Inputs
- The entire `project-docs/approved-docs/docs-kit/` tree.
- `project-docs/claude-docs/analysis/module-list.md` — to confirm every module got a full 11-document set.
- `project-docs/claude-docs/gap-analysis/gap-analysis-report.md` and `clarification-questions.md` — to confirm every decision recorded there actually made it into the generated docs.
- `project-docs/claude-docs/plan/documentation-plan.md` — to confirm every planned document exists.

## Instructions
1. **Completeness check.** Confirm every file `documentation-plan.md` calls for actually exists in `docs-kit/` — every included template in every included category, and `5-modules/<slug>/` for every module in `module-list.md`. List anything missing; don't flag a legitimately-skipped category as missing.
2. **Terminology/consistency check.** Identify this project's own shared concepts from `module-list.md` and (if `2-database/` exists) `2-database/1-database-design.md` — any entity referenced by more than one module, any status/enum field used across modules — then confirm they're named and defined the same way everywhere they appear: status/enum values across `1-project/2-requirements.md`, the relevant `5-modules/<slug>/` documents, and (if `3-api/` exists) API response examples; role names consistent everywhere; entity/field names matching the schema of record exactly wherever referenced downstream (`2-database/1-database-design.md` if a database exists, or wherever this project's actual data shape is documented — e.g. a module's own `4-schema.md` — if it doesn't).
3. **Decision-traceability check.** Confirm every decision recorded in `gap-analysis-report.md`/`clarification-questions.md` (e.g. tech stack, database primary key strategy, and any project-specific business-rule decisions logged there) is actually reflected in the relevant generated documents, not just recorded once and forgotten.
4. **`[NEEDS INPUT]` sweep.** Grep the whole `docs-kit/` tree for the exact marker syntax `[NEEDS INPUT:` and `[Assumption:` (with the colon) — not just the bare phrase "NEEDS INPUT", which can also appear in ordinary prose (e.g. a document's own revision notes describing that an earlier draft *had* an open marker, now resolved) and would falsely read as still-open. Compile the real markers into one consolidated list, grouped by document, so the user can resolve them without hunting through 40+ files individually.
5. **Cross-reference check.** Spot-check that "Related Documents" links in each file point to documents that actually exist and haven't been renamed/moved.
6. Do not silently fix inconsistencies found — report them. Fixing is a separate, explicit follow-up action the user should approve, since changes may ripple across multiple documents.

## Output
- `project-docs/claude-docs/gap-analysis/final-review-report.md` — findings from steps 1–5 above, plus the consolidated `[NEEDS INPUT]`/`[Assumption]` list.
- A plain-language handoff summary in the chat response itself (not just the file): what's done, what's still open, and whether the set is ready to hand off for implementation.

## Guardrails
- This is a review phase — do not edit the generated documents directly here. If the user asks you to fix something found, treat that as a new, separate task using the appropriate category/module's batch prompt under `project-docs/prompts/3-document-generate/`, scoped to just that one document (see that batch file's own "to regenerate a single document" note).
- **A fix found here may require reopening an already-approved document from an earlier, finished category — this is expected, not an error.** `7-cross-cutting/` (and this final sweep) run *last* specifically because some gaps are only visible once every other category's decisions exist to be cross-checked against — e.g. an authentication document approved back in `3-api/` can turn out to be missing a mitigation only the threat model surfaces. Don't treat "the affected document's category was already marked complete" as a reason to skip the fix or leave it as a note instead of actually patching it.
- This is a working document in `claude-docs/`, not a `docs-kit` deliverable.

## Completion Checklist
- [ ] Completeness confirmed against the taxonomy and `module-list.md`
- [ ] Terminology/consistency checked across documents that share concepts
- [ ] Every gap-analysis decision confirmed present in the generated docs
- [ ] All `[NEEDS INPUT]`/`[Assumption]` markers consolidated into one list
- [ ] Related-document links spot-checked
- [ ] `final-review-report.md` written
- [ ] Plain-language handoff summary given to the user

## Next Step
This is the last documentation-generation phase. If the review surfaces fixes, address them one document at a time — re-run that document's category/module batch file under `project-docs/prompts/3-document-generate/`, scoped to just that one document — then consider re-running this phase. Once the docs-kit is clean, run `project-docs/prompts/5-update-sot/1-update-sot.md` to promote the approved documentation into the Source of Truth before implementation planning begins.
