# Project Summary

*Source: `sot-docs/raw/1-business-requirements/project-overview.md`, `scope.md`, `business-case.md`,
`project-charter.md`, `feasibility-study.md`, cross-checked against all 18 module specs under
`raw/2-module-specs/`.*

## Purpose

LBM ERP Rewrite replaces a ~20-year-old ERP built on top of vtiger CRM 5.0.4 (135 accumulated
custom modules) with a new system, driven primarily by security — not feature modernization. Every
module examined so far carries at least one confirmed, live SQL injection (Settings alone: ~47), several
carry plaintext credential storage (AWS keys, payment-gateway tokens), and at least one real data-loss
incident has already occurred in production, traced to a defect in the Users module's `deleteRole()`.
The platform itself (vtiger 5.0.4) is end-of-life and unsupported.

## Approach

Rather than gathering requirements from scratch, the project extracts the legacy system's actual
behavior module-by-module directly from live code and database (a 9-pass "blueprint" process per
module: files/functions, data model, business rules, status/lifecycle, calculations, outputs,
cross-module dependencies, then a re-verification pass), then restates that extraction in
tech-agnostic form as the new system's specification. *(Source: `project-overview.md`.)*

## Target users

*Source is largely silent on named personas — inferred from actor lists scattered across module specs,
not a single stated source.* Actors recurring across module specs: counter/sales staff, warehouse/
fulfillment staff, accounting/management, delivery/dispatch staff, purchasing staff, B2B external
customers (via a storefront), and system/integration processes (accounting sync, EDI, payment
gateways). No formal persona document exists in the SoT — **flagged for gap analysis**.

## MVP scope

Of the legacy system's 135 modules: 42 confirmed dead weight (ruled out), 93 genuinely in scope
long-term (**note**: `1-business-requirements/tech-stack.md` states this instead as "111 eventual
modules" — an unreconciled numeric conflict, see `sot-docs/index.md` Conflicts §2). The confirmed MVP
is 16 core modules plus 2 extracted capabilities (18 total, all fully blueprinted): SalesOrder,
Accounts, Users, Location, Products, Vendors, SearchLineItem, Settings, SalesHistory, PurchaseOrder,
PurchaseLineItem, PurchaseHistory, MPLPricePlan, Pricebooklevel200/300/800, plus UOM (shared
cross-module logic with no real legacy boundary) and Account Statement (large/self-contained enough
to warrant its own spec despite living inside legacy Accounts). *(Source: `scope.md`,
`project-overview.md`.)*

## Not yet decided (explicitly, not silently assumed)

- **Budget, timeline, named executive sponsor**: absent from every project record. *(Source:
  `feasibility-study.md`, `stakeholders.md`.)*
- **Hosting/cloud provider**: deferred until infra/ops ownership is assigned. *(Source:
  `3-tech-stack-decision/tech-stack.md`.)*
- **Visual design source**: left unchecked in `sot-docs/design/design-source.md` by developer choice,
  deferred to `4-design-creation.md`.
- **Multi-tenancy**: resolved as row-level security on a single shared schema, closing UOM's confirmed
  missing-tenant-column gap — but multi-tenancy itself was a confirmed open gap in the legacy system,
  not a settled prior assumption. *(Source: `feasibility-study.md`, `tech-stack.md`.)*

## Tech stack (decided)

Next.js/TypeScript frontend, NestJS/TypeScript backend, PostgreSQL + Prisma, REST API-first
(`/api/v1/...`, one public surface — frontend has no privileged internal API), JWT + hashed/scoped
API-key auth, Redis + BullMQ. Full rationale: `sot-docs/raw/3-tech-stack-decision/tech-stack.md`
(see `sot-docs/index.md` Conflicts §1 — this file and three others restate the same decision;
`3-tech-stack-decision/tech-stack.md` is the most complete and should be treated as authoritative).

## Cross-cutting pattern across all 18 modules

Every module's `permissions.md` independently confirms the same shape: `isPermitted()` checks exist
only on UI-rendering entry points (List/Detail views, gating button visibility), while the actual
write endpoints (Save/Delete/mass-update/ajax handlers) have little or no server-side authorization
check of their own. This is not a per-module bug but a systemic legacy pattern — the new system's
security architecture (NestJS Guards, enforced per the tech-stack decision) exists specifically to
close this class of drift structurally rather than relying on convention.
