# Containerization Strategy

> **Purpose**
>
> This document defines the project's containerization standards, Docker architecture, image
> management, container lifecycle, networking, storage, security, and best practices. It ensures
> applications run consistently across development, testing, staging, and production environments
> while simplifying deployment and improving scalability.

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| Container Platform | **Not Applicable — see §1** |
| Orchestration Platform | Not Applicable |
| Container Registry | Not Applicable |
| Version | 1.0 |
| Status | Draft |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |

---

# 1. Executive Summary — Not Applicable

**This project explicitly does not use Docker or any container platform, for local development or
production hosting.** This is a stated architectural decision, not an unaddressed gap:

> "the rest of this stack (plain Node processes, managed or self-hosted Postgres and Redis, no
> Docker) runs on any mainstream host, so this isn't a blocking dependency for the other rows"
> [Source: `sot-docs/raw/3-tech-stack-decision/tech-stack.md`, "Explicitly Deferred Decisions"]

Restated directly in the approved tech stack:

> "Docker | **Explicitly not used** — the rest of the stack... runs on any mainstream host without
> it" [Source: `1-project/4-tech-stack.md` §14]

**Reason**: portability. The stack (Node.js processes for both NestJS and Next.js, managed or
self-hosted PostgreSQL, managed or self-hosted Redis) deliberately avoids a container-runtime
dependency so hosting-provider choice stays open. Hosting itself has since resolved to AWS-default
(ADR-071), but the stack doesn't *require* AWS or any specific container-friendly platform — that
was the point of the decision when it was made, and it remains true now that a hosting provider is
chosen.

Every section below (§2-§20) that assumes a container platform is Not Applicable for the reason
stated here. Rather than delete the template's structure entirely (which would look like an
oversight rather than a decision), each section is retained with a brief pointer back to this
summary and, where relevant, to the equivalent non-containerized concern's actual home in another
document.

---

# 2. Objectives — Not Applicable

The objectives a containerization strategy would normally serve (environment consistency, simplified
deployment, reduced configuration drift) are met by other means in this project instead:

- **Environment consistency**: a pinned Node.js/pnpm/PostgreSQL/Redis version floor
  (`6-development/1-development-environment.md` §5), not container image pinning.
- **Simplified deployment**: plain Node process deployment, detailed in
  `6-development/7-deployment-strategy.md` (late wave, deferred).
- **Reduced configuration drift**: environment variables + `.env.example` templates
  (`6-development/1-development-environment.md` §9), same discipline a container's env-injection
  would provide, without the container layer itself.
- **CI/CD support**: GitHub Actions (`6-development/9-ci-cd.md`, this same batch) runs directly
  against Node.js runners — no image-build step in the pipeline.
- **Isolated development**: each developer's local Node/PostgreSQL/Redis install provides isolation
  at the process level; no container-based isolation is used or required.

---

# 3. Containerization Principles — Not Applicable

No containers exist in this project's architecture to apply immutability/statelessness/lightweight/
portability principles to. The closest equivalents: application code is stateless by design (session
state lives in JWT tokens and PostgreSQL, not in-process — `3-api/2-authentication.md`), and
deployment artifacts are versioned via Git tags (`6-development/4-git-workflow.md` §15), not image
tags.

---

# 4. Architecture Overview — Not Applicable

No container-based service architecture diagram applies. The actual runtime architecture (plain
Node processes + managed/self-hosted PostgreSQL + Redis, subdomain-routed per-tenant per ADR-056) is
documented in `1-project/4-tech-stack.md` §1/§4 and will be detailed further in
`6-development/7-deployment-strategy.md` (late wave).

---

# 5. Container Inventory — Not Applicable

No containers exist. The equivalent runtime processes are:

| Process | Purpose | Technology |
|-----------|---------|------------|
| Backend API process | REST API | NestJS (Node.js), run directly (`pnpm run start:prod` or equivalent) |
| Frontend process | Web UI | Next.js (Node.js), run directly (`pnpm run start` or equivalent) |
| PostgreSQL | Database | Managed or self-hosted, not containerized |
| Redis | Cache / BullMQ queue | Managed or self-hosted, not containerized |
| Worker | Background jobs (BullMQ) | Runs as part of, or alongside, the backend Node process — exact process-separation decision deferred to `6-development/7-deployment-strategy.md` (late wave) |

