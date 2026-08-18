# UAT Sign-off — M1 (Environment Setup)

**Milestone**: M1 — Environment Setup (EPIC-001 Environment Setup, EPIC-002 Platform Administration)
**Confirmed by**: Developer (Parimal Chaudhari), AI-assisted verification per this project's current
staffing model (`6-development/4-git-workflow.md` §11's note — no second human reviewer available
yet; AI-assisted review/verification applies the same bar, not a lowered one).
**Date**: 2026-08-18
**Environment**: Local dev only (no staging/production environment provisioned yet — see RAID R-002).

---

## Scope

EPIC-001 (Environment Setup) has no end-user journey to walk — it's pure tooling/infra (repo init,
workspace, scaffolding, CI, env config). Its acceptance was mechanical: every setup step verified
working (T-012's full local dev loop check). Nothing further to UAT here.

EPIC-002 (Platform Administration / Skeleton Control Panel) is the milestone's only real user-facing
flow — walked below.

## Journeys walked (against local dev, real Postgres/Redis, not mocked)

1. **Tenant provisioning** — provisioned a real second local tenant (`wbc`, subdomain, real
   Postgres database `lbm_erp_tenant_wbc`, real bootstrap Super Admin row) through the actual
   control panel HTTP endpoint (`POST /skeleton/tenants`), not a direct service call. Confirmed via
   `GET /skeleton/tenants` listing it and a direct DB query confirming the bootstrap user. ✅

2. **Migration fanout** — triggered `POST /skeleton/tenants/migrate-fanout?type=testing` through the
   control panel endpoint; confirmed it applied real Prisma migrations to `wbc` and reported
   `status: ok`. ✅

3. **Cron/job management panel** — seeded a real job definition + per-tenant schedule, confirmed the
   list/master-toggle/per-tenant-toggle endpoints all work live against real data, confirmed the
   filterable run-history endpoint returns real seeded runs. ✅

4. **Control panel UI itself** (T-027) — all 3 screens (`/skeleton/tenants`, `/skeleton/tenants/migrate`,
   `/skeleton/jobs`) rendered and exercised live in a real browser against the real backend above,
   not just curl/HTML inspection.

## Gaps found and fixed during this verification (not glossed over)

- `GET /skeleton/tenants` was leaking `databaseUrl` (Postgres credentials in plaintext) in its
  response — fixed before this sign-off (excluded via Prisma `select`).
- CORS was never wired up (`app.enableCors()` missing) despite ADR-176 locking the policy — added,
  verified with a real cross-origin preflight + request.
- No way to issue a dev-auth token existed (real login is a future Users-module task) — added
  `issue-dev-token` script, used for every authenticated call above.

## Sign-off

All of EPIC-002's real functionality confirmed working end-to-end against live local infrastructure.
No open defects. **M1 approved for release**, understanding real deployment/production verification
(release prompt steps 5-9) is explicitly out of scope for this pass — see RAID R-002.
