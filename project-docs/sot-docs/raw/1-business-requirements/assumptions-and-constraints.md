# Assumptions and Constraints — LBM ERP Rewrite

## Assumptions

**The development database snapshot is representative of production.** Every field catalog, row count,
and live-data finding in the blueprint work was gathered against a local development database
(`lbm-local-integer`), not production. We're assuming that snapshot's schema and general data shape are
representative of what's actually running — but this is explicitly an assumption, not a verified fact.
Several individual findings (most notably the SQL injection in `save_uom_group()`, and any finding
tagged "confirm before building" in a module's own risk register) call out production confirmation as
an unresolved, high-priority next step. Treat production parity as a working assumption per module, not
a blanket guarantee.

**The sixteen-module MVP boundary holds.** We're building against the 2026-08-15 scope decision as
settled until it's explicitly revisited, not treating it as provisional day to day.

**The legacy code we've read reflects what's actually deployed.** The blueprint work reads the code in
this repository directly; we're assuming there isn't a materially different, undocumented fork running
in production that this repository doesn't reflect.

**Documentation discipline is worth the overhead.** The whole approach rests on the belief that
extracting the legacy system's real behavior before building against it is worth the time it costs,
compared to building from a requirements-gathering exercise instead. Sixteen modules in, we still think
that's true — but it's an assumption the project is making, not a fact.

## Constraints

**Technology stack is decided: Next.js (frontend), Node.js/NestJS (backend), PostgreSQL (database),
no Docker.** This closes what was previously the single biggest open constraint on the rewrite. The
tech-agnostic specification layer was deliberately written to not assume a stack, so none of that work
needs to be redone now that one's picked. NestJS was chosen specifically over a lighter framework
(plain Express) because its enforced structure — modules, dependency injection, Guards,
ValidationPipes — is what actually prevents the legacy system's core failure mode from recurring:
inconsistent, convention-only security practice that let SQL injection scatter across every module
rather than being caught structurally. Postgres was chosen for its constraint support (CHECK
constraints, composite/partial unique constraints, row-level security), which is what makes the
normalized-schema proposals already written for all eighteen specified modules actually enforceable at
the database level instead of relying on application code to remember. No Docker is an explicit,
deliberate choice, not a gap — all three pieces run as plain processes.

All three sub-decisions within this stack are now resolved. Next.js runs in standard server mode (not
static export) as a plain Node process — static export would give up server-side data fetching and
auth middleware for no real benefit, and "no Docker" rules out containers, not a running Node process.
The ORM is Prisma, for its migration workflow and shared types with the NestJS backend; `CHECK`
constraints (QoH-can't-go-negative, GP%-divide-by-zero) are written as raw SQL inside Prisma migrations
since its schema DSL doesn't express them natively. Multi-tenancy is row-level security on a single
shared schema — every table carries a `tenant_id` column with an enforced Postgres RLS policy, and the
NestJS layer sets tenant context per request — closing the tenant-scoping gap UOM's own specification
flagged (its tables had no tenant column at all), chosen over schema-per-tenant or database-per-tenant
because it scales to many tenants without a migration fanning out across N schemas every time the
schema changes.

**No committed budget exists in any surviving project document.** This isn't a constraint we're
choosing to impose; it's an honest gap. Any resource planning done against this project right now is
happening without a documented budget ceiling.

**No committed timeline exists in any surviving project document**, for the same reason. Milestones in
the project charter are process-based (blueprint complete → specification complete → decisions
resolved → stack chosen → build starts), not date-based, because there's currently nothing solid to
anchor dates to.

**The legacy platform is unsupported.** vtiger 5.0.4, the base the current system is built on, is
end-of-life. This is a constraint on how long the legacy system can safely keep running in its current
form, not just a motivation for the rewrite — every month it keeps running is a month without a vendor
security-patch path.

**`project-docs/` was lost once already.** The original forward-looking documentation tree for this
project was lost in an incident on 2026-08-14 and never recreated; what survives (the blueprint and
tech-agnostic-spec folders, the module scope tracker) survived because it lives in the code repository
itself. Any new documentation, including this set, should be treated as living inside that same
resilience boundary — kept in the repo, not off to the side where it can be lost the same way again.

**Team size and composition aren't documented anywhere.** We don't know how many people are working on
the blueprint effort, how many would work on implementation, or what skills are already available
in-house versus need to be brought in. This document isn't going to guess.
