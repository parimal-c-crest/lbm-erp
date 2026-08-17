# Documentation Planning

**Prompt version:** 1.5

## Role
You are a documentation lead deciding what needs to be written, in what order, before generation starts.

## Objective
Produce a Documentation Plan that maps every document this project needs onto the fixed taxonomy in `project-docs/docs-templates/`, in dependency order, so `3-document-generate/`'s batch prompts (one per category, or one per module for `5-modules/`) can generate every applicable document in a category together into `project-docs/claude-docs/drafts/`, ready for `4-document-review/` to review and promote that same batch into `project-docs/approved-docs/docs-kit/`.

## Fixed taxonomy (from `project-docs/docs-templates/`)
This folder already exists with seven category folders, each holding a `README.md` and a `templates/` folder of blueprint files. Do not invent new categories or templates — only decide which of the existing templates apply to this project and in what order to fill them.

- **`1-project/templates/`**: 1-project-overview.md, 2-requirements.md, 3-feature-breakdown.md, 4-tech-stack.md
- **`2-database/templates/`**: 1-database-design.md, 2-erd.md, 3-migration-strategy.md, 4-database-standards.md
- **`3-api/templates/`**: 1-api-design.md, 2-authentication.md, 3-authorization.md, 4-query-standards.md, 5-response-standards.md, 6-error-handling.md, 7-api-development-standards.md, 8-api-versioning.md, 9-openapi.yaml, 10-postman-collection.json
- **`4-ui/templates/`**: 1-navigation.md, 2-user-flows.md, 3-design-system.md, 4-component-standards.md, 5-form-standards.md, 6-responsive-design.md, 7-accessibility.md, 8-frontend-development-standards.md
- **`5-modules/templates/`**: 1-module.md, 2-functional-specification.md, 3-business-rules.md, 4-schema.md, 5-data-dictionary.md, 6-validation.md, 7-permissions.md, 8-api.md, 9-ui.md, 10-implementation-plan.md, 11-testing.md — **instantiated once per module** (one filled set per entry in `project-docs/claude-docs/analysis/module-list.md`, in its own subfolder)
- **`6-development/templates/`**: 1-development-environment.md, 2-folder-structure.md, 3-coding-standards.md, 4-git-workflow.md, 5-implementation-workflow.md, 6-testing-strategy.md, 7-deployment-strategy.md, 8-containerization.md, 9-ci-cd.md, 10-debugging-guide.md
- **`7-cross-cutting/templates/`**: 1-non-functional-requirements.md, 2-threat-model.md — always generated **last**, after every other category, since both documents cross-check decisions made everywhere else

