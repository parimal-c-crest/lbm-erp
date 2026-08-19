# Deployment Strategy

> **Purpose**
>
> This document defines the project's deployment strategy, release process, environment management,
> deployment architecture, rollback procedures, and operational readiness requirements. It ensures
> software is deployed consistently, securely, reliably, and with minimal downtime across all
> environments.

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| Deployment Model | CI/CD (GitHub Actions, ADR-181) — Staging automatic, Production manually gated [Source: `6-development/9-ci-cd.md` §7/§15] |
| Hosting Platform | Plain Node.js processes, no containers (`6-development/8-containerization.md`) |
| Cloud Provider | AWS, default and kept portable [ADR-071] |
| Version | 1.1 (late wave — second run, folding in Location alongside Users and UOM) |
| Status | Draft |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-18 |
| Last Updated | 2026-08-19 |

---

# 1. Executive Summary

Deployment targets **database-per-tenant PostgreSQL on AWS** (ADR-056/ADR-071), plain Node.js
processes with no container layer (`6-development/8-containerization.md`), fronted by GitHub
Actions CI/CD (`6-development/9-ci-cd.md`) that promotes the same built artifact from Staging to
Production behind a manual approval gate. This document specifies what was deliberately deferred at
the early-wave stage — `6-development/9-ci-cd.md` §7/§14 explicitly stated CD's *shape* while
deferring exact deployment-target mechanics here; `6-development/8-containerization.md` §4/§10 did
the same for runtime architecture — filling both in now that this is the first late-wave run.

- **Deployment philosophy**: automated up to a single manual approval gate before Production
  (`6-development/9-ci-cd.md` §7) — everything else runs unattended.
- **Automation strategy**: GitHub Actions (ADR-181), the same pipeline that builds and tests every
  PR also deploys `main` (§7).
- **Release methodology**: continuous delivery, GitHub Flow's "always-deployable `main`"
  (`6-development/4-git-workflow.md` §1) — no separate release-branch/release-candidate phase.
- **Environment management**: two environments beyond local development — Staging and Production
  (§5) — each an entirely separate set of tenant databases (ADR-056), no shared state.
