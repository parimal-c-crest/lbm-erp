# Feature Breakdown

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

Business features derived from the 15-module target set (`module-list.md` — 18 blueprinted legacy
modules, 4 pricing mechanisms unified into 1 per `decisions-log.md` ADR-029), organized by domain.
Feature-level detail here is deliberately business-level — module-level functional detail generates
per module in `5-modules/<slug>/`.

---

# 2. Feature Categories

| Category | Description |
|----------|-------------|
| Authentication & Access | Login, role-based access control [Source: `Users/module-overview.md`] |
| Order Management | Sales order capture, quoting, fulfillment [Source: `SalesOrder/`] |
| Purchasing | Purchase orders, receiving, reconciliation [Source: `PurchaseOrder/`, `PurchaseLineItem/`, `PurchaseHistory/`] |
| Pricing | Unified engine — named plans, price sheets, promotions, one precedence model [Source: `decisions-log.md` ADR-029; legacy input: `MPLPricePlan/`, `Pricebooklevel200/300/800/`] |
| Inventory & Location | Quantity-on-hand, unit-of-measure conversion [Source: `Location/`, `UOM/`] |
| Accounts Receivable | Billing, credit, statements [Source: `Accounts/`, `AccountStatement/`] |
| Vendor Management | Supplier identity, freight, line-code taxonomy [Source: `Vendors/`] |
| Reporting & Analytics | Purchasing/inventory-planning reports [Source: `SalesHistory/integrations.md`] |
| Configuration | System/integration settings [Source: `Settings/`] |
| Platform Administration | Cross-tenant: skeleton control panel, tenant provisioning, migration fanout, Super Admin support accounts, cron/job management — infrastructure capability, not one of the 15 business modules [Source: `decisions-log.md` ADR-056/057/059] |

---

# 3. Feature List

| Feature ID | Feature Name | Category | Priority | Status |
|------------|--------------|----------|----------|--------|
| FEAT-001 | Sales Order Capture & Fulfillment | Order Management | Critical | Planned |
| FEAT-002 | Quick SO (fast entry flow) | Order Management | High | Planned |
| FEAT-003 | Backorder/Buyout/Stock-Transfer Resolution | Order Management | High | Planned |
| FEAT-004 | Purchase Order Lifecycle | Purchasing | Critical | Planned |
| FEAT-005 | PO Receiving & Reconciliation | Purchasing | Critical | Planned |
| FEAT-006 | Unified Pricing Engine (plans + price sheets + promotions) | Pricing | Critical | Planned |
| FEAT-007 | Location/Branch & Quantity-on-Hand Tracking | Inventory & Location | Critical | Planned |
| FEAT-008 | Unit-of-Measure Conversion Service | Inventory & Location | High | Planned |
| FEAT-009 | Customer Account & Billing | Accounts Receivable | Critical | Planned |
| FEAT-010 | Statement Generation & Delivery | Accounts Receivable | High | Planned |
| FEAT-011 | Vendor & Line-Code Management | Vendor Management | High | Planned |
| FEAT-012 | Identity, Roles & Permissions | Authentication & Access | Critical | Planned |
| FEAT-013 | Sales/Purchase History Accumulators | Reporting & Analytics | Medium | Planned |
| FEAT-014 | System Configuration & Integrations | Configuration | High | Planned |
| FEAT-015 | Skeleton Control Panel (tenant provisioning, migration fanout, Super Admin, cron management) | Platform Administration | High | Planned |

---

# 4. Feature Details

## Feature: Sales Order Capture & Fulfillment

### Description
Order-capture-through-fulfillment: line items, pricing/tax/discounts/deposits, lifecycle from
draft/quote to invoiced, 10 printed/PDF outputs. [Source: `SalesOrder/module-overview.md`]

### Business Value
Core revenue-generating workflow; closes the legacy system's Critical client-trusted-total defect by
construction. [Source: `SalesOrder/risks-and-open-questions.md` SO-RISK-002]

### Included Functionality
- Standard and Quick SO entry flows
- Server-side-recomputed pricing pipeline
- Three-way status split (Primary/QuoteLifecycle/Fulfillment)

### Primary Users
- Counter/Sales Staff, Warehouse/Fulfillment Staff, Accounting/Management

### Related Requirements
- BR-002, BR-003, FR-001, FR-006

---

## Feature: Purchase Order Lifecycle

### Description
PO creation through an 8-state status pipeline (Approved → Finalized → Received → Reconciled →
RGN-processed). [Source: `PurchaseOrder/workflows.md`]

### Business Value
Closes the legacy system's worst single finding (CalcTotal.php column-name SQL injection) and the
cross-module unsanitized write into Vendors' own freight fields. [Source:
`PurchaseOrder/risks-and-open-questions.md`]

### Included Functionality
- PO creation (direct, from SalesOrder buyout, or suggested-PO flow)
- Receiving and VAT-bucket reconciliation variance
- EDI/QuickBooks sync

### Primary Users
- Purchasing Staff, Warehouse/Fulfillment Staff, Accounting/Management

### Related Requirements
- FR-002

---

*(Remaining 12 features follow the same shape — full detail generates alongside each feature's owning
module at JIT time; this document covers business-level description only, per its own AI Generation
Notes.)*

---

# 5. Feature Prioritization

