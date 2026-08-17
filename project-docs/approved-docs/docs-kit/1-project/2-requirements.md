# Requirements

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
| Approved By | Claude Code review (`4-document-review/1-document-review.md`, 2026-08-17) |

---

# 1. Executive Summary

Project-level requirements for the LBM ERP Rewrite, derived from the 18-module legacy extraction and
locked cross-cutting decisions. Module-specific functional requirements, business rules, and
validation detail live in each module's own `5-modules/<slug>/` document set (generated JIT, not
here) — this document covers requirements that apply project-wide or that a module-level document
would otherwise have to restate.

---

# 2. Business Requirements

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| BR-001 | Replace the legacy vtiger-5.0.4-based ERP before its unsupported platform becomes an unmanageable risk. | Critical | [Source: `project-overview.md`] |
| BR-002 | Close the systemic SQL-injection exposure confirmed in every audited legacy module. | Critical | [Source: `business-case.md`] |
| BR-003 | Prevent recurrence of the defect class that already caused a real production data-loss incident (Users module). | Critical | [Source: `business-case.md`] |
| BR-004 | Provide one public API surface serviceable by the frontend, third parties, and internal integrations identically. | High | [Source: `3-tech-stack-decision/tech-stack.md`] |
| BR-005 | Standard delivery success criteria (on-schedule per milestone, zero Critical/High defects at release, user-acceptance confirmed per module). No numeric revenue/cost/efficiency targets supplied. | — | [Source: `decisions-log.md` ADR-022] |

---

# 3. Functional Requirements

Project-wide functional requirements (module-specific functional requirements are generated per
module in `5-modules/<slug>/2-functional-specification.md`):

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | System must support order-to-cash (SalesOrder → SalesHistory → Accounts/AccountStatement). | Critical [Source: `workflow-summary.md` §1] |
| FR-002 | System must support procure-to-pay (PurchaseOrder → PurchaseLineItem/PurchaseHistory → Vendors). | Critical [Source: `workflow-summary.md` §2] |
| FR-003 | System must resolve pricing via one unified engine (named plans, price sheets, promotions) with a single, explicit precedence model. | Critical [Source: `decisions-log.md` ADR-029 — supersedes the legacy 4-mechanism split and its unresolved precedence question] |
| FR-004 | System must provide one shared unit-of-measure conversion service, callable by every module needing it (closing the legacy pattern of 46+ files bypassing it). | High [Source: `UOM/integrations.md`] |
| FR-005 | System must support role-based identity/access per the starter catalog in `decisions-log.md` ADR-002. | Critical |
| FR-006 | Every financial total must be server-recomputed at every point it's needed — never accepted as direct client input. | Critical [Source: `decisions-log.md`, `SalesOrder/calculations.md` R3] |
| FR-007 | Every tenant runs on its own physically separate PostgreSQL database, reached via its own subdomain, cloned from a canonical `skeleton` database and kept in migration lockstep with every other tenant. | Critical [Source: `decisions-log.md` ADR-056, supersedes ADR-004] |
| FR-008 | Every tenant carries an explicit runtime mode (`live` or `sandbox`); sandbox mode neutralizes every outbound integration with a real-world side effect (payments, email, QuickBooks, delivery dispatch) at its own call site. | High [Source: `decisions-log.md` ADR-058] |

---

# 4. Non-Functional Requirements

## Performance
- API responses < 500ms at p95 (excludes bulk/async operations). [Assumption: `decisions-log.md`
  ADR-028 — starting default, no measured requirement existed]

## Security
- No raw, string-interpolated SQL anywhere in the codebase — closes the confirmed SQL-injection
  pattern found in all 18 blueprinted modules. [Source: `decisions-log.md` ADR-006, every module's
  `risks-and-open-questions.md`]
- Every mutating endpoint gated by a server-side authorization Guard — closes the UI-only-permission
  pattern found in all 18 modules. [Source: `decisions-log.md` ADR-006]
- No plaintext credential/secret storage — closes the legacy AWS/payment-gateway plaintext findings.
  [Source: `Settings/risks-and-open-questions.md`]
- Physical tenant isolation via database-per-tenant — no `tenant_id` column anywhere, isolation is a
  separate physical database, not a row-level check. [Source: `decisions-log.md` ADR-056 (supersedes
  ADR-004), ADR-073]