- **Rollback approach**: Git-level revert plus a redeploy-of-previous-commit mechanism (§12) — this
  project always rebuilds from source, never redeploys a stored binary, so a rollback is simply
  "deploy an older commit" (§12, restated from `6-development/9-ci-cd.md` §18's own shape).
- **Location's own fold-in**: Location introduces no new deployment mechanism or environment — it
  follows the same standard pattern as Users and UOM. Its two genuinely deployment-relevant
  specifics — a scheduled BullMQ job (§13) and encrypted-at-rest integration credentials (§16) — are
  both already-locked, already-generalized project capabilities, not new infrastructure Location
  itself requires; noted below rather than omitted, per this document's own guardrail against
  silently skipping a module with minimal deployment impact.

---

# 2. Objectives

The deployment strategy should:

- Deliver software safely — every deployment passes the same CI gates as the PR that produced it
  (`6-development/9-ci-cd.md` §11); nothing reaches Production that skipped Staging validation.
- Minimize downtime — a rolling/process-restart deployment (§8) rather than a full-stop-then-start
  cutover, on hosting infrastructure that supports it (AWS, ADR-071).
- Reduce deployment risk — database-per-tenant isolation (ADR-056) means a single tenant's data
  issue never cascades to another tenant's database; per-tenant migration fanout (§9) runs the
  skeleton database first, catching a bad migration before it reaches any real tenant.
- Support rapid recovery — native AWS RDS backup/PITR (ADR-070) plus the pre-deploy code snapshot
  (ADR-065) together cover both the data and the code side of a rollback (§12/§17).
- Ensure repeatable deployments — one pipeline definition (`6-development/9-ci-cd.md`), no
  per-developer manual deploy steps, consistent with this project's current solo-developer-plus-AI-
  assistant staffing model needing the automation *more*, not less, since there's no second person to
  catch a manual-step mistake.
- Support continuous delivery — §1.

---

# 3. Deployment Principles

Deployments should be:

- Automated where practical — Staging deployment is fully automatic on merge to `main`
  (`6-development/9-ci-cd.md` §7/§8); Production requires the one manual approval step (§7).
- Repeatable — the exact same build artifact validated on Staging is what's promoted to Production
  (`6-development/9-ci-cd.md` §10), never a separately rebuilt "production build."
- Version controlled — Git tags (Semantic Versioning, `6-development/4-git-workflow.md` §15) plus
  the Git commit SHA the artifact was built from (`6-development/9-ci-cd.md` §10).
- Auditable — GitHub Actions' own run history/audit log (`6-development/9-ci-cd.md` §16), plus the
  pre-deploy backup action (ADR-065) recorded as a manual, logged step.
- Secure — §16.
- Reversible — §12.
- Monitored — §15.

---

# 4. Deployment Workflow

```text
Development (feature branch, 6-development/4-git-workflow.md)
      ↓
Code Review (6-development/3-coding-standards.md §17)
      ↓
Automated Tests (Jest + Playwright, 6-development/6-testing-strategy.md)
      ↓
Build (pnpm run build, backend + frontend, 6-development/9-ci-cd.md §9)
      ↓
Artifact Creation (backend/dist/, frontend/.next/ — no container image, §6)
      ↓
Deploy to Staging (automatic on merge to main, §7)
      ↓
Smoke Tests (Playwright, against Staging)
      ↓
Manual Approval Gate (§10)
      ↓
Pre-Deploy Backup (ADR-065 — git branch snapshot + physical code archive, §17)
      ↓
Deploy to Production (§8)
      ↓
Post-Deploy Health Validation (§13)
      ↓
Monitoring (§15)
      ↓
Release Complete
```

---

# 5. Deployment Environments

| Environment | Purpose |
|------------|---------|
| Development | Local, per-developer — entirely outside CI/CD, `6-development/1-development-environment.md` |
| Staging | Pre-production validation against the same AWS/PostgreSQL/Redis topology as Production, at smaller scale |
| Production | Live tenant traffic |

No separate QA environment distinct from Staging — appropriate for this project's team size and
continuous-deployment shape, restated from `6-development/9-ci-cd.md` §15 rather than re-decided
here.

Document, per environment:

- **Access control**: Staging and Production secrets are GitHub environment-scoped
  (`6-development/9-ci-cd.md` §16) — a PR-branch CI run never has access to either; Production's
  deployment job additionally requires the manual approval reviewer identity (§10).
- **Configuration**: environment variables per `6-development/1-development-environment.md` §9,
  environment-scoped GitHub Actions Secrets for anything sensitive (§16).
- **Database**: one PostgreSQL database per tenant (ADR-056), entirely separate sets for Staging vs.
  Production — a Staging tenant database is never a copy of a real Production tenant's data by
  default (that specific, deliberate exception is the live-to-testing clone, ADR-066, §9/§19 below).
- **Infrastructure**: AWS (ADR-071) — exact service selection (EC2 vs. a managed Node hosting
  service, RDS for PostgreSQL, ElastiCache or a comparable managed Redis) is an implementation-time
  choice within AWS's own service catalog, not narrowed further here beyond what ADR-071 already
  locks (AWS default, kept portable) `[Assumption: this document]`.
- **Deployment frequency**: Staging — every merge to `main` (continuous); Production — after manual
  approval, no fixed cadence/freeze period identified by any SoT source
  `[Assumption: this document]`.

---

# 6. Infrastructure Overview

Document, per the already-locked stack (`1-project/4-tech-stack.md`, `6-development/
8-containerization.md` §5):

- **Application servers**: plain Node.js processes — one running the NestJS backend, one running the
  Next.js frontend (no container, `6-development/8-containerization.md` §5).
- **Web servers**: Next.js's own production server (`pnpm run start`) or a reverse-proxy layer
  (e.g. Nginx or the hosting platform's own load balancer) in front of it — exact topology an
  implementation-time choice within AWS `[Assumption: this document]`.
- **Load balancers**: AWS's own (e.g. Application Load Balancer) if/when multiple Node process
  instances run per app — not confirmed as multi-instance in MVP scope, single-instance-per-app is
  the simpler starting assumption consistent with ADR-028's low-hundreds-of-concurrent-sessions scale
  target `[Assumption: this document]`.
- **Database servers**: PostgreSQL, one per tenant (ADR-056), on AWS RDS or equivalent managed
  service satisfying ADR-070's native-backup/PITR requirement.
- **Cache servers**: Redis (BullMQ queue + cache), managed (e.g. AWS ElastiCache) or self-hosted —
  exact choice an implementation-time decision within `1-project/4-tech-stack.md` §8's already-locked
  Redis+BullMQ stack.
- **Message queues**: BullMQ on top of the same Redis instance — no separate message-broker service.
- **Object storage**: AWS S3 (`1-project/4-tech-stack.md` §7) — runtime-generated documents
  auto-expire after 30 days via a native S3 lifecycle rule; module-uploaded documents never expire
  automatically (ADR-067).
- **CDN**: not confirmed as a distinct MVP-scope decision — Next.js's own static-asset optimization
  (`6-development/2-folder-structure.md` §9) covers asset delivery without a separately provisioned
  CDN layer in MVP `[Assumption: this document]`.

No architecture diagram is included here — this document's own text inventory above, plus
`1-project/4-tech-stack.md` §1/§4, is the current level of architectural detail confirmed by any SoT
source; a diagram is addable without changing this document's content once implementation confirms
exact AWS service topology.

---

# 7. Build Process

Restated from `6-development/9-ci-cd.md` §9/§10 (the authoritative build-process reference — not
duplicated in full here):

- Source checkout — `actions/checkout`.
- Dependency installation — `pnpm install --frozen-lockfile`.
- Build commands — `pnpm run build` (backend + frontend).
- Static analysis / unit testing — part of CI before build (`6-development/9-ci-cd.md` §5, fail-fast
  ordering).
- Artifact generation — `backend/dist/`, `frontend/.next/`, tied to the Git commit SHA plus nearest
  Semantic Version tag.
- Versioning — Git tags (`6-development/4-git-workflow.md` §15).

---

# 8. Release Strategy

**Continuous Delivery** — automated up to the Production approval gate (§10), matching this
project's GitHub-Flow-shaped, single-release-train model (`6-development/4-git-workflow.md` §1).

- Release approval — one manual GitHub Actions `environment` protection-rule approval before the
  Production deployment job runs (`6-development/9-ci-cd.md` §15), by the Technical Lead/Solution
  Architect per this document's own Approval table below.
- Release cadence — no fixed schedule; a change is released once it merges to `main`, passes
  Staging, and is approved — consistent with this project's own JIT, per-module development pace
  (`6-development/5-implementation-workflow.md`) rather than a batched sprint-release model
  `[Assumption: this document]`.
- Freeze periods — none identified by any SoT source; not applicable to this project's current
  single-tenant-of-development-effort stage (pre-MVP, no live customer traffic yet)
  `[Assumption: this document]`, revisit once real tenants are live.

---

# 9. Database Deployment

Per ADR-056 (database-per-tenant) and this project's own two-tier tenant model
(skeleton + per-tenant databases):

- **Migration strategy**: Prisma Migrate, applied via a **per-tenant migration-fanout** — the
  skeleton database migrates first (catching a bad migration before any real tenant sees it), then
  every tenant database in sequence (`6-development/1-development-environment.md` §11's own forward
  reference to this exact mechanism; already partially implemented at the platform-administration
  level, `backend/src/tenant/provisioning/` per `CLAUDE.md` "Where we are"). The fanout orchestration
  script itself lives at `scripts/database/` (`6-development/2-folder-structure.md` §11) — exact
  script mechanics (sequential vs. batched per-tenant application, failure-mid-fanout handling) remain
  an implementation-time detail not further specified by any SoT source
  `[Assumption: this document]`.
- **Schema updates**: additive-forward by convention — a destructive migration (column/table drop)
  requires an explicit, reviewed migration plan rather than the standard fanout alone; no formal
  `2-database/3-migration-strategy.md` document is confirmed to exist yet to cite for this convention
  beyond what's stated here `[Assumption: this document]`.
- **Data migrations**: run as part of the same Prisma-Migrate-driven fanout, not a separate mechanism.
- **Rollback procedures**: §12 (Rollback Strategy) below — a schema rollback is a genuinely harder
  case than a code rollback (a forward migration may have already transformed data); the safe default
  is a new forward migration that reverses the change, not a blind `prisma migrate reset` against a
  live tenant database.
- **Backup requirements**: delegated entirely to the hosting provider's native capability — AWS RDS
  automated backups/point-in-time recovery (ADR-070) — not a custom application-level backup system.
  This is an explicit requirement on whichever AWS RDS configuration is chosen at implementation
  time, not optional.

Ensure migrations are version-controlled — `prisma/schema.prisma` and its migration history are
committed to the repository (`6-development/2-folder-structure.md` §17).

---

# 10. Configuration Management

Document:

- Environment variables — `6-development/1-development-environment.md` §9's already-locked
  convention, applied per environment (Staging/Production each get their own values for the same
  variable names).
- Secret management — GitHub Actions Secrets, environment-scoped
  (`6-development/9-ci-cd.md` §16) — Staging secrets never exposed to a PR-branch run, Production
  secrets never exposed outside the gated deployment job.
- Feature flags — not confirmed as a project mechanism in any SoT source; not introduced here as a
  new capability `[Assumption: this document]`.
- Configuration files — `6-development/2-folder-structure.md` §10's already-locked list
  (`.env.example`, `tsconfig.json`, `prisma/schema.prisma`, etc.); none of these carry real secret
  values, per `6-development/1-development-environment.md` §18.
- Environment-specific overrides — Next.js's and NestJS's own standard environment-resolution
  conventions (`6-development/1-development-environment.md` §9), no custom layer introduced for
  deployment specifically.

Never store secrets in source control — restated from `6-development/4-git-workflow.md` §19/
`6-development/3-coding-standards.md` §15, not a new rule introduced here.

---

# 11. Deployment Automation

Document:

- CI/CD pipeline — `6-development/9-ci-cd.md` (this same batch) is the authoritative pipeline
  reference; this document adds only the deployment-target specifics that document deliberately
  deferred.
- Deployment scripts — the actual deploy mechanism (e.g. an AWS-native deploy action/CLI invocation,
  a process-manager restart command such as PM2's `pm2 reload`, or the specific managed-Node-hosting
  service's own deploy API) is an implementation-time choice within AWS's service catalog
  (ADR-071) — not narrowed to one specific AWS service by any SoT source
  `[Assumption: this document]`, revisit once a concrete AWS service is provisioned.
- Infrastructure as Code — not confirmed as adopted for MVP by any SoT source; if adopted, would be
  a `6-development/2-folder-structure.md` §11 `scripts/deployment/`-adjacent addition, not decided
  here `[Assumption: this document]`.
- Artifact repositories — none; the built artifact is deployed directly from the CI run that produced
  it (`6-development/9-ci-cd.md` §10), never pulled from a separate long-term store.
- Deployment approvals — §10 above.

---

# 12. Rollback Strategy

Define rollback procedures:

- **Rollback triggers**: a failed post-deploy health check (§13) or a manually identified production
  issue (`6-development/10-debugging-guide.md`, this same late wave, covers the diagnostic side).
- **Rollback steps**: redeploy the previous Git tag/commit through the same CI/CD pipeline
  (`6-development/9-ci-cd.md` §18) — since deployment always rebuilds from source, a rollback is
  "deploy an older commit," not a separate binary-restore mechanism. `git revert` on `main`
  (`6-development/4-git-workflow.md` §16) is the source-control half; the actual production rollback
  is the redeploy that follows.
- **Database rollback**: Prisma migrations are additive-forward by convention (§9) — a genuine schema
  rollback (undoing a destructive migration) is handled by a new forward migration that reverses the
  change, combined with AWS RDS point-in-time recovery (ADR-070) if data itself needs restoring to a
  pre-migration state. A full, formalized schema-rollback runbook is not yet written — flagged as an
  open item for this document's next fold-in rather than guessed here.
- **Configuration rollback**: environment-scoped GitHub Actions Secrets are versioned by GitHub
  itself (change history in repository/environment settings) — reverting a bad configuration change
  means updating the Secret value back, no separate configuration-rollback tooling.
- **Validation after rollback**: the same post-deploy health check + smoke test (§13/§14) that gates
  a forward deployment also validates a rollback deployment — no separate rollback-specific
  validation path, restated from `6-development/9-ci-cd.md` §18.

**Automatic rollback is not implemented in MVP** — a failed health check blocks the pipeline from
reporting success but doesn't yet auto-revert the deployment (`6-development/9-ci-cd.md` §18's own
identical `[Assumption: ...]`, restated here rather than re-decided).

**Maximum acceptable recovery time**: **RTO 4 business hours, RPO 15 minutes** (frequent/continuous
backup, not just a nightly snapshot) — a developer-approved default, not a figure any SoT source
states independently; ADR-028's 99.5%-uptime-during-business-hours target doesn't itself translate
into a specific RTO/RPO figure, so this value was set by developer judgment rather than derived
`[Assumption: developer-approved default, revisit once real usage patterns exist]`.

---

# 13. Health Checks

After deployment verify:

- Application startup — the Node process (backend and frontend) actually starts and stays up.
- Database connectivity — the backend's Prisma connection to the target tenant database(s) succeeds.
- API availability — a standard `GET /health` (or equivalent) endpoint on the NestJS backend
  responds successfully; this endpoint's exact shape is flagged in
  `6-development/8-containerization.md` §14 as owned by `3-api/1-api-design.md` or this document —
  not yet specified by either at the time of this late-wave run, carried forward as an open item.
- Authentication — a login attempt against the newly deployed backend succeeds (exercised by the
  post-deploy Playwright smoke test, §14).
- Background jobs — BullMQ workers (auto-clock-out safety net, QuickBooks sync, notification
  schedulers — all Users-module examples; **Location's own lost-sale/false-loss promotion cron**,
  `5-modules/location/8-api.md` §Queues, BR-019/BR-020 — a scheduled job, not API-triggered) are
  running and processing their queues.
- Scheduled tasks — the skeleton-hosted cron/job management panel's own scheduled jobs
  (ADR-059) are firing on their configured per-tenant schedule.
- External integrations — QuickBooks, CardConnect, AWS S3 connectivity confirmed reachable (not
  necessarily exercised end-to-end on every deploy, just reachability).

---

# 14. Smoke Testing

Minimum deployment validation should include (Playwright, per `6-development/9-ci-cd.md` §12):

- Login.
- Dashboard load.
- Core business workflow — for the modules built so far, this means Users' login/Time-Clock flow;
  as more modules ship, their own critical flow (per `4-ui/2-user-flows.md`) is added to this same
  smoke suite, not run as a separate per-module smoke check.
- API endpoints — the health-check endpoint (§13).
- Database connectivity — §13.
- Logging — confirm log output is actually flowing to wherever it's aggregated (§ pointer, §15).
- Monitoring — §15.

---

# 15. Monitoring & Alerting

Monitor:

- Availability — against the ADR-028 target (99.5% uptime during business hours).
- Error rates, response times — against ADR-028's < 500ms p95 target (bulk operations excluded, own
  async budget).
- CPU, memory, disk usage — standard infrastructure metrics at the AWS-instance level.
- Database health — AWS RDS's own native monitoring, consistent with ADR-070's delegation of
  backup/recovery to the same provider.
- Queue health — Redis/BullMQ queue depth and job-failure rate.

Configure alerts for critical failures — exact alerting tool/channel is the same open item already
flagged twice in the early wave (`4-ui/8-frontend-development-standards.md` §17/§18,
`6-development/9-ci-cd.md` §19) and not re-decided here — no dedicated application-performance-
monitoring/observability service is confirmed for MVP `[Assumption: this document, restated from the
early wave]`.

---

# 16. Security Requirements

Deployment should ensure:

- HTTPS enabled — for both the frontend and API surfaces, at the AWS load-balancer/edge level.
- Secure secrets management — §10, GitHub Actions environment-scoped Secrets.
- Access control — GitHub environment protection rules gate who can approve a Production deployment
  (§8/§10); AWS IAM least-privilege for whatever service account CI/CD deploys with.
- Least-privilege permissions — the Node process runs under a non-privileged OS user account at the
  hosting level (the direct equivalent of "non-root container" this project's no-Docker decision
  otherwise has no surface for, `6-development/8-containerization.md` §12).
- Encrypted communication — HTTPS/TLS end-to-end; PostgreSQL/Redis connections encrypted in transit
  where the managed AWS service supports it (RDS/ElastiCache in-transit encryption).
- Security scanning — `pnpm audit` at the CI level (`6-development/9-ci-cd.md` §13), no separate
  deployment-time scan beyond what already gates the merge.
- Dependency vulnerability checks — same as above, merge-blocking on high/critical severity.
- Encrypted-at-rest secrets, application-level — a category distinct from GitHub Actions Secrets
  (§10): **Location's Location Accounting Configuration** stores third-party payment-gateway/
  vendor-integration credentials (TecOrder/Fuse5Connect/CIPW/CIP-EP families, R6) that must be
  encrypted at rest in the tenant database itself, not merely protected by transport encryption —
  the same class of finding this project's whole security-driven rewrite exists to close ("plaintext
  integration credentials" was a confirmed legacy finding, `CLAUDE.md`). No deployment-pipeline
  change is required for this — it is an application-layer encryption requirement verified by
  Location's own `10-implementation-plan.md` Phase 2/8 and `11-testing.md` TC (Sensitive data
  exposure) — noted here because it is this document's own §16 concern once a module actually stores
  such credentials, which Location is the first module to do.

