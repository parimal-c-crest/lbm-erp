# Generate: Module Field & Rule Extraction (05-modules, pre-step)

**Prompt version:** 1.1

## Role
You are a data/business analyst producing an exhaustive, field-by-field and rule-by-rule fact
base for one module — the ground truth `4-schema.md`, `5-data-dictionary.md`,
`3-business-rules.md`, and `6-validation.md` get written from, instead of being drafted straight
from the BRD.

## Why this step exists
`05-modules/modules.md` drafts a module's 11 documents from the SoT (raw BRD/notes) plus
summary-level analysis (`business-rules-summary.md` is a bullet list, not a field catalog) and
tags anything missing with `[NEEDS INPUT]`/`[Assumption]` as it goes. That prevents silent
hallucination, but it does not guarantee completeness — a BRD almost never enumerates every
entity field or every rule precisely, and a reactive per-document pass can miss fields it never
thought to ask about, not just fields it noticed and flagged. This step closes that gap: it
produces one dedicated, exhaustive fact base per module *before* any of the 11 templates get
touched, so the documents generated from it have nothing left to assume.

## Trigger
Runs automatically as step 0 of `05-modules/modules.md`, before that prompt's own step 1,
whenever `project-docs/claude-docs/analysis/module-field-extraction/<module-slug>/` does not yet
exist or is incomplete for the module `7-sprint-planning/1-sprint-planning.md` step 2a named.
Once this step's output exists and any Blocking gaps it raised are resolved, control returns to
`modules.md` step 1.

## Origin — pick per module, not per project
1. **Extracted-from-existing-system** — this module has a live predecessor (an existing codebase
   and/or database this project is replacing or extending). Ask the user for its location if not
   already recorded in `project-docs/sot-docs/index.md`. Facts must come from reading the real
   source and, where available, live schema (`DESCRIBE`/equivalent, read-only) — every field and
   rule cited to a concrete file:line or schema query, not paraphrased from memory or convention.
2. **Derived-from-SoT-plus-questions** — this module is new, with no predecessor. Facts come from
   `sot-docs/` plus direct clarifying questions to the user. Nothing gets guessed silently — see
   Instructions step 6.

State which origin applies at the top of both output documents. A project can mix origins across
modules; never assume one for the whole project.

## Depth — default is full coverage
Default to full, exhaustive coverage (every field, every rule) unless a coordinating process
states a sampling budget or scope limit **before this step starts**. If a scope/depth change
arrives *after* this step is already underway on a given document, finish that document at its
current depth rather than stopping mid-extraction to re-scope — an in-progress exhaustive pass
that gets cut short produces a document that looks complete but silently isn't, which is worse
than finishing it. See the matching guardrail below.

## Prerequisites — stop and report if missing
- `project-docs/claude-docs/analysis/module-list.md`
- `project-docs/claude-docs/gap-analysis/decisions-log.md` (cross-cutting decisions this module's
  fields/rules must not silently re-decide)
- If Origin 1 applies: a confirmed, reachable path to the existing system's source and (if
  available) a read-only database connection. If neither is reachable, stop and say so — do not
  fall back to Origin 2's method while claiming Origin 1.

## Inputs
- `project-docs/sot-docs/index.md` and the raw SoT documents it links to.
- `project-docs/claude-docs/analysis/business-rules-summary.md` and `workflow-summary.md` — use
  as a starting checklist of what to verify exhaustively, not as the final answer.
- `project-docs/claude-docs/gap-analysis/decisions-log.md` and `gap-analysis-report.md`.
- For Origin 1: the existing system's source code and live database.
- Already-completed field-extraction docs for modules this one depends on
  (`project-docs/claude-docs/plan/dependencies.md`) — reference their entities by name rather than
  re-describing them.

## Instructions
1. **One concern per pass across the whole module, not one screen/file fully read at a time** —
   sweep for entities/fields first, then rules, then workflow/state, checkpointing each before
   moving on. This is what prevents fatigue-driven omission on a large or complex module.
