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
| 5 | `5-implementation-workflow.md` | Step-by-step lifecycle for building a feature from approved requirements to done. |
| 6 | `6-testing-strategy.md` | Testing levels, quality objectives, responsibilities, and automation approach. |
| 7 | `7-deployment-strategy.md` | Release process, environment management, rollback procedures. |
| 8 | `8-containerization.md` | Documented as **Not Applicable** — this project explicitly does not use Docker (`1-project/4-tech-stack.md` §14). Every section retained with a pointer to its real non-container equivalent elsewhere in this docs-kit. |
| 9 | `9-ci-cd.md` | CI/CD pipeline architecture (GitHub Actions, ADR-181), automation, and quality gates. |
| 10 | `10-debugging-guide.md` | Troubleshooting methodology, diagnostic tools, root cause analysis — the live-to-testing tenant clone (ADR-066) documented here as this project's primary production-debugging mechanism. |

Early wave (1, 2, 3, 4, 8, 9) approved 2026-08-17 (v1.0, first generation). Two new cross-cutting
decisions locked during this batch: Git hosting/repository (ADR-181, GitHub —
`https://github.com/parimal-c-crest/lbm-erp.git`, GitHub Flow model).

Late wave (5, 6, 7, 10) approved 2026-08-18 (v1.0, first late-wave run, folding in both Users and
UOM — the two modules approved to date). Two developer-confirmed judgment calls locked during this
batch: `7-deployment-strategy.md`'s RTO/RPO default (4 business hours / 15 minutes, still flagged as
a developer-approved default rather than a sourced figure) and `10-debugging-guide.md`'s live-to-
testing clone retention policy (persists until manually deleted, no auto-expiry).

Late wave updated to v1.1 (2026-08-19, second late-wave run) — folded in **Location** (the third
module approved to date) without disturbing Users' or UOM's already-folded-in content:
`5-implementation-workflow.md` gained Location's build-guidance-sourced 9-phase sequencing (QoH-core
before security-hardening) and its partially-blocking Products/Kit-Component dependency;
`6-testing-strategy.md` gained Location's golden-output demand/reorder-point tests and its two named
cross-module chain tests (kit propagation, part-supersession open-order flagging);
`7-deployment-strategy.md` gained Location's scheduled BullMQ lost-sale cron and its encrypted-
at-rest integration-credential requirement (noted as otherwise introducing no new deployment
mechanism); `10-debugging-guide.md` gained a dedicated stock-discrepancy investigation checklist
(non-negative guard → audit trail → concurrent-edit lock → supersession invariant → kit computation).
See `project-docs/claude-docs/gap-analysis/review-log.md` for verdicts and
`project-docs/claude-docs/gap-analysis/decisions-log.md` for every cited decision (this round added
ADR-146–153, ADR-195–198).
