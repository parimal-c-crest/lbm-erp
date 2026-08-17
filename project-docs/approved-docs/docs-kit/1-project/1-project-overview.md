# Project Overview

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| Version | 1.0 |
| Status | Approved |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-16 |
| Last Updated | 2026-08-17 |
| Approved By | Claude Code review (`4-document-review/1-document-review.md`, 2026-08-17) — Business Owner/PM/Tech Lead unassigned per ADR-021 |

---

# 1. Executive Summary

## Purpose

LBM ERP Rewrite replaces LBM's legacy ERP system — built on top of end-of-life vtiger CRM 5.0.4 with
~20 years of accumulated custom business logic across 135 modules — with a new system built on a
modern, security-first stack. [Source: `sot-docs/raw/1-business-requirements/project-overview.md`]

## Background

The legacy platform is unsupported and end-of-life. A systematic module-by-module documentation
effort found that every module examined so far has at least one confirmed, live SQL injection
(Settings alone: ~47 sites, spread across ~22 files), several modules store integration credentials
in plaintext (AWS keys, payment-gateway tokens), and a real production data-loss incident has already
occurred, traced to a defect in the Users module's role-deletion logic. [Source: `business-case.md`,
`project-overview.md`]

## Expected Outcome

A new ERP, covering the same core business capability (sales, purchasing, pricing, inventory,
vendors, accounts receivable), built so that the vulnerability classes found throughout the legacy
system (unparameterized SQL, UI-only permission gating, client-trusted financial totals) are closed
by construction — structurally prevented by the chosen framework and architecture, not dependent on
each developer remembering to defend against them. [Source: `business-case.md`,
`3-tech-stack-decision/tech-stack.md`]

---

# 2. Business Objectives

- Eliminate the systemic security exposure of the legacy platform (live SQL injection in every
  audited module, plaintext credential storage). [Source: `business-case.md`]
- Replace an end-of-life, unsupported platform (vtiger CRM 5.0.4) before it becomes an unmanageable
  operational risk. [Source: `project-overview.md`]
- Prevent recurrence of the class of defect that already caused a real production data-loss incident.
  [Source: `business-case.md`]
- No numeric business-value target (revenue, cost, efficiency) is set. Success is measured by the
  security/delivery objectives above and the standard delivery criteria in ADR-022 — "secure and
  working" is the bar. [Source: `decisions-log.md` ADR-171]

---

# 3. Project Objectives

- Extract and document the legacy system's actual behavior module-by-module before rebuilding it,
  rather than guessing at requirements. [Source: `project-overview.md`]
- Build the new system so that no operation can accept a financial total as direct client input —
  every total is always server-recomputed. [Source: `SalesOrder/entities-and-fields.md` R3,
  generalized as a project-wide principle]
- Build the new system so that every write endpoint is gated by a server-side authorization check
  (NestJS Guards), closing the legacy pattern of UI-only permission gating found in all 18 blueprinted
  modules. [Source: `decisions-log.md` ADR-006]
- Expose one public REST API surface (`/api/v1/...`) that the frontend, third-party integrations, and
  internal system-to-system calls all use identically — no privileged internal-only API.
  [Source: `3-tech-stack-decision/tech-stack.md`]
- Isolate every tenant physically — one dedicated PostgreSQL database per tenant, matching how the
  legacy system already runs it — rather than the row-level-security-on-shared-schema approach
  originally locked and later superseded. [Source: `decisions-log.md` ADR-056, supersedes ADR-004]

---

# 4. Business Problem

**Existing process**: LBM's operations run on a vtiger-5.0.4-derived system with 135 accumulated
custom modules, no consistent security or data-access standard, and business logic that grew
organically over roughly two decades. [Source: `project-overview.md`]

**Pain points**:
- Every module examined has at least one confirmed, live SQL injection.
- Settings module alone: ~47 confirmed SQL injection sites, plus plaintext integration credentials.
- Permission enforcement exists only at the UI-rendering layer in every module examined — the actual
  write endpoints have little or no server-side authorization check. [Source: every module's
  `permissions.md`, consolidated in `business-rules-summary.md`]
