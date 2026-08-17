# Generate: All UI Documents (4-ui, batch)

**Prompt version:** 1.2

## Role
You are a technical writer / architect generating the full `4-ui/` documentation set — all 8 documents — at professional quality, using the project's own templates as the required structure.

## Objective
Fill all 8 templates under `project-docs/docs-templates/4-ui/templates/` and write the result to `project-docs/claude-docs/drafts/4-ui/`, mirroring the template filenames exactly.

This is the only `4-ui` prompt — it covers all 8 documents in one run. To regenerate a single document, re-run this prompt but scope the relevant instruction below (and the write) to just that one file instead of the full sweep.

## Resuming an interrupted run
If a previous run of this prompt stopped partway through, don't restart from document 1. Check `project-docs/claude-docs/drafts/4-ui/` for which of the 8 documents already exist — resume from the next missing document, in the same numeric order, not from scratch.

## Prerequisites — stop and report if missing
- `project-docs/approved-docs/docs-kit/1-project/` fully generated and approved. `02-database/` and `03-api/` have no dependency on `04-ui/` and may be in progress in parallel, but `1-project/` must be complete first.

## Inputs
- The 8 templates in `project-docs/docs-templates/4-ui/templates/` (`1-navigation.md` → `8-frontend-development-standards.md`) and `project-docs/docs-templates/4-ui/README.md`.
- `project-docs/sot-docs/index.md` and the raw SoT documents it links to.
- `project-docs/claude-docs/analysis/project-summary.md`, `module-list.md`, `business-rules-summary.md`, `workflow-summary.md`.
- `project-docs/claude-docs/gap-analysis/gap-analysis-report.md`, `clarification-questions.md`, `decisions-log.md`.
- `project-docs/claude-docs/plan/documentation-plan.md` for this category's declared dependencies.
- `project-docs/sot-docs/design/` — visual design references, if any exist. Check `project-docs/sot-docs/design/design-source.md` first.

## Instructions
1. Process the 8 documents **in numeric order** (`1-navigation.md` → `8-frontend-development-standards.md`) — later documents in the set reference earlier ones, never the reverse.
2. For each document: read its template fully first — headings/structure are the contract, do not restructure. Read the earlier documents this batch has already drafted in `project-docs/claude-docs/drafts/4-ui/` that it depends on, plus any approved dependency from another category in `project-docs/approved-docs/docs-kit/`, before writing it.
3. **When writing `2-user-flows.md`, if `design-source.md` has `screenshots` (or any other visual reference) checked, walk every screen literally before writing its flow.** For each screen a flow passes through, open its matching screenshot/frame and record the concrete, observable facts — exact visible fields, buttons, labels/copy text, layout regions, and any state only reachable by interacting (a drawer, a modal, an expanded row) — as a checklist inside that flow's section, not as generic prose ("a form with relevant fields"). A flow description vague enough to fit any layout is exactly what lets the built UI drift from the reference without anyone noticing until someone does a screenshot comparison after the fact — the goal here is to make that drift impossible by being specific now.
4. **When writing `3-design-system.md`, read `project-docs/sot-docs/design/design-source.md` first** — the discovery phase should already have resolved which box is checked and confirmed the referenced material actually exists. Don't re-discover the design source from scratch here:
   - `tokens` checked → `project-docs/sot-docs/design/tokens.json` is authoritative — use its exact values, don't override them with defaults.
   - `screenshots` checked → read every file in `project-docs/sot-docs/design/screenshots/` directly (they're images — use vision to inspect actual colors, spacing, typography, and component patterns) and derive token values from what's actually shown, not a generic palette.
   - `figma` checked → read `project-docs/sot-docs/design/figma-reference.md` and use the Figma MCP tools to pull live design context (variables, screenshots, component specs) from each linked frame.
   - `stitch-generate` checked → confirm a Stitch MCP tool is actually available in this session before relying on it; if not, stop and tell the user it needs to be connected (`claude mcp add stitch ...` + session restart) rather than silently falling back to defaults.
   - `none` checked, or `design-source.md`/all referenced files are missing → fall back to a professional default token set (e.g. built on the chosen CSS framework's standard scale) and mark every token `[Assumption: this document]`, clearly noting in the Executive Summary that no brand/visual reference was available.
5. Every requirement, rule, or design decision must trace back to a SoT source or a recorded decision/assumption — cite inline, e.g. `[Source: project-docs/sot-docs/raw/brd.md §6]` or `[Assumption: gap-analysis N2]`.
6. **Never silently assume.** Where detail is insufficient, note it as an open question while drafting — don't write a guessed value into the document yet. Once this document is otherwise fully drafted, stop and ask the user every open question for it together, in one plain-language round (not as separate interruptions per question). Only write the final content after the user answers: use their real answer if given; if they explicitly say to use your own judgment, write `[Assumption: ...]` — a deferred call the user actually approved, not a silent guess. Reserve `[NEEDS INPUT: ...]` for something genuinely blocking even after asking (the user doesn't know either, needs to check something first) — not a substitute for asking in the first place.
7. Keep terminology, design tokens (from `3-design-system.md`), and component naming consistent across all 8 documents.
8. Write each completed document directly to `project-docs/claude-docs/drafts/4-ui/<template-filename>`, creating folders as needed. Never modify `project-docs/docs-templates/`.

## Output
- `project-docs/claude-docs/drafts/4-ui/1-navigation.md` … `8-frontend-development-standards.md`

## Guardrails
- Don't skip a document; if something genuinely doesn't apply, still create the file with an explicit "Not Applicable — reason" note rather than omitting it.
- Never write into `project-docs/docs-templates/`.
- Never let `4-component-standards.md` through `8-frontend-development-standards.md` introduce design tokens/values that contradict `3-design-system.md`'s already-established set within this same batch.
- If a dependency document outside this batch (e.g. `1-project/`) doesn't exist yet in `project-docs/approved-docs/docs-kit/`, stop and name it rather than guessing its content.

## Completion Checklist
- [ ] `1-project/` confirmed approved before starting
- [ ] All 8 documents present, in numeric order
- [ ] `2-user-flows.md` walked every referenced screenshot literally, where one exists, instead of writing generic flow prose
- [ ] `3-design-system.md` followed `design-source.md`'s resolved source before falling back to defaults
- [ ] All content traceable to SoT, an approved document, or a labeled assumption
- [ ] Open `[NEEDS INPUT]` markers collected and listed for the user
- [ ] No `[Assumption: ...]` was written without first asking the user and getting an explicit "use your judgment" response
- [ ] Terminology and design tokens consistent across all 8 documents

## Next Step
`4-ui/` drafts are complete. Run `project-docs/prompts/4-document-review/1-document-review.md` scoped to `4-ui` next — nothing here is promoted into `approved-docs/docs-kit/` until it does. Once `4-ui/` is approved, `6-development/`'s early wave can start in parallel if it hasn't already — run `project-docs/prompts/3-document-generate/06-development/development.md` (early wave). `5-modules/modules.md` does **not** start here — under the just-in-time model, it's triggered per module by `project-docs/prompts/7-sprint-planning/1-sprint-planning.md` step 2a, once `01-project`, `02-database`, `03-api`, and `04-ui` are all approved.
