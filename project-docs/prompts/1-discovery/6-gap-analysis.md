# Gap Analysis

**Prompt version:** 2.1

## Role
You are a business analyst stress-testing the project understanding for holes and contradictions before any formal documentation is written.

## Objective
Identify everything that is missing, unclear, or conflicting in the Source of Truth and project analysis, and turn it into a concrete list of questions for the user.

## Inputs
- `project-docs/sot-docs/index.md` and raw SoT documents.
- `project-docs/claude-docs/analysis/project-summary.md`, `module-list.md`, `business-rules-summary.md`, `workflow-summary.md`.
- Any conflicts flagged during Phases 01–02.

## Instructions
1. Cross-check the Project Summary, Module List, Business Rules, and Workflows against the raw SoT documents.
2. Identify:
   - Missing requirements (referenced but never defined; implied but never stated)
   - Conflicting information (two documents disagreeing, or a document contradicting itself)
   - Unstated assumptions the analysis had to make to produce `5-project-analysis.md`'s output
   - Ambiguous terms or scope boundaries (e.g., "admin" role undefined, unclear MVP cutoff)
3. For each item, record: description, where it was found (source documents), why it matters (impact if unresolved), and a specific clarifying question.
4. Prioritize the list — mark items as Blocking (can't proceed to documentation without an answer) vs. Non-blocking (can proceed with a stated assumption, revisit later).
5. **Compile a cross-cutting decisions inventory** — separately from the general gap list, pull out every decision that will be referenced by *more than one* module or document: role/permission scope (who can do what, and whether any role is a superset of another), shared enums and their exact allowed values, ID/naming conventions, status lifecycles reused across entities, and any other rule a reader would expect to find "the same everywhere." A decision like this getting made once during a later module's implementation and never swept back into already-approved docs is exactly how the same stale-permissions class of bug ends up independently rediscovered in three or four modules. Resolve each one now, before any document-generation work starts. Record each as a short ADR (Architecture Decision Record), not a flat statement: **Context** (what prompted the decision), **Options Considered** (what else was on the table, briefly), **Decision** (what was chosen), **Consequences** (what this locks in or rules out downstream). The "options considered" part matters — a decision with no visible alternative looks arbitrary later and invites someone to silently second-guess it in one module without realizing it was already deliberated.
6. **Per-document, per-template-section gap sweep** — this is what lets `3-document-generate/`'s batch prompts run through a whole category with minimal stopping later, by surfacing predictable gaps now, before any writing starts, instead of discovering them mid-batch. For every category in `project-docs/docs-templates/` (all seven — this runs before `documentation-plan.md` exists, so walk the full fixed taxonomy here rather than a project-scoped plan; `2-document-plan/1-documentation-plan.md` will later mark any category/template Not Applicable for this project, which is fine, this sweep just doesn't know that yet), and every template file within it: read its section headings and skim what each section asks for, then ask — for this specific project, is there enough already gathered (SoT, project analysis, decisions already locked above) to fill this section, or is this a likely gap? Add anything likely-unanswerable to the gap list from step 2–4 with a specific question, same as any other gap. This step is explicitly about **predicting** gaps a document will hit before it's written, not just cataloguing gaps already visible in the SoT — the goal is minimizing the total number of questions asked across the whole project (before generation plus after), not just moving today's after-generation questions to before. Some gaps genuinely can't be predicted this way (a template-section-level ambiguity that only becomes visible once actually drafting the detailed content) — those are expected to surface later as `[NEEDS INPUT]`/`[Assumption]` markers during `3-document-generate/`, and that's fine, not a failure of this step.
7. Present the Blocking items to the user directly and ask for answers before continuing to `2-document-plan/1-documentation-plan.md`. Non-blocking items can be logged as assumptions and carried forward.

## Output
- `project-docs/claude-docs/gap-analysis/gap-analysis-report.md` — full list of gaps/conflicts/assumptions.
- `project-docs/claude-docs/gap-analysis/clarification-questions.md` — the question list, split into Blocking / Non-blocking.
- `project-docs/claude-docs/gap-analysis/decisions-log.md` — the cross-cutting decisions inventory, each entry final and locked. Every document generated from `3-document-generate/` onward must *reference* an entry here, never restate or re-decide it independently.

## Guardrails
- Do not silently resolve conflicts by picking one side — surface them.
- Do not proceed past Blocking items without an explicit answer from the user or an explicit decision to treat them as a documented assumption.
- A cross-cutting decision belongs in `decisions-log.md`, not buried inside one module's own gap-analysis notes — if it would ever matter to a second module, it goes in the shared log.

## Completion Checklist
- [ ] Gap Analysis Report written
- [ ] Clarification Questions listed and prioritized
- [ ] Blocking questions answered or explicitly deferred with a recorded assumption
- [ ] Cross-cutting decisions inventory compiled and locked in `decisions-log.md`
- [ ] Per-document, per-template-section gap sweep completed — confirm each category individually, don't check this off from a partial pass:
  - [ ] `1-project/` walked
  - [ ] `2-database/` walked
  - [ ] `3-api/` walked
  - [ ] `4-ui/` walked
  - [ ] `5-modules/` walked (templates only — per-module instances don't exist yet)
  - [ ] `6-development/` walked
  - [ ] `7-cross-cutting/` walked
  - [ ] Likely gaps from all seven added to the question list — a project-level document (e.g. `1-project/4-tech-stack.md`) skipped here is exactly how a stack-level gap (language choice, ORM, etc.) ends up surfacing mid-generation instead of upfront

## Next Step
Run `project-docs/prompts/2-document-plan/1-documentation-plan.md` next.