- Financial totals (e.g. SalesOrder's finalize total) are written verbatim from client-submitted
  values with no server-side recomputation or cross-check. [Source: `SalesOrder/calculations.md`]

**Limitations**: The underlying platform (vtiger CRM 5.0.4) is end-of-life and unsupported.
[Source: `project-overview.md`]

**Risks**: A real production data-loss incident has already occurred (Users module,
`deleteRole()`). [Source: `business-case.md`]

---

# 5. Proposed Solution

**Overall approach**: Extract the legacy system's actual behavior module-by-module (a 9-pass
"blueprint" process per module — files/functions, data model, business rules, status/lifecycle,
calculations, outputs, cross-module dependencies, re-verification), restate it tech-agnostically, then
rebuild on a modern stack designed specifically to close the legacy system's confirmed vulnerability
classes structurally. [Source: `project-overview.md`, `decisions-log.md`]

**Main capabilities**: Sales order capture and fulfillment, purchasing and vendor management,
multi-tier pricing, inventory/location tracking, accounts receivable and statement generation, unit-of
-measure conversion, user identity/RBAC — the same core business capability as the legacy system's
first 18 blueprinted modules. [Source: `module-list.md`]

**Technology direction (high level)**: Next.js/TypeScript frontend, NestJS/TypeScript backend,
PostgreSQL, REST API-first. Full detail in `4-tech-stack.md`. [Source:
`3-tech-stack-decision/tech-stack.md`]

---

# 6. Target Users

*(Uses the starter role catalog locked in `gap-analysis/decisions-log.md` ADR-002, not this
template's generic Administrator/Manager/Staff/Customer/Guest example — the legacy system has no
formal role catalog, so this list was built from actor descriptions across all 18 module specs.)*

| User Type | Description |
|-----------|-------------|
| Counter/Sales Staff | Order entry, quoting, customer-facing transactions |
| Warehouse/Fulfillment Staff | Picking, receiving, stock transfers, delivery prep |
| Accounting/Management | Credit, statements, deposits/ROA, cost/margin visibility, financial reporting |
| Purchasing Staff | Vendor management, PO creation/reconciliation, EDI |
| Admin | Users/role management, Settings, pricing-tier configuration, system configuration |
| B2B Customer | External storefront access |

---

# 7. Stakeholders

| Stakeholder | Role | Responsibility |
|-------------|------|----------------|
| *(No named executive sponsor or IT/infra stakeholder recorded in any project document)* | — | [Source: `sot-docs/raw/1-business-requirements/stakeholders.md` — explicitly flags this absence] |
| Per-module subject-matter experts | SME | Confirm/sign-off on ambiguous field/rule meanings surfaced during module blueprinting |
| Documentation/blueprint team | Author | Produced the 9-pass module extraction this project is built from |

Named Business Owner / Project Manager / Technical Lead: left unassigned, by decision. [Source:
`decisions-log.md` ADR-021]

---

# 8. Project Scope

## In Scope

The confirmed MVP scope, blueprinted from 18 legacy modules but built as **15 target modules**:
SalesOrder, Accounts, Users, Location, Products, Vendors, SearchLineItem, Settings, SalesHistory,
PurchaseOrder, PurchaseLineItem, PurchaseHistory, Pricing (unified — replaces the legacy system's
four separate pricing mechanisms, MPLPricePlan and Pricebooklevel200/300/800, per
`decisions-log.md` ADR-029), UOM, AccountStatement. [Source: `scope.md`, `module-list.md`]

## Out of Scope

- **Legacy-system remediation** — this project covers the new-system rewrite only; legacy security
  fixes are explicitly out of scope. [Source: `decisions-log.md` ADR-001]
- **Modules beyond the MVP-18** — deferred, to be blueprinted incrementally; no fixed total count is
  treated as authoritative (legacy figures conflict and are self-flagged as sometimes wrong).
  [Source: `decisions-log.md` ADR-003]
- **StoreTransfer** — confirmed future addition, not missed scope. The legacy popup entry point
  (`StoreTransferPopup.php`) is a genuinely empty stub; the real store-transfer-creation flow feeds a
  full separate legacy module deferred past MVP 1. PurchaseOrder's and SalesOrder's MVP 1 scope omit
  store-transfer creation. [Source: `decisions-log.md` ADR-144]
