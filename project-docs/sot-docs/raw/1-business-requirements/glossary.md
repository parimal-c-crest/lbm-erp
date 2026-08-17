# Glossary — LBM ERP Rewrite

Terms as this project actually uses them, not generic ERP definitions.

**Blueprint** — the legacy-extraction document set for one module, produced by the nine-pass process
below. Lives under `blueprint/module/<Name>/`. Answers "what does this module actually do today,"
grounded in direct reads of the code and the live database — never modifies the running application.

**docs_from_blueprint** — the tech-agnostic specification layer, one folder per module under
`docs_from_blueprint/module/<Name>/`, consolidated from that module's blueprint. Answers "what must the
new system do," reorganized to be independent of whatever language, framework, or database ends up
building it.

**Doc1 / Doc2 / Doc3** — the three documents that make up a module's blueprint. Doc1 is the Business
Blueprint itself (nine passes, described below). Doc2 is the Implementation Plan — how a rewrite should
re-implement Doc1's findings, including a normalized domain model and a mitigation for every
Critical/High risk. Doc3 is the Deployment/Cutover Outline — lighter-weight, covering per-tenant cutover
strategy and data-migration risk.

**Pass 0 through Pass 8** — the nine sequential steps that produce a module's Doc1. Pass 0 is a
structural inventory of every file and function. Pass 1 is the real data model, translated from
physical database columns to business meaning. Pass 2 is the numbered catalog of validation and
business rules. Pass 3 is the status/lifecycle model. Pass 4 is financial and calculation logic. Pass 5
is documents and outputs. Pass 6 is the cross-module dependency map. Pass 7 re-verifies every earlier
finding by re-reading the code directly, plus runs a fresh systemic sweep for things like SQL injection.
Pass 8 consolidates everything into a final rollup and marks the document `status: reviewed`.

**MVP-16** — the sixteen modules confirmed on 2026-08-15 as the first build target: SalesOrder,
Accounts, Users, Location, Products, Vendors, SearchLineItem, Settings, SalesHistory, PurchaseOrder,
PurchaseLineItem, PurchaseHistory, MPLPricePlan, Pricebooklevel200, Pricebooklevel300, Pricebooklevel800.

**Extracted module** — a module in `docs_from_blueprint/module/` that doesn't have its own
`blueprint/module/<Name>/` folder, because it was never a separate legacy module — it's functionality
pulled out of a larger module's blueprint once investigation showed it deserved its own boundary. Two
exist so far: UOM (pulled from Products) and AccountStatement (pulled from Accounts). Each documents its
own sourcing explicitly, since the rigor level differs slightly from a module blueprinted from scratch.

**Tenant scoping** — whether a piece of data carries a column identifying which customer/company
(tenant) it belongs to, relevant because this is a multi-tenant SaaS system. Several legacy tables
(most notably UOM's) carry no tenant column at all, which may be intentional (tenancy enforced at the
deployment level) or may be a real gap — flagged as an open question rather than assumed either way.

**SO** — Sales Order. **PO** — Purchase Order. **ROA** — Receipt of Account (a deposit/payment/credit
adjustment against a customer account, tracked through the RoaAdj module). **MPL** — Master Price List.
**MPS** — Master Pricing Schedule (the specific bid/contract pricing mechanism inside Accounts'
relationship to PriceBooks). **UOM** — Unit of Measure. **PCB** — Price Code Book, a separate pricing
classification mechanism. **QoH** — Quantity on Hand. **WAC** — Weighted Average Cost, the inventory
costing formula with a confirmed defect in Products (the "Global WAC" calculation hardcodes one input
to zero, silently dropping half the intended blend).

**Confirmed / Inferred / Unclear** — the confidence vocabulary used throughout blueprint findings.
Confirmed means directly verified against code or live data. Inferred means a reasonable reading that
wasn't independently checked. Unclear means the meaning genuinely couldn't be determined and is flagged
as an open question rather than guessed.

**Open Question** — a specific, unresolved item flagged in a module's risk register or field catalog,
carried forward rather than resolved into an invented answer. Not the same as a generic caveat — every
open question in this project's documentation is tied to a specific finding.

**Module scope tracker** — `blueprint/module-blueprint-scope.md`, the living record of which of the
system's 135 modules are in scope, out of scope, and why, including the MVP-16 decision and any
exclusions confirmed after investigation (e.g. the Administration module, confirmed dead).