| Priority | Features |
|----------|----------|
| Critical | FEAT-001, FEAT-004, FEAT-005, FEAT-006, FEAT-007, FEAT-009, FEAT-012 |
| High | FEAT-002, FEAT-003, FEAT-008, FEAT-010, FEAT-011, FEAT-014, FEAT-015 |
| Medium | FEAT-013 |
| Low | *(none — the previously-low-confidence Pricebooklevel800 feature no longer exists as a standalone item; folded into FEAT-006, see `decisions-log.md` ADR-029)* |

---

# 6. Feature Dependencies

| Feature | Depends On | Description |
|----------|------------|-------------|
| FEAT-001 (SalesOrder) | FEAT-007 (Location), FEAT-008 (UOM), FEAT-006 (Pricing), FEAT-009 (Accounts) | Order capture reads inventory, UOM, pricing, and account/credit data [Source: `SalesOrder/integrations.md`] |
| FEAT-004 (PurchaseOrder) | FEAT-011 (Vendors), FEAT-007 (Location) | PO reads/writes vendor and location data [Source: `PurchaseOrder/integrations.md`] |
| FEAT-010 (Statements) | FEAT-009 (Accounts) | Statement generation reads Accounts billing/credit state [Source: `AccountStatement/module-overview.md`] |
| FEAT-013 (History accumulators) | FEAT-001, FEAT-004 | Written as side effects of SalesOrder/PurchaseOrder finalize events [Source: `SalesHistory/integrations.md`, `PurchaseHistory/integrations.md`] |

---

# 7. Module Mapping

| Feature | Module |
|----------|--------|
| FEAT-001, FEAT-002, FEAT-003 | `sales-order` |
| FEAT-004, FEAT-005 | `purchase-order`, `purchase-line-item`, `purchase-history` |
| FEAT-006 | `pricing` (unified — see `decisions-log.md` ADR-029) |
| FEAT-007 | `location` |
| FEAT-008 | `uom` |
| FEAT-009 | `accounts` |
| FEAT-010 | `account-statement` |
| FEAT-011 | `vendors` |
| FEAT-012 | `users` |
| FEAT-013 | `sales-history`, `purchase-history` |
| FEAT-014 | `settings` |
| FEAT-015 | *(none — platform-level, hosted on `skeleton.omnna-lbm.live`, not one of the 15 MVP modules)* |

*(`products`, `search-line-item` support multiple features above rather than owning one 1:1 —
Products backs pricing/inventory/order-capture; SearchLineItem is a SalesOrder read-model.)*

---

# 8. User Access

| Feature | Counter/Sales | Warehouse | Accounting/Mgmt | Purchasing | Admin | B2B Customer |
|----------|:---:|:---:|:---:|:---:|:---:|:---:|
| Sales Order Capture | ✔ | | | | | |
| PO Lifecycle | | ✔ | ✔ | ✔ | | |
| Pricing (unified) | | | ✔ | | ✔ | |
| Location/QoH | ✔ | ✔ | | ✔ | | |
| Accounts/Billing | | | ✔ | | | ✔ |
| Vendor Management | | | | ✔ | | |
| Identity/Roles | | | | | ✔ | |
| System Configuration | | | | | ✔ | |

---

# 9. Feature Workflow

Per `claude-docs/analysis/workflow-summary.md`:
1. Identity/Access (login, role resolution)
2. Pricing resolution (per order/line)
3. Order Capture & Fulfillment (order-to-cash)
4. Purchasing (procure-to-pay, triggered directly or via SalesOrder backorder/buyout)
5. Accounts Receivable / Statement generation
6. Reporting (Sales/Purchase History accumulators feed purchasing/inventory-planning reports)

---

# 10. Assumptions

- Approved requirements (`2-requirements.md`) are complete for project-level scope; module-level
  requirements are not yet elicited (JIT).
- User roles are finalized per ADR-002.
- StoreTransfer (full module) and ProductTracking (design-reviewed, not yet slotted into the build
  sequence) are confirmed future additions, not represented as features here.
  [Source: `decisions-log.md` ADR-144, project `CLAUDE.md`]
- FEAT-015 (Platform Administration) is scoped and prioritized here for completeness but does not map
  to one of the 15 MVP business modules — it generates its own documentation outside the per-module
  `5-modules/` JIT cycle when scheduled.

---

# 11. Constraints

Same as `1-project-overview.md` §11 — budget/timeline not recorded, tech stack locked.

---

# 12. Dependencies

Same external dependencies as `2-requirements.md` §10 (payment gateway, QuickBooks, EDI, B2B
storefront) — not repeated here.

---

# 13. Risks

Same as `1-project-overview.md` §13.

---

# 14. Acceptance Criteria

Complete when: every MVP-18 module maps to at least one feature (confirmed — see §7); features are
categorized, prioritized, and their dependencies mapped; stakeholders approve the feature list
(pending — no named stakeholder recorded, see `1-project-overview.md` §7).

---

# 15. Related Documents

`1-project-overview.md`, `2-requirements.md`, `4-tech-stack.md`, `claude-docs/analysis/module-list.md`

---

# 16. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-16 | Claude Code | Initial draft |
| 1.1 | 2026-08-17 | Claude Code | Added FEAT-015 Platform Administration (skeleton control panel, ADR-056/057/059) and StoreTransfer/ProductTracking scope-note assumption (ADR-144) |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Business Owner | *(pending)* | | |
| Product Owner | *(pending)* | | |
| Technical Lead | *(pending)* | | |

---

# AI Generation Notes

Features derived only from `2-requirements.md` and `module-list.md`, per this template's own AI
Generation Notes. No new requirements introduced. Module mapping is 1:1 or many-to-one, never
ambiguous, per §7.
