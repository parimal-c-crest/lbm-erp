# CI/CD Pipeline

> **Purpose**
>
> This document defines the LBM ERP Rewrite's Continuous Integration (CI) and Continuous Delivery
> (CD) strategy, pipeline architecture, automation standards, quality gates, deployment workflows,
> and operational controls. It ensures every code change is automatically validated, tested,
> packaged, and deployed in a secure, repeatable, and reliable manner.

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| CI/CD Platform | GitHub Actions [ADR-181] |
| Repository | `https://github.com/parimal-c-crest/lbm-erp.git` |
| Artifact Repository | Not applicable — no container registry (no Docker,
`6-development/8-containerization.md`); deployment artifact is the built Node.js output, deployed
directly (§10) |
| Deployment Strategy | Continuous Delivery (automated up to a gated production approval, §15) |
| Version | 1.0 |
| Status | Draft |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |

---

# 1. Executive Summary

CI (this document's primary, fully-specifiable scope right now) runs on **GitHub Actions**
(ADR-181) against every pull request and every push to `main`
(`6-development/4-git-workflow.md` §13): install, lint, typecheck, build, unit/integration test —
no container-build stage, since this project explicitly doesn't use Docker
(`6-development/8-containerization.md`). CD (deployment automation to actual hosted environments)
depends on `6-development/7-deployment-strategy.md`, a **late-wave** document not yet generated
(triggered per-module once the first module completes its own JIT cycle, per that document's own
generation trigger) — this document specifies CD's *shape* (§7, §14, §15) consistent with what's
already locked (AWS hosting default, ADR-071; database-per-tenant, ADR-056) but defers exact
deployment-target/rollout mechanics to that later document rather than guessing them here.

- **Automation philosophy**: every quality gate that can run automatically does — no manually-run
  check gates a merge (`6-development/3-coding-standards.md` §18's tools are all CI-invoked, §11).
- **Quality gates**: lint, typecheck, unit/integration tests, build success — all merge-blocking
  (§11).
- **Build strategy**: pnpm workspace-aware build (backend + frontend), no image build (§9).
- **Deployment automation**: CI-triggered, environment-promotion detail deferred to
  `6-development/7-deployment-strategy.md` (§7, §14).
- **Rollback approach**: Git-level revert (`6-development/4-git-workflow.md` §16) plus
  deployment-level rollback, the latter deferred to `6-development/7-deployment-strategy.md` (§18).

---

# 2. Objectives

The CI/CD pipeline:

- Automates repetitive tasks — lint/typecheck/test/build run on every PR, never manually before
  merge.
- Detects defects early — CI runs on every push to a PR branch, not just at merge time.
- Improves deployment reliability — nothing reaches `main` without passing the same gates every
  other change did (`6-development/4-git-workflow.md` §13).
- Reduces manual intervention — the only manual step in CD is the production-approval gate (§15),
  everything before it is automated.
- Delivers software faster — small, frequently-merged PRs (`6-development/4-git-workflow.md` §20)
  supported by fast, parallelized CI (§9).
- Ensures consistent deployments — one pipeline definition, no per-developer manual deploy steps.
- Supports AI-assisted development — AI-generated code passes through the exact same pipeline as
  human-written code (§20, `6-development/4-git-workflow.md` §18).

---

# 3. CI/CD Principles

The pipeline is:

- Automated — GitHub Actions triggered on PR/push events, no manual invocation required.
- Repeatable — identical steps run for every PR, no special-cased "fast path."
- Reliable — deterministic (pinned Node.js/pnpm versions, `6-development/1-development-
  environment.md` §5, matching what CI runners install).
- Secure — secret scanning (§13), no credentials in workflow YAML (§16).
- Version-controlled — the pipeline definition itself lives in `.github/workflows/` in the
  repository, reviewed like any other code change.
- Observable — GitHub Actions' own run history/logs (§19); a dedicated pipeline-metrics dashboard
  is not confirmed for MVP scope `[Assumption: this document]`.
- Fail-fast — lint/typecheck (cheap, fast) run before the more expensive test/build steps (§5), so a
  trivial mistake fails in seconds, not minutes.
- Environment independent — the same pipeline logic runs regardless of target environment; only the
  deployment *target* (§15) varies, once `6-development/7-deployment-strategy.md` defines it.

---

# 4. Pipeline Overview

```text
Developer Push (PR branch or main)
        │
        ▼
GitHub Actions Trigger
        │
        ▼
Checkout + pnpm install (cached)
        │
        ▼
Lint + Typecheck (fail-fast, §3)
        │
        ▼
Unit + Integration Tests (Jest, ADR-015)
        │
        ▼
Build (backend + frontend)
        │
        ▼
[PR only: stop here — status reported to the PR, §11]
        │
        ▼ (main only, after merge)
Deploy to Staging (§7, §15 — mechanics deferred to `6-development/7-deployment-strategy.md`)
        │
        ▼
E2E / Smoke Tests (Playwright, ADR-027)
        │
        ▼
Manual Approval Gate (§15)
        │
        ▼
Deploy to Production
        │
        ▼
Post-deploy Health Validation
```

No **Security Scan** or **Package Artifact** stage distinct from what's described above — dependency
scanning is `pnpm audit` folded into the standard job (§13), and there is no container image to
package (`6-development/8-containerization.md`) — the "artifact" is simply the built `dist`/`.next`
output, deployed directly (§10).

---

# 5. Pipeline Stages

| Stage | Purpose |
|--------|---------|
| Checkout | Retrieve source code (GitHub Actions `actions/checkout`) |
| Install Dependencies | `pnpm install --frozen-lockfile`, cached across runs (§9) |
| Static Analysis | ESLint + `tsc --noEmit` (`6-development/3-coding-standards.md` §18) |
| Unit / Integration Testing | Jest, against a CI-provisioned test PostgreSQL instance (§12) |
| Dependency Scan | `pnpm audit` (§13) |
| Build | `pnpm run build` for both backend and frontend |
| Deploy (staging) | Automatic on merge to `main`, mechanics deferred to `6-development/7-deployment-strategy.md` |
| E2E / Smoke Validation | Playwright critical-flow suite (§12) against the staging deployment |
| Approval | Manual gate before production (§15) |
| Deploy (production) | Triggered after approval |
| Post-deploy Validation | Health-check endpoint verification (§14, endpoint itself specified where `6-development/8-containerization.md` §14 flagged it — `3-api/`) |

---

# 6. Continuous Integration

CI responsibilities, running on every PR push and every push to `main`:

- **Source checkout** — GitHub Actions `actions/checkout`.
- **Dependency restoration** — `pnpm install --frozen-lockfile` (never a non-frozen install in CI,
  to catch lockfile drift as a CI failure rather than a silent surprise).
- **Build process** — `pnpm run build` (backend + frontend), workspace-aware.
- **Static analysis** — ESLint + `tsc --noEmit` (§5).
- **Unit testing** — Jest, backend and frontend (ADR-015).
- **Artifact generation** — the build output itself (`backend/dist/`, `frontend/.next/`); not
  uploaded as a GitHub Actions artifact for PR runs (no need — a PR's build isn't deployed), but
  produced and retained for `main`-branch runs that feed into deployment (§7).
- **Build notifications** — GitHub's native PR status checks (§17) — no separate notification
  channel required for CI-level (as opposed to deployment-level, §17) events.

---

# 7. Continuous Delivery

CD process — **shape specified here, exact deployment-target mechanics deferred to
`6-development/7-deployment-strategy.md`** (late wave, triggered per `7-sprint-planning/
1-sprint-planning.md` step 2a once the first module completes its JIT cycle):

- **Environment promotion**: `main` → Staging (automatic on merge) → Production (after manual
  approval, §15) — a two-environment promotion path, consistent with this being a single-product,
  continuous-deployment-shaped project (`6-development/4-git-workflow.md` §1) rather than a
  multi-stage enterprise release pipeline.
- **Approval workflow**: a required manual approval step (GitHub Actions `environment` protection
  rule) gates the Staging → Production promotion (§15) — everything before that point is automatic.
- **Deployment automation**: exact deploy mechanism (target platform's deploy API/CLI, given AWS-
  default hosting per ADR-071) is a `6-development/7-deployment-strategy.md` decision — not
  guessed here.
- **Validation**: Playwright smoke tests against Staging before promotion is even offered (§5); a
  post-deploy health check against Production after promotion (§14).
- **Rollback**: `6-development/4-git-workflow.md` §16 (Git-level) plus a deployment-level rollback
  mechanism specified in `6-development/7-deployment-strategy.md` (§18).

---

# 8. Branch-Based Pipelines

| Branch | Pipeline |
|---------|----------|
| `feature/*`, `bugfix/*`, `hotfix/*`, `docs/*`, `refactor/*`, `chore/*` (any PR branch) | Full CI (§6) — lint, typecheck, test, build. No deployment. |
| `main` | Full CI (§6) + CD (§7) — deploy to Staging automatically, Production after approval. |

No `develop`/`release/*` branch pipelines — those branch types don't exist under this project's
GitHub Flow model (`6-development/4-git-workflow.md` §5).

---

# 9. Build Standards

- **Build commands**: `pnpm run build` at the workspace root (or scoped per app:
  `pnpm --filter backend run build`, `pnpm --filter frontend run build`).
- **Build environment**: GitHub-hosted runners (`ubuntu-latest`), Node.js version pinned to match
  `6-development/1-development-environment.md` §5's documented LTS floor exactly — CI and local
  development never drift on Node version.
- **Dependency caching**: pnpm store cached via GitHub Actions' `actions/cache` (keyed on
  `pnpm-lock.yaml` hash) — avoids a full re-download on every run.
- **Parallel builds**: backend and frontend build/test/lint jobs run in parallel matrix jobs where
  independent (lint/typecheck can run concurrently with test, since neither depends on the other's
  output) — build depends on both passing first.
- **Build timeout**: 15 minutes per job (a reasonable ceiling for this project's size; a job
  exceeding it signals a real problem — hung test, dependency-resolution issue — worth investigating
  rather than just extending the timeout) `[Assumption: this document]`.
- **Versioning strategy**: Git tags (Semantic Versioning, `6-development/4-git-workflow.md` §15),
  not a separate build-number scheme.

---

# 10. Artifact Management

- **Artifact format**: built Node.js application output (`backend/dist/`, `frontend/.next/`) — no
  archive/image format, since deployment is direct-to-host (§18 of
  `6-development/8-containerization.md`).
- **Naming/versioning**: tied to the Git commit SHA (for traceability between a deployed artifact
  and its exact source) plus the nearest Semantic Version tag where one exists.
- **Storage**: GitHub Actions build artifacts (short-retention, for the deploy step within the same
  workflow run) — not a long-term artifact store, since redeploying an old version means checking
  out that Git commit and rebuilding, not pulling a stored binary from months ago.
- **Retention policy**: GitHub Actions' default artifact retention (90 days, configurable) —
  sufficient given rebuild-from-source is always the fallback.
- **Promotion process**: the same build artifact that passed Staging validation is what's promoted
  to Production (§7) — never a separate "production build" rebuilt from possibly-different source,
  which would undermine what Staging validation was supposed to prove.

---

# 11. Quality Gates

Every pipeline run verifies (all merge-blocking on `main`, per
`6-development/4-git-workflow.md` §13):

- Build success.
- Linting (ESLint, `6-development/3-coding-standards.md` §18).
- Static analysis / type checking (`tsc --noEmit`).
- Unit tests (Jest).
- Integration tests (Jest, against a CI-provisioned test database, §12).
- Dependency/security scan (`pnpm audit`, §13).
- Code coverage: no specific numeric threshold locked by any SoT source — tracked and reported
  (e.g. via Jest's coverage output surfaced in the PR) but not merge-blocking below a specific
  percentage in MVP `[Assumption: this document]`, revisitable once
  `6-development/6-testing-strategy.md` (late wave) sets a concrete target.
- Documentation validation: not an automated CI check — documentation currency is enforced via PR
  review (`6-development/4-git-workflow.md` §9), not a scripted check in MVP scope
  `[Assumption: this document]`.

Pipeline stops on first failure (fail-fast, §3) — a later stage never runs against a build that
already failed an earlier gate.

---

# 12. Automated Testing

- **Unit Tests** — Jest (ADR-015), every CI run.
- **API Tests** — Postman collection (`3-api/10-postman-collection.json`, ADR-018) run against the
  built backend in CI, or folded into the integration-test suite — exact mechanism decided at
  implementation time `[Assumption: this document]`.
- **Integration Tests** — Jest, backend Controllers exercised against a real CI-provisioned test
  PostgreSQL database (a fresh database per run, migrated via Prisma, per
  `6-development/1-development-environment.md` §11's pattern) — every CI run.
- **UI Tests / Regression Tests** — Playwright (ADR-027) E2E suite, run against the Staging
  deployment (§7), not on every PR (too slow for the fast-feedback PR loop) — exact PR-vs-staging
  trigger split is a `6-development/6-testing-strategy.md` (late wave) decision, restated here only
  at the pipeline-stage level.
- **Smoke Tests** — a minimal Playwright subset (login, load Dashboard) run post-deploy against
  both Staging and Production (§4, §14) — fast confirmation the deployment actually works, distinct
  from the full regression suite.

---

# 13. Security Pipeline

- **Secret scanning**: GitHub's native secret-scanning feature (ADR-181, available on GitHub
  repositories) — repository-level, not a separate CI step, catches a secret before it's even fully
  pushed in supported cases.
- **Dependency scanning**: `pnpm audit`, run as a CI step (§5, §11) — merge-blocking on
  high/critical severity findings, informational on lower severity
  `[Assumption: this document]`.
- **Container scanning**: not applicable — no container images
  (`6-development/8-containerization.md`).
- **License validation**: not automated in MVP CI — covered by the manual evaluation guidance in
  `6-development/3-coding-standards.md` §14, not a scripted gate
  `[Assumption: this document]`.
- **Static security analysis**: covered by ESLint's security-relevant rules (§11) plus the
  parameterized-query/input-validation discipline enforced at the code-review level
  (`6-development/3-coding-standards.md` §12/§17) rather than a separate SAST tool in MVP scope
  `[Assumption: this document]`.

Security thresholds: `pnpm audit` high/critical findings block merge (above); a dedicated SAST tool
and its own threshold policy is deferred alongside the other tooling choices already flagged in
`4-ui/8-frontend-development-standards.md` §17/§18 as forward references to this category.

---

# 14. Deployment Automation

- **Deployment triggers**: automatic to Staging on merge to `main` (§7/§8); manual-approval-gated
  to Production (§15).
- **Environment promotion**: Staging → Production only, the same validated artifact (§10).
- **Deployment scripts**: exact scripts/mechanism deferred to
  `6-development/7-deployment-strategy.md` (late wave) — this document specifies that deployment
  automation exists and where it sits in the pipeline (§4), not its literal implementation.
- **Health validation**: a post-deploy health-check endpoint call (§ pointer already noted in
  `6-development/8-containerization.md` §14) confirms the newly deployed process is actually serving
  traffic before the pipeline reports success.
- **Rollback automation**: deferred to `6-development/7-deployment-strategy.md` §18-equivalent
  content, once that document exists — restated as a forward reference here, consistent with how
  every other genuinely downstream-owned item in this batch has been handled.

---

# 15. Environment Management

| Environment | Purpose | Deployment Rule |
|---|---|---|
| Development | Local, per-developer (`6-development/1-development-environment.md`) | Not part of the CI/CD pipeline — entirely local. |
| Staging | Pre-production validation | Automatic deploy on every merge to `main`. |
| Production | Live | Manual approval required after Staging validation passes (§7). |

No separate QA environment distinct from Staging — appropriate for this project's team size and
continuous-deployment shape (`6-development/4-git-workflow.md` §1); Staging serves both roles.

Approval process: GitHub Actions `environment` protection rule requiring a designated approver
(Technical Lead/Solution Architect, per this document's own Approval table) before the
Production deployment job runs.

Environment isolation: per ADR-056's database-per-tenant model, Staging and Production point at
entirely separate PostgreSQL databases (and separate Redis instances) — no shared-state risk
between the two.

---

# 16. Secrets Management

Secrets (JWT signing keys, database credentials, AWS credentials, third-party API keys —
`1-project/4-tech-stack.md` §15) are stored using **GitHub Actions Secrets** (repository or
environment-scoped, matching the Staging/Production split in §15) — never in workflow YAML, never
in source.

Never store:

- Passwords, API keys, tokens, certificates — in workflow files or logs.

Secret rotation: follows the same cadence noted in
`6-development/1-development-environment.md` §18 (operational, not fixed here). Access control:
GitHub environment-scoped secrets are only accessible to workflow runs targeting that environment
(Staging secrets never exposed to a PR-branch CI run, Production secrets never exposed outside the
gated deployment job). Audit logging: GitHub's own Actions run history and audit log
(organization-level feature) provide this — no separate audit-logging system introduced.

---

# 17. Notifications

Notify on:

- Build/test failure — GitHub's native PR status check + commit status, visible directly in the PR
  UI (no separate notification channel required for this — it's inherently visible where a
  developer is already looking).
- Deployment success/failure — GitHub Actions run status; a dedicated Slack/email notification
  channel for deployment events is not confirmed for MVP scope
  `[Assumption: this document]`, addable later without a pipeline redesign.
- Security scan (`pnpm audit`) failure — same PR status check mechanism as build/test failure.

---

# 18. Rollback Strategy

- **Rollback triggers**: a failed post-deploy health check (§14) or a manually identified production
  issue.
- **Automatic rollback**: not implemented in MVP scope — a failed health check blocks the pipeline
  from reporting success but doesn't yet auto-revert the deployment; this is a
  `6-development/7-deployment-strategy.md` decision to make once the actual deployment mechanism is
  chosen `[Assumption: this document]`.
- **Manual rollback**: redeploy the previous Git tag/commit through the same pipeline (§4) — since
  deployment always rebuilds from source (§10), a rollback is simply "deploy an older commit," not a
  separate mechanism.
- **Database rollback**: Prisma migrations are additive-forward by convention
  (`2-database/3-migration-strategy.md`, if that convention holds) — a full schema rollback
  procedure is a `6-development/7-deployment-strategy.md`/`2-database/3-migration-strategy.md`
  concern, not repeated here.
- **Validation after rollback**: the same post-deploy health check + smoke test (§12/§14) that
  gates a forward deployment also validates a rollback deployment — no separate rollback-specific
  validation path.

---

# 19. Monitoring & Metrics

Track (via GitHub Actions' own run history/insights, no separate pipeline-metrics dashboard
confirmed for MVP `[Assumption: this document]`):

- Build duration.
- Deployment duration.
- Success rate / failure rate — visible via Actions run history filtering.
- Recovery time — not automatically tracked in MVP; a manual note in the incident record
  (`claude-docs/incidents/`, per this project's own working-area structure) if a production issue
  occurs `[Assumption: this document]`.
- Pipeline utilization / test execution time — GitHub Actions' own per-job timing, visible in run
  logs.

A dedicated application-performance-monitoring/observability service is the same open item already
flagged in `4-ui/8-frontend-development-standards.md` §17/§18 — not re-decided here.

---

# 20. AI-Assisted CI/CD

Given this project's own stated heavy AI-assisted development
(`1-project/4-tech-stack.md` §9), when AI contributes code:

- Generated code follows `6-development/3-coding-standards.md` §19's AI-specific guidelines —
  verified structurally by the same pipeline everyone else's code goes through, not a special check.
- The complete validation pipeline (§4-§11) executes identically — no shortcut for AI-authored
  commits.
- Human approval is required before production deployment (§15) regardless of who/what authored the
  underlying code — the approval gate is about the *deployment*, not the *authorship*.
- Documentation updates are validated the same way as any change — via PR review
  (`6-development/4-git-workflow.md` §9/§18), since automated documentation-currency checking isn't
  in MVP CI scope (§11).
- Security scans (§13) must pass — no exemption.
- Builds with failed quality gates (§11) are rejected identically regardless of authorship.

---

# 21. Best Practices

- Keep pipelines fast — fail-fast ordering (§3, §5), parallel jobs (§9).
- Fail early — lint/typecheck before test/build (§4).
- Cache dependencies — pnpm store caching (§9).
- Parallelize builds — backend/frontend jobs run concurrently where independent (§9).
- Version every artifact — Git SHA + Semantic Version tag (§10).
- Automate deployments — Staging fully automatic, Production gated only at the approval step, not
  at every other stage (§7, §14, §15).
- Keep pipelines declarative — GitHub Actions YAML, version-controlled alongside the code it builds
  (§3).
- Monitor pipeline health — §19.
- Review pipeline performance regularly — an operational practice once the pipeline is live, not a
  one-time setup concern.

---

# 22. Assumptions

- No dedicated pipeline-metrics dashboard, SAST tool, code-coverage threshold, or deployment-
  notification channel is confirmed for MVP — each flagged individually above
  (§11, §13, §17, §19) `[Assumption: this document]`, all addable without a pipeline redesign.
- Documentation-currency is enforced via PR review, not an automated CI check, in MVP
  `[Assumption: this document]`.
- Automatic rollback is not implemented in MVP — manual redeploy-of-previous-commit is the rollback
  mechanism until `6-development/7-deployment-strategy.md` specifies otherwise
  `[Assumption: this document]`.
- Build timeout (15 min) is a reasonable starting ceiling, not a value sourced from any SoT document
  `[Assumption: this document]`.

---

# 23. Constraints

- All commits (via PR) trigger CI (§6, §8).
- Protected branches (`main`) require successful pipelines
  (`6-development/4-git-workflow.md` §13).
- Production deployment requires manual approval (§15).
- Dependency security scans must pass at high/critical severity (§13).
- Artifacts are versioned via Git SHA + Semantic Version tag (§10) — no unversioned deployment.

---

# 24. Related Documents

- `6-development/1-development-environment.md`
- `6-development/2-folder-structure.md`
- `6-development/3-coding-standards.md`
- `6-development/4-git-workflow.md`
- `6-development/8-containerization.md`
- `6-development/7-deployment-strategy.md` (late wave, deferred — the real deployment reference)
- `6-development/6-testing-strategy.md` (late wave, deferred)
- `1-project/4-tech-stack.md`
- `3-api/10-postman-collection.json`
- `decisions-log.md` (ADR-015, ADR-018, ADR-027, ADR-056, ADR-070, ADR-071, ADR-181)

---

# 25. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-17 | Claude Code (docs-kit generation) | Initial Draft |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| DevOps Engineer | | Pending | |
| Technical Lead | | Pending | |
| Solution Architect | | Pending | |

---

# AI Generation Notes

- Follows `6-development/4-git-workflow.md` (GitHub/GitHub Flow, ADR-181),
  `6-development/8-containerization.md` (no image-build stage), and
  `6-development/3-coding-standards.md` (the tools this pipeline invokes) exactly.
- Designs a fully automated CI pipeline (§4-§6) with clearly defined, merge-blocking quality gates
  (§11).
- Integrates build validation, testing, dependency scanning, and deployment shape (§7, §14) —
  exact deployment-target mechanics correctly deferred to `6-development/7-deployment-strategy.md`
  (late wave) rather than guessed, consistent with how this document handles every genuinely
  downstream-owned item.
- Pipeline behavior varies by branch (§8) and environment (§15) as specified.
- Uses GitHub Actions directly (not kept platform-agnostic), since the hosting platform is now
  confirmed (ADR-181) — matching the same choice already made in
  `6-development/4-git-workflow.md`.
