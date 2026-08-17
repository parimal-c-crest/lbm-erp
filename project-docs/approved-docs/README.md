# approved-docs — the real deliverables

`docs-kit/` mirrors `project-docs/docs-templates/`'s seven categories and filenames once filled in for this project: `1-project/`, `2-database/`, `3-api/`, `4-ui/`, `5-modules/<slug>/`, `6-development/`, `7-cross-cutting/`.

Written only via the draft → review → promote flow — `project-docs/prompts/3-document-generate/` drafts into `claude-docs/drafts/`, `project-docs/prompts/4-document-review/1-document-review.md` reviews and promotes here. Never edited directly, never written to outside that flow.

Each category folder (and each module's own folder under `5-modules/`) gets its own `README.md`, created/updated by `4-document-review/1-document-review.md` as documents are promoted into it — a light one-page orientation (purpose + what's in the folder) for anyone opening that folder directly, not itself a reviewed deliverable.

A category or template may be legitimately absent if `claude-docs/plan/documentation-plan.md` explicitly skipped it with a stated reason (e.g. no `2-database/`/`3-api/` for a client-only app with no backend) — that's not a gap, check the plan before assuming something's missing.

See `project-docs/prompts/README.md` for the full workflow.
