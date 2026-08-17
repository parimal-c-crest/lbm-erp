# SalesHistory — Entities & Fields

> Every entity, every field, individually. No grouping/summarizing — that's how fields get lost.
> Legacy table/column names are a first-class column in the field catalog below, not an optional
> footnote — this project's whole documentation discipline rests on every claim being traceable to
> a specific source, and a footnote is too easy to skip. See
> `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/SalesHistory/02-entities-and-fields.md`, tracing to
`blueprint/module/SalesHistory/01-entities-fields.md`.

## Governing Architectural Requirements (R1-R6)

These are forward-looking requirements a new implementation must satisfy, restated from the blueprint's
implementation plan (Doc2 §2.1 Decisions D1-D8):

- **R1** — Exactly one service computes and writes `total_activity`; every legacy writer becomes an
  event publisher into it, not an independent database writer (fixes the confirmed 3-way formula
  divergence across 4 writers, no locking — see `calculations.md`).
- **R2** — No operation may reach a raw, string-interpolated SQL statement built from caller-supplied
  values (fixes the two confirmed SQL injections on the module's own everyday Save-form path).
- **R3** — Redundant, independently-writable representations of the same fact are collapsed to one
  derived value: the four week-boundary columns (`.wksttime`/`.wkendtime`/`.stdate`/`.enddate`) store
  the same fact twice with no confirmed ongoing writer. Store only `iso_week`/`iso_year` and derive
  boundaries at read time — conditional on a migration-rehearsal confirmation.
- **R4** — Fields with no confirmed writer or population mechanism (`.pt_id`, `.uom`) are parked in a
  separate structure, not silently promoted to typed columns or silently dropped.
- **R5** — Structurally-empty extension tables (the custom-field extension, the group-relation table)
  and confirmed leftover template files (`CallRelatedList.php`, `updateRelations.php`, `LoadList.php`)
  are excluded from the new implementation, not migrated as empty scaffolding.
- **R6** — Every business entity is scoped to a tenant; the five-field accumulator key is scoped
  per-tenant, not global.

## Entity List

| Entity | Purpose |
|---|---|
| Sales Activity (Weekly Product/Location Activity Aggregate) | The core rollup record — one row per (product number, line code, calendar week, year, location) combination: sell/return/lost-sale/transfer-in/transfer-out quantities, a "false loss" adjustment, and the derived `total_activity` total. |
| Sales Activity Custom-Field Extension *(not carried forward — R5)* | Standard vtiger Studio custom-field companion, structurally present but functionally empty — zero live rows. |
| Sales Activity Group Relation *(not carried forward — R5)* | Generic grouping/relation table referenced only by search-field metadata — zero live rows. |
| Sales Activity → Sales Preview side-effect table *(not a SalesHistory-owned entity)* | A "product-to-sales-history" work-queue-shaped table (id, location, line code, product number, product id), inserted into unconditionally by a shared utility every one of this module's own save paths calls. Documented here for completeness — a genuine cross-table side effect, not owned by this module. |

## Field Catalog

### Sales Activity (Weekly Product/Location Activity Aggregate)

Backed by `vtiger_saleshistory` — 24 physical columns, 13 individually CRM-registered. This entity
carries no money-valued fields at all — every field is an identity/key field, a pure quantity counter,
or a system/audit field.

**Identity / key fields:**

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Sales Activity ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `vtiger_saleshistory.saleshistoryid` |
| Product Number | Business-facing product code this row's activity is bucketed under | text | Yes | NULL | user-entered (five-field required-key gate) | `vtiger_saleshistory.productnumber` |
| Line Code | The product's line-code classification | reference (to Line Code) | Yes | NULL | user-entered (same gate) | `vtiger_saleshistory.linecode` (genuine integer FK) |
| Week | ISO-style week number (1-52) this row's activity bucket covers | number | Yes | NULL | user-entered (same gate) | `vtiger_saleshistory.week` |
| Year | Calendar year this row's week bucket falls in | number | Yes | NULL | user-entered (same gate) | `vtiger_saleshistory.year` |
| Location | Display name of the location this row's activity was recorded at | text | Yes | NULL | user-entered (same gate) | `vtiger_saleshistory.location` (plain-text, joined by name not id) |

**Activity counters** (every one of these six feeds the derived `total_activity` calculation — see
`calculations.md`):

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Sell Qty | Cumulative quantity sold for this bucket, incremented on each write | number | No | NULL | system-set (accumulated) | `vtiger_saleshistory.sellqty` |
| Return Qty | Cumulative quantity returned for this bucket | number | No | NULL | system-set (accumulated) | `vtiger_saleshistory.returnqty` |
| Transfer Out Qty | Cumulative quantity transferred out of this location for this bucket | number | Yes (NOT NULL, no default) | none | system-set (accumulated) | `vtiger_saleshistory.transferoutqty` |
| Transfer In Qty | Cumulative quantity transferred into this location for this bucket | number | Yes (NOT NULL, no default) | none | system-set (accumulated) | `vtiger_saleshistory.transferinqty` |
| Lost Sales | Cumulative "lost sale" quantity — a lost-opportunity counter, not a boolean flag | number | Yes (NOT NULL) | none | user-entered/system-set (accumulated by most writers; **directly overwritten**, not accumulated, by Location's weekly cron — see `calculations.md`) | `vtiger_saleshistory.lostsale` |
| False Loss | Adjustment counter that reverses a portion of lost-sale/transfer figures out of `total_activity` — added later per an explicit change-request comment | number | Yes (NOT NULL) | `0` | user-entered (accumulated) | `vtiger_saleshistory.falseloss` |
| Total Activity | Derived net-activity total — full three-way-divergent formula documented in `calculations.md` | number | No | NULL | system-set (derived, recomputed on every write) | `vtiger_saleshistory.total_activity` |
| UOM | Unit-of-measure code for this row's quantities | text | No | NULL | user-entered — **empty on every sampled row in the source dev snapshot; no write site found anywhere in the blueprint's eight-pass sweep** | `vtiger_saleshistory.uom` |

**Week-boundary / audit / system fields:**

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Week Start Time | Unix-epoch timestamp of the bucket week's start | timestamp | Yes (NOT NULL) | `0` | system-set — no write site found in the module's own live save paths | `vtiger_saleshistory.wksttime` |
| Week End Time | Unix-epoch timestamp of the bucket week's end | timestamp | Yes (NOT NULL) | `0` | system-set — same open question | `vtiger_saleshistory.wkendtime` |
| Start Date | Calendar date of the bucket week's start — same value as Week Start Time, different representation | date | No | NULL | system-set — same open question | `vtiger_saleshistory.stdate` |
| End Date | Calendar date of the bucket week's end — same value as Week End Time, different representation | date | No | NULL | system-set — same open question | `vtiger_saleshistory.enddate` |
| Created Time | Row-creation timestamp | datetime | No | NULL | system-set — written via an unparameterized (system-value-only) raw update on the entity's own save hook | `vtiger_saleshistory.createdtime` |
| Modified Time | Row-last-modified timestamp | datetime | No | NULL | system-set — same basis | `vtiger_saleshistory.modifiedtime` |
| Creator ID | User who created this row | reference (to User) | No | `0` | system-set — same basis | `vtiger_saleshistory.smcreatorid` |
| Owner ID | User who owns this row | reference (to User) | No | `0` | system-set — same basis; nearly every live row in the source dev snapshot is owned by a single system/admin user | `vtiger_saleshistory.smownerid` |
| Price Tracker ID (inferred) | Unclear reference, never populated — an inferred-from-naming-convention guess, not confirmed by any code citation | reference (target unclear) | No | NULL | unclear | `vtiger_saleshistory.pt_id` |
| Is Deleted | Soft-delete flag — set via the shared soft-delete framework helper, a real, non-degenerate path | boolean | No | `0` | system-set — genuinely exercised | `vtiger_saleshistory.deleted` |

### Sales Activity Custom-Field Extension *(not carried forward — R5)*

Backed by `vtiger_saleshistorycf`. One physical column (a 1:1 FK back to the header, also this table's
own primary key), zero live rows, no `vtiger_field` registration of any kind. Documented for
traceability only; excluded from the new schema per R5.

### Sales Activity Group Relation *(not carried forward — R5)*

Backed by `vtiger_saleshistorygrouprelation`. Two columns (a FK back to the header, plus a free-text
"group name" field with no confirmed write site), zero live rows. Documented for traceability only;
excluded from the new schema per R5.

## Known Gaps

- **`.uom`'s intended population mechanism is unconfirmed.** Every sampled row carries an empty
  string; the module's own ListView search-rewriting logic implies real UOM codes are expected in at
  least some tenants' data, but no write site was found anywhere in the eight-pass sweep.
- **The four week-boundary columns' write site is unconfirmed.** No write site found in either of the
  module's own live save paths; a plausible (not confirmed) candidate — a standalone historical
  backfill script — was identified but not verified to write all four columns, nor confirmed one-time
  vs. re-run.
- **`.pt_id`'s business meaning is unconfirmed.** No `vtiger_field` label, no write site found anywhere,
  zero live rows populated — "Price Tracker ID" is an inferred guess only.
- **`.productnumber`'s relationship to Products is a business-key match only, not database-enforced**,
  and its zero-match rate against the live Products table in the dev snapshot was not conclusively
  attributed to a genuine production-data issue vs. a dev-fixture artifact. Flagged for SME
  confirmation against production-shaped data.
- **`Sales Activity Group Relation`'s `groupname` field has no confirmed real-world purpose** — no
  write-site code found anywhere. Excluded from the new schema per R5 regardless.
- **Whether `.lostsale` being `0` on every dev-snapshot row reflects genuine production behavior or a
  dev-data artifact was not conclusively resolved** — the write mechanism that would populate non-zero
  values (Location's weekly cron) genuinely exists and runs, making a dev-data-artifact explanation
  somewhat more likely, but this is not conclusively resolved.

## Recommended Rewrite Schema (proposal, not a blueprint finding)

Table/column names below are tech-agnostic placeholders, not a naming commitment. Full reasoning per
problem is in `docs_from_blueprint/module/SalesHistory/02-entities-and-fields.md` §5; summarized here:

- **`sales_activity`** (replaces `vtiger_saleshistory`) — id, tenant_id (R6), product_number (business
  key only, not FK — per the unresolved linkage open question), line_code_id (FK, required), iso_year,
  iso_week, location_id (FK — resolved from legacy plain-text name), sell_qty, return_qty,
  transfer_out_qty, transfer_in_qty, lost_sale_qty, false_loss_qty (all number, default `0`, never
  null), total_activity (written only by the aggregator service), version (optimistic-lock column,
  incremented per applied event), last_applied_event_id, is_deleted, audit columns. Unique constraint
  on (tenant_id, product_number, line_code_id, iso_year, iso_week, location_id).
- **`sales_activity_event`** (new — replaces direct writes from all four legacy writer roles) — id,
  tenant_id, aggregate_id (FK, nullable until first event resolves it), event_type (enum:
  sale_accrual, return_accrual, transfer_out_accrual, transfer_in_accrual, lost_sale_accrual,
  lost_sale_overwrite, false_loss_accrual, manual_correction), quantity_value (delta for `*_accrual`
  types, absolute value for `lost_sale_overwrite`/`manual_correction`), source_writer (enum:
  saleshistory_save_form, saleshistory_detail_correction, salesorder_finalize, location_weekly_cron,
  migration_script), source_reference_id, occurred_at, applied_at, status (enum: pending, applied,
  rejected), rejection_reason, audit columns. Append-only.
- **`sales_activity_parked_attribute`** (new — closes R4) — id, aggregate_id (FK, unique), uom_raw,
  price_tracker_ref_raw, audit columns. Neither column is treated as active/normative until migration
  rehearsal confirms genuine population.
- **`sales_activity_outbox`** (replaces the shared out-of-module side-effect table) — id, tenant_id,
  aggregate_id (FK), line_code_id (FK), product_number, location_id (FK), enqueued_at, consumed_at,
  consumer_name. Recommend not migrating legacy rows unless a genuine downstream consumer is confirmed.

**No tables carried forward for**: the custom-field extension and group-relation satellites (R5).

**Referential integrity**: every FK above should be a real, enforced database constraint. Recommend
`RESTRICT` on delete for Line Code/Location while any dependent `sales_activity` row exists; `CASCADE`
from `sales_activity` to `sales_activity_parked_attribute` only (a true 1:1 dependent); never
cascade-delete `sales_activity_event` rows, since they are the durable audit trail behind every stored
total.

(Source: `docs_from_blueprint/module/SalesHistory/02-entities-and-fields.md`, full file.)
