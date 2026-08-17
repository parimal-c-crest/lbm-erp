# PurchaseHistory — Entities & Fields

> Every entity, every field, individually. No grouping/summarizing — that's how fields get lost.
> Legacy table/column names are a first-class column in the field catalog below, not an optional
> footnote — this project's whole documentation discipline rests on every claim being traceable to
> a specific source, and a footnote is too easy to skip. See
> `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/PurchaseHistory/02-entities-and-fields.md`, itself traced to
`blueprint/module/PurchaseHistory/01-entities-fields.md`.

## 0. Governing architectural requirements (carried forward as requirements for any new implementation)

- **R1 — single authoritative writer.** The legacy system's three confirmed accumulator writers already
  compute the identical formula byte-for-byte, and two of the three are near-verbatim duplicate function
  implementations. Requirement: consolidate all three legacy call sites into publishers of one uniform event
  type, applied by exactly one aggregator service.
- **R2 — totals are always computed, never accepted as direct input.** The legacy `DetailViewAjax.php`
  inline-edit endpoint can overwrite `total_activity` directly with no recompute. Requirement: no
  general-purpose "edit any field" surface; any manual correction is a narrow, named, audited action that
  always triggers a full recompute of `total_activity`.
- **R3 — security-by-construction: no raw string-interpolated SQL structurally available to business logic.**
  The legacy entity class carries one confirmed, unmitigated Critical SQL injection.
- **R4 — every business entity is tenant-scoped.** Platform-level requirement, carried forward explicitly
  here since the legacy field catalog documents no tenant/company column at all.

(`docs_from_blueprint/module/PurchaseHistory/02-entities-and-fields.md` §1)

## Entity List

| Entity | Purpose | Legacy Trace |
|---|---|---|
| Purchase History (Weekly Product/Location Activity Aggregate) | One row per (product number, line code, calendar week/year, main location): buy quantity, return quantity, and the derived total-activity figure, plus standard audit/ownership columns. 644 live rows, 0 soft-deleted on the source dev snapshot. | `vtiger_purchasehistory` (13 physical columns, 8 CRM-registered) |
| Purchase History Custom-Field Extension | Standard vtiger Studio custom-field companion table — structurally present but functionally empty (one column, zero live rows, no field-metadata references it). Not carried forward as a normative entity. | custom-field extension table for `vtiger_purchasehistory` |
| Purchase History Group Relation | Generic vtiger grouping/relation table referenced by the entity class as backing a "PurchaseHistory Number" search field, but with zero live rows. Not carried forward as a normative entity. | group-relation table keyed on Purchase History ID |

**Relationship summary**: the aggregate is written by three external call sites, all inside the sibling
PurchaseOrder module — neither of PurchaseHistory's own write files (`Save.php`, `DetailViewAjax.php`)
implements the accumulate-delta logic. The aggregate carries loose (non-FK'd or convention-only-FK'd)
references to Products (business-key text, not a true foreign key), Line Codes (a genuine integer foreign
key), and Location (a plain-text location name, joined by name rather than by id).
(`docs_from_blueprint/module/PurchaseHistory/02-entities-and-fields.md` §2)

## Field Catalog

### Purchase History (Weekly Product/Location Activity Aggregate)

Backed by `vtiger_purchasehistory` (13 physical columns, 8 CRM-registered).

**Identity / key fields:**

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Purchase History ID | Primary key | identifier | Yes | auto_increment | system-set | `vtiger_purchasehistory.shid` |
| Product Number | Business-facing product number/code this row's activity is bucketed under. **Not a foreign key** to the Products entity — a plain business-key text match; a live join check against the source dev snapshot found zero matches for every row (may be a dev-data artifact — see Known Gaps) | text | Yes (not-null, no default) | none | user/system-entered | `vtiger_purchasehistory.productnumber` |
| Line Code | The product's line-code classification. Physically an integer foreign key to a line-code lookup entity, though legacy metadata registration mislabels its type as mandatory text (see Known Gaps) | reference (to Line Code) | No | NULL | user/system-entered | `vtiger_purchasehistory.linecode` |
| Week | Week number (1-53 observed) this row's activity bucket covers | number | No | NULL | user/system-entered | `vtiger_purchasehistory.week` |
| Year | Calendar year this row's week bucket falls in | number | No | NULL | user/system-entered | `vtiger_purchasehistory.year` |
| Location | Display name of the location this row's activity was recorded at — a plain-text join-by-name, not a foreign key by id | text | Yes (not-null, no default) | none | user/system-entered | `vtiger_purchasehistory.mainlocation` |

