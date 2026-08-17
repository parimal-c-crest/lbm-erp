# Pricebooklevel800 — Entities & Fields

> Every entity, every field, individually. No grouping/summarizing — that's how fields get lost.
> Legacy table/column names are a first-class column in the field catalog below, not an optional
> footnote — this project's whole documentation discipline rests on every claim being traceable to
> a specific source, and a footnote is too easy to skip. See
> `_deviations-from-original-template.md` in this folder.

Sources: `docs_from_blueprint/module/Pricebooklevel800/02-entities-and-fields.md` (entity list,
field list, business meaning, type, required, default, source-of-truth) joined field-by-field
against `blueprint/module/Pricebooklevel800/01-entities-fields.md` (legacy table/column citations,
`vtiger_field` metadata gaps) to populate the Legacy Trace column that the first source deliberately
omits. Every row below traces to one or both of those two files; nothing is invented.

## Governing architectural finding: no formal foreign keys anywhere in this model

**No column on any of this module's three entities is declared as a formal foreign key at the schema
level** (confirmed via `DESCRIBE`'s `Key` column — only `PRI`/`MUL` index markers appear, no `FOREIGN
KEY` constraints) — every relationship between the price-book header, the pricing-rule table, and the
Accounts assignment column is enforced (or, per §4 below, not enforced) entirely in application code
via string-matched `pricebookname` values, not ids. This is the direct architectural cause of the
module's headline data-integrity finding (§4 below) and is restated here as the single most
consequential forward-looking requirement for a new implementation: relationships that are currently
string-name matches should become real, enforced foreign keys.

```
vtiger_pricebooklevel800 (header, 0 live rows)
        |  pricebookname (string, no FK)
        v
vtiger_level800rules (rules, 8 live rows) ------ scoped by linecode/subline/productdivision/productid/
        |                                        pricecode/salesrank against vtiger_products/vtiger_productcf
        |
        |  pricebookname (string match, no FK) <---- vtiger_accountscf.cf_988 (932 non-empty values)
        v
vtiger_field (fielddefault for cf_988, mutated by the "set as default" mass-action)
```

## Entity List

| Entity | Purpose |
|---|---|
| Pricebooklevel800 (Header) | The named "Price Book" record itself — a container for a set of pricing rules, plus header-level default/guard settings. |
| Level800rules | A formally separate sibling vtiger module's own table, but read/written directly and extensively by this module's own code — the per-product/line-code pricing rules belonging (by name-string match, not FK) to a given price-book header. |
| Accounts.cf_988 assignment | Not a dedicated entity of this module's own, but the module's real external assignment surface: a picklist column on the Accounts module recording which price book (by name string) a given customer Account uses. |

## Field Catalog

<!-- Logical types: money / date / datetime / enum / text / reference(to X) / boolean / array
     Never a raw SQL type (varchar, int, etc). -->

### Pricebooklevel800 — Header

Backed by `vtiger_pricebooklevel800` (tabid 39). **0 live rows** in the snapshot this blueprint was
built from — sibling tiers' own header tables are not empty (`vtiger_pricebooklevel200` = 15 rows,
`vtiger_pricebooklevel300` = 6 rows; see §4 below). 14 columns total, individually catalogued.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Price Book Header ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `vtiger_pricebooklevel800.pricebooklevelid` |
| Price Book Name | The price book's display/matching name — every downstream relationship (rules, Account assignment) matches on this string, not the id | text | Nominally required at the field-metadata layer (fieldid 1047, uitype 2), but the underlying column is nullable and no server-side non-empty check exists — a metadata/schema mismatch | NULL | user-entered | `vtiger_pricebooklevel800.pricebookname` |
| List Price Lower Than Sell Price | Whether the computed List Price is permitted to display below the computed Sell Price for this book (a floor-guard flag, not a pricing formula) | enum (Yes/No) | Yes (NOT NULL) | `No` | user-entered | `vtiger_pricebooklevel800.listprice_lower_than_sellprice` (fieldid 3384) |
| Price Book Description | Free-text description | text | No | NULL | user-entered | `vtiger_pricebooklevel800.pricebooklevel_desc` (fieldid 1567) |
| Times (header default) | Proposed default multiplier for rules newly authored off this book | number | Yes (NOT NULL) | NULL | user-entered; no `vtiger_field` metadata row exists for this column, so it has no client-side validation coverage | `vtiger_pricebooklevel800.times` |
| Auto-Update from PCB | Toggle: "automatically create rules based off of PCB updates" — meaning of "PCB" inferred from label text only, not spelled out anywhere in code; whether any live process actually reads this toggle is unconfirmed | enum ('0'/'1') | Yes (NOT NULL) | `'0'` | user-entered; no `vtiger_field` metadata row | `vtiger_pricebooklevel800.autoupdatefrompcb` |
| Deleted | Soft-delete flag | boolean | Yes (NOT NULL) | 0 | system-set | `vtiger_pricebooklevel800.deleted` |
| Is System Default | System-wide "this is THE default price book" single-exclusive flag, set only by the "set as default" mass-action; also drives an external write into core CRM field metadata (see `workflows.md`) | boolean | No | NULL | system-set; no `vtiger_field` metadata row | `vtiger_pricebooklevel800.pricebooklevel_default` |
| Penny Round Rule | Rounding-rule selector (rendered via a shared "penny round" combo helper) | text | No | NULL | user-entered; no `vtiger_field` metadata row | `vtiger_pricebooklevel800.penny_round` |
| Default Price Level Code | Short code (e.g. "LP") proposed as the default price-level abbreviation for rules authored off this book | text | No | defaults to `"LP"` at save time if submitted empty — the only server-side default-value logic in the entire save flow | NULL | user-entered; no `vtiger_field` metadata row | `vtiger_pricebooklevel800.priceleveldefault` |
| Created Time / Modified Time | Audit timestamps | datetime (×2) | No | NULL each | system-set | `vtiger_pricebooklevel800.createdtime`, `.modifiedtime` |
| Creator / Owner | Owning/creating user | reference (to Employee/User) (×2) | No | 0 each | system-set | `vtiger_pricebooklevel800.smcreatorid`, `.smownerid` |

**Metadata gap confirmed**: only 3 of these 14 columns (Price Book Name, List Price Lower Than Sell
Price, Price Book Description) have a corresponding field-metadata row in the live system. The other
6 substantive columns (Times, Auto-Update from PCB, Is System Default, Penny Round Rule, Default
Price Level Code, plus standard audit columns) are written and read entirely by hand-rolled logic in
`Save.php`/`PBSettings.php`/`massDefaultRule.php`, bypassing the platform's field-metadata/validation
layer altogether — none of them can be edited from the standard "Edit Fields"/layout-editor UI, and
none has any generic client-side validation rule.

**Companion "custom field" table**: `vtiger_pricebooklevel800cf` — a declared 1:1 extension table
exists for this header entity (1 column, `pricebooklevelid` PK/FK, default `0`), but holds only its
own primary/foreign key column, no actual custom fields, and 0 rows — structurally present,
functionally vestigial. The header's real "custom field" in spirit (List Price) actually lives on the
Accounts entity (below), not on this table.

### Level800rules — Pricing Rule

Backed by `vtiger_level800rules` (tabid 40, owned by the formally separate sibling module
`Level800rules`). **8 live rows.** Not owned by Pricebooklevel800, but this module's own save,
delete-guard, rule-list, and duplicate-rule screens all read/write it directly (see
`integrations.md`). 26 columns total, individually catalogued.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Rule ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `vtiger_level800rules.ruleid` |
| Price Book Name | Scopes the rule to a price-book header **by name string**, not by a header id — no referential integrity between this table and the header table's own Price Book Name column at the schema level | text | Yes | none | system-set/derived (copied at rule-authoring time) | `vtiger_level800rules.pricebookname` (fieldid 1038) |
| Line Code | Product line-code scoping column (blank = wildcard) | number | Yes | none | user-entered | `vtiger_level800rules.linecode` (fieldid 1039) |
| Sub Line | Product subline scoping column (blank = wildcard) | number | Yes | none | user-entered | `vtiger_level800rules.subline` (fieldid 1040) |
| Product Number | Specific product id scoping column (blank = wildcard) | text | Yes | none | user-entered | `vtiger_level800rules.productid` (fieldid 1041) |
| Product Division | Product division scoping column (blank = wildcard) | number | Yes | none | user-entered | `vtiger_level800rules.productdivision` (fieldid 1568) |
| Price Code | Price-code scoping column (blank = wildcard) | text | Yes | none | user-entered | `vtiger_level800rules.pricecode` (fieldid 1046) |
| Sales Rank | Account sales-rank scoping column (blank = wildcard) | text | Yes | none | user-entered | `vtiger_level800rules.salesrank` (fieldid 1042) |
| Sales Price | Raw sales-price figure associated with the rule | money | Yes | none | derived; no field-metadata row | `vtiger_level800rules.salesprice` |
| PC $ Range | Optional price-code dollar range filter (free-text, e.g. "10 to 50" or "10 to INFINITE") applied against the resolved basic price before a matched rule is accepted | text | No | none | user-entered | `vtiger_level800rules.pcrange` (fieldid 1815) |
| Times | Per-rule multiplier | number | Yes | 0 | user-entered | `vtiger_level800rules.times` (fieldid 1045) |
| Created From | Provenance flag: was this rule hand-authored directly, or generated from a "PCB" sync process (corroborates the header's Auto-Update from PCB toggle) | enum ('PB'/'PCB') | Yes | `'PB'` | system-set; no field-metadata row | `vtiger_level800rules.createdfrom` |
| Updated (dirty flag) | Nominally a pending/dirty marker; in practice this module's own save flow always resets it to "not updated" on every save regardless of prior state, and no code anywhere in this module reads it back for any conditional purpose — effectively meaningless as a dirty flag from this module's perspective | boolean | Yes | 0 | system-set; no field-metadata row | `vtiger_level800rules.updated` |
| Splitted | Boolean flag; purpose not independently confirmed within this module's own scope | boolean | Yes | 0 | system-set; no field-metadata row | `vtiger_level800rules.splitted` |
| Run ID | Numeric identifier; purpose not independently confirmed | number | Yes | none | system-set; no field-metadata row | `vtiger_level800rules.runid` |
| Price Level | Which pricing-level code this rule resolves to (e.g. an "SP"/"LP"/custom-level code) — one of the six pricing-relevant columns encoding which pricing operation the rule performs | text | Yes | none | user-entered | `vtiger_level800rules.pricelevel` (fieldid 1875) |
| Add-Subtract | Dollar adjustment applied by the rule | money | Yes | none | user-entered | `vtiger_level800rules.addsubtract` (fieldid 1876) |
| Net Price | Explicit net-price figure the rule can resolve to | money | Yes | none | user-entered | `vtiger_level800rules.netprice` (fieldid 1877) |
| Deleted | Soft-delete flag | boolean | Yes | 0 | system-set | `vtiger_level800rules.deleted` |
| GP % | Gross-profit-percent figure the rule can resolve to | number | Yes | 0.000 | user-entered | `vtiger_level800rules.gp_percentage` (fieldid 3044) |
| Markup % | Markup-percent figure the rule can resolve to | number | Yes | 0.000 | user-entered | `vtiger_level800rules.mu_percentage` (fieldid 3045) |
| Penny Round Rule (per-rule) | Rounding-rule selector at the rule level, falling back to the header's own default when unset | text | No | NULL | user-entered; no field-metadata row | `vtiger_level800rules.penny_round` |
| Created Time / Modified Time | Audit timestamps | datetime (×2) | No | NULL each | system-set | `vtiger_level800rules.createdtime`, `.modifiedtime` |
| Creator / Owner | Owning/creating user | reference (to Employee/User) (×2) | No | 0 each | system-set | `vtiger_level800rules.smcreatorid`, `.smownerid` |

**Six pricing-relevant columns on this table** — Price Code, Price Level, Times, Add-Subtract, GP %,
Markup % (plus Net Price) — collectively encode which pricing *operation* a rule performs; full
formula-precedence detail is out of this module's own traced scope (the downstream application of a
matched rule's operation happens in the broader pricing-utility engine, not within this module's own
files).

### Accounts.cf_988 — the module's real assignment surface

Not an entity owned by this module — a single picklist column on the **Accounts** module/entity
(fieldid 989, tabid = Accounts, uitype 16, label "List Price", help text "List PriceBook assigned to
this account"). Catalogued here because it is this module's actual, real-world assignment mechanism.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| List Price (Account assignment) | Which price book (by name string, or the sentinel `"LP"` meaning "no tier override, use product's own List Price") this Account uses for pricing | enum (picklist) | No | Currently `'500'` at the field-definition level (mutable by this module's "set as default" mass-action) | user-entered (via the Apply-to-Accounts bulk UI or direct Account edit) | `vtiger_accountscf.cf_988` (fieldid 989) |

- **932 of the live Accounts rows carry a non-empty value for this field** — 911 = `"M3"`, 21 =
  `"500"`, a handful blank. This is **not a foreign key** — it stores the price-book name string
  directly, matching the pattern every apply/read query in this module uses.
- **Data-integrity gap, confirmed**: since the header table (above) has 0 live rows, **neither `"M3"`
  nor `"500"` currently corresponds to any live header row in this module.** Whether these 932
  accounts reference a sibling tier's own header table, or genuinely orphaned names, is an open
  question — see §4 below and `risks-and-open-questions.md`.
- `massDefaultRule.php`'s side effect on `vtiger_field.fielddefault` for this exact fieldid/columnname
  is a **field-definition-level** write, separate from any individual Account row.

## 4. The empty-Header-table finding (headline data-integrity gap)

**`vtiger_pricebooklevel800` has 0 live rows, yet `vtiger_accountscf.cf_988` carries 932 non-empty
values naming price books that no longer exist as rows in this table, and `vtiger_level800rules`
still carries 8 live rule rows presumably scoped to those same now-nonexistent price-book names.**
This is a real, confirmed data-integrity gap in the current dataset, not a code defect per se, though
it has a confirmed structural code-level root cause:

- No cascade exists on either of this module's two delete paths — neither clears the `Level800rules`
  rows scoped to a deleted header's name, nor clears any Account's `cf_988` value referencing it.
- A correctly-written, generic, tier-aware cascade-delete function — given a header's id, it resolves
  the header's Price Book Name and soft-deletes every `Level800rules` row sharing that name — **exists
  in the codebase but is never called anywhere**, confirmed by a repo-wide search. This is the strong,
  direct explanation for the "0 header rows / 8 orphaned rule rows / 932 orphaned account assignments"
  state: the cascade-delete logic was written, presumably in response to exactly this orphaning risk,
  but never actually wired into either delete flow that would have used it.
- Full financial-pricing consequence of this gap (every non-"LP" pricing lookup silently computing 0)
  is documented in `calculations.md`.

## Known Gaps

- **Whether `Auto-Update from PCB` (header) / `Created From = 'PCB'` (rule) drives any live process**
  is unconfirmed — no such "PCB" (inferred: Product Cost Book) sync process was found anywhere within
  this module's own files. Not guessed at here.
- **Whether the header-level `Times` (default multiplier) column is ever read for anything beyond a
  UI pre-fill** was not confirmed — no reading code path was found within this module's own scope.
- **Whether `"M3"`/`"500"` (the two dominant live `cf_988` values) correspond to live header rows in
  the sibling `Pricebooklevel200`/`Pricebooklevel300` modules' own tables** is unresolved — if so, the
  932 accounts are not simply orphaned but reference a *different* tier's price book under the same
  picklist column, materially reframing the finding above. This is explicitly flagged as a question
  for the cross-sibling consolidation pass, not resolved here.
- **A cross-sibling, undifferentiated-account-plan-column finding** (shared with `Pricebooklevel200`/
  `300`, not specific to this module alone): the account-plan assignment columns across all three tiers
  are undifferentiated — pipe-delimited plan lists can mix names from all three tiers with no column
  distinguishing which tier each name belongs to (a name-collision risk), and the precedence ordering
  between the three tiers when multiple could apply is unresolved (`blueprint/module-blueprint-scope.md`,
  "Cross-sibling finding (200/300/800)").
- **Splitted / Run ID** (Level800rules columns) — purposes not independently confirmed within this
  module's own scope; carried forward as opaque columns, not guessed at.

## Recommended rewrite schema (proposed, not a legacy finding)

Everything above documents what exists today. This section is different in kind: a proposed
replacement schema for this tier, reasoned from the specific structural problems the legacy shape
causes (each cited back to where it's documented elsewhere in this module's own spec, including
`calculations.md` and `risks-and-open-questions.md`). Table/column names below are tech-agnostic
placeholders, not a commitment to any specific naming convention. This proposal is scoped to this
tier alone — it does not assume what the parallel design sessions for `Pricebooklevel200`/`300`
chose, and states its own reasoning explicitly wherever a cross-sibling pattern is involved rather
than presuming alignment.

**Problems this design fixes, one by one:**

1. **Every relationship in this module is a string-matched `pricebookname`, not a real foreign key**
   (above) — header→rule and header→Account-assignment are both name-string joins with no
   schema-level referential integrity at all. **Fix**: replace every name-string join with a real
   id-based foreign key, enforced by the database, not by application-code convention.
2. **The empty-header-table silent-zero defect is the headline case this design must make
   structurally impossible.** Today, an Account's `cf_988` assignment is a free-text/picklist string
   with no FK — so a header row can be deleted (or simply never re-created) while 932 Accounts still
   carry its name, and every pricing lookup for those accounts silently resolves to a displayed
   `0.0000` rather than an error, because the header-lookup step just returns "no match" and the
   failure is swallowed downstream (`calculations.md`). **Fix**: make the Account-assignment column a
   real, nullable FK to the price-book table — `NULL` is the only legitimate way to represent "no
   tier override, use product's own List Price" (replacing the legacy `"LP"`/blank string sentinels),
   and *any non-null value* is now required by the database to reference a live header row. A
   dangling reference becomes a rejected write or an enforced `ON DELETE RESTRICT`/cascade at delete
   time — never a value that silently survives pointing at nothing. The current 0-row header state,
   reached under this design, is only reachable by first clearing every Account's assignment back to
   `NULL` — it cannot happen as a side effect of deleting a header out from under still-assigned
   accounts.
3. **The correctly-written cascade-delete function exists but is never called** — the root cause
   behind finding #2, confirmed by a repo-wide search finding zero call sites. A schema fix on the
   assignment column (point 2) already prevents *new* orphaning, but the underlying lifecycle gap —
   a piece of delete-time logic that was clearly intended to run automatically but depends on every
   caller remembering to invoke it — is a design smell independent of any one bug. **Fix**: do not
   re-implement this as another optional helper function callers must remember to invoke. Either (a)
   enforce it as a database-level `ON DELETE` action (`RESTRICT` on the header while any non-deleted
   rule or assignment references it, so a delete is refused outright rather than silently cascading
   past application logic that might again go unwired), or (b) if soft-delete is kept as a business
   requirement, wire the cascade as a single service-layer transaction that soft-deletes the header
   and its dependent rules/assignments atomically, with the header's own soft-delete write
   structurally incomplete (transaction fails) unless the dependents are also updated — not two
   independently callable steps where the second is optional in practice.
4. **The rule table (`Level800rules`) is owned by a formally separate sibling vtiger module, yet read
   and written directly and extensively by this module's own code, with no FK back to the header**
   (above). This split is an artifact of vtiger's per-tier module registration (each price tier got
   its own module record), not a genuine business-domain boundary — nothing about "a pricing rule"
   requires it to live in a different schema ownership domain than "the price book it belongs to."
   **Fix, this tier's own reasoning**: fold the rule table into this tier's own schema domain, owned
   by the same service/module boundary as the header, with a required `price_book_id` FK (`NOT NULL`,
   `ON DELETE RESTRICT` or cascading per point 3) replacing the current name-string scoping column
   entirely. If the cross-sibling consolidation pass later decides a single shared rules table across
   all three tiers (with an explicit `tier` discriminator column) is preferable to three parallel
   per-tier tables, that is a legitimate alternative — but it is a decision for that consolidation
   pass to make deliberately, not an accident of module registration the way the current split is.
   Either way, the operative fix is the same: a real FK, not a name-string match, and no more
   sibling-owned table read/written directly by a different module's code without a declared
   relationship.
5. **The header's own field-metadata layer is inconsistent with its actual columns** — only 3 of 14
   header columns have a corresponding platform field-metadata row; the other 6 substantive columns
   (Times, Auto-Update from PCB, Is System Default, Penny Round Rule, Default Price Level Code, plus
   audit columns) are written/read by hand-rolled code entirely outside that layer, with no generic
   validation coverage. **Fix**: this is a legacy platform artifact (a separate metadata-driven
   field-definition layer sitting alongside the real table), not something a normalized schema needs
   to reproduce — every column becomes a normal, directly-declared table column with its constraints
   (`NOT NULL`, defaults, enum/lookup FK) expressed in the schema itself, so there is no second
   "declared vs. actual" surface to drift out of sync.
6. **The companion 1:1 "custom field" extension table is structurally present but functionally
   vestigial** — it holds only its own key column, no real fields, 0 rows. **Fix**: drop it. It is
   not carried forward as a distinct table in the new schema; the header is one table.
7. **`PC $ Range` is a free-text range string** (e.g. `"10 to 50"` or `"10 to INFINITE"`) parsed at
   read time by the pricing pipeline (`calculations.md`) — a string format with no schema-level
   validation that it's even well-formed. **Fix**: two explicit numeric columns, `price_range_min`
   and `price_range_max` (nullable independently, so an open-ended range is a `NULL` bound rather than
   a magic `"INFINITE"` string), both nullable together meaning "no range filter."
8. **`Price Level` (rule) and `Default Price Level Code` (header) are free text**, including the
   `"LP"` sentinel meaning "raw sell price, not a price-level lookup" — an implicit convention, not a
   declared value set. **Fix**: a small `price_level` lookup table (code, label) that both columns FK
   into, with the "use raw sell price" case represented by an explicit nullable FK (`NULL` = no
   price-level lookup) rather than a reserved string value that happens to also be a legitimate-
   looking code.
9. **The cross-sibling undifferentiated account-assignment-column finding** (Known Gaps, above;
   `blueprint/module-blueprint-scope.md`): today a single pipe-delimited Accounts column mixes
   price-book names from all three tiers with no column saying which tier a given name belongs to,
   and precedence between tiers when more than one could apply is undocumented. Combined with fix #2
   above (Account assignment becomes a real FK, not a string), a single pipe-delimited multi-value
   column cannot be a real FK at all. **Fix, this tier's own reasoning**: replace the single
   picklist/pipe-delimited column with a proper join table,
   `account_price_book_assignment(account_id FK, price_book_id FK, tier ENUM/lookup, precedence_rank
   INTEGER)` — one row per Account-per-tier assignment, an explicit `tier` discriminator so a name
   collision across tiers is structurally impossible (the FK target itself disambiguates which tier's
   table the row points into), and an explicit `precedence_rank` column so "which tier wins when more
   than one is assigned" is a declared, queryable value instead of an unresolved open question. This
   reasoning is offered as this tier's own proposal for the shared column, not asserted as what the
   parallel `200`/`300` design sessions concluded — reconciling the three proposals is exactly the
   cross-sibling consolidation pass's job.

**Proposed tables:**

- **`price_book`** (replaces `vtiger_pricebooklevel800`, closes problems 1, 5, 6) — `id` (PK),
  `tenant_id`, `name` (unique per tenant — still the human-facing identity, but no longer the join
  key), `description`, `allow_list_price_below_sell_price` (boolean, `NOT NULL`, default `false`),
  `default_multiplier` (number, nullable — proposed default for new rules, explicitly documented as
  UI-pre-fill-only per the open question in `calculations.md` until a real consumer is confirmed),
  `auto_update_from_pcb` (boolean, `NOT NULL`, default `false` — kept pending the unresolved "what
  does PCB mean/drive" open question, not silently dropped), `is_system_default` (boolean, with a
  partial unique index enforcing at most one `true` row per tenant at the database level, rather than
  relying on the mass-action's own bookkeeping), `penny_round_rule` (FK to a `penny_round_rule` lookup
  table), `default_price_level_id` (FK to `price_level`, nullable), audit columns
  (`created_at`/`updated_at`/`created_by`/`updated_by`), `is_deleted`/`deleted_at`.
- **`price_book_rule`** (replaces `vtiger_level800rules`, closes problems 1, 4, 7, 8) — `id` (PK),
  `price_book_id` (FK → `price_book`, **required, `NOT NULL`** — no rule can exist without a header to
  belong to, closing the reverse direction of problem 2), `line_code`, `sub_line`, `product_division`,
  `product_id` (FK → product), `price_code`, `sales_rank` (all nullable = wildcard, matching current
  scoping semantics), `sales_price` (money), `price_range_min`/`price_range_max` (number, nullable,
  replaces the free-text PC $ Range), `multiplier` (number, `NOT NULL`, default `0`), `created_from`
  (enum: hand-authored / pcb-generated), `price_level_id` (FK → `price_level`, nullable = raw sell
  price), `add_subtract` (money), `net_price` (money), `gp_percent`, `markup_percent`,
  `penny_round_rule` (FK to lookup, nullable — overrides the header's own default when set), audit/
  soft-delete columns. The legacy `updated` (dirty-flag) and `splitted` columns are not carried
  forward as-is: `updated` is dropped (confirmed meaningless — always reset on save, never read back);
  `splitted`/`run_id` are carried forward only as opaque columns pending SME clarification of their
  purpose, not silently dropped and not guessed at.
- **`price_level`** (new lookup table, closes problem 8) — `id` (PK), `tenant_id`, `code` (e.g.
  `"LP"`, `"SP"`, unique per tenant), `label`, audit columns.
- **`penny_round_rule`** (new lookup table, replaces the current free-text column referencing a
  shared UI combo helper) — `id` (PK), `code`, `label`, audit columns.
- **`account_price_book_assignment`** (replaces `vtiger_accountscf.cf_988`, closes problems 1, 2, 9)
  — `id` (PK), `account_id` (FK → Accounts, required), `price_book_id` (FK → `price_book`, **nullable
  — `NULL` means "no tier override, use the product's own List Price," replacing the legacy
  `"LP"`/blank string sentinel**; any non-null value is a real, enforced reference to a live header
  row), `tier` (enum/lookup: 200 / 300 / 800 — the explicit discriminator that makes the current
  pipe-delimited name-collision risk structurally impossible), `precedence_rank` (integer — declared,
  queryable precedence when an account carries assignments across more than one tier), unique on
  (`account_id`, `tier`) so an account has at most one assignment per tier, audit columns.

**On the SQL-injection findings** (`risks-and-open-questions.md`, Criticals 1–4): these are
application-layer defects (unparameterized query construction, an unvalidated dynamic column name),
not schema defects — no schema design can substitute for parameterized queries and an allow-list of
writable columns in the new implementation's data-access layer. They are noted here only because
Critical Finding #1's dynamic-column-name mass-assignment specifically targets the sibling rule table
across a module boundary (problem 4 above) — a real FK plus a single owning service boundary
(problem 4's fix) at least removes the *cross-module* half of that attack surface, even though the
underlying unparameterized-query defect must still be fixed at the query-construction layer, not the
schema layer.

**Referential integrity**: every FK above should be a real, enforced database constraint. This
directly replaces the legacy model's confirmed absence of any formal foreign key on any of this
module's three entities (above) — the exact gap that let the header table empty out to 0 live rows
while 8 rule rows and 932 account assignments kept referencing a price-book name that no longer
existed anywhere. Recommend `RESTRICT` on delete for `price_book` while any non-deleted
`price_book_rule` or `account_price_book_assignment` row references it (or the atomic cascading
soft-delete described in problem 3, if soft-delete is retained as a business requirement) — either
way, replacing the legacy's dead, never-invoked cascade-delete function with a guarantee the database
itself enforces on every delete path, not just the ones a developer remembered to route through the
right helper.