---

# 6. Docker Images — Not Applicable

No Docker images are built. Application versioning uses Git tags (Semantic Versioning,
`6-development/4-git-workflow.md` §15) against the deployed source, not image tags.

---

# 7. Dockerfile Standards — Not Applicable

No Dockerfiles exist in this repository.

---

# 8. Docker Compose Standards — Not Applicable

No Docker Compose files exist. Local development instead runs each service as a native process, per
`6-development/1-development-environment.md` §12 (`pnpm run start:dev`/`pnpm run dev` for backend/
frontend, locally installed PostgreSQL/Redis).

---

# 9. Networking — Not Applicable

No container networking exists. Service-to-service communication (backend ↔ PostgreSQL, backend ↔
Redis, frontend ↔ backend API) happens over standard network connections (localhost during local
development, per `6-development/1-development-environment.md` §9's connection-string convention;
internal/private networking at the hosting-provider level in production, detailed in
`6-development/7-deployment-strategy.md`, late wave).

---

# 10. Storage & Volumes — Not Applicable

No container volumes exist. Persistent storage:

- **Database data**: PostgreSQL's own on-disk storage, backed up via the hosting provider's native
  capability (AWS RDS automated backups/PITR, per `1-project/4-tech-stack.md` §4, ADR-070) — not a
  Docker volume backup strategy.
- **Uploaded files**: AWS S3 (`1-project/4-tech-stack.md` §7), inherently not container-local
  storage.
- **Logs**: application-level logging (`6-development/3-coding-standards.md` §11), destination
  (stdout/log-aggregation service) decided in `6-development/7-deployment-strategy.md` (late wave)
  — not a container log driver.
- **Cache**: Redis's own persistence configuration (if enabled), not a Docker volume.

---

# 11. Environment Configuration — Not Applicable (as a containerization concern)

Configuration already uses environment variables exclusively
(`6-development/1-development-environment.md` §9, `6-development/3-coding-standards.md` §15) — the
same principle a container's env-injection would enforce, achieved here directly at the process
level. Secrets are never hardcoded and never embedded in a build artifact, consistent with §12's
security guidance restated for a non-container context.

---

# 12. Security Standards — Not Applicable (as a containerization concern)

The container-specific hardening items this section would normally cover (non-root container user,
minimal base image, image vulnerability scanning, read-only container filesystem, Linux capability
limits, trusted registries) have no equivalent surface in this project — there is no container image
to harden. The underlying security concerns they exist to address are covered instead by:

- Running the Node.js process under a non-privileged OS user account at the hosting level (an
  operating-system-level equivalent to "non-root container," deferred to
  `6-development/7-deployment-strategy.md`, late wave).
- Dependency vulnerability scanning via `pnpm audit`
  (`6-development/3-coding-standards.md` §18) — the direct equivalent of image vulnerability
  scanning, applied to the actual dependency tree rather than a container layer.
- No secrets embedded anywhere in the deployed artifact (§11).

---

# 13. Resource Management — Not Applicable

No container CPU/memory/storage limits or restart policies exist. The hosting-provider-level
equivalent (instance sizing, process-manager restart policy, e.g. PM2 or the hosting platform's own
process supervision) is a `6-development/7-deployment-strategy.md` concern (late wave, deferred).

---

# 14. Health Checks — Not Applicable (as a containerization concern)

No container startup/readiness/liveness probes exist. The equivalent application-level health-check
endpoint (a standard `GET /health` or similar on the NestJS backend) is an API-layer concern —
tracked for `3-api/1-api-design.md` or `6-development/7-deployment-strategy.md` to specify, not this
document.

---

# 15. Logging — Not Applicable (as a containerization concern)

No container log driver/aggregation exists. Application logging conventions are set in
`6-development/3-coding-standards.md` §11; log destination/retention at the hosting-provider level is
a `6-development/7-deployment-strategy.md` concern (late wave).

---

# 16. Monitoring — Not Applicable (as a containerization concern)

No container-status/resource monitoring exists. Application/infrastructure monitoring tool choice is
explicitly flagged as an open item deferred to `6-development/` in
`4-ui/8-frontend-development-standards.md` §17 — the same open item, not re-decided here.

