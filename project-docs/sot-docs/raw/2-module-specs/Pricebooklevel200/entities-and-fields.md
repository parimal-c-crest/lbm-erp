# Pricebooklevel200 — Entities & Fields

> Every entity, every field, individually. No grouping/summarizing — that's how fields get lost.
> Legacy table/column names are a first-class column in the field catalog below, not an optional
> footnote — this project's whole documentation discipline rests on every claim being traceable to
> a specific source, and a footnote is too easy to skip. See
> `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/Pricebooklevel200/02-entities-and-fields.md`, itself transcribed from
`blueprint/module/Pricebooklevel200/01-entities-fields.md` ("Pass 1"). Legacy Trace values below are copied
verbatim from Pass 1 §2.

## Governing architectural requirements (carried forward as forward-looking requirements, not merely observations)

Per `docs_from_blueprint/module/Pricebooklevel200/02-entities-and-fields.md` §1 (Decisions D1-D10 of the source
blueprint's own implementation plan):

- **R1** — The rule-line entity should get a real foreign key to its parent sheet, not a string join. The
  legacy rule table has no foreign-key column of any kind back to its own parent sheet header — every join is
  by sheet *name* string equality.
- **R2** — The rule-line entity should have one, first-class, unambiguous owner. The legacy rule table is
  physically declared as belonging to a separate, sibling module (`Level200rules`), yet Pricebooklevel200's own
  files are that table's dominant, real-world writer via five independent raw-SQL write paths, with no
  coordinating lock or shared write-path abstraction found between the two modules. **Explicitly flagged as not
  resolvable unilaterally by this document alone** — pending `Level200rules`'s own separately-authored
  blueprint.
- **R3** — The account-assignment relationship should be a real many-to-many relationship, not a
  pipe-delimited string field. The legacy system assigns a price sheet to an account by appending/removing/
  overwriting a pipe-delimited substring inside a single shared text field, via three independently-reachable,
  semantically-inconsistent write paths (one of which overwrites/clears the whole field rather than appending
  or removing one value).
- **R4** — The seven rule-scope dimensions should be type-consistent. Six of the rule entity's seven
  scope-dimension columns are integers; the seventh (the product-id dimension) is a variable-length string.
- **R5** — Every business entity should be scoped to a tenant (multi-tenant platform requirement, carried
  forward explicitly rather than silently assumed).

## Entity List

| Entity | Purpose |
|---|---|
| Price Sheet (header) | The named, optionally account- and/or job-scoped Master Price Sheet record: its identity, scoping, active/inactive status, effective dates, and default pricing-method configuration. |
| Price Sheet Rule (line item) | One pricing rule on a sheet, scoped against up to 7 product dimensions, carrying the net price (or GP-derived fallback) the pricing engine resolves to. |
| GP Color-Code Level (settings) | A fixed, 5-row settings entity mapping a GP%-range to a display color, used to visually flag a rule's margin health. Not tied to any one price sheet — tenant-wide. |
| Account Price-Sheet Assignment | The relationship recording which price sheet(s) are assigned to which customer account(s). In the legacy system this is a pipe-delimited multi-value string field, not a distinct entity — carried forward here as a first-class relationship per Requirement R3. |

**Not carried forward as a normative business entity**: a dormant/dead "Level100rules-adjacent sub-system" —
three files/methods referencing a "100 level" pricing tier, module, and set of tables confirmed absent from the
codebase and database entirely. Legacy dead code referencing an already-removed concept, not a real entity —
noted here for completeness and carried forward in `risks-and-open-questions.md`, not as schema.

**Relationship summary**: A Price Sheet has one or more Price Sheet Rules (see R1/R2 on the current no-FK,
dual-ownership relationship), is assigned to zero or more Accounts via the Account Price-Sheet Assignment
relationship (see R3), may be linked to zero or one Job, and — at pricing-computation time — is resolved by an
upstream caller (outside this module's own scope) to a specific account's applicable price sheet, whose rules
are then matched against a sale line's own product attributes via the 7-dimension specificity-scored mechanism
(see `calculations.md`). GP Color-Code Level is not tied to any Price Sheet — it is a single, tenant-wide
settings entity referenced only by the rule-editing UI.

## Field Catalog

### Price Sheet (header)

Backed by `vtiger_pricebooklevel200`, 21 physical columns (13 with CRM-style field labels, 8 without).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Price Book ID | Primary key | identifier | Yes | auto_increment | system-set | `.pricebooklevelid` |
| Price Book Name | The sheet's display name (auto-generated for job/POS-origin sheets); also this entity's own `list_link_field` | text | Yes | NULL | user- or system-entered | `vtiger_field` 1002; `.pricebookname` |
| Price Book Description | Free-text description | text | No | NULL | user-entered | `vtiger_field` 1565; `.pricebooklevel_desc` |
| Start Date | Effective start date for this sheet | date | No | NULL | user-entered | `vtiger_field` 4042; `.mps_start_date` |
| End Date | Effective end date — read and displayed in one UI callback, but not confirmed evaluated as a pricing gate anywhere in the live pricing-computation path | date | No | NULL | user-entered | `vtiger_field` 4043; `.mps_end_date` |
| Status | `Active`/`Inactive` — confirmed read as a live, unconditional pricing gate: a sheet flipped to Inactive is excluded from pricing resolution entirely | enum | No | `Inactive` | user-entered | `vtiger_field` 4044; `.mps_status` |
| Master Account | The account this sheet is scoped to, stored as the account's own number string, not a foreign-key reference | text (reference-shaped) | No | NULL | user- or system-entered | `vtiger_field` 4082; `.account_number` — joined to `vtiger_accountscf.cf_658` by string equality |
| Future Master Price Sheet | Picklist reference to a sheet intended to supersede this one — no evaluation of this field found anywhere in the source blueprint's read scope | enum (reference-shaped) | No | NULL | user-entered | `vtiger_field` 4083; `.future_mps` |
| Job Name | Reference to the job this sheet is scoped to | reference (to Job) | No | NULL | user- or system-entered | `vtiger_field` 4086; `.jobid` (FK to `lbm_jobs.jobid`) |
| Creation Date | Row-creation timestamp | datetime | No | NULL | system-set | `vtiger_field` 4103; `.createdtime` |
| Item Specific Sheet | Whether this sheet's rules apply per-item, or the sheet instead falls back to a location-base-price lookup at a chosen price level — read as a live pricing-path branch | enum (boolean-shaped) | No | `No` | user-entered | `vtiger_field` 4411; `.mps_item_specific` |
| Price Off | Which base price level a non-item-specific sheet's fallback price is computed off — read live alongside Item Specific Sheet | enum | No | `CM` | user-entered | `vtiger_field` 4412; `.mps_gp_pricelevel` |
| Default Penny Round Up | A penny-rounding default for this sheet's computed prices — no evaluation found anywhere in the traced live pricing path | enum (text) | No | NULL | user-entered | `vtiger_field` 4517; `.mps_default_penny_round` |
| Price Method | Free-text/picklist default pricing-method label (e.g. "GP%") — no evaluation found in the traced pricing path; appears descriptive/UI-only | enum (text) | No | `GP%` | user-entered | `vtiger_field` 4518; `.mps_price_method` |
| Display-Fields Configuration | Which optional product-attribute columns (brand/profile/color/manufacturer) this sheet's rule grid displays | json | No | NULL | system-set (built by `Save.php`) | `.productfieldsdisplayjson` |
| Last Modified | System-set last-modified timestamp | datetime | No | NULL | system-set | `.modifiedtime` |
| Created By | Reference to the creating user | reference (to User) | No | `0` | system-set | `.smcreatorid` (FK to `vtiger_users.id`) |
| Owner | Reference to the owning user | reference (to User) | No | `0` | system-set | `.smownerid` (FK to `vtiger_users.id`) |
| Soft-Delete Flag | Whether this row is soft-deleted | boolean | No | `0` | system-set | `.deleted` |
| Price-Basis Selector | Which of the last-12-months "history and cost" price-basis fields this sheet's price method compares against, populated alongside Price Method — role/relationship to Price Method / Price Off not fully disambiguated | text | No | `''` | user-entered | `.pricelevel` |
| 100-Level Override Flag | A 3-state override flag whose exact business meaning was not resolved — the column name itself directly references the confirmed-dead "100 level" tier, and no code path reading this column was found anywhere; flagged as the single highest-priority schema open question | enum (3-state) | Yes | `'0'` | system/user-set | `.override100level` |

### Price Sheet Rule (line item)

Backed by `vtiger_level200rules`, 21 physical columns, none carrying CRM-style field labels (no `vtiger_field`
rows — a pure detail table, physically owned in the legacy system by the sibling `Level200rules` module's own
entity class).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Rule ID | Primary key | identifier | Yes | auto_increment | system-set | `.ruleid` |
| Price Book Name | String join key back to the parent Price Sheet's own name — no foreign-key column of any kind exists (see Requirement R1) | text | Yes | NULL | system-set (copied from the parent sheet's own name at rule-creation time) | `.pricebookname` |
| Line Code | Scope dimension 1 of 7; empty means "matches any" for this dimension | reference (to Line Code) | No | `0`/NULL | user-entered | `.linecode` |
| Subline | Scope dimension 2 of 7 | reference (to Subline) | No | `0`/NULL | user-entered | `.subline` |
| Product Division | Scope dimension 3 of 7 | reference (to Product Division) | No | `0`/NULL | user-entered | `.productdivision` |
| Product | Scope dimension 4 of 7 — stored as a variable-length string, unlike the other 6 dimensions' integer type, an inconsistency flagged for correction (Requirement R4) | reference (to Product) | No | NULL | user-entered | `.productid` (`varchar(100)`) |
| Brand | Scope dimension 5 of 7 | reference (to Brand) | No | `0`/NULL | user-entered | `.brand_id` |
| Color | Scope dimension 6 of 7 | reference (to Color) | No | `0`/NULL | user-entered | `.color_id` |
| Manufacturer | Scope dimension 7 of 7 | reference (to Manufacturer) | No | `0`/NULL | user-entered | `.manufacturer_id` |
| Net Price | The rule's own resolved sell price — used directly as the sale price when non-zero | money | No | `0` | user-entered | `.netprice` |
| UOM Type | Which unit-of-measure basis this rule's Net Price is expressed in | enum (text) | No | NULL | user-entered | `.uom_type` |
| MPS GP | A stored gross-profit figure computed/entered alongside Net Price; used as the divisor input to the fallback pricing formula when Net Price is zero | number (decimal) | No | `0.000` | user- or system-computed (`calcAvgGP()`) | `.mpsgp` |
| MPS GP Title | Label for which price-level basis MPS GP was computed against | text | No | `CM` | user-entered | `.mps_gp_title` |
| CM GP % | A stored GP-percentage figure computed against one cost basis | number (decimal) | No | `0.000` | user- or system-computed | `.cm_gp_percentage` |
| AWC GP % | A stored GP-percentage figure computed against a second (average-weighted-cost) cost basis | number (decimal) | No | `0.000` | user- or system-computed | `.awc_gp_percentage` |
| Created | Row-creation timestamp | datetime | No | NULL | system-set | `.createdtime` |
| Modified | Row-last-modified timestamp | datetime | No | NULL | system-set | `.modifiedtime` |
| Created By | Reference to the creating user | reference (to User) | No | `0` | system-set | `.smcreatorid` |
| Owner | Reference to the owning user | reference (to User) | No | `0` | system-set | `.smownerid` |
| Soft-Delete Flag | Whether this rule row is soft-deleted — legacy deletion is bulk, by parent sheet name, not per-rule | boolean | No | `0` | system-set | `.deleted` — confirmed 0 of 187 live rows currently soft-deleted on the source blueprint's dev snapshot |
| Default Penny Round | A per-rule penny-round override — not confirmed consumed by the live pricing computation | text | No | `''` | user-entered | `.default_penny_round` |

### GP Color-Code Level (settings)

Backed by `vtiger_gpcolorcode200level`, 4 physical columns, no CRM-style field labels.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Level ID | Primary key, a fixed 1-5 range — a static 5-row seed table, not a general-purpose growing table | identifier | Yes | none (no auto-increment) | system-seeded | `.id` |
| Lower Bound | The GP% range's lower bound for this level | number (decimal) | Yes | `0.00` | system-computed (cascading recalculation via `UpdateGPCOlorCodeRange.php`) | `.lower` |
| Upper Bound | The GP% range's upper bound for this level | number (decimal) | Yes | `0.00` | system-computed | `.higher` |
| Color Code | Display color for this level's visual margin-health flag | text | Yes | NULL | user-entered (color picker) | `.colorcode` |

### Account Price-Sheet Assignment (relationship — currently a shared, pipe-delimited field, not a distinct table)

Not a physically distinct table in the legacy system — a single shared text field on the Account entity's own
extension table, written by three of this module's own independent code paths. Carried forward here as a
relationship per Requirement R3.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Assigned Price Books/Plans | A pipe-delimited, multi-value list of price-sheet names assigned to this account — physically owned by the Accounts module, not this one, and shared, per the source blueprint's own naming, with the sibling `Pricebooklevel300`/`800` modules' own identically-shaped assignment mechanism (unresolved cross-tier question, see `integrations.md`) | text (multi-value, denormalized) | No | NULL | system-set (3 inconsistent write paths, see `business-rules-and-validation.md` rules PBL200-RULE-029 to PBL200-RULE-035) | `vtiger_accountscf.cf_984` |
| Account Number | The account's own display/lookup number, matched by string equality against the Price Sheet header's own Master Account field | text | No | NULL | system-set | `vtiger_accountscf.cf_658` |

## Known Gaps

- **`.override100level` (the "100-Level Override Flag" field)** is used in the schema and is a `NOT NULL`
  column with a default, yet no code path anywhere in the module's own files, or in the live
  pricing-computation function, was found to read it — flagged as the highest-priority schema open question: is
  this a further dead artifact of the confirmed-removed "100 level" pricing tier, or an active flag whose reader
  simply wasn't surfaced by the source blueprint's own search scope? Requires subject-matter-expert confirmation.
- **"Future Master Price Sheet" (`.future_mps`)** has no confirmed evaluation anywhere in the source blueprint's
  read scope — structurally similar in shape to a "captured, never consumed" field, at single-field rather than
  whole-sub-schema scale.
- **Default Penny Round Up / Price Method / Price-Basis Selector** — whether these three fields are genuinely
  read anywhere in the live pricing path, or are UI-descriptive-only, was not resolved to full closure: the
  penny-round mechanism is confirmed *not* consumed by the traced pricing-computation function (see
  `calculations.md`), but Price Method's and the Price-Basis Selector's own roles remain open.
- **Roughly 20 fields carry confirmed-unclear or partially-unclear business meaning** across the header and rule
  entities (marked inline above where the source blueprint itself flagged them) — these require
  subject-matter-expert input before being assigned normative meaning in a new schema; none is guessed at in
  this document.
- **Whether the sibling `Level200rules` module's own CRUD writes the rule table with the same field-level
  conventions this module's own files assume** was not investigated in the Pricebooklevel200-scoped source
  blueprint — a real risk given the confirmed dual-ownership finding (Requirement R2).
- **Whether the account-assignment field is genuinely shared with the `Pricebooklevel300`/`800` sibling
  modules' own assignment mechanism**, and if so whether their own write semantics match any of this module's
  three (already internally inconsistent) paths, is flagged for the cross-sibling consolidation pass, not
  resolved here.
- **`vtiger_pricebooklevel200cf` exists but carries zero actual custom-field columns**, and is not declared in
  the entity class's own `$tab_name` — a schema/entity-class mismatch (Pass 1 §3/§4 item 4): even if a tenant
  added a Studio custom field today, the entity class's own save/retrieve machinery would not persist it against
  this table without a code change.

<!-- Logical types: money / date / datetime / enum / text / reference(to X) / boolean / array
     Never a raw SQL type (varchar, int, etc). -->

---

## Recommended rewrite schema — this session's own design proposal, not a blueprint finding

Everything above documents what exists today, transcribed from the source blueprint. This section is different
in kind: a proposed replacement schema grounded in the specific structural problems the legacy shape causes,
each cited back to where it is documented above. Table/column names below are tech-agnostic placeholders, not a
commitment to any specific naming convention or database engine.

Source: `docs_from_blueprint/module/Pricebooklevel200/02-entities-and-fields.md` §5.

**Problems this design fixes, one by one:**

1. **The rule-line entity has no foreign-key column back to its own parent sheet — only a string join on the
   sheet's name.** This is Requirement R1 above, and it is not merely theoretical: it is the same string-join
   weakness that underlies the module's own duplicate-name-check endpoint doing nothing (`risks-and-open-questions.md`
   risk PBL200-RISK-014) and the CSV-export session-value injection chain riding on a poisoned rule-name write.
   **Fix**: give the rule-line entity a real, enforced foreign key to its parent sheet's primary key, and stop
   copying the sheet's name onto the rule row at all — a join, not a denormalized copy, is how the rule resolves
   its parent from then on.
