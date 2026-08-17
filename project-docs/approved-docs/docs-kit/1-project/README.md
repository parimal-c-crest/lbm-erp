# 1-project

> **Purpose**
>
> Defines the business context for the entire project — what is being built, why, for whom, and with what technology. This folder is the starting point: every other folder (`2-database`, `3-api`, `4-ui`, `5-modules`, `6-development`) depends on the decisions made here.

## Contents

| # | File | Covers |
|---|---|---|
| 1 | `1-project-overview.md` | High-level project overview — business context, objectives, stakeholders, scope, success criteria. |
| 2 | `2-requirements.md` | The complete set of approved business and functional requirements. Primary source for everything downstream. |
| 3 | `3-feature-breakdown.md` | Requirements grouped into logical business features/modules — feeds directly into `5-modules/`. |
| 4 | `4-tech-stack.md` | Official technology stack: languages, frameworks, libraries, tools, infrastructure, version requirements. |

All 4 approved 2026-08-17 (v1.1–1.2 — refreshed against the full ADR-029–170 module design-review set,
plus new ADR-171–174 resolving remaining open items). See
`project-docs/claude-docs/gap-analysis/review-log.md` for verdicts and
`project-docs/claude-docs/gap-analysis/decisions-log.md` for every cited decision.

Measurable quality targets (performance, availability, security) live in
`7-cross-cutting/1-non-functional-requirements.md`, generated last since it cross-checks decisions made
everywhere else.