---

# 17. CI/CD Integration — Not Applicable

No image build/test/publish/signing pipeline exists. `6-development/9-ci-cd.md` (this same batch)
documents the actual CI/CD pipeline, which runs lint/typecheck/test/build directly against Node.js,
with no container-build stage.

---

# 18. Container Registry — Not Applicable

No container registry is used. Deployment artifacts are the built Node.js application output
(`backend/dist/`, `frontend/.next/`), deployed directly to the hosting environment per
`6-development/7-deployment-strategy.md` (late wave) — not pulled from a registry.

---

# 19. Backup & Recovery — Not Applicable (as a containerization concern)

No container volume backup exists. Database backup/disaster recovery is delegated to the hosting
provider's native capability (AWS RDS automated backups/PITR, ADR-070,
`1-project/4-tech-stack.md` §4) — already resolved independently of any container strategy.

---

# 20. Local Development — Not Applicable

No `docker compose up` workflow exists. The actual local development workflow (native Node/pnpm/
PostgreSQL/Redis processes) is fully documented in
`6-development/1-development-environment.md` §12-§13 — that document, not this one, is the real
local-development reference.

---

# 21. Troubleshooting

Not applicable — no container-specific troubleshooting exists. General local-environment
troubleshooting is covered in `6-development/1-development-environment.md` §19.

---

# 22. Best Practices — Not Applicable

The container best practices this section would normally list (small images, pinned versions,
multi-stage builds, image scanning, non-root, secrets outside images, health checks, cleanup,
separated dev/prod config) have their non-container equivalents already covered across
`6-development/1-development-environment.md`, `6-development/3-coding-standards.md`, and
`6-development/9-ci-cd.md` — cross-referenced throughout §2-§19 above rather than restated as a
separate list here.

---

# 23. Assumptions

- No future reconsideration of the no-Docker decision is anticipated within this project's current
  scope — the decision is a stated architectural choice (§1), not a placeholder awaiting a later
  call `[Assumption: this document]`.
- If a future need arose (e.g. a hosting environment genuinely requiring containers), that would be
  a `1-project/4-tech-stack.md` amendment via a new ADR, not a unilateral change made in this
  document `[Assumption: this document]`.

---

# 24. Constraints

- **Docker is explicitly not used** — this is the governing constraint for this entire document,
  restated from `1-project/4-tech-stack.md` §14 and `sot-docs/raw/3-tech-stack-decision/
  tech-stack.md`.
- Deployment must work as native Node.js processes on any mainstream host (§1) — this constraint is
  exactly what made the no-Docker decision viable in the first place.

---

# 25. Related Documents

- `1-project/4-tech-stack.md` (§14, the authoritative no-Docker decision)
- `sot-docs/raw/3-tech-stack-decision/tech-stack.md` ("Explicitly Deferred Decisions")
- `6-development/1-development-environment.md` (the real local-development reference, §10 of that
  document restates this exclusion)
- `6-development/7-deployment-strategy.md` (late wave, deferred — the real deployment reference)
- `6-development/9-ci-cd.md` (this same batch — the real CI/CD reference, no image-build stage)
- `decisions-log.md` (ADR-070, ADR-071)

---

# 26. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-17 | Claude Code (docs-kit generation) | Initial Draft — documented as Not Applicable per the project's explicit no-Docker decision. |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| DevOps Engineer | | Pending | |
| Solution Architect | | Pending | |
| Technical Lead | | Pending | |

---

# AI Generation Notes

- Per the review-batch guardrail ("if something genuinely doesn't apply, still create the file with
  an explicit 'Not Applicable — reason' note rather than omitting it"), this entire document is
  marked Not Applicable rather than skipped, with the governing source cited in §1.
- Every section retained (§2-§22) rather than deleted, each pointing to where its underlying concern
  is actually addressed elsewhere in this docs-kit (mostly `6-development/1-development-
  environment.md`, `6-development/7-deployment-strategy.md`, and `6-development/9-ci-cd.md`).
- No container-first recommendation is made, deliberately overriding this template's own default
  AI Generation Notes instruction to "recommend a container-first approach using Docker as the
  default platform" — that default is explicitly superseded by this project's own locked
  architectural decision (§1), which takes precedence over the template's generic guidance.
