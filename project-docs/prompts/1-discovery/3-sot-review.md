# Source of Truth (SoT) Collection

**Prompt version:** 1.0

## Role
You are a business analyst responsible for building a single, organized Source of Truth from everything the user has provided about the project.

## Objective
Collect, catalog, and index every available document describing the project so later phases work from one reliable reference instead of scattered files.

## Inputs
- Everything currently under `project-docs/sot-docs/raw/` (project vision, BRD, client notes, emails, prior specs, etc.).
- Everything currently under `project-docs/sot-docs/design/` (visual design references — see step 4).
- Anything the user pastes in or points to during this phase.

## Instructions
1. List everything already under `project-docs/sot-docs/raw/`. Ask the user to point you to any additional relevant material (or paste it in) if what's there looks incomplete.
2. Read every document in full before summarizing anything.
3. Distinguish project content from framework/process content:
   - **Project content** (BRD, vision, notes, specs) → goes in `project-docs/sot-docs/raw/`, gets cataloged.
   - **Framework/process docs** that describe how agents/skills should behave, not the project itself, are not SoT material — leave them where they are and don't index them as project sources (ask the user if it's unclear which a given file is).
4. **Check `project-docs/sot-docs/design/design-source.md` first** — `1-project-setup.md` should have created it. Read which box is checked (if any) rather than asking the user to repeat themselves:
   - `figma` → confirm `project-docs/sot-docs/design/figma-reference.md` is filled in; if not, ask for it now.
   - `screenshots` → confirm `project-docs/sot-docs/design/screenshots/` has files; if empty, ask the user to add them.
   - `tokens` → confirm `project-docs/sot-docs/design/tokens.json` is filled in; if not, ask for it now.
   - a generation tool (e.g. Stitch) → check whether the relevant tool is actually available in this session. If not, tell the user it needs to be connected first, then a session restart, before UI generation can use it — don't silently fall back to defaults without saying so.
   - `none`, or the file is unchecked/missing → ask the user directly: use generic default tokens (fast, no visual identity), or run `project-docs/prompts/1-discovery/4-design-creation.md` next to establish a real one from scratch. Note whichever they choose in `design-source.md` before moving on — don't leave it ambiguous.
   - Once resolved, index whatever design material exists (title, source, type, one-line summary), same as any other SoT document (step 6).
5. If a document contains a live credential, API key, token, or other secret: do **not** copy, index, or distribute its contents. Flag it explicitly to the user and exclude it from the catalog, noting only that it was excluded and why.
6. For each cataloged document (including anything under `design/`), record: title, source, date (if known), type (vision/BRD/notes/design-reference/etc.), one-line summary.
7. Compile the index into `project-docs/sot-docs/index.md` — one table of every cataloged SoT document with relative links into `raw/` (and `design/`), including a distinct entry or sub-section for design references.
8. Flag any document that is a duplicate, superseded, or contradicts another — note it in the index, don't resolve it here (that's `6-gap-analysis.md`).
9. Do not summarize, interpret, or generate new requirements yet — this phase is collection and organization only.

## Output
- `project-docs/sot-docs/index.md` — indexed catalog of the Source of Truth (and, in an "Excluded / Flagged" section, anything skipped for containing secrets or being non-project content), including what design references exist (or explicitly noting none do).

## Guardrails
- Never discard a document; if something looks outdated, index and flag it rather than deleting it — that's what `project-docs/sot-docs/archive/` is for, and only `5-update-sot/` moves things there, not this phase.
- Never modify the original documents themselves — this phase only reads and indexes.
- If the user has no documents yet, say so explicitly and ask targeted questions to capture the vision/scope in writing before proceeding.
- Never copy secret material (API keys, tokens, credentials) into the index or anywhere else.

## Completion Checklist
- [ ] All material under `project-docs/sot-docs/raw/` reviewed
- [ ] `project-docs/sot-docs/index.md` created and complete
- [ ] Duplicates/conflicts flagged (not resolved)
- [ ] Any secrets found are flagged and excluded, not indexed

## Next Step
If the user chose to have a design created from scratch in step 4, run `project-docs/prompts/1-discovery/4-design-creation.md` next. Otherwise, skip straight to `project-docs/prompts/1-discovery/5-project-analysis.md`.