## Inputs
- `project-docs/claude-docs/analysis/project-summary.md`, `module-list.md`, `business-rules-summary.md`, `workflow-summary.md`.
- `project-docs/claude-docs/gap-analysis/gap-analysis-report.md` (resolved/assumptions noted) and `decisions-log.md` (locked cross-cutting decisions).
- The actual template files under each `project-docs/docs-templates/<category>/templates/` (read them — don't assume their contents from the filenames alone).

## Instructions
1. Confirm `project-docs/docs-templates/` exists with the structure above; if a category or template is missing, note it and ask the user whether to proceed without it or pause until it's restored.
2. For every template file, decide: is it needed for this project (skip only with a stated reason — e.g., no `9-openapi.yaml` if there's no REST API)?
3. For `5-modules/`, list every module from `project-docs/claude-docs/analysis/module-list.md` that needs its own filled template set, with its target subfolder slug.
4. Order the full list by dependency across categories: `1-project` is foundational and runs first, alone. Once it's approved, `2-database`, `3-api`, and `4-ui` have no dependency on each other and **can run in parallel** (separate sessions, or just reordered freely by whoever's generating — see `prompts/README.md`'s Session Boundaries section for how a session splits at this granularity; this kit's document-generation prompts run in the main session, not delegated to subagents) — don't treat the `02-`/`03-`/`04-` folder numbering as implying a required sequence between them, it's a naming convention, not a dependency edge. `6-development` splits into an early wave (`1-development-environment.md`, `2-folder-structure.md`, `3-coding-standards.md`, `4-git-workflow.md`, `8-containerization.md`, `9-ci-cd.md` — six documents, no module dependency, can also run in parallel with `2-database`/`3-api`/`4-ui`) and a late wave (`5-implementation-workflow.md`, `6-testing-strategy.md`, `7-deployment-strategy.md`, `10-debugging-guide.md`). `7-cross-cutting` always runs last, strictly after everything else that's generated upfront, since both its documents cross-check decisions made across every other category. Order within a category follows the template's numeric prefix.

   **`5-modules/` and `6-development/`'s late wave are deferred, not part of this upfront order.** List every module from `module-list.md` in the plan (per step 3) so the full scope is visible, but mark each module's 11-document set and its corresponding late-wave slice as **"deferred — triggered per-module by `7-sprint-planning/1-sprint-planning.md` step 2a"** rather than giving them a place in the upfront generation sequence. A module's documentation only gets generated once its `<Module> — UI Design` or `<Module> — Backend/API` epic is first selected into a sprint — not during this initial documentation-generation pass. This keeps the upfront batch limited to `1-project`, `2-database`, `3-api`, `4-ui`, `6-development` (early wave), and `7-cross-cutting` — the shared foundation every module needs — while module-specific documentation spreads out across the project's actual build timeline instead of front-loading all of it before any module is touched.
5. **Explicitly mark, for every document in the plan, whether it can run in parallel with others or must wait** — don't leave this implicit in the numbering. A document plan entry should read like "`3-api/2-authentication.md` — parallel with `2-database/*`, `4-ui/*`; sequential after `1-project/*`," not just a flat ordered list. This matters even for a solo session (it tells you what order is actually safe to reshuffle if priorities change) and matters more if multiple sessions ever generate concurrently.

   **Why `2-database`/`3-api`/`4-ui`/`6-development`-early-wave are actually safe to parallelize**:
   each of these categories' generation prompts is instructed to ground its content in
   `decisions-log.md` and the upfront SoT/analysis — never in another upfront category's own
   drafted output. That's what makes running them concurrently safe (no category is reading
   another's in-progress draft). If a future template change ever makes one of these categories
   need to read another one's *content* directly (not just the shared decisions log), that pair
   stops being parallel-safe and this plan must mark it sequential — don't assume the parallel
   grouping above stays valid if that assumption changes.

## Output
- `project-docs/claude-docs/plan/documentation-plan.md` — every target document as `<category>/[<module-slug>/]<template-filename>`, with its dependencies and generation order, ready to drive repeated runs of `3-document-generate/`.

## Guardrails
- Don't invent documents outside the existing `docs-templates/` taxonomy — if something doesn't fit, flag it to the user rather than adding an ad hoc category.
- Flag any document whose content still depends on an unresolved gap from `1-discovery/6-gap-analysis.md`.
- If `decisions-log.md` doesn't exist or looks incomplete (a role/permission/enum question surfaces here that isn't already locked there), stop and go back to `1-discovery/6-gap-analysis.md` rather than letting individual documents each make their own call on a cross-cutting question.
- If `docs-templates/` changes (a template gains/loses sections) after some documents were already approved from its old shape, don't silently treat the already-approved ones as stale or wrong — flag which approved documents predate the template change and let the user decide whether they need updating, rather than assuming drift is an error.

## Completion Checklist
- [ ] `project-docs/docs-templates/` structure confirmed and read
- [ ] Full document list drafted against the fixed taxonomy, with per-module instances for `5-modules`
- [ ] Dependencies mapped and list ordered accordingly
- [ ] Plan reviewed with the user before generation begins

## Next Step
Run the appropriate batch prompt(s) under `project-docs/prompts/3-document-generate/` next — one batch file per category, each covering every applicable document in it in one run — in the order this plan establishes. This covers `1-project`, `2-database`, `3-api`, `4-ui`, `6-development` (early wave), and `7-cross-cutting` only. `5-modules/modules.md` and `6-development`'s late wave are **not** run from here — they stay deferred until `7-sprint-planning/1-sprint-planning.md` step 2a triggers each module's set individually.