2. **The rule table's declared owner (`Level200rules`) and its dominant real-world writer (this module, via
   five independent raw-SQL write paths) are two different modules, with no coordinating lock or shared
   write-path abstraction between them** (Requirement R2; risk PBL200-RISK-009). This is the core
   normalization target named for this design pass. Two structurally different fixes were weighed:
   - *(a) Keep the rule table in a separate service/table, but make the FK real.* This preserves today's
     physical split but does nothing to resolve the deeper problem: the split was never shown to reflect an
     actual bounded-context boundary — the source blueprint found no case where `Level200rules` behaves as an
     independent aggregate with its own invariants distinct from Price Sheet's own. A real FK stops the
     *integrity* gap but leaves the *ownership* gap (two write paths, no single command surface) exactly as
     open as before.
   - *(b) Fold the rule table into this module's own schema, as a true child entity of Price Sheet.* This is
     the design recommended here: nothing in the documented evidence justifies `Level200rules` as a
     separately-owned aggregate — it has no rule-editing UI, no business capability, and no lifecycle of its
     own independent of the sheet it belongs to; it exists as a physically separate table for reasons the
     source blueprint could not determine. A price sheet's rules are lot-for-lot the classic "owned
     collection" shape (header + line items), which normally lives in one bounded context with one writer.
     Folding removes the dual-ownership problem by construction rather than coordinating around it.

   This recommendation is offered with the same explicit caveat R2 itself carries: it is **not resolvable
   unilaterally by this module's own documentation alone** — `Level200rules`'s own separately-authored blueprint
   may surface a real reason for the split (e.g. a genuine independent capability never reached by this
   module's own read scope) that would favor option (a) instead. This design proposal's recommendation is (b),
   contingent on that sibling review not turning up such a reason.
3. **Six of the rule's seven scope-dimension columns are integers; the seventh (Product) is a variable-length
   string** (Requirement R4). **Fix**: all seven scope-dimension columns use one consistent typed reference
   representation (an integer foreign key to the dimension's own entity, nullable to mean "matches any").
4. **The account-to-price-sheet relationship is a pipe-delimited multi-value string field on the Account
   entity's own extension table, written by three independently-reachable, semantically-inconsistent paths —
   one of which overwrites the whole field rather than appending or removing a single value** (Requirement R3;
   risk PBL200-RISK-010). **Fix**: replace the field with a proper many-to-many relationship table, one row
   per (account, price sheet) assignment, so "assign" and "unassign" are row insert/delete operations with no
   overwrite-vs-append ambiguity possible.
5. **The same pipe-delimited column shape is shared, undifferentiated, across all three pricing tiers** — per
   `blueprint/module-blueprint-scope.md`'s own cross-sibling finding, `vtiger_accountscf.cf_984`/`cf_986`/
   `cf_988`-style columns mix Level200/300/800 plan names in one pipe-delimited list with no column
   distinguishing which tier a given entry belongs to, creating a name-collision risk across tiers with no
   structural guard. **Fix, scoped to this design**: the many-to-many assignment table from problem 4 above
   adds an explicit `tier` (or `price_sheet_type`) discriminator column, so a row is unambiguously "this
   account, this sheet, this tier" — one row per tier-assignment rather than one shared blob mixing all three.
   **Flagged explicitly, not decided unilaterally here**: this table's shape is shared across
   Pricebooklevel200/300/800, so its final column set (in particular whether it is one shared table with a
   `tier` column, as proposed here, or three separate per-tier tables) must be reconciled with the 300 and 800
   modules' own schema proposals rather than fixed by this document alone — this design pass proposes the
   single-table-with-discriminator shape as the direction, consistent with Requirement R3's per-module framing,
   but does not attempt to design Pricebooklevel300's or Pricebooklevel800's own schema here.
6. **No enforced tenant scoping is asserted anywhere in the field catalog above** (Requirement R5). **Fix**:
   every table below carries an explicit, required `tenant_id`.
7. **The "100-Level Override Flag" and "Future Master Price Sheet" fields have no confirmed reader anywhere in
   the module's own files or the traced pricing path** (Known Gaps above; risks PBL200-RISK-001, PBL200-RISK-002,
   PBL200-RISK-013). **Fix**: neither is carried forward into the new schema as live, read-consumed columns.
   Recommend deferring both until a subject-matter expert either confirms a live consumer (in which case they
   re-enter the schema with a documented purpose) or confirms them dead (in which case they are dropped
   entirely) — carrying forward an unread column with a `NOT NULL` default, as today, is not repeated in this
   design.

**Proposed tables:**

- **`price_sheet`** (replaces the header table) — `id` (PK), `tenant_id` (required), `name` (required, unique
  per tenant — closing the currently-nonfunctional duplicate-name check, risk PBL200-RISK-014), `description`,
  `start_date`, `end_date` (required to be evaluated as a live pricing gate in the new implementation, closing
  risk PBL200-RISK-012 — captured-but-unenforced is not carried forward), `status` (enum: active/inactive,
  required, no defaulting to inactive-by-omission), `master_account_id` (FK → the Account entity, replacing the
  legacy string-matched account number — closes the account-linkage half of Requirement R3), `job_id`
  (FK → Job, nullable), `is_item_specific` (boolean, required), `price_off_basis` (enum, required when
  `is_item_specific` is false), `display_fields_config` (structured/json), audit columns
  (`created_at`/`updated_at`/`created_by`/`updated_by`), `is_deleted`/`deleted_at`. `default_penny_round`,
  `price_method`, and `price_basis_selector` are carried forward as columns pending the open question above
  (whether they are genuinely consumed), but are explicitly flagged for removal if a new pricing-engine design
  confirms they are UI-descriptive-only.
- **`price_sheet_rule`** (replaces the sibling-owned rule table, folded into this schema per problem 2 above)
  — `id` (PK), `tenant_id` (required), `price_sheet_id` (FK → `price_sheet`, required, enforced — closes
  Requirement R1 — replacing the legacy's name-string join entirely), `line_code_id`, `subline_id`,
  `product_division_id`, `product_id`, `brand_id`, `color_id`, `manufacturer_id` (all seven scope dimensions
  as nullable integer FKs to their own dimension entity, closing Requirement R4 — `product_id` is no longer a
  variable-length string), `net_price` (money, nullable — zero/null both mean "use the GP fallback," but the
  distinction between "explicitly zero" and "not set" should be resolved by the new implementation rather than
  inheriting the legacy's `0` default for both), `uom_type`, `mps_gp`, `mps_gp_title`, `cm_gp_pct`, `awc_gp_pct`,
  audit columns, `is_deleted`/`deleted_at` (per-rule soft delete — the legacy's bulk-by-sheet-name delete
  pattern is replaced by a real FK-scoped cascade or per-row delete, not a name-matched bulk operation).
  `default_penny_round` carried forward pending the same open question as the header's own copy.
- **`gp_color_code_level`** (replaces the settings table, unchanged in shape — no structural problem was
  identified against it) — `id` (PK, fixed 1–5 seed range), `tenant_id`, `lower_bound`, `upper_bound`,
  `color_code`, audit columns.
- **`price_sheet_account_assignment`** (new — replaces the pipe-delimited field, closes problems 4 and 5) —
  `id` (PK), `tenant_id`, `account_id` (FK → Account), `price_sheet_id` (FK → `price_sheet`), `tier` (enum:
  200/300/800 — the cross-tier discriminator; see problem 5's caveat on reconciling this column's final home
  with the sibling modules' own proposals), unique on (`account_id`, `price_sheet_id`, `tier`), audit columns.
  Assign/unassign becomes an insert/delete on this table — no path exists that can silently clear another
  assignment as a side effect, closing risk PBL200-RISK-010.

**Referential integrity**: every FK above should be a real, enforced database constraint — the legacy schema's
sheet-to-rule relationship was confirmed to work only by string-equality convention, and the module's own
raw-SQL rule-field-update paths carry no bound parameters and no field-name allow-list at all
(`business-rules-and-validation.md` rule PBL200-RULE-008). Recommend `RESTRICT` on delete for `price_sheet`
while any non-deleted `price_sheet_rule` or `price_sheet_account_assignment` row references it, and recommend
the new implementation's delete action target `price_sheet`'s own entity class directly and exclusively —
replacing the legacy standard delete action's confirmed instantiation of an unrelated module's entity class
(risks PBL200-RISK-001, PBL200-RISK-004), which is a routing/wiring defect this schema proposal cannot fix on
its own but which any new delete-guard design should treat as a hard requirement to avoid repeating.