---

# 17. Backup & Disaster Recovery

Document:

- **Application-data backup**: delegated to AWS RDS's native automated backups/point-in-time
  recovery (ADR-070) — not a custom-built backup system. This is stated as a requirement on the AWS
  RDS configuration chosen at implementation time, not an assumption that it's automatically covered
  without deliberate setup.
- **Code backup (pre-deploy)**: a dedicated, separate mechanism from database backup — before any
  production deployment, a **Git branch snapshot/tag** of the production branch is taken, plus a
  **physical code archive** (e.g. to AWS S3) independent of Git, kept as a rolling retention of the
  **last 2** backups with older ones purged automatically (ADR-065). This runs as a manual,
  operator-triggered step from the skeleton control panel, not an automatic part of every CI run —
  the deliberate reason being an explicit, auditable pre-deploy checkpoint distinct from Git's own
  continuous history.
- **Document storage backup**: AWS S3's own durability guarantees cover both runtime-generated
  documents (30-day lifecycle expiration, ADR-067) and module-uploaded documents (never auto-expire,
  ADR-067) — no separate application-level backup layer on top of S3's own durability.
- **Recovery procedures**: for data — AWS RDS PITR (ADR-070); for code — redeploy from the
  Git-tag/physical-archive snapshot (ADR-065) taken immediately before the problematic deployment.
