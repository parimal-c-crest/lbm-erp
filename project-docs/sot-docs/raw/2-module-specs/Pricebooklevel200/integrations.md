# Pricebooklevel200 — Cross-Module & Integration Touchpoints

Source: `docs_from_blueprint/module/Pricebooklevel200/07-cross-module-integrations.md`, itself transcribed from
`blueprint/module/Pricebooklevel200/06-cross-module-integrations.md` ("Pass 6"), with the cross-sibling framing
drawn from `blueprint/module-blueprint-scope.md` and `blueprint/module/Pricebooklevel200/00-README.md`.

Pricebooklevel200 is simultaneously: (a) the dominant writer of a table it does not itself declare ownership of
in any entity class; (b) a writer of a shared, multi-tenant account field via three inconsistent paths; (c) a
reader/writer of the Jobs subsystem; and (d) home to **four confirmed leftover files from an unrelated module
(Campaigns)** that write that unrelated module's own tables from inside this module's own namespace. This is a
wider, messier cross-module footprint than the sibling `MPLPricePlan` module (three clean, well-separated
relationships) or most other modules blueprinted in this documentation series.

## Related Modules

| Module | What This Module Reads | What This Module Writes/Triggers | Direction | Sync/Async |
|---|---|---|---|---|
| `Level200rules` | This module's own files read the rule table (`vtiger_level200rules`) via the header-to-rule join (by sheet-name string equality). | Four of the module's own files write the rule table directly via raw SQL — by live row count (187 rows), this module's own dominant contribution to the table. The sibling `Level200rules` module's own entity class also declares this same table as its **own** entity table, writing through normal entity-save machinery — a materially different write discipline, not itself read in this Pricebooklevel200-scoped blueprint. | Bidirectional, uncoordinated — no lock, no shared write-path abstraction, no confirmed awareness in either module's own files of the other's writes. | Sync (both modules' own writes are synchronous within their own request) |
| Accounts | Reads `vtiger_accountscf.cf_984`/`cf_658` for account-assignment/lookup. | Three independently-reachable, semantically-divergent write paths against `cf_984` (rules PBL200-RULE-029 through PBL200-RULE-035): two with append/pipe-join/diff semantics, one with overwrite/clear semantics. | Pricebooklevel200 → the assignment field (write, 3 paths); read-back by the same three paths' own "already assigned" checks. | Sync |
| Jobs (`lbm_jobs`) | Shared job-identity-resolution helpers (not this module's own files) resolve job identity in several of this module's own account/job-existence-check and job-scoped save files. | The standard save action raw-updates the job record's own timestamp and assigned-price-sheet pointer field whenever a sheet carrying a job link is saved (PBL200-RULE-010). | Bidirectional, narrow (one field written, one id/name pair read), synchronous at save time. | Sync |
| SalesOrder / Quotes | The pricing-computation function (`InventoryUtils.php::find_MA_MPS_SalesPricesByParams()`) is called from the sales-order/quote line-item pricing flow, not itself under this module's own files — reads this module's own Price Sheet and rule data, read-only, re-evaluated fresh per priced line, not cached. The job-scoped save variant's sales-order-line-item auto-seed query joins across the sales-order line-item table (PBL200-RULE-038). | N/A (read-only consumer of this module's data; the auto-seed flow writes rule rows sourced from a sales order's own line items). | SalesOrder/Quotes → reads this module's data. This module → reads SalesOrder line items (auto-seed only). | Sync |
| Products, Location | Read as part of the 6-table sales-order-line-item auto-seed join (PBL200-RULE-038), and the location-base-price fallback lookup used by the GP-based pricing formula (see `calculations.md`). | N/A | Read-only | Sync |
| Pricebooklevel300 / Pricebooklevel800 (sibling tiers) | Not directly read by this module's own files. | Not directly written. | Joint consumption: the pricing-computation function tags every price with a literal `"200Level"` tier identifier, strongly implying its own caller also invokes structurally parallel `300Level`/`800Level`-tagged functions feeding the **same** shared pricing-decision result set. Tier-precedence ordering between the three is unresolved. | Not traced — the caller and ordering are out of this module's own scope. |
| Campaigns | N/A — not a designed integration. | Four confirmed leftover files write/instantiate Campaigns' own entities/tables from inside this module's own directory (see below). | Not a designed integration; confirmed copy-paste leftovers. | Sync |
| Deliverylog | N/A | The module's own standard delete action instantiates this unrelated module's entity class instead of its own (PBL200-RULE-014). | Not a designed integration; confirmed wrong-entity-class defect. | Sync |

## `Level200rules` — the confirmed, shared-table sibling relationship (detail)

This is Pricebooklevel200's own single most consequential cross-module finding — a genuine dual-ownership table
with no coordinating mechanism. **Confirmed NOT an accidental, one-off wrong-table write** (a shape confirmed
elsewhere in this documentation series, e.g. the sibling `MPLPricePlan` module's own `DeleteRule.php` finding
against a different sibling tier's table) — this is a genuine, live, heavily-used shared table, with two
structurally different modules both writing to it through two structurally different mechanisms, joined to
Pricebooklevel200's own header only by an unenforced string key.

**Explicit boundary note carried forward from the source blueprint's own implementation plan**: which module
ultimately owns this shared entity going forward (this module's own successor, or `Level200rules`'s own
successor) is a decision the source blueprint's implementation plan **explicitly declines to make
unilaterally**, deferring it to a joint Phase-0 decision pending `Level200rules`'s own separately-authored
blueprint. This tech-agnostic spec preserves that as an open, unresolved boundary question (Requirement R2 in
`entities-and-fields.md`).

## The confirmed-dead "100 level" tier references

Three files/methods reference a module and set of tables that do not exist anywhere in the codebase or live
database (rules PBL200-RULE-004, 015, 016, 023, 024). A different flavor of risk than the live `Level200rules`
relationship above: not a live wrong-table write against a table that exists and belongs to someone else, but
files whose entire cross-module "reach" points at a target that has been fully removed from the system, leaving
them permanently inert rather than dangerous. The practical risk profile is lower (nothing can be corrupted,
because nothing exists to corrupt), but the underlying pattern — this module's own files casually referencing
another pricing tier's module/table by name, without adaptation — is the same class of copy-paste risk that
produced the live `Level200rules` finding above.

## Cross-tier precedence — the unresolved question shared with the sibling pricing tiers

The pricing-computation function tags every price it contributes with a literal tier identifier, strongly
implying its own caller also invokes structurally parallel functions for the sibling `Pricebooklevel300`/
`Pricebooklevel800` modules, all feeding into the **same** shared pricing-decision result set (see
`calculations.md`). **Whether/how the caller orders these three tiers' contributions against each other, and
which tier's price wins if more than one tier's rule matches the same product, is not traced anywhere in this
module's own blueprint** — this is the single most important open question for the later cross-sibling
consolidation pass.

This is compounded by a second, related cross-sibling finding recorded at the blueprint-program level (not
specific to this module's own file set): the account-assignment fields across all three pricing tiers
(`cf_984`-shaped columns) are **undifferentiated** — pipe-delimited plan lists can mix names from all three
tiers with no column distinguishing which tier each belongs to (a name-collision risk), and **precedence
ordering between the three tiers when multiple apply is unresolved — flagged at the blueprint-program level as
a hard cutover blocker**, not merely a Pricebooklevel200-specific open item. All three tiers' own rule tables
are physically owned by separate sibling modules, joined only by string, no foreign key — the same shape as
this module's own `Level200rules` relationship, confirmed **not** unique to the "200" tier.

## Campaigns — four confirmed leftover files, the widest count of this bug class found in this documentation series to date

| File/branch | What it does | Table(s) touched |
|---|---|---|
| The ajax dispatch endpoint's "detail view" branch (`DetailViewAjax.php`) | Instantiates the unrelated Campaigns entity, saves an arbitrary field on an arbitrary record — **with no permission check of its own**, see `permissions.md` | Campaigns' own record tables |
| A related-list page controller (`CallRelatedList.php`) | Whole-file Campaigns related-list rendering, zero Pricebooklevel200-specific logic | (read-only Campaigns-owned lookup queries) |
| A list-loading ajax script (`LoadList.php`) | Inserts/deletes Campaigns' own lead/contact relationship rows | Campaigns-owned junction tables |
| A relation-update ajax script (`updateRelations.php`) | Same as above, a second independent copy | Campaigns-owned junction tables |

Not a designed integration of any kind — four independent, confirmed copy-paste leftovers (PBL200-RULE-041 and
the "Additional confirmed-dead/wrong-table findings" note in `business-rules-and-validation.md`), the same
"wrong entity class instantiated inside another module's own directory" shape confirmed elsewhere in this
documentation series, but recurring **four times within one module** here — the widest count of this specific
bug class found in the series to date.

## `Deliverylog` — a second confirmed wrong-class instantiation, this module's own live delete action

The module's own standard delete action (`Delete.php`) instantiates an unrelated outbound-delivery-tracking
module's entity class, not this module's own Price Sheet entity, as the target of the module's own standard
delete action (PBL200-RULE-014, see `workflows.md`). Not a designed integration; carried forward here alongside
the Campaigns findings above as this module's second confirmed wrong-entity-class defect.

## External Systems

| System | What Crosses the Boundary | Direction | Trigger | Sync/Async |
|---|---|---|---|---|
| *(none confirmed)* | A case-insensitive sweep of all 37 code files for accounting-system/EDI-integration signatures returns **zero matches** — consistent with the sibling `MPLPricePlan` module's own confirmed-absence finding, and with this module's role as an internal pricing-configuration and document-generation tool with no direct trading-partner-facing code of its own. No file outside this module's own directory, the `Level200rules` sibling module, the shared pricing-utility function, or the narrow Jobs/SalesOrder/Products/Location touchpoints above was found reading this module's own data directly in a repo-wide sweep. The module's one genuinely external-facing artifact is the Master Price Sheet PDF itself (see `outputs.md`) — a document a customer receives, not a live API/webhook integration. | N/A | N/A | N/A |

## Cross-sibling notes carried forward for the later consolidation pass

1. A shared gross-profit-recalculation helper function is explicitly shared, verbatim, between this module's
   own "200" tier and the sibling "800" tier — with **no "300" branch**, meaning if the `Pricebooklevel300`
   sibling module calls this same shared helper, its own table-resolution variable would resolve to neither
   declared branch (silently computing against an unset value). Flagged for the `Pricebooklevel300` blueprint
   to confirm/refute independently.
2. The rule table's dual-ownership shape with `Level200rules` is **very likely mirrored** by the corresponding
   "300" and "800" tier rule tables and their own sibling `Level300rules`/`Level800rules` modules — confirmed
   to exist as a parallel triple by the source blueprint's own database check. The
   `Pricebooklevel300`/`Pricebooklevel800` blueprints should expect to find the identical dual-ownership shape
   in their own modules, not treat it as unique to the "200" tier.
3. The account-assignment field's tier-scoping is the single highest-priority item for the cross-sibling
   consolidation pass to close.
4. The tier tag is the clearest evidence that the pricing-computation caller evaluates all three tiers' pricing
   functions against a shared result set — the consolidation pass should trace that caller to determine
   tier-precedence ordering.
5. The confirmed-dead "100 level" references are worth checking for a parallel in each sibling — either each
   tier independently accumulated its own dead "100 level" leftover, or this one happens to be uniquely fully
   dead.
6. The four confirmed Campaigns-leftover files and the one Deliverylog wrong-class delete are unique to this
   module's own directory in the source blueprint's own read scope — whether the sibling modules carry their
   own independent copies of the same leftover files is an open question for the consolidation pass.

## Cross-module/integration open items

- The exact caller(s) of the pricing-computation function within SalesOrder/Quotes, and its ordering relative
  to any sibling-tier calls — the single most important open item, both for this module's own cutover planning
  and for the cross-sibling consolidation.
- Whether the sibling `Level200rules` module's own CRUD files write the shared rule table with the same field
  conventions this module's own files assume — not investigated in the Pricebooklevel200-scoped source
  blueprint.
- Whether the account-assignment field is genuinely shared across all three sibling tiers, or tier-specific —
  the highest-priority cross-sibling open question.
- Whether the sibling `Pricebooklevel300`/`Pricebooklevel800` modules carry their own dead "100 level"-shaped
  references, their own Campaigns-leftover files, or their own wrong-class delete action against an unrelated
  module — none of these were independently confirmed or ruled out for the sibling modules in the source
  blueprint.
