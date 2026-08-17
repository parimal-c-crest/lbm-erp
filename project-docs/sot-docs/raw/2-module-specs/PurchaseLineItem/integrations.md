# PurchaseLineItem — Cross-Module & Integration Touchpoints

> Source: `docs_from_blueprint/module/PurchaseLineItem/07-cross-module-integrations.md`, itself traced
> to `blueprint/module/PurchaseLineItem/06-cross-module-integrations.md`.

PurchaseLineItem is structurally inverted relative to a typical business-entity module: it is not an
independent entity other modules reference — it is a **denormalized write-target with an unusually wide
writer set**. Six confirmed writers (five that create new rows, one that only updates an existing row)
live in three other modules plus one shared utility function; the module's own CRUD surface is vestigial,
and its one other "own" write endpoint is confirmed broken (see `business-rules-and-validation.md`
PLI-RULE-010). PurchaseLineItem's real cross-module story is: who writes into this table, and who reads
its rows back out for purchasing/reconciliation/forecasting reporting.

## Related Modules

| Module | What This Module Reads | What This Module Writes/Triggers | Direction | Sync/Async |
|---|---|---|---|---|
| PurchaseOrder | N/A — PurchaseLineItem does not read from PurchaseOrder | PurchaseOrder's own internal save-path logic — its primary finalize-triggered writer, its append-line writer, its reverse-return-PO writer, plus a narrow ASN-number backfill update — writes into this module's table whenever a PO's status transitions (to Finalized, Completely/Partially Reconciled, Order Partially/Fully Received, or Fully Processed RGN), or when lines are appended/reversed. This module never writes back to PurchaseOrder's own tables. | One-way: PurchaseOrder → PurchaseLineItem | Synchronous — all four PurchaseOrder-side write paths are inline, same-request writes triggered by a user's PO save/append/reverse-RGN action; no cron/queue component |
| Receiving | N/A | Receiving's own line-item-append flow writes into this module's table via a shared, reusable helper function — the only one of the six writers that routes through a genuinely shared function rather than an inline restatement, though that shared function still duplicates the same cost-extension formula the other writers restate independently. | One-way: Receiving → PurchaseLineItem | Synchronous, inline at receiving-save time |
| POReconciliation | Its own existing row (read-then-write) | During PO cost-variance reconciliation, an existing row's cost and extension fields are re-derived and updated (matched by PO number + line code + product number, not the row's own identifier) whenever a reconciled cost differs from the row's originally recorded cost. | Bidirectional (read-then-write) on the same table | Synchronous, inline at reconciliation-save time; parameterized (no injection risk in this specific write) |
| Customreport | This table, directly, by five separate reporting files (accrued-purchase-cost, linecode/subline-by-vendor, vendor-backorder, reconciled-by-user/date, core/warranty/defect QuickBooks-push-context) | N/A | One-way, read-only: Customreport → PurchaseLineItem | Synchronous, inline at report-render time. The heaviest single reporting consumer of this table by query-block count. |
| Forecasting | PO-committed date and receipt date, as an input to lead-time/demand-forecasting calculations | N/A | One-way, read-only: Forecasting → PurchaseLineItem | **Asynchronous** — daily cron-triggered, unlike every other consumer of this table, which reads synchronously/inline |
| Location | This table, via one of Location's own computed/formula field functions (specific business meaning not traced further in the source blueprint) | N/A | One-way, read-only: Location → PurchaseLineItem | Synchronous, inline |
| Products | This table, via a product-detail popup aggregation that sums quantity purchased, grouped by vendor/linecode/product/location, for a "total purchase/core" display | N/A | One-way, read-only: Products (detail popup) → PurchaseLineItem | Synchronous, inline |

### Shared framework infrastructure — not a bespoke integration

Three further touchpoints are generic, shared framework code that happens to special-case this module's
table name, not a genuine business cross-module relationship: the shared list-query implementation this
module's own list view calls into (this module has no equivalent of a module-specific search-utility file
the way some sibling modules do — its own list-query SQL lives entirely in shared infrastructure), a
shared search-utility special-case that resolves the line-code field's display name, and the shared
CustomView engine's own special-case for this module's primary-key alias. Noted for completeness, not
counted as independent business writers/readers.

### The wrong-entity-class bug's cross-module blast radius

Per `business-rules-and-validation.md` PLI-RULE-010: the module's own inline-edit endpoint instantiates a
different module's entity class entirely — one used elsewhere in the system for backorder-log tracking —
rather than PurchaseLineItem's own class. This means every legitimate use of that endpoint reads/writes
that unrelated module's own tables, keyed by a PurchaseLineItem record id — either matching an unrelated
row in that other module that happens to share the numeric id (silent cross-module data corruption) or
matching nothing and silently no-op'ing. Which of these two outcomes actually occurs was not empirically
tested in the source blueprint, per a project-wide constraint against destructive testing. This is,
structurally, a cross-module integration finding as much as an entity-level one: it means this module's
write surface silently reaches into a different module's data, not its own.

## External Systems

| System | What Crosses the Boundary | Direction | Trigger | Sync/Async |
|---|---|---|---|---|
| QuickBooks / EDI vendor networks (transitive only) | PurchaseOrder is the outbound trigger for QuickBooks and three EDI vendor networks — but none of those integration files read this module's table directly. PurchaseOrder's own external pushes are sourced from its own header/staging tables, not from this module's post-finalize snapshot. A PO-status transition simultaneously fires this module's own primary writer *and*, per PurchaseOrder's own spec, the EDI/QuickBooks push logic — the two are siblings under the same PO-save code path, not a data dependency of one on the other. | Not applicable — purely transitive, no direct read path found | PO-status transition (shared trigger with this module's own primary writer) | N/A |
| ASN (Advance Shipment Notice) | Unlike the QuickBooks/EDI integrations above, the ASN integration does write into this module's table directly — matching an inbound ASN line to an already-written row and backfilling the ASN-number field. This is the one place this module's data is directly touched by an EDI/vendor-network-adjacent process. | Inbound: ASN integration → PurchaseLineItem | ASN line match | Synchronous, inline; a narrow, one-column write |

**No direct external-system integration code exists inside this module's own files.** A case-insensitive
sweep of the module's own files for QuickBooks/EDI-shaped signatures returns zero matches — consistent
with the module's shape as a narrow, mostly system-populated snapshot table.

## Open Questions

- Whether the QuickBooks-push-named Customreport file feeds an actual QuickBooks push, or is purely a
  read-only report despite its name — not traced beyond the one matched query.
- Whether any of the five Customreport consumers generate PDF/document output of their own — not traced,
  out of this module's own scope.
- Whether the Location formula field consumer has any PurchaseLineItem-specific business meaning worth
  documenting from the Location side — flagged for a Location-focused investigation if one revisits that
  module.
- Whether the POReconciliation writer's cost-correction write can itself diverge from what the primary
  finalize-time writer's original write would have produced for the same PO line — the preconditions (six
  independent restatements of the same formula) are structurally present, but a direct formula-comparison
  confirming a live divergence was not completed in the source blueprint.
- Whether ASN-matching's own request-value origin is ever directly user-supplied — not traced to its
  ultimate origin.
- Whether `DetailViewAjax.php`'s wrong-entity-class bug produces a silent no-op or an actual cross-module
  data corruption on any given system's specific id-numbering overlap between this module's own records
  and the unrelated module's — not empirically tested, per the no-destructive-testing constraint.