- **Disaster recovery plan**: no full, formalized DR runbook (e.g. cross-region failover) is
  confirmed by any SoT source for MVP — database-per-tenant (ADR-056) plus AWS RDS's native
  backup/PITR (ADR-070) is the current DR posture; a formal DR plan beyond "restore from AWS RDS
  backup, redeploy from the last pre-deploy code snapshot" is not yet written
  `[Assumption: this document]`, flagged as an open item for a future fold-in of this document once
  real tenant traffic makes a stronger DR requirement concrete.
- **Recovery Time Objective (RTO) / Recovery Point Objective (RPO)**: **RTO 4 business hours, RPO 15
  minutes** — same developer-approved default value stated in §12, not independently re-derived here.
  No SoT source states this figure on its own; it is a deliberate judgment call the developer
  explicitly approved this session `[Assumption: developer-approved default, revisit once real usage
  patterns exist]`.

---

# 18. Release Validation Checklist

Before release verify:

- Build successful (`6-development/9-ci-cd.md` §11).
- Tests passed (`6-development/6-testing-strategy.md`, this same late wave).
- Security scan completed (`pnpm audit`, §16).
- Database migration reviewed (§9).
- Documentation updated (`6-development/5-implementation-workflow.md` §11).
- Release approved (§10).

After deployment verify:

