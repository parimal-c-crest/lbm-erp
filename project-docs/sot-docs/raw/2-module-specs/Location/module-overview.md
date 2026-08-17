# Location — Module Overview

> Copy this whole `2-module-spec-template/` folder per module, rename, fill in. Stay tech-agnostic
> throughout — no framework/database/language references anywhere in Stage 2.

## Purpose

Location is the physical branch/warehouse/store dimension used throughout the ERP for inventory,
sales, and pricing scoping. It is really **two** genuinely distinct business entities sharing one
module directory and one UI: the physical **Branch/Store** (identity, document-numbering prefixes,
addresses, tax rates, per-branch POS/print/email/WMS configuration, payment-gateway and
vendor-integration credentials — 7 live rows on the source blueprint's dev database), and the
**Product-at-Location** record (one row per product × branch pair, carrying that product's
quantity-on-hand, bin location, cost history, demand-forecast/reorder-formula outputs, and
part-supersession state — 72,104 rows, by far the largest and most business-critical data this
module owns, with no independent identity of its own). Every module dealing with sales, purchasing,
inventory, pricing, or reporting joins against Location's identity to scope its own data and to read
quantity-on-hand as ground truth.

## Actors

- **Counter/warehouse/inventory staff** — enter/adjust quantity-on-hand, review the Lost Sale Log
  Report and act on its inline controls (reorder level, reorder-alert flag, cost, "track SH" flag,
  lost-sale factor), record lost sales at the point of sale, flag a sale as a "Disqualified Sale."
- **Products-module users** — view and edit a product's per-branch Location detail (QoH, reorder
  settings, pricing/cost, bin/zone) from within the Products module's own screens, since this entity
  has no independently routable view of its own.
- **Management/accounting/inventory-management staff** — review the Lost Sale Log Report and its
  admin-notification email, manage per-branch configuration (tax rates, print/email settings,
  accounting GL mappings) via Settings-area admin screens.
- **System/integration processes** — the WMS put-away/pick-list system (genuinely bidirectional, not
  read-only), the Forecasting cron/report suite, the Customreport reorder-point calculator, the
  CIPW/CIP-EP payment gateways, the TecOrder vendor-ordering integration, and the Traverse/QuickBooks
  accounting sync.
- **Administrators** — configure the branch header's ~100 largely-unregistered configuration columns
  (address, tax, print-copy counts, from-email addresses, payment-gateway credentials) via
  Settings-area screens outside the standard CRM edit-view pipeline.

## Scope within this module

**In scope**: the physical branch/store header and its configuration, the Location→GL-account
mapping, the Product-at-Location composite entity (QoH, bin/zone location, cost history, reorder
configuration, demand-forecast formula outputs, part-supersession state), the Location Pass-On Field
Configuration, the demand/lead-time/reorder-point calculation engine, the lost-sale/false-loss
tracking pipeline, the part-supersession merge cascade, and Location's interfaces to Products,
SalesOrder, WMS, Forecasting, Customreport, Users, and the CIPW/CIP-EP/TecOrder/Fuse5Connect/
Traverse/QuickBooks external systems.

**Out of scope**:
- **Role-Location Assignment and User-Location Tracking are not redesigned as part of this module.**
  Both are genuinely Location-domain *data* by the source blueprint's own accounting, but neither has
  any Location-module code reading or writing it — Role-Location Assignment is Settings-owned and
  already normalized as part of the Users module's own specification; User-Location Tracking is
  entirely Users-module-owned code, with a confirmed schema-drift finding (a branch reference stored
  as a denormalized name rather than a stable identifier) flagged as a recommendation for whichever
  module's specification eventually redesigns it, not designed here.
- **Location Group** (the generic CRM record-sharing "group" assignment mechanism) — inherited
  platform infrastructure, not business-specific to Location.
- **Re-designing Products, SalesOrder, WMS, or Forecasting in full** — this specification establishes
  Location's own domain model and its *interfaces* to those modules, not those modules' internals.
- **Deployment/rollout sequencing** — kept at outline depth per the source blueprint.
- **Selecting an implementation technology stack** — explicitly deferred.
- **Fixing every documented legacy behavior automatically.** Legitimate business logic — even logic
  with confirmed quirks, such as a divisor bias in the demand formulas — is carried forward faithfully
  where the source blueprint found no evidence of an actual defect, and flagged for subject-matter-
  expert sign-off (not silently "fixed") where it found a genuine but ambiguous statistical question.

## Origin

Extracted-from-legacy, blueprint-sourced. Primary source: `blueprint/module/Location/` (the 12-file
Location Business Blueprint, 8 completed analysis passes plus an implementation-plan draft),
consolidated into `docs_from_blueprint/module/Location/` (one file per topic, per the SalesOrder
pilot's shape) and re-organized into this Stage 2 module spec from there. Location is the fourth
module blueprinted in this series, following SalesOrder (the pilot), Accounts, and Users. This
module's `permissions.md` is genuine net-new extraction work against `modules/Location/*.php` and the
blueprint's validation-rules/cross-module-integrations passes — no blueprint file separately
catalogues permissions, so that file's content was pulled directly from source rather than mapped
1:1 from an existing blueprint topic file the way the other ten files in this folder are.

## Dependencies

- **Products** — hosts the entire Product-at-Location display/edit surface (this entity has no
  independently routable screen of its own); supplies the kit/component relationship as a
  read-only interface for Location's own kit-quantity determination.
- **SalesOrder** — the manual, counter-person-triggered lost-sale write path (and the Disqualified
  Sale / false-loss flag at order finalize) originates in SalesOrder/point-of-sale, not in this
  module's own UI.
- **Customreport** — reads Location's Reorder flag, Primary Supplier, Part Min/Max/Order Point, and
  sales-history joins as reorder-point calculation inputs; writes the computed suggestion back onto
  one of Location's own fields on a cron-driven run.
- **Forecasting** — a 10+ file demand-forecasting cron/report suite reads Location's Product-at-
  Location data as ground truth and scopes every query to exclude Part-Superseded rows; at least one
  file name suggests an untraced write path back into Location's own table.
- **Users** — Role-Location Assignment and User-Location Tracking are genuinely Location-domain data
  but are entirely Users/Settings-owned; no code relationship exists between the two modules' own
  files for either table.
- **WMS** — the one relationship in this module's dependency graph confirmed bidirectional: WMS reads
  Location's QoH as authoritative ground truth for its own pick-list reconciliation, and Location's
  own QoH-adjustment endpoints write directly into WMS-owned tables when the triggering context is
  WMS-specific.
- **CIPW / CIP-EP / TecOrder / Fuse5Connect / Traverse / QuickBooks** — external integrations for
  which Location stores branch-scoped credentials/GL-account mappings; several of these integrations'
  own consuming code was never located in the source blueprint (flagged as open items elsewhere in
  this module's own specification).
