# Project Charter — LBM ERP Rewrite

## Purpose

This charter authorizes the continuation of the LBM ERP Rewrite effort: replacing the legacy,
heavily-customized vtiger 5.0.4-derived ERP system with a modern rewrite, built from a rigorously
extracted specification of what the current system actually does, rather than from assumptions about
what it's supposed to do.

## Objective

Replace the legacy system's highest-risk, highest-value modules first, using a two-stage documentation
process (legacy extraction, then tech-agnostic specification) that has already been proven across
sixteen modules, and extend that same process to the remaining in-scope modules before they're built.

## Sponsor and authority

Not formally named in any surviving project record — the original `project-docs/` tree that would have
recorded this was lost in an incident on 2026-08-14 and has not been recreated. This charter should be
updated with a named sponsor once one is confirmed; leaving it blank here rather than guessing.

## Scope (high level)

**In scope for the current build phase**: the sixteen-module MVP set confirmed on 2026-08-15 —
SalesOrder, Accounts, Users, Location, Products, Vendors, SearchLineItem, Settings, SalesHistory,
PurchaseOrder, PurchaseLineItem, PurchaseHistory, MPLPricePlan, and the three price-book tiers
(Pricebooklevel200/300/800) — plus two capabilities extracted from within that set during
specification work: Unit of Measure (UOM), pulled out of Products because it turned out to be shared,
uncontrolled functionality touching a dozen other modules; and Account Statement, pulled out of
Accounts because it's large and self-contained enough to deserve its own boundary.

**In scope for later phases, not yet started**: 78 further modules already identified as in-scope but
not yet blueprinted.

**Explicitly out of scope**: 42 modules identified as dead, vestigial, or otherwise not worth carrying
into the rewrite (the full list and the reasoning behind each exclusion lives in the module scope
tracker, `blueprint/module-blueprint-scope.md`).

Full detail on scope boundaries is in `1-business-requirements/scope.md`.

## Success criteria

- Every module built in the rewrite has a completed blueprint and tech-agnostic specification before
  implementation starts on it — no module gets built from assumption.
- Every confirmed SQL injection and plaintext-credential-storage finding from the blueprint phase is
  closed by construction in the new system, not merely patched.
- The sixteen-module MVP set (plus UOM and Account Statement) reaches a build-ready state: normalized
  schema proposed, business rules mapped to enforcement layers, open decisions resolved or explicitly
  escalated.

## Constraints

- **Technology stack**: Next.js (frontend), Node.js/NestJS (backend), PostgreSQL (database), all
  TypeScript on the app layers. No Docker — every piece runs as a plain process (static export or a
  Node process for the frontend, a Node process under PM2/systemd or a managed host for the backend, a
  managed or self-hosted Postgres instance for the database). Decided after the eighteen-module
  specification work was far enough along to inform the choice: NestJS's enforced structure (modules,
  DI, Guards, ValidationPipes) is what actually closes the legacy system's core failure mode —
  inconsistent, convention-only security practice — and Postgres's constraint support (CHECK
  constraints, composite uniques, row-level security) is what makes the normalized-schema proposals
  already written for every module actually enforceable. Fully resolved: Next.js runs in standard
  server mode (not static export) as a plain Node process under PM2/systemd or a managed host —
  static export would give up server-side data fetching and auth middleware for no benefit, and "no
  Docker" only rules out containers, not a running Node process. ORM is Prisma, chosen for migration
  DX and shared types with the NestJS backend; `CHECK` constraints (the QoH-can't-go-negative and
  GP%-divide-by-zero guards) go in as raw SQL inside Prisma migrations, since Prisma's schema DSL
  doesn't natively express them. Multi-tenancy is row-level security on a single shared schema — every
  table carries a `tenant_id` column with an enforced Postgres RLS policy, and NestJS sets the tenant
  context per request — directly closing the tenant-scoping gap UOM's own spec flagged (its tables had
  no tenant column at all), and chosen over schema-per-tenant or database-per-tenant because it scales
  to many tenants without a migration fanning out across N schemas on every change.
- **No committed budget or timeline** appear in any surviving project document. Both are open items,
  not settled facts this charter is glossing over.
- **The legacy platform (vtiger 5.0.4) is unsupported.** Any interim patching of the legacy system
  happens against an end-of-life base with no vendor path forward.

## Assumptions

- The development database snapshot used throughout the blueprint effort is representative of what's
  running in production — this hasn't been independently re-verified against a live production
  environment for every finding, and several risk items explicitly flag "production confirmation" as
  the single highest-priority next step before treating a finding as fully closed.
- The sixteen-module MVP boundary, confirmed 2026-08-15, holds until explicitly revisited.

## Key milestones (process-based, not date-based)

1. Legacy blueprint complete for a module (nine-pass extraction, reviewed).
2. Tech-agnostic specification consolidated from that blueprint (eleven-file spec, normalized schema
   proposed).
3. Open decisions from that module's build guidance resolved with the relevant product owner/SME.
4. Technology stack selected, informed by the accumulated specifications rather than decided in
   isolation — done: Next.js / Node.js+NestJS / PostgreSQL, no Docker.
5. Implementation begins.

No calendar dates are attached to these milestones in this charter, because none currently exist in
the project record to attach.

## Governance note

The loss of the original `project-docs/` tree on 2026-08-14 is itself a process lesson worth naming
here: the surviving documentation (the module scope tracker, the blueprint and tech-agnostic-spec
folders) proved resilient because it lives in the code repository itself, not in a separate,
un-backed-up tree. Whatever documentation discipline this charter establishes going forward should keep
that property.