- **ProductTracking** — blueprinted and fully design-reviewed (ADR-166–170) but not yet added to the
  formal MVP module count/build sequence; pending developer decision on where it slots in.
- **Reporting beyond legacy's existing reports** — MVP 1 reproduces legacy's report set only; any new
  reporting capability is deferred to a future, dedicated Reporting module. [Source: `decisions-log.md`
  ADR-173]
- **Visual design system** — deferred to `1-discovery/4-design-creation.md`; developer chose not to
  decide now. [Source: `sot-docs/design/design-source.md`]

---

# 9. High-Level Features

| Feature | Description |
|---------|-------------|
| Order capture & fulfillment | Sales orders, quotes, service contracts, backorder/buyout/transfer resolution [Source: `SalesOrder/module-overview.md`] |
| Purchasing & receiving | Purchase orders, receiving, reconciliation, return-goods-notification [Source: `PurchaseOrder/module-overview.md`] |
| Unified pricing | One engine — named plans, price sheets, promotions/coupons, single precedence model [Source: `decisions-log.md` ADR-029] |
| Inventory & location tracking | Branch/location quantity-on-hand, unit-of-measure conversion [Source: `Location/`, `UOM/module-overview.md`] |
| Accounts receivable & statements | Billing/credit, statement generation/delivery [Source: `Accounts/`, `AccountStatement/module-overview.md`] |
| Identity & access | Authentication, role-based access control [Source: `Users/module-overview.md`, `decisions-log.md` ADR-002/006] |
| Vendor management | Supplier identity, freight config, line-code taxonomy [Source: `Vendors/module-overview.md`] |

---

# 10. Assumptions

- Every module beyond the MVP-18 will go through the same 9-pass blueprint extraction process before
  its documentation is generated. [Source: gap-analysis-report.md, "Unstated assumptions"]
- UOM's and AccountStatement's lower documentation rigor (self-flagged: session-found /
  filtered-subset) does not block generating their docs-kit documents, but may need an extra SME
  confirmation pass at their JIT field-extraction stage.
  [Source: `gap-analysis-report.md`]

---

# 11. Constraints

- **Budget**: not recorded in any project document. [Source: `feasibility-study.md`]
- **Timeline**: not recorded in any project document.
- **Technology**: locked — see `4-tech-stack.md`. [Source: `decisions-log.md`]
- **Infrastructure/hosting**: AWS is the default provider, kept portable (not a hard vendor-lock).
  [Source: `decisions-log.md` ADR-071]
- **Multi-tenancy**: physical database-per-tenant, one PostgreSQL database per tenant, subdomain-routed
  from a shared codebase; migration fanout to every tenant database is a hard requirement on every
  deploy. [Source: `decisions-log.md` ADR-056]
- **Compliance**: PCI-DSS applies via tokenized vault — application never touches raw card numbers,
  tokens only. [Source: `decisions-log.md` ADR-007]

---

# 12. Dependencies

| Dependency | Description |
|------------|-------------|
| CardConnect (payment gateway, retained) | Tokenized card vault, kept from legacy [Source: `decisions-log.md` ADR-008] |
| QuickBooks | Accounting sync — rebuilt working properly, scope expanded beyond legacy [Source: `decisions-log.md` ADR-009, ADR-023 — exact expanded entity list still open, resolved per-module at JIT time] |
| EDI networks | Purchasing/vendor integration [Source: `PurchaseOrder/integrations.md`] |
| EliteExtra (delivery-dispatch) | Retained from legacy [Source: `decisions-log.md` ADR-010] |
| AWS S3 (file storage) | Documents/PDFs/images [Source: `decisions-log.md` ADR-011] |
| Hosting/cloud infrastructure | AWS (default, portable) [Source: `decisions-log.md` ADR-071] |
| `skeleton.omnna-lbm.live` (schema-template database) | New-tenant provisioning source and migration-registry member; carries default/seed data cloned into every new tenant [Source: `decisions-log.md` ADR-056] |

---

