# PurchaseHistory — Cross-Module & Integration Touchpoints

Source: `docs_from_blueprint/module/PurchaseHistory/07-cross-module-integrations.md`, itself traced to
`blueprint/module/PurchaseHistory/06-cross-module-integrations.md`.

## Related Modules

| Module | What This Module Reads | What This Module Writes/Triggers | Direction | Sync/Async |
|---|---|---|---|---|
| PurchaseOrder | N/A — PurchaseHistory does not read from PurchaseOrder directly | N/A — PurchaseHistory writes nothing to PurchaseOrder | PurchaseOrder → PurchaseHistory (write-only from PurchaseOrder's side, via three call sites: a purchase-order-finalize handler, a line-append handler, and a reverse-return-goods-notification handler, each reading the existing aggregate row for a key via a fully parameterized query, then updating or creating it) | Synchronous — all three write paths are inline, same-request writes triggered by a user's purchase-order save/append/RGN-creation action; no cron/queue component |
| PurchaseLineItem | N/A — no direct read/write relationship confirmed | N/A | Coordination point only — both modules are triggered by the same three PurchaseOrder-side events, so their event contracts need to be designed together for the rewrite | N/A |

**A materially cleaner cross-module posture than SalesHistory's own equivalent finding.** All three confirmed
writers live in the same other module (PurchaseOrder), not scattered across three-plus unrelated modules the
way SalesHistory's own writer set spans several. All three also compute the identical `total_activity`
formula byte-for-byte, and all three are fully parameterized with no SQL-injection risk of their own — a
materially better security and consistency posture than SalesHistory's own confirmed-divergent, partially-
unescaped writer set.

**A commented-out fourth candidate — confirmed dead code, not a live writer.** A repo-wide search surfaced an
unfinished, truncated SQL fragment inside `PurchaseOrder/EditView.php`, sitting inside a block comment
alongside other commented-out logic. This is dead, never-executed code — not a fourth writer. Its own shape
(a buy-quantity decrement on purchase-order finalize) hints at a historically-intended "purchase-order
finalize should also correct PurchaseHistory when line items are deleted" feature that was apparently
started and abandoned.

**One-off migration/maintenance scripts — not live runtime writers.** Three scripts touch this module's own
table but are confirmed one-off migration/maintenance tooling, not live production writers: `db_utilities/
load_data_ph.php` (a bulk-load/backfill utility — the source of the narrow formula divergence documented in
`calculations.md`), `remove_dups_merge_2pids_ps.php` (a product-id-merge de-duplication utility, fully
parameterized), and `clearSampleData.php` (a sample-data-cleanup utility that truncates this module's own
tables).

**Shared framework plumbing — not genuine business relationships.** Several further touchpoints are confirmed
to be generic, shared-framework code that happens to special-case this module's table name, not business
cross-module relationships: a copy-pasted template shared with another, unrelated module's own "load list
into related entity" handler (`LoadList.php`); a shared, framework-level "is this line code in use" guard
that checks this module's table among several others as one of its own multiple special cases (a read-only,
cross-cutting utility, not a PurchaseHistory-specific writer or reader — its own unescaped SQL shape is real
but is a shared-framework concern, not owned by this module); shared list-view/search/CustomView
infrastructure that special-cases this module's table name for line-code-name display substitution and
generic id-aliasing.

## External Systems

| System | What Crosses the Boundary | Direction | Trigger | Sync/Async |
|---|---|---|---|---|

**Confirmed absent.** A case-insensitive search for accounting-integration/EDI-integration/dispatch-
integration terms inside this module's own files returns zero matches, and a further search for this
module's own name inside the accounting/EDI integration layer's own directory also returns zero matches.
PurchaseHistory has no external-system touchpoint of any kind confirmed anywhere in the source repository.
Unlike PurchaseOrder itself (confirmed to be the outbound trigger for an accounting integration and several
EDI vendor networks), none of those integration mechanisms reach into this module's own table — PurchaseOrder's
own external pushes are sourced from its own header/staging tables, not from this post-finalize activity
aggregate.

## A significant, unrelated finding: `fillinventorycost.php` is misplaced inside this module's directory

A file living inside this module's own directory has nothing to do with this module at all. Despite its name
suggesting purchase-cost history, and despite living inside `modules/PurchaseHistory/` in the source system,
this file's entire body operates on a completely different pair of tables belonging to a different module's
own domain (the SalesOrder-family search-line-item table and a separate inventory-cost table) — it truncates
the inventory-cost table unconditionally on every run, aggregates monthly sell-price/margin/cost-of-goods-sold
figures from the search-line-item table (explicitly excluding return-type transaction codes), joins against
location and product data for an inventory-turns calculation, then repopulates the inventory-cost table from
scratch. This module's own table is never referenced anywhere in this file — a direct search confirms zero
matches. Its own SQL does carry a vulnerable, unparameterized shape in two of its own queries, but none of
the values reaching those queries originate from user request input (this is a cron-invoked script whose
inputs all trace back to prior database reads) — and, critically, none of it touches this module's own table
at all. This finding is out of this module's own scope entirely — it belongs, if anywhere, to whichever
module's specification eventually covers the search-line-item/inventory-cost reporting domain, not
PurchaseHistory's.

## Open items

- The complete, authoritative transaction-code enumeration that PurchaseOrder's own domain rules define —
  needed before a new implementation's typed transaction-code representation can be finalized with
  confidence.
- Whether the commented-out fourth writer candidate represents a still-needed feature or a genuinely
  abandoned one — needs a direct question to the legacy system's current maintainers.
- Whether `LoadList.php`'s own branch for this module is ever actually reached by a live caller anywhere in
  the source system — no caller was found within the source blueprint's own search scope.
- The shared "what happened when this purchase-order line was committed" event-design point this module's
  own event contract will need to coordinate with the sibling PurchaseLineItem module's own equivalent
  contract, since both are triggered by the same three PurchaseOrder-side call sites today.

(`docs_from_blueprint/module/PurchaseHistory/07-cross-module-integrations.md` §7.1-7.7)
