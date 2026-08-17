# Project Setup

**Prompt version:** 1.1

## Role
You are a senior technical lead setting up a new software project for AI-assisted development.

## Objective
Initialize the `project-docs/` folder structure and root-level project files so every later phase (SoT collection, analysis, gap analysis, documentation, implementation) has a consistent place to read from and write to. This is the entry point when reusing this kit for a **new** project.

## The four areas under `project-docs/` — do not mix these up
- **`project-docs/docs-templates/`** — fixed, project-agnostic blueprint library (seven category folders: `1-project/`, `2-database/`, `3-api/`, `4-ui/`, `5-modules/`, `6-development/`, `7-cross-cutting/`, each with `README.md` + `templates/`). Never create, restructure, or write into this folder. If it doesn't exist, stop and tell the user rather than recreating it from memory.
- **`project-docs/approved-docs/docs-kit/`** — the real deliverables, mirroring `docs-templates/`'s categories/filenames once filled in and reviewed. Written only via the draft → review → promote flow (`3-document-generate/` → `4-document-review/`), never directly.
- **`project-docs/claude-docs/`** — this workflow's own working area: `analysis/`, `gap-analysis/`, `drafts/` (mirrors `docs-kit/`'s category structure), `plan/` (documentation plan, milestones, epics, tasks), `tasks/` (per-task Todo checklists, reviews, test reports), `sprints/` (sprint backlogs and retros), `incidents/` (production incident records). Nothing in here is a final deliverable.
- **`project-docs/sot-docs/`** — the Source of Truth: `raw/` (original, unedited material), `archive/` (superseded material, never deleted), `index.md` (catalog, points to whatever is currently authoritative — raw material or a promoted `docs-kit/` document), `changelog.md` (SoT change history). The user may add material to `raw/` manually at any time; `3-sot-review.md` organizes and indexes it.

## Inputs
- Project name and a one-paragraph description from the user, if not already evident from `project-docs/sot-docs/`.
- Preferred tech stack, if the user already has one (otherwise propose one and confirm later, once enough is known).
- Any existing repo contents — check before creating anything.

## Instructions
1. Check what already exists under `project-docs/` before creating anything — do not overwrite existing files without confirming with the user.
2. Confirm `project-docs/docs-templates/` exists with all seven category folders. If missing, stop and tell the user to restore it rather than recreating it from scratch (it's meant to be copied in as-is from this kit).
3. Confirm `project-docs/prompts/` exists (this file included). If missing, same as above.
4. Create `project-docs/approved-docs/docs-kit/` (empty root — category subfolders are created as documents are approved in `4-document-review/`).
5. Create the `project-docs/claude-docs/` working structure (skip/adapt any folder that already exists):
   - `project-docs/claude-docs/analysis/`
   - `project-docs/claude-docs/gap-analysis/`
   - `project-docs/claude-docs/drafts/`
   - `project-docs/claude-docs/plan/`
   - `project-docs/claude-docs/tasks/`
   - `project-docs/claude-docs/sprints/`
   - `project-docs/claude-docs/incidents/`
6. Create the `project-docs/sot-docs/` structure:
   - `project-docs/sot-docs/raw/`
   - `project-docs/sot-docs/archive/`
   - `project-docs/sot-docs/design/`
   - `project-docs/sot-docs/design/screenshots/`
   - `project-docs/sot-docs/index.md` (populated in `3-sot-review.md`)
   - `project-docs/sot-docs/changelog.md` (populated from `5-update-sot/` onward)
7. If `project-docs/sot-docs/raw/` is empty, ask the user for their project material (BRD, vision doc, notes, etc.) before proceeding — do not invent business content at this stage.
8. If `project-docs/sot-docs/design/design-source.md` doesn't exist, create it and ask the user to check the box that matches how they'll provide visual design (Figma, screenshots, tokens, generation tool, or none) — decided once, upfront, so it doesn't need rediscovering mid-workflow at the UI-generation stage. Don't block on an answer if the user wants to decide later; leave it unchecked and move on.
9. Create/confirm a root `CLAUDE.md`: project summary, tech stack (once known), coding standards pointer, a map of the four `project-docs/` areas above, the planning hierarchy (`Project → Milestone → Epic → Task → Todo`, see `6-implementation-plan/1-implementation-plan.md`), a pointer to `project-docs/prompts/README.md` as the workflow entry point, a pointer to `project-docs/prompts/GLOSSARY.md` for any unfamiliar term, and a **Communication Conventions** section (verbatim rule, not project-specific — copy it as-is):
   - **Status prefixes:** use an icon + bold label when a response contains a warning, error, skipped/blocked item, or confirmation — ⚠️ **WARNING**, 🚫 **SKIPPED** / **BLOCKED**, ❌ **ERROR** / **FAILED**, ✅ **DONE** / **CONFIRMED**, ℹ️ **NOTE**. Only when the content actually is that kind of status, not decoratively on every line.
   - **Plain-language questions:** state any question to the developer in plain language before naming jargon/internal terminology. When offering options, explain in one clause what choosing each one actually does, and if one is recommended, say why in the same breath — never just a label like "(Recommended)" with no reason.
   - **Next-prompt reminder:** after running any `project-docs/prompts/` file (including `/init`/this setup prompt itself), state the next prompt's full folder-qualified path and ask permission to run it, in that same response — before ending the turn. Never let a turn end without naming the next step.
   These conventions exist because a developer using this kit may not know its internal vocabulary (SoT, epic rollup, Definition of Ready, etc.), and a question or status update they can't parse either gets rubber-stamped or ignored — defeating the point of asking/flagging at all. Any Claude session working in this project should follow both from the first response onward, not just once `project-docs/prompts/` is in use.
   Do not invent project-specific business content in `CLAUDE.md` beyond this — that belongs to later phases.
10. Create `README.md` at the project root with project name, one-line description, setup instructions (placeholder if stack isn't finalized), and a link to `CLAUDE.md`.
11. Create an empty `CHANGELOG.md` at the project root (distinct from `sot-docs/changelog.md` — this one tracks releases, see `10-release/`).
12. Do not invent business requirements, scope, or a module list at this stage — that belongs to `5-project-analysis.md` onward.

## Output
- Confirmed/created folder structure as above.
- Root `CLAUDE.md`, `README.md`, `CHANGELOG.md`.

`CLAUDE.md` plus `project-docs/approved-docs/docs-kit/` together are this project's onboarding material — a new developer joining mid-project should read those two before anything else, rather than there being a separate onboarding phase.

## Guardrails
- Never write into `project-docs/docs-templates/`.
- Do not overwrite existing files without confirming with the user first.
- Keep this phase infrastructural only — no feature or requirement content yet.

## Completion Checklist
- [ ] `project-docs/docs-templates/` and `project-docs/prompts/` presence confirmed (not modified)
- [ ] `project-docs/approved-docs/docs-kit/`, `claude-docs/*`, `sot-docs/*` folders confirmed/created
- [ ] `project-docs/sot-docs/raw/` has at least one source document, or the user has been asked for one
- [ ] `project-docs/sot-docs/design/design-source.md` created (checked or explicitly left open)
- [ ] Root `CLAUDE.md`, `README.md`, `CHANGELOG.md` confirmed/created
- [ ] User has confirmed the setup

## Next Step
Run `project-docs/prompts/1-discovery/2-requirements-elicitation.md` next if the user doesn't yet have their project material written down anywhere (no BRD/vision doc/notes) — it runs a structured discovery conversation to produce that material. If `project-docs/sot-docs/raw/` already has real material, skip straight to `project-docs/prompts/1-discovery/3-sot-review.md`.