- Smoke tests passed (§14).
- Monitoring healthy (§15).
- No critical errors.
- Performance acceptable — against ADR-028's stated targets (§15).

---

# 19. Deployment Risks

| Risk | Mitigation |
|------|------------|
| Failed deployment | Rollback plan (§12) — redeploy previous commit |
| Database migration failure | Skeleton-first fanout (§9) catches a bad migration before any real tenant sees it; AWS RDS backup/PITR before any destructive migration (ADR-070) |
| Configuration errors | Environment-scoped Secrets (§10/§16), environment parity between Staging and Production (§5) |
| Performance degradation | Post-deployment monitoring (§15) against ADR-028's numeric targets |
| A production-only bug that doesn't reproduce locally | Live-to-testing tenant clone (ADR-066) — a full, unscrubbed copy of a real tenant's data, automatically sandboxed (no real emails/payments/QuickBooks calls), provisioned as its own addressable testing sub for repro debugging — the concrete mechanism `6-development/10-debugging-guide.md` (this same late wave) relies on for production-only issues |
| A tenant needs to be taken offline for maintenance/non-payment without affecting others | Per-tenant maintenance mode (ADR-061) / tenant lock (ADR-062), Super Admin bypass preserved, from the same skeleton control panel used for deployment-adjacent operations |

