# 6-development

> **Purpose**
>
> Defines how the project is actually built, tested, and shipped day-to-day — local environment setup, repo conventions, coding practices, git workflow, testing, containerization, CI/CD, and debugging. This is where documentation ends and implementation begins.

Requires `1-project/`, `2-database/`, `3-api/`, and `4-ui/` to be understood first; this folder governs *how* those get implemented, not *what* gets built.

## Contents

| # | File | Covers |
|---|---|---|
| 1 | `1-development-environment.md` | Required software, tooling, installation, and configuration for a consistent local setup. |
| 2 | `2-folder-structure.md` | Standard project directory structure and ownership across the codebase. |
| 3 | `3-coding-standards.md` | Coding conventions and quality requirements all developers/AI tools must follow. |
| 4 | `4-git-workflow.md` | Branching model, commit conventions, PR process, merge strategy. |
| 5 | `5-implementation-workflow.md` | *(late wave — not yet generated)* Step-by-step lifecycle for building a feature from approved requirements to done. |
| 6 | `6-testing-strategy.md` | *(late wave — not yet generated)* Testing levels, quality objectives, responsibilities, and automation approach. |
| 7 | `7-deployment-strategy.md` | *(late wave — not yet generated)* Release process, environment management, rollback procedures. |
| 8 | `8-containerization.md` | Documented as **Not Applicable** — this project explicitly does not use Docker (`1-project/4-tech-stack.md` §14). Every section retained with a pointer to its real non-container equivalent elsewhere in this docs-kit. |
| 9 | `9-ci-cd.md` | CI/CD pipeline architecture (GitHub Actions, ADR-181), automation, and quality gates. |
| 10 | `10-debugging-guide.md` | *(late wave — not yet generated)* Troubleshooting methodology, diagnostic tools, root cause analysis. |

Early wave (1, 2, 3, 4, 8, 9) approved 2026-08-17 (v1.0, first generation). Two new cross-cutting
decisions locked during this batch: Git hosting/repository (ADR-181, GitHub —
`https://github.com/parimal-c-crest/lbm-erp.git`, GitHub Flow model). See
`project-docs/claude-docs/gap-analysis/review-log.md` for verdicts and
`project-docs/claude-docs/gap-analysis/decisions-log.md` for every cited decision.

## Late wave — not yet triggered

`5-implementation-workflow.md`, `6-testing-strategy.md`, `7-deployment-strategy.md`, and
`10-debugging-guide.md` reference a specific module's real structure and generate once the first
module completes its own JIT documentation cycle (`7-sprint-planning/1-sprint-planning.md` step 2a)
— not before. Several early-wave documents in this folder (`9-ci-cd.md` especially) forward-reference
these four rather than guessing their content ahead of time.
