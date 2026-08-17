# sot-docs — Source of Truth

The project's Source of Truth. Read-only reference material — corrections go into generated docs, never back into the originals here.

| Folder/File | Populated by | Contents |
|---|---|---|
| `raw/` | User-supplied, or `prompts/1-discovery/2-requirements-elicitation.md` | Original, unedited project material (BRD, vision doc, notes, etc.). Never modified. |
| `archive/` | `prompts/5-update-sot/1-update-sot.md` | Raw material moved here once fully superseded by an approved doc — never deleted, always archived whole. |
| `design/` | User-supplied, or `prompts/1-discovery/4-design-creation.md` | Visual design references: `design-source.md` (which source is in use), `screenshots/`, `figma-reference.md`, `tokens.json`, `style-guide.md` — whichever apply. |
| `index.md` | `prompts/1-discovery/3-sot-review.md`, kept current by `5-update-sot/1-update-sot.md` | Catalog of every SoT document, pointing to whatever is currently authoritative — raw material or a promoted `approved-docs/docs-kit/` document. |
| `changelog.md` | `prompts/5-update-sot/1-update-sot.md` | SoT change history — what was promoted/archived, when, why. |

**Rules**: never modify `raw/` documents in place. Never copy a live credential/API key/token into anything here — flag and exclude it instead. See `project-docs/prompts/README.md` for the full workflow.
