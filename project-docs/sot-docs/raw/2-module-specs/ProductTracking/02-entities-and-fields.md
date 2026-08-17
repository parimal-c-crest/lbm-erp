# ProductTracking — Entities & Data Model

Part of the ProductTracking tech-agnostic module spec. Full legacy-system traceability for every field
below is at `blueprint/module/ProductTracking/01-entities-fields.md` (Doc1 Pass 1).

---

## 1. Governing architectural requirements

The blueprint's implementation plan (Doc2 §3) establishes decisions this document restates as
forward-looking **requirements** for any new implementation, not merely observations about the legacy
system:

**R1 — ProductTracking is preserved as a first-class, append-only audit-log entity, written exclusively
through one shared write service, not eliminated and not left as ≥26 independent direct-instantiation
call sites.** The legacy pattern is genuinely fragmented: some writers instantiate the entity directly
(≥21 confirmed files), a smaller set (≥5) funnel through a shared `ptcommonentry()` wrapper, and both
patterns coexist with no single enforced contract (Pass 6 §1). **Requirement**: every writer in the new
design calls one write-service method — one write path, one place validation/computation lives.

**R2 — Exactly one authoritative cost-basis resolution service computes the unit/net/accounting cost
figures, never independently re-derived by each of the ≥26 callers.** The legacy system's three
independent cost-override layers (GP-basis-branch default, Receiving-with-known-PO-cost, Product-Cut-
with-WAC) have no confirmed mutual-exclusivity guard, and `net_cost` (always Average Landed Cost) and
`accountingnetcost` (GP-basis-branched) genuinely diverge on the same row whenever a location runs a
non-default cost basis (Pass 4 §5 Findings 1-2). **Requirement**: the new implementation resolves the
cost basis exactly once per write, in one service, with `net_cost` derived from the same resolved value
`accounting_net_cost` uses — closing the confirmed divergence by construction.

**R3 — Security-by-construction: no raw string-interpolated SQL is reachable from business logic.** The
legacy system carries **four confirmed, unmitigated, live-reachable SQL injections** — the widest count
of any module blueprinted in this series relative to file count — one of which is reachable from an
external mobile-scanner webservice without a web session at all, the first finding of that reachability
class in this series (Pass 7 §1, §1.5). **Requirement**: the new data-access layer makes raw string-
interpolated SQL structurally unavailable to business-logic code — every write and search operation
resolves against a parameterized query builder or equivalent, never a request value spliced into a
query string. The mass-assignment gap that chains one of these injections into the module's own
everyday inline-edit endpoint is closed independently, by validating any submitted field name against
an explicit allow-list of editable domain properties before it ever reaches the write service.

**R4 — Every business entity is scoped to a tenant.** This is a multi-tenant platform, established at the
platform level outside this module's own scope, carried forward here as an explicit requirement rather
than silently assumed. **Requirement**: the entity below carries a tenant reference, and every query is
scoped per-tenant by construction, not by convention at each call site — also closing, as a byproduct,
the legacy system's own `$_SESSION['DEFAULTLOCATION']`-based scoping pattern (every ListView/export
query hardcodes the session's current default location into its `WHERE` clause) with an explicit,
structural tenant+location scope parameter instead of an implicit session global (Pass 0/5's finding,
Doc2 §3 Decision D8).

---

## 2. Entity list

**One real entity, no satellite tables at all** — even narrower than every other module blueprinted in
this series so far: a `SHOW TABLES LIKE` query against the live schema confirms no `*cf` custom-field
extension table and no `*grouprelation` group table physically exist for this module, despite
commented-out code in the entity class that references both (Pass 1 §1, Schema Drift §4.1).

| # | Entity | Business meaning | Doc1 citation |
|---|---|---|---|
| 1 | **Product Tracking Log Entry** | The sole entity — one row per quantity-on-hand-affecting event on a specific product/location: what changed (previous → new QoH), why (free-text reason), what kind of event caused it (a fixed classification set), who/what triggered it, and a costing snapshot computed at save time. Cross-references to the originating transaction (Sales Order number, Purchase Order number, Store Transfer number, BOM number, Customer PO, Vendor, Account, Sales Group) are carried as loose (non-FK) text/id columns, populated only by whichever writer produced that kind of change. Backed by `vtiger_producttracking`, **35 physical columns, 31 CRM-registered** (30 own + 1 anomalous cross-registration — see §4 below), **15,013 live rows**, dates spanning 2022-06-17 through 2026-07-13 — the smallest single-entity field catalog of any module blueprinted in this series so far, narrower even than SearchLineItem's 103-column catalog. | §01 §1 item 1, §2.1 |

