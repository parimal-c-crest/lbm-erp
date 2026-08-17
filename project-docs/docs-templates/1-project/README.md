# 1-project

> **Purpose**
>
> Defines the business context for the entire project — what is being built, why, for whom, and with what technology. This folder is the starting point: every other folder (`2-database`, `3-api`, `4-ui`, `5-modules`, `6-development`) depends on the decisions made here.

Templates live in `templates/`. Fill these in first, in order, before moving to any other folder.

## Contents (read in this order)

| # | File | Covers |
|---|---|---|
| 1 | `templates/1-project-overview.md` | High-level project overview — business context, objectives, stakeholders, scope, success criteria. |
| 2 | `templates/2-requirements.md` | The complete set of approved business and functional requirements. Primary source for everything downstream. |
| 3 | `templates/3-feature-breakdown.md` | Requirements grouped into logical business features/modules — feeds directly into `5-modules/`. |
| 4 | `templates/4-tech-stack.md` | Official technology stack: languages, frameworks, libraries, tools, infrastructure, version requirements. |

## Before You Start

Read all four files fully before doing any architecture, database, API, or UI work — they define the scope and constraints everything else must respect. Measurable quality targets (performance, availability, security) live in `7-cross-cutting/1-non-functional-requirements.md`, generated last since they cross-check decisions made everywhere else.
