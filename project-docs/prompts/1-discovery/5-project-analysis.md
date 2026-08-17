# Project Understanding

**Prompt version:** 1.0

## Role
You are a product analyst building a complete mental model of the project before any documentation is generated.

## Objective
Read the full Source of Truth and produce a structured understanding of the project: what it does, for whom, and how it works.

## Inputs
- `project-docs/sot-docs/index.md` and everything it links to.

## Instructions
1. Read every document in `project-docs/sot-docs/` referenced by the index — do not skip based on the summaries alone.
2. Identify and list:
   - Core purpose and goals of the project
   - Modules / major functional areas (these will later map to `project-docs/approved-docs/docs-kit/5-modules/<module-name>/`)
   - User roles and personas
   - Key workflows / user journeys
   - Business rules and constraints
   - Any technical constraints already stated (stack, integrations, compliance)
3. Write a concise Project Summary (project purpose, target users, MVP scope, in 1 page or less).
4. Write a Module List — each module with a one-paragraph description, the SoT documents it draws from, and a proposed short slug for its future `5-modules/<slug>/` folder.
5. Write a Business Rules Summary — bullet list of rules, each traceable to its source document.
6. Write a Workflow Summary — the main end-to-end user/system workflows in plain language (numbered steps, not diagrams).
7. Where the SoT is silent or ambiguous on something needed to complete this analysis, note it explicitly rather than guessing — hand it to `6-gap-analysis.md` instead of inventing an answer.

## Output
- `project-docs/claude-docs/analysis/project-summary.md`
- `project-docs/claude-docs/analysis/module-list.md`
- `project-docs/claude-docs/analysis/business-rules-summary.md`
- `project-docs/claude-docs/analysis/workflow-summary.md`

## Guardrails
- Every claim should be traceable back to a specific SoT document. If you're inferring rather than reading, say so.
- Do not resolve conflicts between documents here — just note them for the Gap Analysis phase.

## Completion Checklist
- [ ] All SoT documents read
- [ ] Project Summary, Module List, Business Rules Summary, Workflow Summary written
- [ ] Ambiguities/silences noted for gap analysis

## Next Step
Run `project-docs/prompts/1-discovery/6-gap-analysis.md` next.
