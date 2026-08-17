# Generate: All API Documents (3-api, batch)

**Prompt version:** 1.2

## Role
You are a technical writer / architect generating the full `3-api/` documentation set — all 10 documents — at professional quality, using the project's own templates as the required structure.

## Objective
Fill all 10 templates under `project-docs/docs-templates/3-api/templates/` and write the result to `project-docs/claude-docs/drafts/3-api/`, mirroring the template filenames exactly.

This is the only `3-api` prompt — it covers all 10 documents in one run. To regenerate a single document, re-run this prompt but scope the relevant instruction below (and the write) to just that one file instead of the full sweep.

## Resuming an interrupted run
If a previous run of this prompt stopped partway through, don't restart from document 1. Check `project-docs/claude-docs/drafts/3-api/` for which of the 10 documents already exist — resume from the next missing document, in the same numeric order, not from scratch.

## Prerequisites — stop and report if missing
- `project-docs/approved-docs/docs-kit/1-project/` fully generated and approved. `02-database/` and `04-ui/` have no dependency on `03-api/` and may be in progress in parallel, but `1-project/` must be complete first.

## Inputs
- The 10 templates in `project-docs/docs-templates/3-api/templates/` (`1-api-design.md` → `10-postman-collection.json`) and `project-docs/docs-templates/3-api/README.md`.
- `project-docs/sot-docs/index.md` and the raw SoT documents it links to.
- `project-docs/claude-docs/analysis/project-summary.md`, `module-list.md`, `business-rules-summary.md`, `workflow-summary.md`.
- `project-docs/claude-docs/gap-analysis/gap-analysis-report.md`, `clarification-questions.md`, `decisions-log.md`.
- `project-docs/claude-docs/plan/documentation-plan.md` for this category's declared dependencies.

## Instructions
1. Process the 10 documents **in numeric order** (`1-api-design.md` → `10-postman-collection.json`) — later documents in the set reference earlier ones, never the reverse.
2. For each document: read its template fully first — headings/structure are the contract, do not restructure. Read the earlier documents this batch has already drafted in `project-docs/claude-docs/drafts/3-api/` that it depends on (per the order above), plus any approved dependency from another category in `project-docs/approved-docs/docs-kit/`, before writing it.
3. Every requirement, rule, or design decision must trace back to a SoT source or a recorded decision/assumption — cite inline, e.g. `[Source: project-docs/sot-docs/raw/brd.md §6]` or `[Assumption: gap-analysis N2]`.
4. **Never silently assume.** Where detail is insufficient, note it as an open question while drafting — don't write a guessed value into the document yet. Once this document is otherwise fully drafted, stop and ask the user every open question for it together, in one plain-language round (not as separate interruptions per question). Only write the final content after the user answers: use their real answer if given; if they explicitly say to use your own judgment, write `[Assumption: ...]` — a deferred call the user actually approved, not a silent guess. Reserve `[NEEDS INPUT: ...]` for something genuinely blocking even after asking (the user doesn't know either, needs to check something first) — not a substitute for asking in the first place.
5. Keep terminology, resource/endpoint naming, and any shared enums consistent across all 10 documents, and consistent with `decisions-log.md` for anything cross-cutting (role scope, shared status values, ID conventions).
6. **`9-openapi.yaml` — special handling.** Its template is a filled-in skeleton (`openapi`, `info`, `servers`, `paths`, `components.schemas`, `components.securitySchemes`) with generic example paths (`/auth/login`, `/users`, `/users/{id}`) and a generic `User` schema. Keep its structure and section order; replace the generic example resources with the project's real resources, endpoints, schemas, and security scheme, deriving each from `1-api-design.md` through `8-api-versioning.md` in this same batch — do not leave the generic `/users` example in place alongside the real ones.
7. **`10-postman-collection.json` — special handling.** Its template is a filled-in Postman Collection v2.1 skeleton (`info`, `item[]` grouped by folder per resource, `variable[]` for `base_url`/`token`) with generic example requests (Login, List/Get/Create User). Keep its structure; replace the generic example folders/requests with one folder per real resource and one request per real endpoint, mirroring every endpoint just defined in this batch's `9-openapi.yaml` rather than inventing a different endpoint set or leaving the generic examples in place.
8. Write each completed document directly to `project-docs/claude-docs/drafts/3-api/<template-filename>`, creating folders as needed. Never modify `project-docs/docs-templates/`.

## Output
- `project-docs/claude-docs/drafts/3-api/1-api-design.md` … `10-postman-collection.json`

## Guardrails
- Don't skip a document; if something genuinely doesn't apply, still create the file with an explicit "Not Applicable — reason" note rather than omitting it.
- Never write into `project-docs/docs-templates/`.
- `10-postman-collection.json` must mirror `9-openapi.yaml`'s endpoint set exactly — never a different or partial set.
- If a dependency document outside this batch (e.g. `1-project/`) doesn't exist yet in `project-docs/approved-docs/docs-kit/`, stop and name it rather than guessing its content.

## Completion Checklist
- [ ] `1-project/` confirmed approved before starting
- [ ] All 10 documents present, in numeric order
- [ ] `9-openapi.yaml`'s generic example resources fully replaced with the project's real ones
- [ ] `10-postman-collection.json` mirrors `9-openapi.yaml`'s endpoints exactly
- [ ] All content traceable to SoT, an approved document, or a labeled assumption
- [ ] Open `[NEEDS INPUT]` markers collected and listed for the user
- [ ] No `[Assumption: ...]` was written without first asking the user and getting an explicit "use your judgment" response
- [ ] Terminology and resource/endpoint naming consistent across all 10 documents

## Next Step
`3-api/` drafts are complete. Run `project-docs/prompts/4-document-review/1-document-review.md` scoped to `3-api` next — nothing here is promoted into `approved-docs/docs-kit/` until it does. Once `3-api/` is approved, continue with whichever of `4-ui/ui.md` or `6-development/development.md` (early wave) are still outstanding — `3-api/` has no further generation step of its own. `5-modules/modules.md` does **not** run from here; under the just-in-time model it's triggered per module by `project-docs/prompts/7-sprint-planning/1-sprint-planning.md` step 2a instead.
