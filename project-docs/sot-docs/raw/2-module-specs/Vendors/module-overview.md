# Vendors — Module Overview

> Copy this whole `2-module-spec-template/` folder per module, rename, fill in. Stay tech-agnostic
> throughout — no framework/database/language references anywhere in Stage 2.

## Purpose

Vendors is the supplier master entity of the legacy ERP: it anchors the identity, contact, GL/tax, and
freight/PO-terms configuration for every manufacturer, supplier, or subcontractor the business buys from,
plus the satellite data purchasing depends on — a ship-from physical address book, primary-supplier
assignment per location, a many-to-many contact relation, manufacturer-part-number-to-line-code conversion
rules, and the shared vendor line-code/line-code-alias purchasing taxonomy also consumed by Products and
SalesOrder. It also owns a two-way QuickBooks Desktop sync and a (currently unconfigured) SlipStream
vendor-payment-enrollment integration (`docs_from_blueprint/module/Vendors/01-module-overview.md` §1.1–1.2).

## Actors

- **Purchasing/vendor-management staff** — create and edit vendor records, manage the physical address
  book, assign primary suppliers, manage line-code/conversion-rule/alias mappings.
- **Purchase Order entry staff** — consume vendor identity, freight terms, tax configuration,
  cost-source configuration, and EDI-eligibility data when placing Purchase Orders.
- **Products/catalog staff** — consume the shared Vendor Line Code classification data for product-detail
  rendering and the B2B customer catalog's cost display.
- **SalesOrder counter/sales staff** — indirectly consume Vendor Line Code pricing parameters (markup
  adder, square-footage price) through SalesOrder's Non-Stock-Code line-entry calculator.
- **Accounting/reconciliation staff** — consume vendor identity via RebateTracker and VendorInvoice's own
  screens, and the SlipStream Vendor Status field to gate SlipStream-based payment-import eligibility.
- **System/integration processes** — the QuickBooks (OCS) sync queue, the SlipStream inbound webhook, the
  EDI transmission paths (Do It Best / Orgill / Emery Jensen Distribution), Saberis, Aconnex, and TecOrder.

(`docs_from_blueprint/module/Vendors/01-module-overview.md` §1.4)

## Scope within this module

**In scope**: vendor identity/contact/configuration capture, the vendor physical address book, primary
supplier assignment, the vendor-contact relationship, the vendor conversion rule (manufacturer-number-to-
line-code) mapping, the vendor line-code/line-code-alias purchasing cluster, freight/PO terms
configuration, tax-code resolution for Purchase Orders, EDI/Saberis/Aconnex/TecOrder integration
configuration, and the QuickBooks/SlipStream synchronization surfaces — together with this module's
interfaces to PurchaseOrder, Products, SalesOrder (via the shared line-code data), Forecasting,
RebateTracker, and VendorInvoice.

**Out of scope**:
- Generic record-sharing/audit plumbing inherited from the underlying CRM framework.
- VendorInvoice, RebateTracker, and POReconciliation's own domain models — confirmed FK-referencing or
  read-only consumers of Vendors, not Vendors-owned data.
- The full QuickBooks Web Connector queue mechanics (enqueue internals, the SOAP consumer, polling/
  retry/failure handling) — never read in any source pass.
- The full SlipStream integration surface beyond the one confirmed vendor-status webhook event — the
  integration is confirmed 100% unconfigured/unused on the checked dev snapshot.
- Deployment/rollout sequencing across the wider system.
- Selecting an implementation technology stack.

(`docs_from_blueprint/module/Vendors/01-module-overview.md` §1.3)

## Origin

**Extracted-from-legacy.** This spec is a reformatting of `docs_from_blueprint/module/Vendors/` (10 topic
files), itself consolidated from the 12-file Vendors Business Blueprint at `blueprint/module/Vendors/`
(00-README through 10-deployment-cutover-outline). Every claim in this file and its sibling files traces
back to a specific blueprint section; ambiguity found in the source (unclear field meanings, unconfirmed
code paths, open design intent) is preserved as ambiguity here rather than resolved into an invented
answer. Vendors was the sixth module blueprinted in a 126-module-wide documentation/modernization
initiative, following SalesOrder (the pilot), Accounts, Users, Location, and Products.

## Dependencies

Per the source blueprint's cross-module analysis, Vendors is read/written by, or reads from:

- **PurchaseOrder** — the module's primary dependent; bidirectional (PurchaseOrder both reads extensively
  and writes directly into Vendors' own Freight PPD fields via a separate ajax endpoint).
- **Products** — read-only consumer of Vendor Line Code classification data and the cost-source resolver.
- **VendorLinecode** (a distinct module) — genuinely independent, full-CRUD co-owner of the shared Vendor
  Line Code table.
- **SalesOrder** — read-only consumer of Vendor Line Code pricing parameters via its client-side NSCode
  calculator.
- **VendorInvoice** — read-only, FK-only display consumer.
- **RebateTracker** — read-only consumer of vendor identity for rebate-rule scoping.
- **Forecasting** — read-only consumer of Primary Supplier Assignment.
- **Settings (SlipStream admin)** — bidirectional, asymmetric: owns the bulk/admin side of the SlipStream
  sync; Vendors owns only the initial individual-link write and read-only display.
- **External**: QuickBooks (OCS), EDI (Do It Best / Orgill / Emery Jensen Distribution), Saberis, Aconnex,
  X12 EDI (unconfirmed live), TecOrder.

(`docs_from_blueprint/module/Vendors/07-cross-module-integrations.md` §7.1–7.2 — full detail in
`integrations.md`)
