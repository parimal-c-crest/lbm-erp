# PurchaseLineItem — Entities & Fields

> Every entity, every field, individually. No grouping/summarizing — that's how fields get lost.
> Legacy table/column names are a first-class column in the field catalog below, not an optional
> footnote — this project's whole documentation discipline rests on every claim being traceable to
> a specific source, and a footnote is too easy to skip. See
> `_deviations-from-original-template.md` in this folder.
>
> Source: `docs_from_blueprint/module/PurchaseLineItem/02-entities-and-fields.md`, itself traced to
> `blueprint/module/PurchaseLineItem/01-entities-fields.md`.

## Governing architectural requirements (carried forward as forward-looking requirements)

- **R1** — PurchaseLineItem remains a separate, physically-materialized read-model, not eliminated in
  favor of querying PurchaseOrder's own line-item aggregate directly. Real, multi-surface reporting
  consumers (five `Customreport` files, a Forecasting cron, a Location formula field, a Products-detail
  popup aggregation) already depend on a stable, query-optimized snapshot of *committed* purchase lines.
- **R2** — Exactly one calculation path computes the cost-extension fields, regardless of which of the six
  legacy trigger points originates the write (closes the six-writer divergence documented in §"Known
  gaps" below and in `calculations.md`).
- **R3** — Security-by-construction: no operation may accept a raw, unparameterized SQL fragment built
  from request data (closes the confirmed SQL injection in the audit-timestamp re-stamp; see
  `business-rules-and-validation.md` PLI-RULE-005).
- **R4** — The inline-edit capability is scoped to the correct entity by construction, not by convention
  (closes the wrong-entity-class bug in `DetailViewAjax.php`; see `business-rules-and-validation.md`
  PLI-RULE-010).
- **R5** — Every business entity is scoped to a tenant (platform-level requirement, carried forward
  explicitly rather than silently assumed).

## Entity List

| Entity | Purpose | Legacy Trace |
|---|---|---|
| Purchase Line Item (Purchase-Order-Line Snapshot) | One row per received/finalized PO line, or a Receiving-flow buyout/append event: vendor, parent PO number, transaction type, PO date (line-committed date, not PO header date), product/line-code, purchased qty/cost/core-cost and their extensions, receiving location, ASN number if matched. The sole real, business-content-bearing entity in this module. | `vtiger_purchaselineitem` |
| Purchase Line Item Custom-Field Extension | Standard vtiger Studio custom-field companion table. Structurally live (1,100 rows, one per header row) but carries **zero business columns** — no `vtiger_field` row references it. | `vtiger_purchaselineitemcf` (per convention; entity class's declared custom-field table) |
| Purchase Line Item Group Relation | Grouping context for a line item — business meaning unconfirmed; no code site was found anywhere that writes to either candidate table. Two candidate tables exist in the live database (see Known Gaps below); the entity class references the smaller, non-conventionally-named, unindexed one. | `vtiger_pligrouprelation` (entity class's own declared table, unindexed) vs. `vtiger_purchaselineitemgrouprelation` (indexed, matches codebase naming convention, unreferenced by any code found) |

**Relationship summary**: A Purchase Line Item is created by one of six independent writer code paths —
five that create new rows, one (`POReconciliation`) that only updates an existing row during
cost-variance reconciliation. All six live outside this module's own files. Beyond the write side, a
Purchase Line Item carries loose (non-foreign-key-enforced, business-key or plain-value) references to:
PurchaseOrder (via PO number), Vendors (via vendor id and denormalized vendor number), Products (via
product number and product id), Location (via a location display-name field), and a shared
SalesOrder/PurchaseOrder transaction-code table.

## Field Catalog

### Purchase Line Item (Purchase-Order-Line Snapshot)

Backed by `vtiger_purchaselineitem`, 23 physical columns, 17 individually CRM-registered. 1,100 live
rows, dates spanning 2022-06-22 through 2026-04-15. **Zero rows have the soft-delete flag set** — the
mechanism exists structurally but is unexercised on this dev data.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Purchase Line Item ID | Primary key | identifier | Yes | auto_increment | system-set | `vtiger_purchaselineitem.pliid` |
| Vendor Name | Reference to the Vendors entity; copied at write time from the PO's own vendor | reference (to Vendor) | Yes | NULL | system-set (copied) | `vtiger_purchaselineitem.vendor_id` |
| PO Number | The parent Purchase Order's user-facing number (e.g. a standard PO number or an RGN-prefixed return number) | text | Yes | NULL | system-set (copied) | `vtiger_purchaselineitem.ponumber` |
| Transaction Code | Purchase-type classification. Live values on this dev snapshot: a "Normal Sale" code (1,072 of 1,100 rows — reused from a table authored for the sales side, meaning normal/regular purchase here) and a "Normal Return" code (28 of 1,100 rows). See Known Gaps, Schema Drift finding 2. | enum(code) | Yes | NULL | system-set (copied) | `vtiger_purchaselineitem.transaction_code`, joined against the shared `vtiger_sotransaction` table |
| PO Date | The date the line was *committed* (a write-time date computation), **not** the parent PO's own header-level date field — see Schema Drift finding 3. | date | Yes | NULL | system-set (write-time computation, not copied) | `vtiger_purchaselineitem.podate` |
| Linecode | Internal line-code classification of the product purchased. Source column differs by writer, and one writer applies an extra name-resolution step the others don't — see Schema Drift finding 4. | number/reference | No | NULL | system-set (copied; source varies by writer) | `vtiger_purchaselineitem.linecode` |
| Product Number | The product's business-facing number/code | text | Yes | NULL | system-set (copied) | `vtiger_purchaselineitem.productnumber` |
| Purchased Qty | Quantity purchased/received on this line | number | Yes | `0.00` | system-set (copied) | `vtiger_purchaselineitem.purchasedqty` |
| Purchased Cost | Unit purchase cost for this line, formatted to 3 or 4 decimal places depending on which writer produced the row | money | No | NULL | system-set (copied) | `vtiger_purchaselineitem.purchasedcost` |
| Core Cost | Unit core-charge cost for this line | money | No | NULL | system-set (copied) | `vtiger_purchaselineitem.corecost` |
| Purchased Cost Ext. | Purchased Cost × Purchased Qty — computed independently by every writer, not by a shared function | money | No | NULL | system-set (derived) | `vtiger_purchaselineitem.purchasedcostext` |
| Core Cost Ext. | Core Cost × Purchased Qty — same multi-writer pattern | money | No | NULL | system-set (derived) | `vtiger_purchaselineitem.corecostext` |
| Location | Display name of the receiving/purchasing location | text | Yes | NULL | system-set (copied) | `vtiger_purchaselineitem.location` |
| Line Number | This line's ordinal position within its parent PO/receiving batch | number | Yes | NULL | system-set | `vtiger_purchaselineitem.linenumber` (physical column is integer, despite a CRM-registered type description that suggests text — see Known Gaps) |
| Productid | Internal numeric identifier of the product purchased | number/reference | Yes | NULL | system-set | `vtiger_purchaselineitem.productid` |
| ASN # | Advance Shipment Notice number this line was matched against, if any — set via a narrow post-creation update, not at initial write | text | No | NULL | system-set (post-write update) | `vtiger_purchaselineitem.asnnumber` |
| Vendor Number | The vendor's business-facing vendor number, denormalized. Re-derived on every save (idempotent unless the vendor's own number changes between writes). | text | No | NULL | system-set (post-write update, every save) | `vtiger_purchaselineitem.vendornumber` |
| Total Sq Ft | Total square footage represented by this line, for square-foot-priced non-stock products. Only one of the module's six writers populates this — see Schema Drift finding 5. | number | No | `0.00` | system-set (copied; only one writer populates it) | `vtiger_purchaselineitem.total_sq_ft` |

**Audit / system fields (no individual CRM label, 6 columns, all fully resolved by naming convention and
writer-code usage — no true orphans):**

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Created Time | Row-creation timestamp | datetime | No | NULL | system-set (via a raw, unparameterized re-stamp — see `business-rules-and-validation.md` PLI-RULE-005) | `vtiger_purchaselineitem.createdtime` |
| Modified Time | Row-last-modified timestamp | datetime | No | NULL | system-set (same path) | `vtiger_purchaselineitem.modifiedtime` |
| SM Creator ID | The user who created this row | reference (to User) | No | `0` | system-set | `vtiger_purchaselineitem.smcreatorid` |
| SM Owner ID | The row's owning user (defaults to creator) | reference (to User) | No | `0` | system-set | `vtiger_purchaselineitem.smownerid` |
| Is Deleted | Soft-delete flag | boolean(int) | No | `0` | system-set (via the generic, shared delete mechanism — this module, unlike some others, does not bypass it with a direct update) — 0 of 1,100 live rows set | `vtiger_purchaselineitem.deleted` |

### Purchase Line Item Custom-Field Extension

No individually CRM-labeled fields exist for this table. It has exactly one physical column but —
unlike a fully-empty companion table — 1,100 live rows, populated automatically as a structural side
effect of the entity class's own declared table list.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Purchase Line Item ID (FK) | 1:1 foreign key back to the header row, also this table's own primary key | identifier/reference | Yes | NULL | system-set | `vtiger_purchaselineitemcf.pliid` (per naming convention; the entity class's own custom-field table declaration) |

### Purchase Line Item Group Relation

No individually CRM-labeled fields exist for this table; referenced only by the entity class's own
declared "group table" property. See Known Gaps, Schema Drift finding 1, for the two-candidate-table
ambiguity.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Purchase Line Item ID | Foreign key to the header row this grouping applies to | reference (to Purchase Line Item) | Yes | NULL | system-set | `vtiger_pligrouprelation.pliid` (referenced candidate) |
| Group Name | The name of the group this line belongs to | text | No | NULL | unclear — **Open Question**: no code site found anywhere that writes to either candidate table | `vtiger_pligrouprelation.groupname` (unindexed, referenced) vs. `vtiger_purchaselineitemgrouprelation.groupname` (indexed, unreferenced) |

## Known Gaps

- **No true orphan fields exist.** Every one of this entity's 23 physical columns — all 17 CRM-labeled
  and all 6 unlabeled audit/system columns — is fully explained, either by a direct CRM label or by
  column-name convention and confirmed writer-code usage. This is the cleanest field-coverage result of
  any module processed under this method to date.
- **The extension fields (`Purchased Cost Ext.`, `Core Cost Ext.`) are computed six different times by six
  different writers, with confirmed precision divergence.** See `calculations.md` for the full formula
  comparison and the R2 fix.
- **`.total_sq_ft` is populated by only one of the module's six writers** — the other five leave the
  column at its schema default. Not necessarily a bug (the non-stock-square-footage use case may
  genuinely only apply to that one write path), but a real cross-writer inconsistency, not resolved in
  the source blueprint.
- **`.linecode`'s source column and transformation step differ by writer** — one writer converts a
  "Groups"-labeled source column through a name-resolution step before assigning it; the other writers
  assign a differently-labeled "Line Code" source column directly, with no conversion step. Whether
  "Groups" and "Line Code" represent the same underlying concept under two different labels was not
  resolved in the source blueprint.

### Schema drift findings (carried forward verbatim, not resolved)

1. **Two group-relation tables exist in the live database; the entity class references the smaller,
   unindexed, non-conventionally-named one, while the conventionally-named, indexed one sits unreferenced
   by any code found in the source investigation.** `vtiger_pligrouprelation` (1 live row, no index on its
   group-name column) is the one the entity class actually points at; `vtiger_purchaselineitemgrouprelation`
   (0 live rows, group-name column *is* indexed, matches naming convention) is never referenced by any
   code found. Neither table has enough live data to determine intended use with confidence — flagged for
   SME confirmation before any grouping feature is (re)built.
2. **The Transaction Code field reuses a shared table originally authored for the sales side
   (SalesOrder), not a purchasing-specific one.** The live values on this table ("Normal Sale" used here
   to mean a normal/regular *purchase*, "Normal Return") are a genuine cross-module shared-reference-data
   finding.
3. **The PO Date field is a write-time date computation, not a copy of the parent PO's own header date
   field.** Every writer sets this field to the date of the status transition or append event, not the
   PO's own creation or header date. For a PO finalized days after creation, this field diverges from the
   PO's own header date.
4. **The Linecode field's source column differs by writer, and one writer applies an extra
   name-resolution step the others don't.** A candidate for a real cross-writer-consistency bug, not
   fully resolved — flagged for SME review.
5. **The Total Sq Ft field is populated by only one of the module's six writers.**

### Open Questions

1. Which of the two group-relation tables was actually intended, and whether the 1 row in the
   currently-referenced table represents real data or test/leftover data — unresolved.
2. Whether "Groups" and "Line Code" are the same underlying concept under two different labels, or a
   genuinely different classification picked up by one writer versus the other four — not resolved.
3. The real-world purpose of the group-relation "group name" concept — no write-site code was found for
   either candidate table anywhere in the source investigation.
4. A labeling/physical-type mismatch on the Line Number field (its CRM-registered type description
   suggests a text-shaped field despite the physical column being a true integer) — not investigated
   further in the source blueprint.
5. Whether the Receiving module's one confirmed write path is its only write path, or whether other
   Receiving-module code writes this table directly, bypassing the entity class entirely — not closed out
   in the source blueprint.

---

## Recommended rewrite schema (§7 addendum — this session's own design proposal, not a blueprint finding)

Everything above documents what exists today. This section is different in kind: a proposed replacement
schema, reasoned from the specific structural problems the legacy shape causes. Table/column names below
are tech-agnostic placeholders, not a commitment to any specific naming convention.

**Problems this design fixes, one by one:**

1. **Two candidate group-relation tables exist, and it is genuinely unresolved from available evidence
   which one was intended** — one has 1 live row and no index on its group-name column (the one the entity
   class actually references), the other has 0 live rows, an indexed group-name column, and matches this
   codebase's own naming convention, but is referenced by no code found anywhere. Neither row count is
   enough to settle intent. **Fix**: collapse to **one** table going forward (structural resolution
   below), but flag the *data/semantics* question — whether "group" means anything business-real at all,
   given no writer was found for either candidate — for explicit SME confirmation before this capability
   is rebuilt or repopulated. This design does not guess at a business meaning that was never confirmed to
   exist.
2. **The cost-extension fields are computed independently in six different writers, with confirmed
   precision divergence (3 vs. 4 decimal places) and no shared function** — the same class of problem as
   SalesHistory's four-writer divergence. R1 already establishes that this entity stays a dedicated,
   projection-populated read-model rather than being merged into PurchaseOrder's aggregate; R2 already
   establishes exactly one shared calculation function as the intended fix at the application layer.
   **Fix here is the schema-level backstop for that same decision**: the extension columns are not
   writable inputs at all — they are database-computed (generated/derived) from the stored
   `purchased_cost`/`core_cost`/`purchased_qty` columns, so a seventh writer added later structurally
   cannot restate the formula independently, because there is no column for it to write to.
3. **The copy-pasted primary-key bug in `LoadList.php`** — a related-record loader hardcoding a different
   module's own PK column name into this module's branch — was possible in the first place because every
   module in the legacy schema names its own primary key differently (`pliid`, `<othermodule>id`, etc.),
   so a copy-pasted branch silently compiles against the wrong column name with no structural signal.
   **Fix**: every table in the new schema uses the same primary-key column name (`id`) system-wide. A
   copy-pasted branch referencing the wrong table still fails on the wrong *table*, but can no longer fail
   on a wrong, module-specific *column name* — the specific bug shape found here is closed by
   construction, not just by more careful review.
4. **The custom-field extension companion table is structurally live (1,100 rows, one per header row) but
   carries zero business columns** — ongoing per-row storage and join cost for no value. **Fix**: do not
   carry it forward as a separate physical table. If Studio-style ad-hoc custom fields are still wanted,
   model them as a genuinely optional extensible mechanism (e.g. a single nullable JSON/EAV column on the
   header row) that costs nothing when unused, rather than a second table populated unconditionally as a
   side effect of class wiring.
5. **`Location` and several reference-style fields are loose, non-FK-enforced text/display-name values**,
   not real foreign keys — nothing stops a row referencing a location or product that no longer exists.
   **Fix**: real foreign keys throughout, enforced at the database level.
6. **No tenant column is asserted anywhere in the legacy field catalog**, only carried forward here as
   requirement R5. **Fix**: add it explicitly on every table below.

**Proposed tables:**

- **`purchase_line_item`** (replaces `vtiger_purchaselineitem`) — `id` (PK), `tenant_id`,
  `purchase_order_id` (FK → PurchaseOrder's own header table, **new** — a real foreign key alongside the
  legacy's loose PO Number text, closes problem 5), `vendor_id` (FK → Vendor), `vendor_number` dropped as
  a stored column — derive it via the `vendor_id` join at read time instead of a save-time-re-derived
  denormalization (closes the "re-derived on every save" pattern), `transaction_code_id` (FK → a shared,
  explicitly cross-domain transaction-code reference table — kept shared rather than reinvented as a
  purchasing-only enum, per Schema Drift finding 2's own recommendation), `line_committed_date` (renamed
  from the legacy's misleading "PO Date" label, per Schema Drift finding 3 — a write-time event date, not
  the PO's own header date), `line_code_id` (FK, nullable — resolves to a single source column and a
  single transformation step at the projection layer, closing Schema Drift finding 4's writer-divergence
  question by construction: there is one projection function, not six), `product_id` (FK → Product,
  required), `product_number` dropped as a separately stored column for the same denormalization reason as
  `vendor_number`, `purchased_qty` (required), `purchased_cost`, `core_cost`, `purchased_cost_ext` and
  `core_cost_ext` (**generated/derived columns**, `= purchased_cost * purchased_qty` and
  `= core_cost * purchased_qty` respectively, single documented rounding policy, not writable — closes
  problem 2), `location_id` (FK → Location, replacing the legacy's display-name text, closes problem 5),
  `line_number` (integer — explicitly typed as such, resolving Open Question 4's labeling mismatch),
  `asn_number` (nullable), `total_sq_ft` (nullable, default `0` — kept nullable rather than defaulting to
  a populated `0.00` for the five writers that don't use it, so "not applicable" and "confirmed zero" are
  distinguishable), audit columns (`created_at`/`updated_at`/`created_by`/`updated_by`),
  `is_deleted`/`deleted_at`.
- **`purchase_line_item_group`** (replaces *both* `vtiger_pligrouprelation` and
  `vtiger_purchaselineitemgrouprelation`, closes problem 1) — `id` (PK), `tenant_id`,
  `purchase_line_item_id` (FK → `purchase_line_item`, required), `group_name` (indexed — carrying forward
  the *indexed* candidate's structural shape, since an unindexed FK-adjacent lookup column is a defect
  regardless of which table was "intended"), unique on (`purchase_line_item_id`, `group_name`), audit
  columns. **This table's population is left empty/unused until SME confirmation** of what "group" is
  meant to represent — the schema is ready to receive real data, but no migration script should backfill
  guessed values from either legacy candidate without that confirmation, since neither had a confirmed
  writer.

**On the cost-extension calculation** (closes problem 2, restates R2 at the schema level): even with
generated columns, the *inputs* (`purchased_cost`, `purchased_qty`) still need one owned write path per
R1's projection-mechanism requirement, since multiple upstream events (PO finalize, PO append, PO reverse,
Receiving append, ASN backfill, POReconciliation correction) legitimately need to produce a row or update
one. This design does not attempt to collapse those six *event sources* into one — that would contradict
R1's own multi-writer business reality — but it does collapse them to one *calculation path*: every event
source calls the same projection function, and that function is the only code permitted to write
`purchased_cost`/`purchased_qty`, with the extension columns computed by the database from whatever that
function wrote. POReconciliation's read-then-write correction remains a legitimate second call into that
same function, not a seventh independent formula restatement.

**Referential integrity**: every FK above should be a real, enforced database constraint — the legacy
schema's PO/Vendor/Product/Location references are confirmed to work only by loose business-key or
plain-value convention, which is exactly the shape of gap that let the group-relation ambiguity and the
PK-name copy-paste bug both go undetected. Recommend `RESTRICT` on delete for
`purchase_order`/`vendor`/`product`/`location` while any dependent `purchase_line_item` row exists, and
`CASCADE` on delete from `purchase_line_item` to `purchase_line_item_group`, since a group row has no
independent meaning once its header row is gone.
