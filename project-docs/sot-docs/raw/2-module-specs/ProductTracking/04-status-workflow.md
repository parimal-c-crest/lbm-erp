# ProductTracking — Status / Workflow

Part of the ProductTracking tech-agnostic module spec. Source:
`blueprint/module/ProductTracking/03-status-workflow.md` (Doc1 Pass 3), cross-checked against Pass 8's
consolidation review, ultimately derived from `blueprint/module/ProductTracking/`.

## 4.1 No real state machine exists — stated explicitly, not glossed over

**This module carries no field that transitions through states across a row's lifetime.** Every row is
a point-in-time audit-log entry — once written, its classification, reason, quantity, and cost fields
are not expected to change again. The only confirmed post-creation writer is the inline-edit ajax path
(this module's business-rules documentation, PT-VAL-016/017/018), which is a manual correction
mechanism, not a workflow transition. `change_type` is best understood as a **classification tag set
once at creation**, describing which module/event produced the row, not a state a row moves through
(Pass 3 §1).

### 4.1.1 `change_type` — live value distribution (DB-grounded)

| Value | Live row count (of 15,013) | Inferred originating module/event |
|---|---|---|
| Sales Order | 7,087 | SalesOrder finalize/QoH-adjustment paths |
| Product Import | 5,637 | Bulk product import |
| Store Transfer | 1,090 | StoreTransfer/PendingStoreTransfers/ReceivingST |
| Receiving | 569 | Receiving/ReceivingST (PO receipt) — gates the Receiving-cost-override business rule |
| Product Created | 418 | Products module (new-product creation seeding an initial QoH row) |
| Manual QoH Adjustment | 145 | Direct QoH-edit UI path — gates the QuickBooks-push branch's finer-grained param logic |
| Purchase Order | 29 | PurchaseOrder module |
| Manual Physical Count Report | 25 | PhysicalInventory/manual-count reconciliation |
| Product Edited | 7 | Products module (edit-triggered QoH change) |
| From Scan Inventory Report | 4 | Mobile-scanner physical-inventory reconciliation |
| Manual Physical Count Report++ | 2 | An apparently-related variant of the row above — the relationship between the two was never confirmed |

**Confirmed absent from live data**: `'Sales Order - Manual QoH Update'`, `'Quick Edit'`, and `'Product
Cut'` — three of the four values the save hook's own QuickBooks-push branch explicitly checks for by
exact string — have **zero** live rows on the blueprint's own dev tenant. The code path is real
(confirmed by direct read); it is simply unexercised on this specific tenant's data as of the DB
snapshot date. Not asserted dead system-wide.

### 4.1.2 `push_to_qb` — a per-row flag, not a transitioning status

This flag determines whether the save hook fires the QuickBooks-push side effect **at save time** — it
is not read again afterward by any code path the blueprint found (no "push succeeded, mark as pushed"
follow-up write was located). Functionally this is closer to a one-shot trigger flag than a status: it
is set once by the writer, acted on once during the same save, and never referenced again. The 990 rows
holding an empty string instead of `Yes`/`No` (this module's entities-and-fields documentation) are not a
stuck/incomplete workflow state — they simply never triggered the push branch (an empty string fails the
"equals Yes" check the same way `No` would), so there is no "stuck, needs a dismiss mechanism" finding
here (Pass 3 §1.2).

### 4.1.3 `deleted` — the only true binary state, structurally present, unexercised on this dev snapshot

`0` (not deleted) → `1` (soft-deleted) via the delete endpoint, one-way, no reverse transition found
anywhere. **0 of 15,013 live rows are currently deleted** — consistent with a module whose records are an
append-only audit trail that operations staff would rarely, if ever, need to remove (Pass 3 §1.3).

## 4.2 No SO-status, sub-status, or any other module's status is snapshotted here

Checked two ways, per the method the blueprint applies consistently across this series: a live-schema
check for any status/flag/state-shaped column (zero matches beyond `change_type` and `push_to_qb`), and
an independent re-check of the full field catalog (confirming no field on this table copies or mirrors
another module's own status column) (Pass 3 §2).

## 4.3 Narrative diagram

```
  Row lifecycle (append-only audit log, no state machine):

    Writer module (SalesOrder/Products/PurchaseOrder/StoreTransfer/
    Receiving/ReceivingST/ProductCut/QuickEdit/PhysicalInventory/
    mobile-scanner webservice, etc.) calls the shared writer function
    or instantiates the entity directly, sets field values, saves
           |
           v
    The entity save hook runs unconditionally: recomputes Net
    Effect, resolves cost basis, resolves bin/zone/shelf, resyncs
    M2, conditionally pushes to QuickBooks — no branch here ever
    aborts the save
           |
           v
    Row persists as a permanent audit-log entry — change_type is
    a classification tag fixed at creation, not a state
           |
           v (rare — inline-edit ajax path, a manual correction,
              not a workflow transition)
    Any single field may be corrected post-creation, which
    silently re-triggers the ENTIRE save hook pipeline again
           |
           v (rarer still — 0 of 15,013 live rows)
    deleted: 0 --[one-way, no reverse transition found]--> 1
```

## 4.4 Required treatment for a new implementation

Per the module's own governing findings: **do not invent a state machine where none exists.**
`change_type` should be modeled as a fixed, DB-backed classification enum, set once at creation and
never transitioned — not as a status field with implied lifecycle semantics. `push_to_qb` should be
modeled as a plain boolean consumed once at write time, not carried forward as a stateful flag; this
also closes the legacy system's confirmed 990-row enum-coercion anomaly by construction, since a real
boolean column cannot hold a third, accidental blank state. Soft-delete (`deleted`) is preserved
structurally per the module's own append-only-audit-log framing, even though it is essentially
unexercised on the blueprint's own live data.

## 4.5 Open questions carried forward

1. **Whether `'Sales Order - Manual QoH Update'`, `'Quick Edit'`, and `'Product Cut'` are live
   `change_type` values on other tenants** — zero live rows under those exact strings on the blueprint's
   own dev snapshot; the code branches checking for them are real. Not resolved.
2. **The relationship between `'Manual Physical Count Report'` and `'Manual Physical Count Report++'`**
   — two live, distinct values differing only by a suffix; whether this represents a versioned/superseded
   report mechanism or an unrelated naming variant was not traced to a specific writer.
3. **Whether any code path re-reads `push_to_qb` after the initial save to mark a row as "successfully
   pushed"** — no such follow-up write was found in the blueprint's own module-scoped reads; a definitive
   answer would require reading the QuickBooks-push function's own internals, out of the blueprint's own
   scope.