**Relationship summary — a terminal audit-log leaf.** ProductTracking has no owned child/satellite
entity and is never itself the target of another entity's foreign key — no code site found anywhere in
the blueprint treats a `protrackid` as a parent reference from another table. Every relationship runs
inward (other modules write into it) rather than outward (nothing depends on a specific ProductTracking
row surviving). Confirmed directly reachable writers, joined loosely (business-key, not FK, matching
this codebase's established join style) to: Location (by location name; by line code + product number),
Products (by product number), Users (by user id, stored as text), Accounts, Vendors, and free-text
cross-references to SalesOrder/PurchaseOrder/StoreTransfer/BOM records that carry no FK constraint and
are simply whatever string the calling module's writer passed in (Pass 1 §1).

---

## 3. Full field catalog

**Scope and method.** Every field below is transcribed from `blueprint/module/ProductTracking/
01-entities-fields.md` §2 (Doc1's own field-by-field pass against the live schema, cross-checked against
a code read of the entity class and its three genuinely live write/edit paths) — nothing here is
invented, and nothing that source individually catalogued is dropped. Legacy column names, `vtiger_field`
label IDs, and file:line code citations are intentionally omitted from every row below (that is
traceability detail, not business meaning) — the full citation for any field is in
`01-entities-fields.md`. Where a field's business meaning was flagged by Doc1 as unconfirmed ("Open
Question"), that uncertainty is carried forward verbatim rather than resolved into a confident-sounding
guess.

**Logical Type legend**: `money`, `date`, `datetime`, `enum`, `text`, `number` (counts, quantities),
`boolean(-ish enum)`, `reference (to X)` (a link to another entity), `identifier` (a row's own primary-
key value).

### 3.1 Product Tracking Log Entry — Identity / location / product

| Field | Business Meaning | Type | Required? | Default | Source-of-truth |
|---|---|---|---|---|---|
| Log Id | Primary key | identifier | Yes | auto_increment | system-set |
| Location | Store/branch location this event occurred at — used as the join key (by name, not id) to Location, and hardcoded into every ListView/export query's `WHERE` clause via the current session's default location | text | Yes | none | system-set (copied by the writer) |
| Linecode | Internal line-code classification of the product involved | integer | Yes | none | system-set (copied by the writer) |
| Product Number | The product's business-facing stripped part number | text | Yes | none | system-set (copied by the writer) |

### 3.2 Product Tracking Log Entry — Quantity / classification

| Field | Business Meaning | Type | Required? | Default | Source-of-truth |
|---|---|---|---|---|---|
| Prev Qty | Quantity on hand immediately before this event | number | Yes | none | system-set |
| New Qty | Quantity on hand immediately after this event | number | Yes | none | system-set |
| Reason For Change | Free-text explanation of why the QoH changed | text | Yes | none | system-set/user-entered (writer-supplied) |
| Change Type | Fixed classification of what kind of event produced this row (e.g. "Sales Order," "Receiving," "Store Transfer" — see this module's status-workflow documentation for the live value set) | enum-like text | Yes | none | system-set — drives the save hook's QuickBooks-push branching |
| Net Effect | The net QoH change for this event (New Qty − Prev Qty), computed server-side | number | Yes | none | system-set (computed on every save) — recomputed unconditionally on every save via a direct write, never trusted from the submitted value |

### 3.3 Product Tracking Log Entry — Attribution / cross-references

| Field | Business Meaning | Type | Required? | Default | Source-of-truth |
|---|---|---|---|---|---|
| Counter Person / User | The user id (as text) associated with the event | text | No | NULL | system-set — FK-shaped but stored as plain text, not a typed reference |
| Sales Order # | Cross-reference to the originating Sales Order, if applicable | text | No | NULL | writer-supplied — this module's default drill-through/order-by target; no FK constraint |
| Purchase Order # | Cross-reference to the originating Purchase Order, if applicable | text | No | NULL | writer-supplied |
| Master Account Name | Cross-reference to a related Account | reference (to Account) | No | NULL | writer-supplied — no FK constraint |
| Sales Group Name | Free-text sales-group label associated with the event | text | No | NULL | writer-supplied |
| TRN# | Store-transfer number cross-reference | text | No | NULL | writer-supplied |
| Vendor Name | Cross-reference to a related Vendor | reference (to Vendor) | Yes | none | writer-supplied — no FK constraint |
| Customer PO | Customer's purchase-order number, if applicable | text | No | NULL | writer-supplied |
| BOM # | Bill-of-materials cross-reference number, when this row was created by a BOM-run event | text | No | NULL | writer-supplied |
| Lot Numbers | Lot number(s) associated with this event's inventory | text | Yes | none | writer-supplied |

### 3.4 Product Tracking Log Entry — Cost snapshot

| Field | Business Meaning | Type | Required? | Default | Source-of-truth |
|---|---|---|---|---|---|
| Cost | Unit cost snapshot at save time — **always sourced from Average Landed Cost regardless of the location's configured GP-basis setting** (a real formula divergence — see this module's financial/pricing-logic documentation) | money | No | NULL | system-set (computed on every save) |
| Sell Price | Unit sell price at the time of the event — **confirmed always `0`/`NULL` on all 15,013 live rows**; every writer traced in the blueprint explicitly sets this to blank | money | No | NULL | user/writer-supplied — **confirmed dead** |
| Net Cost | Cost basis × Net Effect, always computed from Average Landed Cost regardless of the location's GP-basis setting | money | No | NULL | system-set (computed on every save) |
| Accounting Cost | Direct pass-through of the caller-supplied per-unit cost value, with no multiplication or basis resolution — only set if the caller supplied it | money(text) | No | NULL | writer-supplied |
| Accounting Net Cost | Cost basis × Net Effect, resolved per the location's GP-basis setting (Average-Landed-Cost/FIFO/LIFO/default), or overridden entirely for Receiving- or Product-Cut-originated rows — the module's most-branched formula, with three independent override layers and no confirmed mutual-exclusivity guard | money | No | NULL | system-set (computed on every save) |
| Purchase Order Cost | Unit cost from the originating PO, when this row was created by a Receiving event — read (not written) by the save hook to override Accounting Net Cost | money | No | NULL | writer-supplied |
| WAC | Weighted-average-cost snapshot, either supplied by the calling writer or overridden by the save hook's Product-Cut branch | money(text) | No | NULL | writer-supplied / system-set (Product-Cut override) |
| Push To Quick Book | Whether this event should be pushed to the QuickBooks integration | enum(`Yes`/`No`) | Yes | `'No'` | writer-supplied — **990 of 15,013 live rows hold an empty string**, neither `Yes` nor `No`, despite the column's two-value enum type |

### 3.5 Product Tracking Log Entry — Warehouse / M2 / description

| Field | Business Meaning | Type | Required? | Default | Source-of-truth |
|---|---|---|---|---|---|
| Bin | Warehouse bin location, resolved WMS-aware | text | No | NULL | system-set (computed on every save) |
| Zone | Warehouse zone location, resolved WMS-aware | text | No | NULL | system-set (computed on every save) |
| Shelf | Warehouse shelf location, resolved WMS-aware | text | No | NULL | system-set (computed on every save) |
| M2 | A cross-field copy of a product custom column — business meaning of "M2" not identified anywhere in the blueprint | number | Yes | none | system-set (resynced on every save from the product's own custom-field data, looked up by product number) — **Open Question** |
| Product Description | Denormalized product name/description — registered in the CRM field catalog against the Products entity's own name column, **not** against this entity's own table — a cross-table field-registration anomaly, the same class of finding the SearchLineItem blueprint found for its own "Shipping Name" field | text | No | NULL | derived (join) — excluded from this entity's own catalog on the anomaly basis; flagged for SME confirmation |

### 3.6 Product Tracking Log Entry — Audit / system

| Field | Business Meaning | Type | Required? | Default | Source-of-truth |
|---|---|---|---|---|---|
| Created Time | Row-creation timestamp — **overwritten to the actual save moment on every save**, not just on create, including inline-edit corrections to unrelated fields | datetime | No | NULL | system-set — see this module's business-rules documentation |
| Modified Time | Row-last-modified timestamp | datetime | No | NULL | system-set — standard audit column, unlabeled in the CRM field catalog |
| Created By (session user id) | The user id who created the row — re-stamped from session on every save, same over-write behavior as Created Time | reference (to User) | No | NULL | system-set — unlabeled in the CRM field catalog |
| Modified By | The user id who last modified the row | reference (to User) | No | NULL | system-set — standard audit column; not observed being written by any traced code path |
| Is Deleted | Soft-delete flag | boolean | No | `0` | system-set — **0 of 15,013 live rows** set to deleted on the blueprint's own live snapshot; the delete path is structurally present but essentially unexercised on this tenant's data |

---

## 4. Schema notes carried forward from the blueprint

- **No `vtiger_crmentity` join, and — unlike several other modules blueprinted in this series — no
  companion custom-field or group-relation tables exist at all.** The entity class's own commented-out
  declarations describe a design (a shared entity-table join, a group table) that was apparently never
  built out; the live schema confirms only the one base table exists. This is a narrower, more literal
  version of the same finding several sibling modules' blueprints made for their own satellite tables
  (present but empty) — here the tables don't exist to begin with (Pass 1 Schema Drift §4.1).
- **One CRM field-registration row is anomalous** ("Product Description," registered against the
  Products entity's own name column, not against this entity's own table) — a Studio configuration
  artifact (copy/paste error, or intentional shared display plumbing) the blueprint could not resolve
  from static reads alone (Pass 1 Schema Drift §4.2).
- **`.sellprice` is confirmed dead/always-empty on live data** — 15,013 of 15,013 live rows hold `NULL`
  or `0`, and every writer function traced in the blueprint explicitly sets it to blank. This is not a
  coincidental data gap; it is structurally never populated with a real value by any code path found in
  the codebase (Pass 1 Schema Drift §4.3).
- **`.push_to_qb` holds an empty string on 990 of 15,013 live rows**, despite being declared a two-value
  enum with a `'No'` default. The database's own permissive configuration coerces an out-of-range enum
  assignment to an empty string rather than rejecting the write — meaning some writer path is passing a
  value that is neither of the enum's two declared members. Which specific writer(s) produce these 990
  blank rows was not identified in the blueprint (Pass 1 Schema Drift §4.4).

## 5. Known field-catalog gaps (carried forward, not resolved)

- **The exact business-meaning distinction between the two location-level cost-basis fields "Cost"/"Net
  Cost" are hardcoded to use, versus the field the "ALC" GP-basis setting maps "Accounting Net Cost" to**
  — both appear to be location-level average-cost fields, but why the module's own "default" cost source
  and its own "ALC" setting value map to two different columns was never resolved in the blueprint.
- **`M2`'s business meaning** — the field the module resyncs from a product custom column on every save;
  no CRM label or code comment anywhere in the blueprint's scope identifies what "M2" means.
- **The fieldid-4629 ("Product Description") cross-table registration** — configuration error vs.
  intentional cross-module registration, unresolved.
- **Which writer(s) produce the 990 blank-`push_to_qb` rows** — not identified; would require tracing
  every one of the module's ≥26 writer files' own `push_to_qb` assignment against the live data's
  creation-time/change-type distribution, out of the blueprint's own budget.
- **Whether `'Sales Order - Manual QoH Update'`, `'Quick Edit'`, and `'Product Cut'` — three of the four
  `change_type` values the save hook's own QuickBooks-push branch explicitly checks for by exact
  string — are live values on any other tenant.** Zero live rows exist under those exact strings on the
  blueprint's own dev snapshot; the code branches checking for them are real, confirmed code, simply
  unexercised on this specific tenant's data.
- **Eight fields (`.salesorder`, `.purchaseorder`, `.stnumber`, `.bomnumber`, `.customer_po`,
  `.accountid`, `.salesgroupname`, `.vendor_id`) are legitimately "populate whatever the calling module
  hands you" pass-through columns** — cataloged as writer-supplied cross-references, but no later
  blueprint pass traces a specific field's population rule to a specific writer file/line beyond the
  module-level writer map. Not treated as a coverage gap requiring action; this is the same class of
  field every other module's own consolidation review found doesn't need individual re-derivation.
- **`.lot_numbers` is a true orphan** — cataloged in the field catalog, but never referenced by any later
  blueprint pass and never touched by the module's own save hook.

## 6. No new schema proposal in this document

Unlike this specification's own SearchLineItem file (which carries a "recommended rewrite schema"
section reasoned from confirmed structural problems in that module's field set), this document does not
propose a new schema design of its own. The blueprint's own field-coverage finding is that
ProductTracking's schema is already the cleanest of any module blueprinted in this series — zero true
orphan clusters beyond the three individually-noted items above, zero cross-document contradictions, and
a 10-rule spot-check that found 0/10 naming drift (Doc1 Pass 8 §1-§3). The structural problems this
module's specification addresses instead concern *how the entity is written to* (§1 R1, R2) and *how
securely* (§1 R3) — not the shape of the entity's own columns.
