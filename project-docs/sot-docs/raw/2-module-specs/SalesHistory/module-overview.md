# SalesHistory — Module Overview

> Copy this whole `2-module-spec-template/` folder per module, rename, fill in. Stay tech-agnostic
> throughout — no framework/database/language references anywhere in Stage 2.

## Purpose

SalesHistory is a per-product/line-code/calendar-week/location rolling sales-activity aggregate. Each
row buckets one (product number, line code, calendar week, year, location) combination and accumulates
six raw quantity counters — sell, return, lost-sale, transfer-out, transfer-in, and a "false loss"
adjustment — into one derived total, `total_activity`. Unlike a typical CRM entity created once and
then edited field-by-field, SalesHistory rows are genuine accumulator rows: a save reads the existing
row for a key (if any) and adds the incoming delta onto it, rather than always inserting a fresh row or
overwriting wholesale. The module does not capture a single business event on its own — it rolls up
activity originating from a live sale (its own Save form, or SalesOrder's finalize routine), a
lost-sale detection (Location's weekly cron), a manual correction (DetailView inline-edit), and
historical migration/balancing activity (one-off `db_utilities/` scripts). (Source:
`docs_from_blueprint/module/SalesHistory/01-module-overview.md` §1.1-1.2.)

## Actors

- **Counter/sales staff and any user with SalesHistory create/edit permission** — reach the module's
  own EditView/Save form and the DetailView inline-edit correction interaction.
- **SalesOrder's finalize process** — an automated, synchronous writer that records sell/return
  activity as a side effect of finalizing a qualifying order line, using its own independently-restated
  formula.
- **Location's scheduled lost-sale job** — an automated, asynchronous (weekly, per-tenant cron) writer
  that records lost-sale activity, using a formula that agrees with SalesOrder's but disagrees with the
  module's own.
- **Internal purchasing/inventory-planning report consumers** (`modules/Customreport/`) — read this
  module's data for order-point, suggested-buy, and stock-buy calculations; do not write to it.
- **System/migration processes** — the one-off `db_utilities/` backfill/balancing scripts that shaped
  historical data but are not ongoing writers.

(Source: `docs_from_blueprint/module/SalesHistory/01-module-overview.md` §1.4.)

## Scope within this module

**In scope**: the weekly product/line-code/location activity-aggregate entity and its field catalog;
the accumulator save semantics and their validation gaps (including two confirmed SQL injections); the
confirmed absence of a status/workflow concept; the `total_activity` derived calculation and its
confirmed three-way formula divergence across writers; the module's one output (generic CSV export);
and this module's interfaces to SalesOrder, Location, the `vtiger_product_to_sh` side-effect table, and
the `Customreport/` read-consumer family.

**Out of scope**:
- Redesigning SalesOrder's own finalize-routine business logic or Location's own lost-sale-detection
  logic — this spec designs the contract both must publish against, not their own upstream decision
  logic.
- The one-off `db_utilities/` migration/balancing scripts — historical migration tooling, not live
  runtime writers.
- The ~12 largely-unopened `modules/Customreport/*.php` purchasing/inventory-planning report files —
  this spec designs the read-query interface those reports should consume, not their own internals.
- Three Campaigns/Backorderlog-pattern leftover files found in the module's own directory
  (`CallRelatedList.php`, `updateRelations.php`, `LoadList.php`) — confirmed to never touch this
  module's own table at all.
- Deployment/rollout sequencing across the wider system.
- Selecting an implementation technology stack (explicitly deferred).

(Source: `docs_from_blueprint/module/SalesHistory/01-module-overview.md` §1.3.)

## Origin

Extracted-from-legacy, blueprint-sourced, see `blueprint/module/SalesHistory/`. Consolidated into this
tech-agnostic spec via `docs_from_blueprint/module/SalesHistory/` (the second module processed under
the SalesOrder-pilot method, applied here to a much smaller 21-file, 1-entity module with a
structurally different risk profile).

## Dependencies

- **SalesOrder** — an independent, synchronous writer into this module's core table at SO-finalize
  time; also calls the same shared side-effect utility this module's own save paths call.
- **Location** — an independent, asynchronous (weekly per-tenant cron) writer into this module's core
  table for lost-sale activity; also writes into the shared side-effect table.
- **`Customreport/` purchasing/inventory-planning reports** — read-only consumer of this module's data.
- No confirmed external-system dependency of any kind (see `integrations.md`).

(Source: `docs_from_blueprint/module/SalesHistory/07-cross-module-integrations.md` §7.1.)
