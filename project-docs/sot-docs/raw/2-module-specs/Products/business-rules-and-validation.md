# Products — Business Rules & Validation

> Every rule gets a stable ID (e.g. <MOD>-RULE-001) so Stage 4's test docs can trace back to it.

**Source**: `docs_from_blueprint/module/Products/03-business-rules-and-validation.md` (Doc1 §02, corrected
by Doc1 §07), which is itself condensed from `blueprint/module/Products/02-validation-rules.md`. That
blueprint catalogs **65 numbered rules**, extracted from a full read of the module's core save-hook,
mass-update, supersession, delete, CSV import, and rule-engine code. IDs below are the same 65 rules,
renumbered from the source's `PROD-VAL-###` scheme to this kit's `PROD-RULE-###` scheme (same numeric
suffix, e.g. `PROD-VAL-001` → `PROD-RULE-001`) — no rule was dropped, split, or merged beyond what the
source itself had already merged (see Open Questions for the one place a "correction" note changes how
a rule should be read, not its identity). Legacy file:line citations were already dropped one level up,
in the source blueprint document itself; they remain available in `blueprint/module/Products/02-validation-rules.md`
if a rule ever needs re-verification against the original legacy source.

**Severity legend** (source's own characterization, carried through unchanged): *Hard block* = the
operation is refused/rejected entirely; *Guard/scope-gate* = a sub-step or side effect is conditionally
skipped, not the whole operation; *Clamp/auto-correct* = a value is silently adjusted rather than
rejected; *Override* = one rule's outcome unconditionally supersedes another computed value; *Advisory*
= the rule computes a result but leaves enforcement to an unread/unconfirmed caller; *Not a block* =
documents a computation branch or side-effect gate, not a validation per se. Where the source table cell
itself contains a longer explanatory phrase, that phrase is preserved rather than force-fit into one of
these six labels, since collapsing it would lose real information (e.g. "Hard gate (three-way AND),
silent skip otherwise").

**Confidence column** (new — does not exist in the source's own PROD-VAL numbering, assessed rule-by-rule
for this document): *Confirmed* = the source states the rule as a direct finding from reading the actual
code (the overwhelming majority of the 65 — the source blueprint is a full-code-read catalog, not a
survey). *Inferred* = the source itself hedges the rule with language like "not confirmed to occur in
practice," "structurally possible," "never confirmed intentional or accidental," or "enforcement at call
site unconfirmed" — i.e. the underlying mechanism was read, but a consequence, a real-world occurrence,
or a downstream enforcement point was not independently verified.

**A correction carried forward explicitly**: PROD-RULE-053/054/055 (the Auto-Update Subline rule engine's
scope guard) were originally rated by the source blueprint's Pass 2 as describing a Critical,
catalog-wide mass-rewrite risk. A later re-verification pass (Doc1 §07 Finding 1) directly re-read the
rule-*selection* query both entry points use and found a hard `WHERE` filter — invisible to the earlier
pass's narrower read range — that already excludes any blank-scoped rule before the originally-flagged
guard is ever reached. The practical risk is downgraded to Medium; the rows below carry both the original
characterization and this correction inline, matching the source blueprint's own explicit "correct any
planning document that inherited the uncorrected characterization" guidance (Doc1 §08 §3.1).

## 3.1 Entity-save: save-orchestration rules (PROD-RULE-001 to 010) — 10 rules

Governs the main product-save entry point. Headline finding: **no rule in this group or elsewhere in the
traced legacy code enforces any Product field as required at save time** — Product Number, Line Code,
and Description are all documented as core identity fields, yet no code path was found that blocks a
save when they are missing (Doc1 §02 "Save.php headline finding"). This group is almost entirely
field-cascade/audit-stamp/notification logic, not field-level validation.

| ID | Statement | Trigger | Scope | Severity | Confidence |
|---|---|---|---|---|---|
| PROD-RULE-001 | Fourteen cost-tracking date/user field pairs (price-level audit pairs) are unconditionally overwritten with the current timestamp and current username on **every** save, regardless of whether the corresponding price value actually changed this save. | Every save | 14 cost-date/cost-user field pairs | Not a block — unconditional audit-stamp overwrite | Confirmed |
| PROD-RULE-002 | Seven location-level cost-tracking date/user field pairs are likewise unconditionally overwritten on every save, independent of whether the location's cost fields actually changed. | Every save | 7 location-level cost-date/cost-user pairs | Not a block — unconditional audit-stamp overwrite | Confirmed |
| PROD-RULE-003 | Core-Qty-Changed and Warranty-Qty-Changed tracking is refreshed **only** when the submitted value differs from the currently-stored value (or this is a create); otherwise the existing stored date/user is silently re-copied forward — the one field pair in this group with a genuine change-detection guard. | Edit or create | Core/Warranty Qty Changed audit pairs | Not a block — conditional audit-stamp update | Confirmed |
| PROD-RULE-004 | On every edit, a denormalized copy of Line Code is force-synced from the submitted value across **all** locations for the product, not just the location currently being edited. | Edit | Line Code (cross-location denormalized copy) | Hard side-effect (unconditional multi-row mutation), not a block | Confirmed |
| PROD-RULE-005 | On create, with a non-empty positive Current Cost submitted, the value is silently number-formatted to 3 decimal places before being staged — a precision truncation, not a validation. | Create, Current Cost > 0 | Current Cost | Not a block — silent numeric formatting | Confirmed |
| PROD-RULE-006 | A quantity-on-hand-change audit message is written **only** when the previous quantity-on-hand differs from the newly-submitted value for the edited location. | Edit, QoH value actually changed | Quantity on Hand (location-scoped) | Not a block — conditional audit-message write | Confirmed |
| PROD-RULE-007 | On duplicate-product creation, the new product's e-commerce upload flags are force-reset and its e-commerce-description field is overwritten from the copied product's identity — a duplicate never inherits the source's live e-commerce publish state. | Create via duplicate | E-commerce upload flags, e-commerce description | Hard override on duplicate — prevents an accidental double-publish to the storefront | Confirmed |
| PROD-RULE-008 | MPL pricing data is copied from the source product to a duplicate **only** if a location "pass-on" template is configured **and** the source has a non-empty MPL row — otherwise a duplicated product starts with no MPL pricing at all. | Create via duplicate, pass-on template configured | MPL pricing data | Not a block — conditional copy, silent no-op otherwise | Confirmed |
| PROD-RULE-009 | AUPF rules are (re-)applied to the saved product on **both** create and edit, keyed by the product's Line Code and Subline — every product save is a potential AUPF-rule trigger point, not just batch/cron runs. | Create or edit | Line Code, Subline (drives AUPF rule matching) | Not a block — triggers external rule-engine call | Confirmed |
| PROD-RULE-010 | A low-stock-reorder notification fires only when **both** Qty in Stock and Reorder Level are non-empty **and** Qty in Stock is strictly less than Reorder Level — a blank Reorder Level silently suppresses the alert entirely (no fallback threshold). | Every save | Qty in Stock, Reorder Level | Not a block — conditional notification; the underlying inventory value is saved regardless | Confirmed |

**Unconfirmed/flagged for follow-up in this group** (Doc1 §02): roughly twelve functions called from
the save-completion block (AUPF-application internals, location-information save, MPL save-for-all-
locations, UOM pricing save, WAC-on-change field update, price-code-book/rank-group table push
functions, e-commerce field sync, pass-on-field propagation, reorder-change recording) were never
opened in this pass — they may contain additional validation not captured in this catalog.

## 3.2 Entity-save: core entity save hook (PROD-RULE-011 to 024) — 14 rules

Governs the core entity save hook itself. Headline finding: this hook never aborts a save — every branch
is a conditional default-fill, cross-table cascade, or logging side-effect, the same "zero hard
validation in the entity save hook" pattern found in every prior module blueprinted in this series. The
most structurally significant finding is the **Global WAC (Weighted Average Cost) recalculation block**
(PROD-RULE-018 to 021): when WAC changes and the system is configured for Global WAC calculation, this
single save hook rewrites the WAC on **every location row for the product system-wide** — a save on one
location's product record can silently change the displayed cost at every other location.

| ID | Statement | Trigger | Scope | Severity | Confidence |
|---|---|---|---|---|---|
| PROD-RULE-011 | On create, with no "created by" custom field already staged, it is force-set to the current username via a direct update bypassing the normal field-staging mechanism. | Create | Created By (custom) | Not a block — default-fill | Confirmed |
| PROD-RULE-012 | On create, with no Part Status staged, Part Status is force-defaulted to "Active" via a direct update. | Create | Part Status | Not a block — default-fill | Confirmed |
| PROD-RULE-013 | On create only, an "archived" flag is force-reset to "No" via a direct update — runs unconditionally on every create, no guard on prior value. | Create | NS Archived | Hard override (unconditional), not itself a block | Confirmed |
| PROD-RULE-014 | Reciprocal Alternate-Part linking: when an Alternate Part list is submitted with a reciprocate flag set, every linecode:product-number pair named in the list has its own Alternate Part field updated to add a back-reference to the currently-edited product — a bidirectional-link auto-maintenance cascade. | Edit, Alternate Part submitted + reciprocate flag set | Alternate Part (cross-product, cross-location) | Not a block — cascade side-effect across arbitrary other product rows | Confirmed |
| PROD-RULE-015 | Reciprocal Related-Part linking follows the identical pattern for the Related Part field, but with a Required/Suggested prefix distinguishing the relationship direction on each side of the reciprocal write. | Edit, Related Part submitted + reciprocate flag set | Related Part (cross-product, cross-location) | Not a block — cascade side-effect | Confirmed |
| PROD-RULE-016 | Sort-ID assignment: a blank/zero sort id is assigned "append to end"; a non-blank sort id colliding with another product's existing sort id triggers a global re-sequencing routine — a single product save can trigger a **table-wide** sort-order renumbering of every non-deleted product. | Save, sort id submitted and collides | Sort ID (catalog-wide ordering) | Hard side-effect — potential broad blast radius, not a validation block | Confirmed |
| PROD-RULE-017 | MPL pricing data, if present in the request, is applied unconditionally on every save where it's non-empty — no gate on whether pricing actually changed. | Save, MPL data non-empty | MPL pricing | Not a block — unconditional apply | Confirmed |
| PROD-RULE-018 | **Global WAC recalculation gate**: the entire WAC-recalculation block only runs when WAC is submitted non-empty **and** differs from the currently-stored cost for the location being edited, **and** the system-wide WAC calculation mode is set to Global — if any one condition fails, no recalculation happens at all (silently skipped, no error). | Edit, WAC changed, Global WAC mode | Weighted Average Cost | Hard gate (three-way AND), silent skip otherwise | Confirmed |
| PROD-RULE-019 | When the Global-WAC gate passes, the new blended cost is computed as (total inventory value across ALL locations for this product) ÷ (total quantity on hand across ALL locations), and that single new blended value is written back to **every** location row for the product — see this module's pricing/calculation documentation for the confirmed formula defect. | Edit, Global-WAC gate passes | WAC (all locations for the product) | Hard side-effect — one location's edit rewrites cost data at every other location | Confirmed |
| PROD-RULE-020 | A full audit trail is written for the Global-WAC recalculation: one calculation-input row and one before/after row **per location**, plus a change-log entry per location — there is no equivalent audit trail for the non-Global (per-location) WAC update path elsewhere in the codebase. | Edit, Global-WAC gate passes | WAC audit history | Not a block — audit-logging side-effect | Confirmed |
| PROD-RULE-021 | The Global-WAC recalculation additionally triggers an external accounting-system cost-adjustment push per location, but **only** for locations where the computed inventory-dollar difference is non-zero. | Edit, Global-WAC gate passes | External accounting-system cost adjustment | Hard gate (non-zero-diff only) | Confirmed |
| PROD-RULE-022 | Which fields are even shown/editable on a product's edit/detail view is driven by a hardcoded master-vs-slave field allow-list, selected by whether the product is flagged an "alternate-part record" — a slave product's edit form silently hides roughly 60 fields (pricing, tax, dimensions, e-commerce, etc.) that a master product exposes, with no per-product override. | View render (edit/detail) | ~60 master-only fields | UI-level restriction only — the underlying data is not protected from being set via a non-UI write path (mass-update, import) | Confirmed |
| PROD-RULE-023 | A dashboard metric counts every non-deleted product with no Vendor assigned — an informational count only, not an enforcement; nothing in this hook blocks saving a product with no vendor. | Reporting/dashboard query | Vendor | Not a block — informational count only | Confirmed |
| PROD-RULE-024 | Price-Code-Book/rank-group mapping logic exists (auto-creating/updating mapping rows whenever Price Code Book is anything other than a sentinel "skip" value) but its call sites inside the save hook are **commented out** — a later re-verification pass confirmed a repo-wide search found **zero external callers anywhere**, meaning this logic is 100% unreachable dead code as currently deployed. | N/A — confirmed unreachable | Price Code Book, Line Code | Confirmed dead code, not a live enforcement mechanism | Confirmed |

**Unconfirmed/flagged for follow-up** (Doc1 §02): the tax-relationship-row insert function's call site is
similarly gated off by a commented-out call — whether tax association rows are actually maintained
through the normal product-save path at all was never independently confirmed.

## 3.3 Mass-update: apply-path rules (PROD-RULE-025 to 033) — 9 rules

**Headline finding — the single most consequential blast-radius risk found in this module.** The
mass-update **form/grid UI** contains no update-apply logic at all; the actual mass-update **execution**
happens in a separate file, found only by cross-referencing the module's own structural inventory. **The
mass-update apply path builds its target-row filter almost entirely from raw, unparameterized request
values concatenated directly into SQL update statements** — every mass-updatable field value is
similarly concatenated unescaped into the write clause. A later re-verification pass confirmed this is
**definitively, directly exploitable**: not merely unparameterized-but-not-attacker-controlled, but
attacker-controlled on **both** the column name and the value in the same statement (Doc1 §07 §1 Finding 3).

| ID | Statement | Trigger | Scope | Severity | Confidence |
|---|---|---|---|---|---|
| PROD-RULE-025 | The mass-update field picker UI is restricted to a hardcoded allow-list of roughly 70 fields — fields not on this list never appear as mass-update options in the rendered form, but this restriction is UI-only and does not itself constrain what the apply path would do if a non-listed field name were submitted directly. | Mass-update form render | ~70 allow-listed fields | Not a block — UI-level allow-list only | Confirmed |
| PROD-RULE-026 | The mass-update apply action only executes at all when the save button was pressed **and** at least one of three scope conditions holds (an explicit selected-record list, an "all Line Codes" filter, or a reused prior search). | Mass-update submit | N/A — top-level scope gate | Hard gate on whether *any* update runs, but note "all Line Codes" is itself "match everything" — this gate does not limit blast radius, only whether the code path runs | Confirmed |
| PROD-RULE-027 | **No server-side re-validation of an explicit selected-record-id list**: the ids are decoded from a client-submitted payload and concatenated directly into the target-row filter with no format/existence check — a crafted request could submit an arbitrary id list independent of what the picker UI actually rendered. | Mass-update submit, explicit selection mode | Product ID scope | No block — trusts client-submitted id list verbatim | Confirmed |
| PROD-RULE-028 | For the "reuse a prior saved search" scope, the target-row filter is reconstructed by naive string-replacement of table-alias tokens inside session-stored SQL fragments — if any stored fragment is stale, malformed, or was built against a different alias set, the resulting filter is silently wrong, with no post-substitution sanity check. | Mass-update submit, search-reuse scope | Entire product search-result scope | No block — blind string substitution | Confirmed |
| PROD-RULE-029 | Every mass-updatable field's new value is taken directly from the request and concatenated **unescaped** into the update statement (one narrow exception exists for a single field, per a comment referencing a prior defect) — every other of the ~30 branch-handled fields has no escaping or type-checking before being embedded in the statement. Additionally, the mass-updatable field list itself is built by matching *any* request key against a naming pattern, meaning the column-name token, not only the value, is attacker-controlled for any field name not on the enumerated list. | Mass-update submit, any field selected | Any of ~30 mass-updatable fields (plus any arbitrary column name matching the request-key pattern) | **Confirmed directly exploitable SQL injection** — column name and value both attacker-shaped | Confirmed |
| PROD-RULE-030 | One specific date-shaped field is the **only** mass-update field with actual format validation (parsed and range-checked); an invalid date for this one field is silently dropped from the update entirely rather than erroring. | Mass-update submit, date field selected | One date-shaped field | Partial validation (format-checked) but silent-drop on failure | Confirmed |
| PROD-RULE-031 | A quantity-on-hand mass-update additionally re-queries the pre-update quantity/cost for every affected location before the update runs (for later history-row writing), but only if that field was selected and non-empty — if the "before" snapshot query returns zero rows, the history-tracking flag is silently downgraded and no history is written for the mass change at all. | Mass-update submit, QoH field selected and non-empty | QoH history tracking | Not a block — conditional audit-trail write with a silent-skip fallback | Confirmed |
| PROD-RULE-032 | The actual bulk update only fires when a non-empty target location **and** a non-empty accumulated field list are present — if reached with a field selection but no location, the update silently never executes with no error surfaced. | Mass-update submit | N/A — execution gate | Hard gate, but a silent no-op rather than a user-facing error on failure | Confirmed |
| PROD-RULE-033 | UOM/price recalculation is re-run per affected product **only** when a price-family field (from a hardcoded ~16-field list) was among the ones updated — a price change made through a different, non-allow-listed field silently skips UOM-pricing recalculation. | Mass-update submit, price-family field selected | UOM-based pricing recalculation | Not a block — conditional side-effect trigger, allow-list may not be exhaustive | Confirmed |

**Unconfirmed/flagged for follow-up** (Doc1 §02): no confirmation limit, batch-size cap, or "you are
about to update N products, confirm?" server-side checkpoint was found anywhere in the apply path — if
such a confirmation exists it is client-side only. Combined with PROD-RULE-026/032, an "all Line Codes"
scope with a broad field selection can mass-update every non-deleted product/location row in the system
in one statement, with no dry-run, staged-preview, or count-confirmation step visible server-side —
carried forward as a separate risk-register item.

## 3.4 Supersession: Products-side trigger rules (PROD-RULE-034 to 038) — 5 rules

**Headline finding**: this group is the Products-side write point for a supersession relationship whose
one-way enforcement actually lives on Location's own table. There is a real bug in this group: one
guard's underlying variable is read on two lines but is **never assigned anywhere in the file** — it is
always undefined, so both its downstream uses operate on an undefined value rather than the intended old-
product line code.

| ID | Statement | Trigger | Scope | Severity | Confidence |
|---|---|---|---|---|---|
| PROD-RULE-034 | A superseded-product row is only processed at all when all three of the submitted new-product-number, old-linecode, and old-product-number fields are non-empty for that row; any row missing one is silently skipped, no error reported to the user. | Supersession batch submit (per row) | New Product Number, Old Line Code, Old Product Number | Hard gate (silent skip per malformed row) | Confirmed |
| PROD-RULE-035 | The old product to supersede is looked up by an exact match on (Line Code, normalized Product Number) against non-deleted products; if no match is found, that row is silently skipped with no user-facing error. | Supersession batch submit (per row) | Line Code + Product Number (normalized) | Hard gate (silent skip, not surfaced) | Confirmed |
| PROD-RULE-036 | **Bug**: an undefined-variable guard means the intended "only merge if the old linecode is genuinely non-blank" condition is **always true** regardless of the actual data — the guard is a no-op, not confirmed to cause incorrect merges since the sibling condition is correctly derived, but flagged as dead/broken logic. | Every supersession row that passes PROD-RULE-034/035 | Superseded-product merge trigger | Latent bug — the guard is a no-op | Confirmed |
| PROD-RULE-037 | The quantity-on-hand/sales-history/pricing merge trio fires only when the old product's "superseded" flag is confirmed set **and** the (effectively-always-true, per PROD-RULE-036) linecode check **and** a non-empty new product number — this is the trigger point that hands off to Location's own, already-documented one-way merge behavior; the merge itself is enforced elsewhere. | Supersession row, "superseded" flag set | Sales History, QoH, Pricing/Cost (cross-module: Location) | Hard trigger for a downstream one-way merge | Confirmed |
| PROD-RULE-038 | The supersession fields are written **only** to the row for the organization's single default location — a multi-location product's supersession state is not distributed to its other locations by this script. | Supersession batch submit | Location-scoped supersession fields | Hard scope-restriction (default location only) | Confirmed |

## 3.5 Delete rules (PROD-RULE-039 to 041) — 3 rules

| ID | Statement | Trigger | Scope | Severity | Confidence |
|---|---|---|---|---|---|
| PROD-RULE-039 | Delete is unconditionally aborted if no record id is present in the request at all. | Delete request | N/A (record selection) | Hard block | Confirmed |
| PROD-RULE-040 | A product flagged as a protected system product is **entirely exempted** from the delete path — not just the entity delete but also the two related-table cleanup calls (classification master-table update, MPL soft-delete) are skipped for a system product, since all three calls sit inside the same conditional block. | Delete request, system product | N/A (system-product exemption) | Hard block (silent skip — no error message shown for why nothing happened) | Confirmed |
| PROD-RULE-041 | For a non-system product, deletion cascades to two side-effects unconditionally: the classification master table is updated and every MPL pricing record for the product across all locations is soft-deleted — neither call is itself gated on whether the entity delete actually succeeded. | Delete request, non-system product | Classification master table, MPL records (all locations) | Not a block — unconditional cascade, no rollback-on-failure coupling | Confirmed |

## 3.6 Import rules (PROD-RULE-042 to 045) — 4 rules

**Headline finding**: this is a create-or-update-in-place import, not a validated insert pipeline — a CSV
row either matches an existing product (by exact normalized-product-number lookup) and gets its fields
raw-updated, or a brand-new product is created with whatever fields were mapped, no required-field
checking beyond "Line Code and normalized Product Number both resolved to non-empty strings." There is
**no CSV-internal duplicate-row detection** — if the same product number appears twice in one uploaded
file, the first occurrence creates the product and the second occurrence's row is silently folded into
an update of the row the first occurrence just created.

| ID | Statement | Trigger | Scope | Severity | Confidence |
|---|---|---|---|---|---|
| PROD-RULE-042 | The entire import aborts if an import-location mode selection is missing — the operator must explicitly choose a location-import mode before any row is processed. | Import submit | Import location mode | Hard block | Confirmed |
| PROD-RULE-043 | The entire import aborts if any two mapped CSV columns are mapped to the **same** target field — a genuine duplicate-column-mapping guard. | Import submit, column mapping | Field mapping | Hard block | Confirmed |
| PROD-RULE-044 | A CSV data row is skipped entirely (no product created or updated) unless **both** the Line Code and the derived normalized Product Number value are non-empty for that row — this is the only per-row content validation in the whole import; no other mapped field (description, cost, etc.) is checked for presence, type, or range. | Import, per data row | Line Code, Product Number (normalized) | Hard gate (silent skip per malformed row, no per-row error report surfaced) | Confirmed |
| PROD-RULE-045 | Product matching is by **exact** normalized Product Number equality against non-deleted products only — Line Code is not part of the match key, meaning two different Line Codes sharing the same normalized product number would collide onto the same existing product row (an update, not a duplicate-create) — structurally possible, not confirmed to occur in practice. | Import, per data row | Product Number (normalized) uniqueness assumption | Hard match logic — a potential silent cross-linecode collision | Inferred — matching logic itself confirmed by code read, but the collision scenario's real-world occurrence is explicitly unconfirmed |

**Unconfirmed/flagged for follow-up in this group** (Doc1 §02): the per-table update from staging to the
live tables writes any value present in the CSV as-is (beyond a numeric-comma-strip and a tolerant
date-parse transform applied earlier) — numeric fields are not range- or sign-checked, and a genuinely
malformed but non-zero date string passes through to best-effort date interpretation with no rejection.

## 3.7 AUPF / Auto-Update-Subline rule-engine rules (PROD-RULE-046 to 055) — 10 rules

**Headline finding.** For the **AUPF price-field engine**, the answer to "is there a real scope-gate
before a bulk price change applies" is **yes, but only a per-product opt-out flag, not a scope-emptiness
requirement**: a rule with a blank Line Code and blank Subline builds a condition containing only the
per-product exception flag and a positive-source-value requirement — i.e. **every non-exception-flagged
product system-wide with a positive value in the source price column** would be updated. For the
**Auto-Update Subline engine**, an originally-flagged scope guard was found by a later re-verification
pass to be **moot in practice**: a hard SQL-level filter upstream of that guard already excludes any rule
with a blank Line Code or blank match-area from ever being selected, on both the manual-apply and
scheduled-cron entry points — see the correction note at the top of this file.

| ID | Statement | Trigger | Scope | Severity | Confidence |
|---|---|---|---|---|---|
| PROD-RULE-046 | The daily auto-update cron selects only rules flagged for automatic application with **both** From and To price-level endpoints non-empty, and whose scheduled-date is unset, a zero-date sentinel, or due — a rule missing either price-level endpoint is never picked up. | Auto-update pricing cron | AUPF rule selection | Hard gate — a genuine scope-narrowing filter at the rule-selection level | Confirmed |
| PROD-RULE-047 | Every product row touched by an AUPF rule is unconditionally excluded if it carries the per-product AUPF-exception flag — the **only** per-product opt-out mechanism found for this engine; there is no product-level "confirm before applying" step, only this binary flag. | AUPF rule application (any trigger) | AUPF Exception | Hard block (per-product opt-out) | Confirmed |
| PROD-RULE-048 | A rule's Line Code, Subline, and Report-Codes filters are each appended to the applied condition **only if non-empty** — there is no rule-save-time requirement that at least one be populated, and no rule-apply-time refusal to run a scope-less rule. | AUPF rule application | Line Code, Subline, Report Codes scope filters | **No gate at apply time** — a rule with all three blank applies to the entire unfiltered product set, subject only to PROD-RULE-047's exception flag and PROD-RULE-050's positive-value requirement | Confirmed |
| PROD-RULE-049 | A specific sentinel value for Line Code is treated as equivalent to a blank Line Code (no filter applied) — a special case not documented anywhere in the field catalog. | AUPF rule application | Line Code | Not a block — a second way to reach the same "no linecode filter" outcome as PROD-RULE-048 | Confirmed |
| PROD-RULE-050 | Every AUPF rule's applied condition unconditionally includes a positive-source-value requirement — a rule can never apply to a product whose source price-level is zero or negative, but this provides no floor on how many products can have a positive value in that column. | AUPF rule application (always) | From-price-level column | Hard gate, but not a scope-narrowing one in the blast-radius sense | Confirmed |
| PROD-RULE-051 | When "Value based on UOM" is set on a rule, the computed new value divides the source column by the location's UOM-conversion factor, with an explicit divide-by-zero guard — an empty/zero UOM factor is treated as 1 (no-op division) rather than raising an error. | AUPF rule application, UOM-based | UOM-based price computation | Not a block — defensive divide-by-zero substitution | Confirmed |
| PROD-RULE-052 | For cost-family price levels (Current Cost, WAC, Alternate Cost 1-3) used as either source or target (and always when UOM-based), the update is additionally restricted to one canonical "sequence=1" location — these cost fields are treated as effectively location-invariant, not fanned out per-location the way Global-WAC recomputation is. | AUPF rule application, cost-level field involved | Current Cost, WAC, Alternate Cost 1-3 | Hard scope-restriction to one canonical location | Confirmed |
| PROD-RULE-053 | The Auto-Update Subline engine's immediate-apply path checks that three request-derived keys are "set" — but since those keys are unconditionally populated (to a possibly-empty string) by the preceding data fetch, this is not an emptiness check and cannot function as a scope-guard **on its own**. **Correction**: a hard `WHERE`-clause filter upstream of this check already excludes any rule with a blank Line Code or blank match-area from ever reaching this point, on the live entry point as currently coded — see the correction note above. | Auto-update-subline immediate apply | Subline mass-update scope | Downstream guard is a no-op, but moot given the upstream SQL filter — downgraded from the original characterization | Confirmed — re-verified by a dedicated correction pass (Doc1 §07 Finding 1) |
| PROD-RULE-054 | Originally characterized as: a rule saved/selected with a blank Line Code and blank match-pattern builds a condition consisting of nothing but a not-deleted filter, mass-rewriting Subline on **every non-deleted product in the entire catalog**. **Correction**: this does not reproduce as characterized — the upstream selection query's own `WHERE` filter excludes blank-scoped rules before this point is ever reached; the worst case a currently-selectable rule can produce is Line-Code-scoped, not catalog-wide. | Auto-update-subline immediate apply, misconfigured rule | Subline | **Downgraded from the original Critical characterization to Medium** — the design-level fragility (relying on an incidental downstream filter) remains worth fixing for clarity, but is not a currently-live mass-corruption vector | Confirmed — re-verified by a dedicated correction pass (Doc1 §07 Finding 1) |
| PROD-RULE-055 | The scheduled-cron variant repeats the identical downstream-guard shape and the identical upstream-filter correction as PROD-RULE-053/054, with the additional characteristic that this path runs unattended on a schedule rather than requiring an operator to actively apply it. | Scheduled auto-update-subline cron, daily | Subline | Same downgrade as PROD-RULE-054 applies | Confirmed — re-verified by a dedicated correction pass (Doc1 §07 Finding 1) |

## 3.8 Lot / serial number tracking rules (PROD-RULE-056 to 060) — 5 rules

**Headline finding**: a confirmed enforcement asymmetry between the two tracking mechanisms — serial
numbers have real duplicate-blocking validation; lot numbers do not.

| ID | Statement | Trigger | Scope | Severity | Confidence |
|---|---|---|---|---|---|
| PROD-RULE-056 | Before inserting a new serial number, the full set of existing serial numbers already recorded for the product is fetched, and a new entry is rejected if it's already in that set — a genuine per-product serial-number uniqueness block. | Add serial number | Serial Number (scoped per product) | Hard block (duplicate rejected, insert never happens) | Confirmed |
| PROD-RULE-057 | On editing an existing serial number entry, the new value is likewise checked against the existing set (excluding a same-value no-op edit) before the update runs — the guard is enforced symmetrically on both insert and edit. | Edit serial number | Serial Number | Hard block | Confirmed |
| PROD-RULE-058 | The lot-number edit path performs **no uniqueness check whatsoever** before writing the new lot number — it only guards on the new value differing from the old, with no query against other lot numbers for the product before the update. | Edit lot number | Lot Number | **No uniqueness enforcement** — confirmed absent, in direct contrast to PROD-RULE-056/057's serial-number behavior | Confirmed |
| PROD-RULE-059 | The lot-number edit path additionally branches its downstream logging calls on a WMS-enabled flag — a WMS-enabled location resolves the lot's master-log linkage via a location-and-lot-specific join, while a non-WMS location uses the request-submitted id directly; a location that flips between WMS-enabled and not could see the same lot record resolved through two different id-lookup paths over its lifetime. | Edit lot number | Lot Number master-log linkage | Not a block — location-mode-dependent resolution logic, a possible data-consistency risk across a WMS-toggle event, not confirmed to occur in practice | Inferred — the two code paths are confirmed, the cross-toggle data-consistency risk is not confirmed to occur in practice |
| PROD-RULE-060 | The available-lot/serial-number fetch endpoints both branch their query by which module is calling (Receiving/PurchaseOrder/other) with materially different filter conditions per branch — the "available lot numbers to pick from" set is not a single consistent query, it is context-dependent by caller. | Add lot/serial number UI, per module context | Available Lot/Serial Number list | Not a block — display-scoping logic | Confirmed |

## 3.9 Barcode ambiguity resolution rules (PROD-RULE-061 to 062) — 2 rules

**Headline finding — directly relevant to the barcode-uniqueness concern.** These files are read-only
duplicate-detection and session-bookkeeping pages, not enforcement. They list products that already
share a duplicate barcode (sourced from a separate staging table, presumably populated by an unread
cron/batch process) and let an operator flag rows for manual resolution — but the actual "resolve"
write-back is a separate endpoint whose column-name token is one of the module's confirmed SQL
injections. Combined with the confirmed absence of any barcode-uniqueness check at product-save time,
**no server-side gate anywhere prevents two products from being saved with an identical Unit, Inner-Case,
or Case barcode** — duplicates are detected only after the fact and "resolved" only through an
injectable endpoint.

| ID | Statement | Trigger | Scope | Severity | Confidence |
|---|---|---|---|---|---|
| PROD-RULE-061 | The three barcode-ambiguity listing pages each display products via a join against the duplicate-staging table filtered to one barcode field — the duplicate-detection logic (what populates the staging table and how "duplicate" is defined) lives entirely outside these display files, not located in the source blueprint's read scope. | Ambiguity-resolution page load | Case/Inner-Case/Unit Barcode duplicate lists | Not a block — display of pre-computed duplicates only | Inferred — the display behavior is confirmed, but the upstream population logic that defines "duplicate" was never located, so this rule's full scope is not independently verified |
| PROD-RULE-062 | The checkbox-toggle endpoint performs no validation on the barcode:product-id pairs it stores into session — any decodable pair is accepted and added to or removed from the session's pending-resolution set, with no check that the product id actually owns that barcode or even exists. | Ambiguity-resolution checkbox toggle | Session-held pending-resolution set | No block — trusts client-submitted pairs verbatim | Confirmed |

## 3.10 Product-field lookup management rules (PROD-RULE-063 to 065) — 3 rules

| ID | Statement | Trigger | Scope | Severity | Confidence |
|---|---|---|---|---|---|
| PROD-RULE-063 | A function computing case-barcode fullness for a return sums already-sold-and-selected plus already-returned-not-available counts per case and flags any case whose combined total exceeds the product's configured Units-Per-Case — a genuine over-return computation, but the actual block/rejection is left entirely to an unread caller. | Serial-number return flow | Case fullness vs. Units Per Case | Advisory — computed but enforcement at call site unconfirmed | Inferred — the computation itself is confirmed by code read; whether it is actually used to block anything is unconfirmed since the calling code was not read |
| PROD-RULE-064 | A function flags whether any case-barcode for the product currently has more recorded serial numbers than a submitted new case-barcode-qty value — an advisory check for whether editing a case's barcode-qty configuration downward would be inconsistent with already-recorded serial numbers; the actual block is again left to an unread caller. | Case-barcode-qty edit | Case Barcode Qty vs. recorded serial numbers | Advisory — computed but enforcement at call site unconfirmed | Inferred — same reasoning as PROD-RULE-063: computation confirmed, enforcement at the call site unconfirmed |
| PROD-RULE-065 | A generic duplicate-lookup helper used by the product-field-management UI is case-insensitive/trimmed and excludes the record's own id when editing — but for one specific classification table, the match condition is additionally **hardcoded to one specific fixed value** regardless of what's actually being checked, a suspicious hardcoded literal that looks like leftover debug/special-case code rather than intentional business logic. | Product field lookup-value add/edit | Classification/vendor-linecode master values | A genuine duplicate for any value other than the hardcoded one could slip past the intended uniqueness guard — never confirmed intentional or accidental | Inferred — the hardcoded literal and its effect are confirmed by code read, but whether it is a bug or deliberate special-casing is explicitly never confirmed either way |

## 3.11 Rule catalog notes

- The full rule catalog with legacy-source file:line citations is preserved at
  `blueprint/module/Products/02-validation-rules.md` for traceability if a claim above ever needs
  re-verification against the original source.
- A recommended enforcement-layer mapping for all 65 rules is provided elsewhere in this module's spec.
- Eleven confirmed SQL injections and eleven further systemic risk-register items were surfaced
  incidentally while cataloging and re-verifying these rules — covered fully elsewhere in this module's
  spec (risk register), not restated here.

## Open Questions

- **PROD-RULE-045** (import product matching): whether two different Line Codes sharing the same
  normalized Product Number actually collide onto the same product row in practice — the matching logic
  is confirmed by code read, but no real occurrence was confirmed or ruled out.
- **PROD-RULE-053/054/055** (Auto-Update Subline scope guard): the *design* is still fragile — the only
  thing preventing a catalog-wide mass-rewrite is an upstream SQL filter incidental to the rule-selection
  query, not an intentional, documented scope-guard at the point where the rewrite itself happens. The
  practical risk is downgraded to Medium per the Doc1 §07 correction, but the underlying fragility (one
  filter's continued existence is all that stands between "Line-Code-scoped" and "catalog-wide") is
  flagged as worth fixing for clarity even though it is not currently exploitable as originally feared.
- **PROD-RULE-059** (lot-number WMS-toggle dual resolution path): whether a location actually flipping
  between WMS-enabled and not in practice causes the same lot record to resolve through two different
  id-lookup paths was not tested — flagged as a possible data-consistency risk, not confirmed to occur.
- **PROD-RULE-061** (barcode-ambiguity staging table population): the process that populates the
  duplicate-staging table these listing pages read from was never located in the source blueprint's read
  scope — what defines "duplicate" and how/when it runs (cron, on-save, on-demand) is unresolved.
- **PROD-RULE-063/064** (case-fullness / case-barcode-qty advisory checks): both compute a real answer,
  but whether either result is actually used to block anything was left unconfirmed because the calling
  code was not read in this pass.
- **PROD-RULE-065** (hardcoded literal in the classification-table duplicate check): never confirmed as
  intentional special-casing versus leftover debug code — needs SME confirmation before deciding whether
  to carry the special-case forward or treat it as a bug to fix in the rewrite.
- **Save-hook follow-ups** (§3.1, §3.2 group notes): roughly twelve save-completion functions and one
  tax-relationship insert call site were never opened in this pass and may contain additional validation
  not captured in this catalog.
- **Mass-update follow-up** (§3.3 group note): no server-side confirmation/batch-size cap was found for
  the "all Line Codes" scope — if one exists it is client-side only; carried forward as a separate
  risk-register item rather than resolved here.
- **Import follow-up** (§3.6 group note): numeric and date fields beyond the two per-row required fields
  are not range-, sign-, or format-checked on import; a malformed but non-zero date string is passed
  through to best-effort interpretation rather than rejected.