2. **Entities & Fields** — enumerate every field individually, never grouped or summarized. For
   each: business name, business meaning, logical type (money / date / datetime / enum /
   text / reference(to X) / boolean / array — never a raw DB type here, that's schema's job later),
   required?, default, source-of-truth (user-entered / derived / system-set), and a `Confidence`
   tag:
   - `Confirmed` — directly stated in the source (SoT section, or file:line/schema query for
     Origin 1)
   - `Inferred` — deduced from context, not directly stated; flag your reasoning
   - `Underspecified` — the source describes the *existence* of something (a field is clearly
     used elsewhere) but not enough to fill in type/meaning/constraints confidently. This is
     distinct from `Inferred` — it means the gap is incompleteness, not ambiguity, and needs
     follow-up input rather than a best-guess read.

   If a field appears anywhere else in this module's business rules, workflow, or UI references
   but has no entry here, that is a bug in this document — add it (even as `Underspecified` if its
   meaning isn't clear) rather than letting the mismatch stand. Do the same check in reverse before
   finishing: does the rules pass (step 3) reference every field that should matter to at least one
   rule, or is a cataloged field orphaned with no rule/screen ever touching it? Orphans aren't
   necessarily wrong (audit/system fields legitimately stand alone) but should be a conscious
   note, not silence.

   For any field with a fixed value set (enum/status/lookup), list the concrete allowed values —
   not just "this is an enum." If the values aren't in the source, that's a `Underspecified` gap,
   not something to invent a plausible-sounding list for.
3. **Business Rules & Validation** — enumerate every rule with a stable ID (`<MODULE>-RULE-001`
   sequential), each with: statement (plain business language), trigger, scope (which fields/
   entities), severity (hard block / warning / auto-remediation / not a block), source citation,
   and the same `Confidence` tag as step 2. For a rule with real multi-step logic (a calculation,
   a multi-record distribution, anything beyond a single condition), write the actual steps/
   formula — if the source only gives a one-sentence description of something that's clearly more
   complex than one sentence can capture, tag it `Underspecified` rather than implementing a
   simplified guess and presenting it as the real rule.
4. **Cross-module field dependencies** — for every rule or field that depends on another module's
   data (e.g. "blocked if the linked Account disallows X"), name the specific field needed from
   that module explicitly, even if that module hasn't been extracted yet. Don't describe the
   dependency only at the relationship level ("reads from Accounts") — name the field.
5. **Workflow/state** (if this module has lifecycle behavior) — states, transitions, guard
   conditions (cite the rule ID from step 3 that enforces each guard), side effects.
6. **Never silently assume, and never silently defer either.** Where the source doesn't give
   enough to fill in a field/rule confidently, tag it `Underspecified` and add it to this
   document's Open Questions list with a **Blocking?** flag: does leaving this unresolved block
   an entire capability (e.g. a whole pricing feature can't work without it) or is it a narrow,
   isolated gap? Present all Blocking items to the user together in one round before finishing
   this module's extraction, same pattern as `1-discovery/6-gap-analysis.md` step 7. Non-blocking
   items carry forward as open questions into the generated docs.
7. Cross-check against `decisions-log.md` — never let this module's rules restate or re-decide a
   cross-cutting decision (shared enum values, role scope, ID conventions) already locked there.
8. **End every output document (entities-and-fields.md, business-rules.md, workflow.md) with a
   Coverage Statement** — the specific files, folders, or SoT sections actually read for this
   document, and, just as importantly, what was deliberately NOT read (a large file only
   partially opened, a related file skipped as out of scope, a called function whose body wasn't
   traced). This is not the same as the Open Questions list — Open Questions covers things you
   read but couldn't resolve; the Coverage Statement covers what you didn't attempt to read at
   all, so a later reader can tell the difference between "checked and unclear" and "never
   checked."

## Output
- `project-docs/claude-docs/analysis/module-field-extraction/<module-slug>/entities-and-fields.md`
- `project-docs/claude-docs/analysis/module-field-extraction/<module-slug>/business-rules.md`
- `project-docs/claude-docs/analysis/module-field-extraction/<module-slug>/workflow.md` (only if
  the module has lifecycle behavior)
- `project-docs/claude-docs/analysis/module-field-extraction/<module-slug>/open-questions.md`
  (Blocking / Non-blocking, per step 6)

These are working fact-base documents, not part of the 11-file module deliverable — `05-modules/
modules.md` reads them as required input when drafting `3-business-rules.md`, `4-schema.md`,
`5-data-dictionary.md`, and `6-validation.md` for this module.

## Guardrails
- Don't group/summarize fields to save space — every field gets its own row, always.
- Don't invent a plausible-sounding enum value list, default, or meaning when the source doesn't
  give one — tag `Underspecified` and ask.
- Don't implement a simplified version of a multi-step rule and present it as the documented rule
  — tag `Underspecified` if the source's description is too thin for the rule's real complexity.
- Don't mix origins within one module — if Origin 1 was declared, don't fall back to guessing from
  general domain convention when the source is silent; that's still a gap, tag it.
- Don't proceed to `05-modules/modules.md` step 1 until this module's Blocking open questions are
  resolved with the user.
- If a scope-narrowing or depth-reduction instruction arrives while a document is already
  substantially drafted, don't discard the completed work to redo it smaller — finish and keep
  what's done, and note in the Coverage Statement that the instruction arrived late. Apply a new
  depth instruction only to work that hasn't started yet.
- Don't skip the Coverage Statement — an extraction document without one can't be told apart from
  one that quietly covered less than it claims to.

## Completion Checklist
- [ ] Every field individually listed (no grouping), with logical type, required/default,
      source-of-truth, and Confidence tag
- [ ] Every enum/lookup field has its concrete value list, or is tagged `Underspecified`
- [ ] Every rule has a stable ID, full statement, trigger, scope, severity, source, Confidence
- [ ] Multi-step rules have real steps/formula, not a simplified restatement
- [ ] Cross-module field dependencies named at the field level, not just the relationship level
- [ ] Cross-check done both directions: every field referenced elsewhere resolves here; every
      cataloged field is either used somewhere or consciously noted as standalone
- [ ] Open Questions list has a Blocking/Non-blocking flag on every item
- [ ] Blocking items presented to and resolved with the user
- [ ] Nothing here restates or re-decides an entry already in `decisions-log.md`
- [ ] Every output document ends with a Coverage Statement (what was read, what deliberately wasn't)

## Next Step
Once this module's field-extraction documents exist and Blocking open questions are resolved,
resume `project-docs/prompts/3-document-generate/05-modules/modules.md` at step 1 for this module,
using these documents as required input (see that file's Inputs list).
