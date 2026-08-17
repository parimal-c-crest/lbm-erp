# Generate: All Cross-Cutting Documents (7-cross-cutting, batch)

**Prompt version:** 1.4

## Role
You are a technical writer / architect (and, for the threat model, a security engineer) generating the full `7-cross-cutting/` documentation set — both documents — at professional quality, using the project's own templates as the required structure.

## Objective
Fill both templates under `project-docs/docs-templates/7-cross-cutting/templates/` and write the result to `project-docs/claude-docs/drafts/7-cross-cutting/`, mirroring the template filenames exactly.

This is the only `7-cross-cutting` prompt — it covers both documents in one run. To regenerate a single document, re-run this prompt but scope the relevant instruction below (and the write) to just that one file instead of the full sweep.

## Resuming an interrupted run
If a previous run of this prompt stopped partway through, don't restart from document 1. Check `project-docs/claude-docs/drafts/7-cross-cutting/` for which of the 2 documents already exist — resume from the next missing document, not from scratch.

## Prerequisites — stop and report if missing
- Every other category (`1-project/`, `2-database/`, `3-api/`, `4-ui/`, `5-modules/`, `6-development/`) fully generated and approved. This category runs **last**, always — its two documents cross-check decisions made everywhere else. Under the just-in-time module documentation model (`7-sprint-planning/1-sprint-planning.md` step 2a), `5-modules/` and `6-development/`'s late wave complete gradually, one module at a time — this prerequisite isn't satisfied until `module-list.md` shows every module approved, which that step's own Next Step is what checks and triggers this prompt from, once true.

## Inputs
- The 2 templates in `project-docs/docs-templates/7-cross-cutting/templates/` (`1-non-functional-requirements.md`, `2-threat-model.md`) and `project-docs/docs-templates/7-cross-cutting/README.md`.
- `project-docs/sot-docs/index.md` and the raw SoT documents it links to.
- `project-docs/claude-docs/analysis/project-summary.md`, `module-list.md`, `business-rules-summary.md`, `workflow-summary.md`.
- `project-docs/claude-docs/gap-analysis/gap-analysis-report.md`, `clarification-questions.md`, `decisions-log.md`.
- `project-docs/claude-docs/plan/documentation-plan.md` for this category's declared dependencies.
- `project-docs/approved-docs/docs-kit/1-project/4-tech-stack.md` — NFR targets can constrain stack choices already made.
- `project-docs/approved-docs/docs-kit/3-api/2-authentication.md` and `3-authorization.md` — the threat model evaluates their mechanisms against real attack scenarios, it doesn't redefine them.
- `project-docs/approved-docs/docs-kit/2-database/1-database-design.md` and every module's `project-docs/approved-docs/docs-kit/5-modules/<slug>/5-data-dictionary.md` for the sensitivity classification of data assets (`2-database/` has no `5-data-dictionary.md` of its own — the data dictionary is a per-module `5-modules/` document).

## Instructions
1. Process the 2 documents in order: `1-non-functional-requirements.md`, then `2-threat-model.md` — the threat model reads the NFR document's Security & Compliance section within this same batch.
2. **`1-non-functional-requirements.md`:** Numeric targets (response times, uptime SLAs) are especially prone to being invented — label every one that isn't sourced from the SoT with `[Assumption: ...]`. If any target meaningfully constrains `1-project/4-tech-stack.md`'s choices (e.g. an availability target the chosen stack can't realistically hit), flag it explicitly rather than silently writing an aspirational number that contradicts the stack decision.
3. **`2-threat-model.md`:** Ground every threat in this specific system's actual attack surface (its real endpoints, data, integrations) — not a generic security checklist copy-pasted regardless of relevance. Cross-check every threat against what `3-api/2-authentication.md` and `3-authorization.md` already claim to mitigate; flag any threat with no corresponding mitigation documented elsewhere as a real gap, not something to silently smooth over. Mark unresolved/accepted-risk threats explicitly as such in the Mitigation/Status columns — don't omit a threat just because it doesn't have a clean fix yet. Don't let this become a generic OWASP-Top-10 restatement disconnected from what this system actually does.
4. Every requirement, rule, or design decision must trace back to a SoT source or a recorded decision/assumption — cite inline, e.g. `[Source: project-docs/sot-docs/raw/brd.md §6]` or `[Assumption: gap-analysis N2]`.
5. **Never silently assume.** Where detail is insufficient, note it as an open question while drafting — don't write a guessed value into the document yet. Once this document is otherwise fully drafted, stop and ask the user every open question for it together, in one plain-language round (not as separate interruptions per question). Only write the final content after the user answers: use their real answer if given; if they explicitly say to use your own judgment, write `[Assumption: ...]` — a deferred call the user actually approved, not a silent guess. Reserve `[NEEDS INPUT: ...]` for something genuinely blocking even after asking (the user doesn't know either, needs to check something first) — not a substitute for asking in the first place.
6. Write each completed document directly to `project-docs/claude-docs/drafts/7-cross-cutting/<template-filename>`, creating folders as needed. Never modify `project-docs/docs-templates/`.

## Output
- `project-docs/claude-docs/drafts/7-cross-cutting/1-non-functional-requirements.md`, `2-threat-model.md`

## Guardrails
- Don't skip a document; if something genuinely doesn't apply, still create the file with an explicit "Not Applicable — reason" note rather than omitting it.
- Never write into `project-docs/docs-templates/`.
- Don't invent specific SLA/performance numbers unlabeled — an unsourced "99.9% uptime" reads as a real commitment, not a placeholder.
- If a dependency document from another category isn't approved yet, stop and name it rather than guessing its content.
- **If `2-threat-model.md` finds a real, unmitigated gap in an already-approved document from an earlier category** (e.g. an authentication document with no CSRF mitigation), don't just note the gap and move on — resolve it: record the decision in `decisions-log.md`, then patch the earlier document via its own category's batch file, scoped to that one document. This is exactly the scenario this category running last exists to catch; leaving it as an unresolved note defeats the point.

## Completion Checklist
- [ ] Every other category confirmed approved before starting
- [ ] Both documents present
- [ ] Numeric NFR targets sourced or explicitly labeled `[Assumption: ...]`
- [ ] Every threat cross-checked against documented mitigations; gaps flagged, not smoothed over
- [ ] All content traceable to SoT, an approved document, or a labeled assumption
- [ ] Open `[NEEDS INPUT]` markers collected and listed for the user
- [ ] No `[Assumption: ...]` was written without first asking the user and getting an explicit "use your judgment" response

## Next Step
This is the last generated category. Run `project-docs/prompts/4-document-review/1-document-review.md` scoped to `7-cross-cutting` next — nothing here is promoted into `approved-docs/docs-kit/` until it does. Once `7-cross-cutting/` is approved, run `project-docs/prompts/4-document-review/2-documentation-review.md` to do a final cross-document consistency sweep and produce a handoff summary, then `project-docs/prompts/5-update-sot/1-update-sot.md` once to fold this final batch into the Source of Truth (it already ran earlier for the upfront categories and after each module — this is its last cycle, not its first).