**Activity counters (the module's core accumulator fields):**

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Buy Qty | Cumulative quantity purchased for this product/line-code/week/location bucket, incremented on each qualifying purchase-order finalize/append/return-goods-notification event | number | No | NULL | system-set (accumulated by PurchaseOrder-side code) | `vtiger_purchasehistory.buyqty` |
| Return Qty | Cumulative quantity returned for this bucket | number | No | NULL | system-set (accumulated) | `vtiger_purchasehistory.returnqty` |
| Total Activity | Derived net-activity total: buy quantity minus return quantity, recomputed on every accumulator write | number | No | NULL | system-set (derived) | `vtiger_purchasehistory.total_activity` |

No lost-sale, transfer-out, transfer-in, or false-loss equivalent exists on this entity — PurchaseHistory's
activity-counter surface is a strict two-counter subset of SalesHistory's six-counter shape.

**Audit / system:**

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Created Time | Row-creation timestamp | datetime | No | NULL | system-set | `vtiger_purchasehistory.createdtime` |
| Modified Time | Row-last-modified timestamp | datetime | No | NULL | system-set | `vtiger_purchasehistory.modifiedtime` |
| Creator ID | User who created this row | reference (to Employee/User) | No | 0 | system-set | `vtiger_purchasehistory.smcreatorid` |
| Owner ID | User who owns this row — nearly all live rows on the source dev snapshot are owned by a single system/admin user rather than a distributed set of individual buyers | reference (to Employee/User) | No | 0 | system-set | `vtiger_purchasehistory.smownerid` |
| Is Deleted | Soft-delete flag, set via a shared delete-framework mechanism (a real, non-degenerate delete path) | boolean | No | No | system-set | `vtiger_purchasehistory.deleted` (via shared `DeleteEntity()` framework helper) |

### Purchase History Custom-Field Extension

No individually catalogued fields beyond the identity FK. Excluded from the normative entity list.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Purchase History ID (FK) | 1:1 reference back to the header row, also this table's own primary key | identifier/reference | Yes | NULL | system-set | custom-field extension table PK/FK |

### Purchase History Group Relation

No individually catalogued business fields beyond the two below. Excluded from the normative entity list.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Purchase History ID | Reference to the Purchase History row this grouping applies to | reference | Yes | NULL | system-set | group-relation table FK |
| Group Name | The name of the group this row belongs to | text | No | NULL | unclear — no code site found in the source blueprint that writes to this table (Open Question) | group-relation table group-name column |

## Known Gaps

- **Product Number's confirmed zero-match rate against the Products entity's own product-code field** — not
  resolved as genuine production-data mismatch versus dev/test-fixture artifact. Structurally confirmed:
  this field is not database-constrained to match Products — a business-key-only relationship, never
  enforced by a foreign key.
- **Line Code's underlying legacy metadata registration mislabels its type** — registered as mandatory text
  in the legacy field-metadata table despite the physical column being a nullable integer foreign key.
- **Purchase History Group Relation's "Group Name" field has no confirmed write path anywhere** in the
  source blueprint's own code reads.
- **Whether the soft-delete flag being unset on every one of the 644 live rows reflects genuine production
  behavior or a dev-data artifact** — not resolved.
- **Whether the two-counter formula's confirmed simplicity relative to SalesHistory's six-counter shape
  reflects a genuine business difference or an intentionally-deferred/never-built feature** — not resolved
  from static code reading alone.

(`docs_from_blueprint/module/PurchaseHistory/02-entities-and-fields.md` §4)

## 5. Recommended rewrite schema — this session's own design proposal, not a blueprint finding

Everything above documents what exists today. This section is different in kind: a proposed replacement
schema, reasoned from the specific structural problems the legacy shape causes. Table/column names below are
tech-agnostic placeholders, not a commitment to any specific naming convention.

Unlike most modules in this series, this module's writer posture is already close to clean: three confirmed
call sites, all in one sibling module (PurchaseOrder), all fully parameterized, all computing the identical
`total_activity` formula byte-for-byte (requirement R1 above). This design does not invent a consistency
problem that isn't there. What it does fix is narrower and more structural.

**Problems this design fixes, one by one:**

1. **PurchaseHistory owns a writable schema it never legitimately writes to itself.** Every real write
   originates from PurchaseOrder's own three call sites; this module's own `Save.php` and
   `DetailViewAjax.php` are vestigial with respect to the accumulate-delta logic, and
   `DetailViewAjax.php`'s general-purpose inline-edit path is the confirmed mechanism by which
   `total_activity` can be silently desynchronized (R2, rule PH-RULE-013 below). **Fix**: this entity is not
   modeled as a PurchaseHistory-owned, independently-writable table. It is a derived/read-model table whose
   only write path is PurchaseOrder's own aggregator service (R1) — the module that reads a rollup and the
   module whose events actually produce it are not the same module here, and the schema should say so.
2. **The general-purpose "edit any field" surface that produced the `total_activity` desync risk (R2) has no
   structural counterpart in a derived-table design.** A table with no independent writer cannot expose an
   inline-edit endpoint that overwrites a derived total, because there is no writer to attach one to. **Fix**:
   any legitimate manual correction becomes a narrow, named, audited command handled by PurchaseOrder's own
   aggregator service, which always recomputes `total_activity` from `buy_qty - return_qty` rather than
   accepting a direct value.
3. **The loose, convention-only references to Products (business-key text) and Location (join-by-name text)
   are not database-enforced**, and Product Number's own confirmed zero-match rate against Products was
   never resolved as genuine-mismatch versus dev-data-artifact. **Fix**: `product_id` and `location_id`
   become real foreign keys in the new schema; if the zero-match finding turns out to reflect a genuine
   production business-key mismatch, that is a data-migration question to resolve before cutover, not a
   reason to keep the reference unenforced going forward.
4. **Line Code's legacy metadata mislabels its own physical type.** This is a metadata/registration defect,
   not evidence the column itself needs to change shape. **Fix**: carry `line_code_id` forward as the
   reference it already physically is, with correct metadata from the start.
5. **No confirmed unique constraint on the aggregation key.** Nothing in the legacy schema stops two rows
   from claiming the same (product, line code, week, year, location) bucket. **Fix**: an explicit unique
   constraint on the full key tuple.
6. **The two functionally-empty satellite tables** (Custom-Field Extension, Group Relation) carry no
   confirmed write path or live usage, or function unknown entirely. **Fix**: neither is carried forward
   into the new schema. If the Group Relation table's business purpose is later confirmed by a
   subject-matter expert, it can be reintroduced as a purpose-built table at that point.
7. **No tenant/company column is documented anywhere in this module's own field catalog.** **Fix**: made
   explicit here, consistent with R4.

**On `fillinventorycost.php`: this is not a schema problem.** The file is confirmed to reference none of
this module's tables at all — its misplacement is a source-tree/code-organization issue, fully resolved by
moving the file at the code level. It has no bearing on PurchaseHistory's own table design.

**Proposed tables:**

- **`purchase_history_activity`** (replaces `vtiger_purchasehistory`, closes problems 1, 3, 4, 5) — `id`
  (PK), `tenant_id` (required, closes problem 7), `product_id` (FK → Products, required — no longer a
  business-key text match), `line_code_id` (FK → Line Code lookup, nullable, correctly typed from the
  start), `location_id` (FK → Location, required — no longer a join-by-name), `week` (integer, required),
  `year` (integer, required), `buy_qty` (number, required, default 0), `return_qty` (number, required,
  default 0), `total_activity` (number, **generated/computed column or view-layer derivation, never a
  directly-writable input** — closes problem 2, enforces R2 at the schema level), audit columns
  (`created_at`/`updated_at`/`created_by`/`owned_by`), `is_deleted`/`deleted_at`. Unique constraint on
  (`tenant_id`, `product_id`, `line_code_id`, `location_id`, `week`, `year`) — closes problem 5.
- No replacement table for the Custom-Field Extension or Group Relation satellites (closes problem 6) —
  dropped, not migrated.

**On ownership**: this table's only writer in the new design is PurchaseOrder's own aggregator service (R1)
— the same service responsible for PurchaseLineItem's own equivalent write, since both are triggered by the
same three PurchaseOrder-side events today. PurchaseHistory itself, as a module, becomes a read-only
consumer of this table for reporting/display purposes; it does not carry its own independent create/update
code path. This does not ask PurchaseOrder to take on new logic it doesn't already have — it only asks the
schema to stop implying that PurchaseHistory has, or should have, a write contract of its own that the
confirmed evidence shows it has never actually exercised.

**Referential integrity**: every FK above should be a real, enforced database constraint, replacing the
legacy schema's convention-only Product/Location references. Recommend `RESTRICT` on delete for
`product_id`/`line_code_id`/`location_id` while any dependent activity row exists. Because this table has
exactly one writer by design (PurchaseOrder's aggregator service), the schema should also enforce that write
path at the access-control layer, not merely by convention — closing off the general-purpose edit surface
that produced the legacy desync risk (R2, R3) rather than merely discouraging its use.

(`docs_from_blueprint/module/PurchaseHistory/02-entities-and-fields.md` §5)