---

# 20. Best Practices

- Automate deployments — Staging fully automatic (§4/§7).
- Keep deployments repeatable — same artifact promoted, never rebuilt separately (§3).
- Version all deployment artifacts — Git SHA + Semantic Version tag (§7).
- Validate every deployment — health checks + smoke tests (§13/§14).
- Monitor continuously — §15.
- Test rollback procedures regularly — not yet a scheduled practice for this project (no live tenant
  traffic yet) — flagged for adoption once Production has real tenants, not deferred indefinitely
  `[Assumption: this document]`.
- Deploy small, incremental changes — GitHub Flow's short-lived-branch discipline
  (`6-development/4-git-workflow.md` §20) naturally produces this.
- Document every release — release notes are not yet a real deliverable pre-first-release
  (`6-development/5-implementation-workflow.md` §15) but become one once the project reaches its
  first tagged release beyond M1's v1.0.0.

---

# 21. Assumptions

- Exact AWS service selection within ADR-071's "AWS default, kept portable" decision (specific
  compute/hosting service for the Node processes, specific managed-Postgres/managed-Redis products)
  is an implementation-time choice, not narrowed further by any SoT source
  `[Assumption: this document]`.
- RTO/RPO (§12/§17) is set to a developer-approved default — **4 business hours / 15 minutes** — not
  derived from any SoT source; revisit once real usage patterns exist
  `[Assumption: developer-approved default, revisit once real usage patterns exist]`.
