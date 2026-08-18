# Tech Stack — LBM ERP Rewrite

This is the single reference for the stack decision, consolidated out of the discussion that produced
it. `project-charter.md` and `assumptions-and-constraints.md` both reference this decision inline; this
document is the detailed version.

## Summary

| Layer | Choice |
|---|---|
| Frontend | Next.js (React, TypeScript), standard server mode |
| Backend | Node.js + NestJS (TypeScript) |
| Database | PostgreSQL |
| ORM | Prisma |
| Multi-tenancy | Row-level security, single shared schema |
| Background jobs | BullMQ (Redis-backed) |
| Containers | None — no Docker, by explicit choice |

## Why this stack, not another one

The tech-agnostic specification layer (`docs_from_blueprint/module/`) was deliberately written before
any stack decision, so this choice could be informed by what eighteen fully-specified modules actually
need, rather than made in a vacuum. Two things came out of that work that shaped every choice below:
every module blueprinted so far has at least one confirmed, live SQL injection (Settings alone has
roughly forty-seven), and every module's normalized-schema proposal assumes real database-level
constraints the legacy system never had. The stack had to close both, structurally, not by convention.

## Frontend: Next.js

React with TypeScript, running in standard Next.js server mode (not static export). There's no
SEO or anonymous-visitor argument for Next.js here — every screen in this system sits behind login, so
the SSR/SEO pitch Next.js is usually chosen for doesn't apply. It was picked anyway for its
routing/DX conventions over a plain Vite SPA, on the understanding that a Node server process is
required to run it (see "No Docker," below, for how that's deployed without containers).

Static export was considered and rejected — it would reduce Next.js to a plain SPA with none of its
server-side data-fetching or auth-middleware capability, at which point there'd be no reason to have
picked it over Vite in the first place.

Frontend module structure mirrors `docs_from_blueprint/module/<Name>/` 1:1, so the eventual buildout
across the remaining 78 in-scope modules is additive (new module folder) rather than a restructure.
Route-level code-splitting keeps the bundle scoped to whatever module a user is actually in, regardless
of how many modules eventually exist.

## Backend: Node.js + NestJS

Node.js is the runtime; NestJS is the framework on top of it, chosen deliberately over a lighter option
like plain Express. The reasoning is specific to this project's history, not a generic framework
preference: the legacy system's core failure mode was inconsistent, convention-only security practice —
some queries parameterized, some not, with no structural reason a new one would be written safely.
Express doesn't prevent that pattern from recurring; NestJS's enforced structure does:

- **Modules** map directly onto the module boundaries already established across the spec work — each
  of the eighteen (eventually 93+) specified modules becomes its own NestJS module.
- **Guards** are the single enforced place authorization happens, replacing the legacy's scattered
  `isPermitted()` checks — including closing gaps like AccountStatement's confirmed B2B
  permission-check bypass.
- **ValidationPipes** reject malformed input before it reaches business logic by default, not by
  convention — every module's numbered validation-rule catalog (`ACC-VAL-###`, `PROD-VAL-###`, etc.)
  has a natural home as DTO validation here.

Chosen over .NET or Java/Spring Boot specifically because the frontend is already TypeScript — one
language across the stack, shared types and validation schemas between frontend and backend, no team
split across two ecosystems for a project with no documented existing backend-team skill set to weigh
against it.

## Database: PostgreSQL

Every normalized-schema proposal already written (one per module, in each module's own
`02-entities-and-fields.md`) assumes constraint capability the legacy MySQL-based system never had:

- **`CHECK` constraints** — closes Location's confirmed missing negative-quantity-on-hand guard and
  MPLPricePlan's confirmed unguarded GP%-divide-by-zero.
- **Composite/partial unique constraints** — closes Vendors' confirmed line-code vendor-scoping bug and
  the picking-hierarchy duplicate-position gap found in UOM.
- **Row-level security** — the mechanism chosen for multi-tenancy (below), directly answering the
  tenant-scoping question UOM's own specification found unresolved in the legacy schema.

Not a default choice — it's the engine that makes the schema work already done for this rewrite
actually enforceable at the database level, instead of "enforced" by application code remembering to
check, the way the legacy system's convention-only relationships are today.

## ORM: Prisma

Chosen for its migration workflow and the type generation it shares cleanly with the NestJS backend —
a schema-first approach that maps directly onto the entity catalogs already written per module.

One caveat, stated plainly rather than glossed over: Prisma's schema DSL doesn't natively express
`CHECK` constraints. Those (the QoH and GP% guards above) are written as raw SQL inside Prisma
migrations, which Prisma supports natively as an escape hatch — not a blocker, just means those
specific constraints live in SQL rather than the schema file.

## Multi-tenancy: row-level security, single shared schema

Every table carries a `tenant_id` column, with a Postgres row-level-security policy enforcing that
every query is scoped to the current tenant. NestJS sets the tenant context per request (read off the
authenticated session, applied as a Postgres session variable RLS policies key off), so tenant scoping
is structural at the database layer, not something each module's own code has to remember to apply.

This directly closes a gap found during UOM's specification: its tables carried no tenant/company
column at all, which was flagged as an open question rather than assumed either way. RLS on a shared
schema was chosen over schema-per-tenant or database-per-tenant because it scales to a growing tenant
base without a migration having to fan out across N schemas or N databases every time the schema
changes — relevant given this rewrite is still only 18 of a probable 111 eventual modules in.

## Background jobs: BullMQ

Redis-backed job queue, replacing the legacy system's pile of standalone cron PHP scripts
(`BillingCycleCron.php`, `accountPastDueCron.php`, and similar one-off scripts found scattered across
several modules) with a single, structured job-scheduling mechanism integrated into the NestJS
application rather than living outside it as independent scripts.

## No Docker

An explicit, deliberate constraint, not a gap in the stack. Every piece runs as a plain process:

- **Frontend**: a Node process running the Next.js server (PM2/systemd on a VM, or a managed Node
  host).
- **Backend**: a Node process running the NestJS application, same deployment shape as the frontend.
- **Database**: a managed or self-hosted PostgreSQL instance.
- **Jobs**: Redis, managed or self-hosted, with the BullMQ workers running as part of (or alongside)
  the backend Node process.

"No Docker" rules out containers specifically — it doesn't require avoiding a running server process
for the frontend or backend, both of which need one regardless of stack choice.

## What this document doesn't cover

Cloud provider and hosting specifics, CI/CD tooling, and exact infrastructure sizing are all separate,
later decisions — this document is the application/data-layer stack only.