# 13. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Legacy system remains live and exploitable throughout the rewrite (SQLi, plaintext credentials) since remediation is out of scope | Continued exposure to data breach/loss during the build | Business decision, not a rewrite-scope mitigation — see `decisions-log.md` ADR-001 |
| No budget/timeline/named sponsor recorded | Project pacing and prioritization cannot be planned from the SoT alone | Developer supplies sprint capacity directly at `7-sprint-planning/1-sprint-planning.md` |
| *(superseded)* Legacy cross-tier pricing precedence — now moot | The unified Pricing module (ADR-029) designs one fresh precedence model instead of reconciling 4 legacy ones | Resolved by architecture decision, not by answering the legacy question |
| UOM/AccountStatement lower-rigor blueprint source | Risk of an incomplete field/rule catalog for those 2 modules | Extra SME confirmation pass at their JIT `0-field-extraction.md` stage |
| Database-per-tenant migration fanout has no designed orchestration mechanism yet | A bad migration could reach every tenant database before being caught | Recommended mechanism (Prisma Migrate fanout loop, staged by tenant type) captured but not yet built into `6-development/`; resolve before that category generates. [Source: `decisions-log.md` ADR-056] |
| Cross-tenant reporting/analytics becomes materially harder once databases are physically separate | No single query can span tenants | Accepted tradeoff of the database-per-tenant decision, not a defect to fix [Source: `decisions-log.md` ADR-056] |

---

# 14. Success Criteria

- Every closed-by-construction requirement stated in this project's SoT is structurally impossible to
  reproduce in the new system (no direct-input totals, no raw SQL interpolation, no UI-only permission
  gating). [Source: `decisions-log.md`, module `build-guidance.md` files]
- Each milestone ships on its own plan schedule; zero Critical/High-severity defects at release;
  user-acceptance (real-browser click-through) confirmed per module before that module's epic is
  marked Complete. [Source: `decisions-log.md` ADR-022] No numeric business targets (revenue, cost,
  adoption) apply — confirmed, not merely unsupplied. [Source: `decisions-log.md` ADR-171]

---

# 15. Project Deliverables

- Business/technical documentation (`approved-docs/docs-kit/`)
- Source code (Next.js frontend, NestJS backend)
- REST API (`/api/v1/...`, OpenAPI/Swagger docs)
- PostgreSQL database schema (Prisma)
- Test suites (per module, rule-ID-traceable per each module's own `build-guidance.md`)
- Deployment scripts / infra-as-code, targeting AWS (ADR-071) — in scope as a real project deliverable.
  [Source: `decisions-log.md` ADR-172]
- End-user manuals, per module, once that module's UI is built and confirmed. [Source: `decisions-log.md`
  ADR-172]

---

# 16. References

- `sot-docs/index.md` and all linked raw SoT documents
- `claude-docs/analysis/project-summary.md`, `module-list.md`, `business-rules-summary.md`,
  `workflow-summary.md`
- `claude-docs/gap-analysis/decisions-log.md`
- `3-tech-stack-decision/tech-stack.md`

---

# 17. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-16 | Claude Code | Initial draft |
| 1.1 | 2026-08-17 | Claude Code | Refreshed against ADR-029–170: multi-tenancy flipped to database-per-tenant (ADR-056, supersedes ADR-004), hosting resolved to AWS-default (ADR-071), StoreTransfer/ProductTracking scope notes added, migration-fanout and cross-tenant-reporting risks added |
| 1.2 | 2026-08-17 | Claude Code | Resolved all open `[NEEDS INPUT]` markers: no numeric business target (ADR-171), deployment automation + user manuals in scope (ADR-172), reporting-beyond-legacy deferred to future Reporting module (ADR-173) |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Business Owner | *(pending)* | | |
| Project Manager | *(pending)* | | |
| Technical Lead | *(pending)* | | |

---

# AI Generation Notes

Generated per `docs-templates/1-project/templates/1-project-overview.md`'s own AI Generation Notes —
business-focused, non-technical where possible, no schema/API/UI detail duplicated here (those live in
their own categories). Every claim above traces to a specific SoT document, an analysis file, or a
locked decision; nothing was invented. Open items are marked `[NEEDS INPUT]`, not guessed.