- No fixed release cadence/freeze period exists pre-first-Production-tenant (§8) — revisit once real
  tenants are live.
- No formalized disaster-recovery runbook exists beyond "restore from AWS RDS backup, redeploy from
  the pre-deploy code snapshot" (§17) — revisit once real tenant traffic makes a stronger requirement
  concrete.
- No CDN or dedicated APM/observability service is confirmed for MVP (§6/§15) — the same open item
  already flagged twice in the early wave, not re-decided here.
- Automatic rollback is not implemented in MVP (§12) — restated from `6-development/9-ci-cd.md` §18's
  own identical assumption.

---

# 22. Constraints

- Production deployments require approval (§10).
- Database backups (via AWS RDS, ADR-070) required before any migration that could be destructive
  (§9).
- All automated tests must pass before Staging deployment, let alone Production
  (`6-development/9-ci-cd.md` §11).
- Rollback procedures must be documented (§12) — done here at the level current SoT sources support;
  RTO/RPO now carries a developer-approved default (4 business hours / 15 minutes, §12/§17); a formal
  DR runbook remains open (§21).
- Deployment artifacts must be versioned (§7).
- No `tenant_id` shortcut across databases — every deployment operation (migration fanout, backup,
  rollback) respects database-per-tenant isolation (ADR-056) as a hard structural constraint, not a
  convention.