- Every user's activity is logged (who/what/when), Super Admin platform-support accounts included with
  no carve-out; every write endpoint is gated by a server-side Guard with the same no-exceptions
  posture applied to the audit-logging layer. [Source: `decisions-log.md` ADR-006, ADR-057]

## Availability
- 99.5% uptime during business hours. [Assumption: `decisions-log.md` ADR-028]

## Scalability
- Sized for LBM's internal staff + B2B traffic — low-hundreds of concurrent sessions as a starting
  assumption, not internet-scale. [Assumption: `decisions-log.md` ADR-028]

## Reliability
- Locking/concurrency-safety required wherever a legacy module was found to lack it (e.g.
  SalesHistory's confirmed 3-way formula divergence with no locking across 4 writers).
  [Source: `SalesHistory/calculations.md`]

## Accessibility
- WCAG 2.1 AA. [Source: `decisions-log.md` ADR-017]

## Compatibility
- Chrome, Edge, Firefox, Safari — latest 2 versions each. [Source: `decisions-log.md` ADR-016]

## Maintainability
- No dynamic-field/EAV mechanism anywhere in the schema — closes the legacy pattern found in
  SalesOrder, Products, and others. [Source: module `entities-and-fields.md` R1-class requirements
  across modules]
- Standing project-wide principles, applied automatically at every module's JIT cycle rather than
  re-decided per module: no formula/logic implemented more than once
  [`decisions-log.md` ADR-030]; non-blocking external integration calls move to a BullMQ background job
  unless a genuine synchronous requirement is confirmed [ADR-031]; every editable record uses the same
  Redis TTL-based concurrent-edit lock [ADR-079/080/084]; every module with bulk/tabular data gets
  import and export on the same background-job pattern [ADR-093/098]; every field in every module's UI
  carries a help-icon tooltip authored fresh from that field's own documentation [ADR-101].

---

# 5. User Roles

*(Per `decisions-log.md` ADR-002 — supersedes this template's generic example roles.)*

| Role | Description |
|------|-------------|
| Counter/Sales Staff | Order entry, quoting, customer-facing transactions |
| Warehouse/Fulfillment Staff | Picking, receiving, stock transfers, delivery prep |
| Accounting/Management | Credit, statements, deposits/ROA, financial reporting |
| Purchasing Staff | Vendor management, PO creation/reconciliation, EDI |
| Admin | Users/role management, Settings, pricing configuration |
| B2B Customer | External storefront access |

---

# 6. User Stories

Project-level only — module-specific user stories are generated per module.

| ID | User Story | Priority |
|----|------------|----------|
| US-001 | As Counter/Sales Staff, I want to create a sales order with line-item pricing and tax computed automatically, so I don't have to trust a client-side total. | High |
| US-002 | As Purchasing Staff, I want a purchase order's status to move through receiving/reconciliation without a broken re-finalize guard, so an order can't be duplicated financially. | High |
| US-003 | As Admin, I want every write action gated by a real server-side permission check, not just a hidden button, so a crafted request can't bypass authorization. | Critical |

---

# 7. Business Rules

Project-wide rules only — the ~700 module-specific numbered rules live in each module's own
`business-rules-summary.md` reference and generate in full at each module's JIT cycle.

- No total (grand total, subtotal, final total) may ever be accepted as direct client input; it is
  always computed server-side from current persisted state. [Source: `decisions-log.md`,
  `SalesOrder/calculations.md`]
- Every tenant's data lives in its own physically separate database; uniqueness constraints are
  naturally per-database, not `(tenant_id, ...)`-scoped — there is no shared-schema tenant column.
  [Source: `decisions-log.md` ADR-056 (supersedes ADR-004), ADR-073]
- Every mutating endpoint requires a server-side Guard check against the role catalog (ADR-002) — no
  UI-only enforcement. [Source: `decisions-log.md` ADR-006]
- Soft-delete (`is_deleted`/`deleted_at`) is the uniform deletion mechanism across every entity — no
  hard deletes. [Source: `decisions-log.md` ADR-005]

---

# 8. Validation Requirements

- Every field documented as "required" in a module's legacy field catalog must be genuinely enforced
  server-side in the new system — closing the legacy pattern (confirmed in SalesOrder, Products, and
  others) where no field is actually enforced required at save time despite being documented as such.
  [Source: `business-rules-summary.md`, "Cross-cutting rules"]
- Numeric deltas/counters (e.g. accumulator-style fields like SalesHistory's activity counters) must
  be type/range-validated before being applied — closing the legacy pattern of silent type coercion.
  [Source: `SalesHistory/business-rules-and-validation.md` SLH-RULE-004]

---

# 9. Data Requirements

## Master Data
- Products, Locations, Vendors, Accounts, Users — catalog/master entities every transactional module
  depends on. [Source: `module-list.md`]

## Transaction Data
- Sales Orders, Purchase Orders, line items, deposits/ROA transactions, sales/purchase history
  accumulators. [Source: `module-list.md`]

## Reference Data
- Unified pricing engine data (plans, price sheets, promotions — ADR-029), unit-of-measure
  conversions, line codes.
  [Source: `module-list.md`]

## Audit Data
- Standard audit columns (`created_at`/`updated_at`/`created_by`/`updated_by`) plus an append-only
  event table wherever a derived total has multiple historical writers. [Source: `decisions-log.md`
  ADR-005]

---

# 10. Integration Requirements

| System | Purpose |
|---------|---------|
| CardConnect | Payment gateway, tokenized card vault — retained from legacy [Source: `decisions-log.md` ADR-008] |
| QuickBooks | Accounting sync — rebuilt working properly, scope expanded beyond legacy [Source: `decisions-log.md` ADR-009, ADR-023] |
| EDI networks | Vendor/purchasing integration [Source: `PurchaseOrder/integrations.md`] |
| EliteExtra | Delivery-dispatch, retained from legacy [Source: `decisions-log.md` ADR-010] |
| AWS S3 | File storage [Source: `decisions-log.md` ADR-011] |
| B2B storefront | External customer account access [Source: `Accounts/integrations.md`] |

---

# 11. Reporting Requirements

| Report | Description |
|--------|-------------|
| Purchasing/inventory-planning reports | Order-point, suggested-buy, stock-buy calculations, consuming SalesHistory/PurchaseHistory data [Source: `SalesHistory/integrations.md`] |
| Cost/margin reports | Internal, never customer-facing [Source: `SalesOrder/outputs.md`] |
| Tax reports | [Source: `Accounts/outputs.md`] |

MVP 1 reproduces legacy's existing report set only. Any reporting beyond what legacy already produces
is deferred to a future, dedicated Reporting module — not designed piecemeal inside MVP-1 modules.
[Source: `decisions-log.md` ADR-173]

---

# 12. Notification Requirements

- Payment-link notifications (SalesOrder). [Source: `SalesOrder/business-rules-and-validation.md`]
- Statement delivery via print/email/fax (AccountStatement). [Source: `AccountStatement/outputs.md`]
- Push/in-app notifications — new capability beyond legacy's email-only pattern. [Source:
  `decisions-log.md` ADR-012; delivery mechanism itself not yet decided — resolve when a module's UI
  design needs it]

---

# 13. Assumptions

- All requirements above assume the MVP-18 module boundary holds; requirements for modules beyond it
  are not yet known. [Source: `assumptions-and-constraints.md`]
- Dev database is assumed representative of production for data-shape purposes.
  [Source: `assumptions-and-constraints.md`]

---

# 14. Constraints

- Tech stack locked (`4-tech-stack.md`). Budget/timeline: not recorded. Compliance regime: PCI-DSS
  via tokenized vault. [Source: `decisions-log.md` ADR-007]
- Hosting: AWS default, kept portable. [Source: `decisions-log.md` ADR-071]
- Multi-tenancy: database-per-tenant, migration fanout to every tenant database required on every
  deploy — exact orchestration mechanism not yet designed, flagged as a blocking follow-up before
  `6-development/` generates. [Source: `decisions-log.md` ADR-056]

---

# 15. Dependencies

| Dependency | Description |
|------------|-------------|
| Hosting/cloud provider | AWS (default, portable) [Source: `decisions-log.md` ADR-071] |
| Payment gateway | CardConnect, retained from legacy — tokenized vault [Source: `decisions-log.md` ADR-008] |

---

# 16. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cross-tier pricing precedence unresolved | Blocks 3 modules' schema/business-rules docs | Resolve at those modules' JIT cycle (gap Q-11) |
| NFR targets are starting defaults, not measured requirements | May need revision once real usage data exists | Explicitly flagged as `[Assumption: ADR-028]` wherever stated, not presented as fact |
| Database-per-tenant migration-fanout orchestration mechanism not yet designed | A bad migration could reach every tenant before being caught | Recommended shape captured (Prisma Migrate fanout, staged by tenant type) but must be finalized before `6-development/` generates [Source: `decisions-log.md` ADR-056] |

---

# 17. Open Questions

| ID | Question | Owner | Status |
|----|----------|-------|--------|
| Q-001 | Measurable business/success-criteria numbers? | Developer | Resolved — ADR-022/171 (standard delivery criteria, no numeric business targets — confirmed, not merely unsupplied) |
| Q-002 | Payment gateway vendor for the new system? | Developer | Resolved — ADR-008 (CardConnect retained) |
| Q-003 | Compliance regime (PCI-DSS etc.)? | Developer | Resolved — ADR-007 (tokenized vault) |
| Q-004 | Cross-tier pricing precedence (200/300/800)? | Developer/SME | Superseded — ADR-029 unifies the 4 mechanisms into 1 module with a fresh precedence model, not a reconciliation of the legacy question |
| Q-005 | WCAG accessibility target? | Developer | Resolved — ADR-017 (WCAG 2.1 AA) |
| Q-006 | QuickBooks expanded-sync exact entity list? | Developer/SME | Open — deferred to Accounts/Users/PurchaseOrder JIT cycles, ADR-023 |
| Q-007 | Multi-tenancy model? | Developer | Resolved — ADR-056 (database-per-tenant, supersedes ADR-004's row-level security) |
| Q-008 | Hosting/cloud provider? | Developer | Resolved — ADR-071 (AWS default, portable) |
| Q-009 | Migration-fanout orchestration mechanism across all tenant databases? | Developer | Open — recommended shape captured (ADR-056), not yet finalized before `6-development/` |
| Q-010 | Deployment automation / user manuals — in scope or deferred? | Developer | Resolved — ADR-172 (both in scope, real deliverables) |
| Q-011 | Reporting beyond legacy's existing report set? | Developer | Resolved — ADR-173 (deferred to a future Reporting module) |
| Q-012 | Specific backend/frontend package choices beyond framework-level? | Developer | Resolved — ADR-174 (class-validator/class-transformer, date-fns, react-hook-form+zod, pdf-lib, papaparse/csv-parse) |

---

# 18. Acceptance Criteria

This document is considered complete when: all business/functional requirements above are confirmed
(done); NFR numeric targets are supplied (done — ADR-028 defaults, flagged as assumptions); user roles
are confirmed (locked per ADR-002); open questions are resolved or explicitly deferred with an owner
(Q-004/Q-006/Q-009 remain open, deferred to JIT cycles or `6-development/` by design; Q-001, Q-010,
Q-011, Q-012 resolved this refresh — ADR-171/172/173/174). No open `[NEEDS INPUT]` markers remain in
this document.

---

# 19. Related Documents

`1-project-overview.md`, `3-feature-breakdown.md`, `4-tech-stack.md`, `sot-docs/index.md`,
`claude-docs/analysis/*`, `claude-docs/gap-analysis/decisions-log.md`

---

# 20. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-16 | Claude Code | Initial draft |
| 1.1 | 2026-08-17 | Claude Code | Refreshed against ADR-029–170: database-per-tenant FR/NFR/business-rule updates (ADR-056/073), hosting and payment-gateway open items resolved (ADR-071/008), 5 standing cross-cutting principles added to Maintainability (ADR-030/031/084/098/101), sandbox-mode FR added (ADR-058) |
| 1.2 | 2026-08-17 | Claude Code | Resolved remaining open `[NEEDS INPUT]`: reporting-beyond-legacy deferred to future Reporting module (ADR-173); deployment automation/user manuals and package choices confirmed (ADR-172/174) |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Business Owner | *(pending)* | | |
| Product Owner | *(pending)* | | |
| Technical Lead | *(pending)* | | |

---

# AI Generation Notes

Project-level requirements only, per this template's own scope — module-specific requirements
generate per module at JIT time, not duplicated here. Every requirement traces to a SoT source, an
analysis file, or a locked decision. `[NEEDS INPUT]` markers are used, not guesses, per this batch's
"never silently assume" rule.