---

# 23. Related Documents

- `6-development/5-implementation-workflow.md` (this same late wave)
- `6-development/6-testing-strategy.md` (this same late wave)
- `6-development/10-debugging-guide.md` (this same late wave — the live-to-testing clone mechanism,
  ADR-066, is detailed there for diagnostic use)
- `6-development/9-ci-cd.md` (the authoritative CI pipeline reference; this document fills in only
  what that document deliberately deferred)
- `6-development/8-containerization.md` (the authoritative no-Docker reference)
- `6-development/1-development-environment.md`
- `1-project/4-tech-stack.md`
- `decisions-log.md` (ADR-056, ADR-057, ADR-059, ADR-060, ADR-061, ADR-062, ADR-065, ADR-066,
  ADR-067, ADR-070, ADR-071, ADR-028, ADR-181, ADR-152)
- `5-modules/location/8-api.md` §Queues (the lost-sale/false-loss promotion cron), `5-modules/
  location/7-permissions.md` §6 (R6 encrypted-credential requirement)

---

# 24. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-18 | Claude Code (docs-kit generation) | Initial Draft — first late-wave run, filling in what `6-development/9-ci-cd.md`/`8-containerization.md` deliberately deferred. |
| 1.1 | 2026-08-19 | Claude Code (docs-kit generation) | Second late-wave run — folded in Location: noted as introducing no new deployment mechanism (§1), added its scheduled BullMQ lost-sale/false-loss cron to the post-deploy health-check background-job list (§13), and its encrypted-at-rest integration-credential requirement (R6) to the security requirements section (§16) as the first module to actually store such credentials. |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| DevOps Engineer | | Pending | |
| Technical Lead | | Pending | |
| Solution Architect | | Pending | |

---

# AI Generation Notes

- Fills in exactly what `6-development/9-ci-cd.md` and `6-development/8-containerization.md`
  explicitly stated they were deferring to this document — no re-decision of anything those two
  documents already locked (environment promotion shape, no-Docker architecture, secrets model).
- Surfaces this project's own skeleton-control-panel-owned operational capabilities (pre-deploy
  backup ADR-065, maintenance mode ADR-061/062, live-to-testing clone ADR-066) as first-class
  deployment-strategy content, since they're real, already-decided platform capabilities directly
  relevant to release/rollback/DR even though they were decided outside the `6-development/`
  category originally.
- Two numeric targets a template author might reflexively invent (RTO/RPO, §12/§17) are explicitly
  left unset per this document's own generation guardrail — no SoT source states them, and ADR-028's
  uptime target doesn't translate into either figure automatically.
- Flags AWS service-selection granularity, DR-runbook formalization, and CDN/APM tooling as open
  items rather than guessing specifics ADR-071/ADR-028 don't themselves narrow.
- Location's own fold-in is deliberately light — per this document's own guardrail ("don't omit,
  note why" for a module with minimal deployment-specific content), Location's Executive Summary
  bullet (§1) states explicitly that it introduces no new deployment mechanism, then §13/§16 add its
  two genuinely relevant specifics (a scheduled BullMQ job, an encrypted-credential requirement)
  rather than inventing deployment content the module doesn't actually need.
