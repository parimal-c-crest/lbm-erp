# SalesOrder — Workflows

> Keep this file even if this module has no lifecycle/state behavior — state that explicitly below
> rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

## Applicability

This module clearly has lifecycle/state behavior. A Sales Order moves through a primary
status/sub-status lifecycle (draft/working → quote or contract → pending → finished/closed/
expired) and, once in "Pending" primary status, through a separate, tenant-configurable
fulfillment sub-status pipeline. Source: `docs_from_blueprint/module/SalesOrder/04-status-workflow.md`
§4.1-§4.3, ultimately derived from `blueprint/module/SalesOrder/`.

**Governing finding carried forward as-is (do not treat as resolved):** the legacy system carries
two loosely-coupled, independently-gated status systems — the Primary Status/Sub-Status lifecycle
and the Fulfillment Sub-Status pipeline — that happen to write into the **same underlying field**.
Because both write the same field, a sub-status value is contextually one or the other depending
only on which subsystem last wrote it; a query against the field alone cannot determine which
system produced a given value without also consulting the order's classification (order type /
location type / job type). This is the specific defect that the module's "no generic overloaded
status field" governing architectural requirement exists to fix. A new implementation is expected
to split this into three explicit, independently-typed concepts instead of resolving the ambiguity
within the legacy shape:

1. **Primary lifecycle status** — a strict state machine (Pending → Finished terminal;
   Pending/Accepted-Quote → Closed terminal, quote-type only; Pending/Accepted-Quote → Expired
   terminal, quote-type only).
2. **QuoteLifecycleStatus** — the free-text quote/contract/pending track, as an explicit
   enumerated concept independent of fulfillment state.
3. **FulfillmentStatus** — the configurable delivery/fulfillment pipeline, sourced from a
   tenant-scoped lookup plus a job-type-scoped allow-list, preserving the legacy
   forward/backward-move and skipped-stage-logging semantics.

An order carries a non-null QuoteLifecycleStatus **or** a non-null FulfillmentStatus depending on
which track it is currently in — but as two separate, independently-typed fields, not one shared
one. The tables below document the legacy behavior as found; they do not pre-resolve which of the
three target concepts a given legacy value maps to where the source itself flags that mapping as
ambiguous or unconfirmed (see notes after each table).

## States

**Primary Status values:**

| State | Meaning |
|---|---|
| Pending | Working order — not yet finalized/invoiced. Default state for a normal order, or a quote/contract once accepted and past its acceptance sub-flow. |
| Finished | Finalized/invoiced order — locked; final total set; inventory/cost/tax fully committed. |
| Closed | A quote-type record that was accepted, shipped (in full or in part), and explicitly closed once nothing remains to ship. Terminal, quote-only. |
| Expired | A quote-type order whose sub-status contains "quote" and whose expiration date has passed. Set both opportunistically on save and by a separate scheduled sweep. |
| Pending: Time Out | An auto-save/session-timeout snapshot status, distinct from a real user save. |
| *(blank)* | A small number of legacy records carry no primary status at all — no code path was found that explains how a record reaches this state. Flagged as unexplained data, not a confirmed defect. |

**Quote/Contract/Pending Sub-Status track** (non-exhaustive but representative): Pending Quote,
Pending Contract, Accepted Quote, Accepted Contract, Pending (plain working order), Pending:
Service-Appointment, Pending COD, Pending COD Quote, three "Pending …Email Payment" variants (one
per payment-gateway integration), Pending: Awaiting Approval (a credit-hold gate), Pending: Time
Out (with three COD/quote-preserving variants), Historical Quote (an immutable audit copy of an
accepted quote), plus Finished/Closed mirrored from the primary status when those transitions
fire.

**Fulfillment Sub-Status pipeline values** (live configuration): To Be Delivered, Staged, Roofing,
Flooring, Furnished, Plumbing, Packing, Invoiced (terminal — always sorted last in the fulfillment
interface regardless of its configured sort position), plus three historically-used values
(Picking, Out For Delivery, Delivered) now deactivated but preserved for historical-reference
integrity. Which of these values is even selectable for a given order is scoped by the order's job
type via a configurable allow-list.

**Other status-shaped fields, related but independently gated** (not part of the primary state
machine, tracked separately): a derived Paid Status (Yes/No, recomputed only when primary status
is Finished); a Quote/Contract boolean companion flag; a pre-pick-verification micro-status
(Pending/Completed) layered on top of the primary lifecycle; a "picked status" fulfillment marker;
an order-acknowledgement/ship-notice status whose write path was never located in the traced code
(flagged open, see notes below).

## Transitions

| From | To | Trigger | Guard Condition | Side Effects |
|---|---|---|---|---|
| (create) | Pending / Pending Quote / Pending Contract | Order creation | Routed by the initial classification chosen at create time | — |
| Pending Quote | Accepted Quote | Quote acceptance | Duplicate guard (SO-VAL-097) | Regenerates a historical-quote audit copy; flips the order's quote/contract classification |
| Pending Contract | Accepted Contract | Contract acceptance | Contract-flow analogue of quote acceptance | — |
| Accepted Quote | Closed | Quote closure | Fires only once every related shipment-tracking row shows nothing left to ship | De-allocates inventory |
| any quote-flavored sub-status | Expired | Quote expiration | Order is past its expiration date | Fires opportunistically on any save touching the order, and via a separate scheduled sweep (logic not fully read — flagged open) |
| Pending | Pending: Awaiting Approval | Credit-hold interrupt | Client-computed over-limit/past-due signal (SO-VAL-005) | Hard override, supersedes whatever sub-status would otherwise apply |
| configured fulfillment stage | next/previous configured fulfillment stage | Explicit user action (Pending, LBM/Stock-Order-type locations only) | Move must stay within the job-type-scoped allow-list sequence | Skipped stages logged going forward and retroactively un-logged going backward |
| Pending (any working sub-status) | Finished | Finalize | None confirmed reliable — legacy guard against re-finalizing an already-Finished order is broken in one of two finalize entry points (High-severity finding); a new implementation must enforce this as a single, non-bypassable rule | Locks the order; sets invoice metadata; triggers financial recalculation, external-system pushes, PO generation, delivery-log creation |
| (any, quote/COD-eligible) | quote/COD sub-status classification updated | Printing the customer-facing Quote document | — | Printing is itself a status-changing action, not read-only: it writes the quote/COD sub-status classification onto the order as a side effect of printing (confirmed as a gap in the original transition-table documentation) |
| Pending (pre-pick micro-status) | Completed | Pre-pick-verification action | — | For COD orders, pushes a delivery-time estimate to the delivery-dispatch integration on completion. Layered on top of the primary lifecycle without gating it |

**Note on completeness**: this is the transition set condensed from the source's §4.3 summary; the
source itself describes it as condensed from a fuller transition table (with triggers, guards, and
side effects) that lives only in the underlying blueprint document, not reproduced in full here.
Two independent micro-workflows — the pre-pick-verification flow and a deposit-payment-schedule
flow consumed oldest-first as deposits are recorded — layer on top of the primary lifecycle without
gating it and are not themselves primary-status transitions.

## State Diagram

```
[create] --> Pending / Pending Quote / Pending Contract  (per initial classification)

Pending Quote --> Accepted Quote --> Closed (terminal, quote-type only)
Pending Contract --> Accepted Contract
(quote-flavored sub-status, any) --> Expired (terminal, quote-type only)
Pending --> Pending: Awaiting Approval  (credit-hold interrupt; supersedes other sub-status)
Pending (any working sub-status) --> Finished (terminal in normal flow)

Independent, orthogonal to the above (same order, once Pending, LBM/Stock-Order-type locations):
  Fulfillment pipeline (job-type-scoped, configurable order):
  To Be Delivered <-> Staged <-> [Roofing | Flooring | Furnished | Plumbing] <-> Packing --> Invoiced (terminal)
  (forward/backward moves allowed via explicit user action; skipped stages logged)

Layered, non-gating micro-workflows (do not block the primary lifecycle):
  Pre-pick-verification: Pending -> Completed
  Deposit-payment-schedule: consumed oldest-first, independent of status track
```

**Ambiguity preserved, not resolved**: because the Primary Status/Sub-Status lifecycle and the
Fulfillment Sub-Status pipeline write the same underlying legacy field, this diagram shows them as
two logically distinct tracks per the source's own analysis and the module's "no generic
overloaded status field" requirement — but the legacy system itself does not enforce this
separation, and a handful of legacy records (see below) cannot be explained by either track alone.

**Open items carried forward from the source, unresolved:**
- Roughly 26 legacy records carry a blank primary status with no explaining code path; one legacy
  record carries an anomalous Finished/Pending combination that no traced write path could produce;
  six carry an unexplained sub-status value that is only ever read, never found being written, in
  the traced code. Flagged as data anomalies to triage during any future migration, not states the
  new design should accommodate as valid.
- The scheduled quote-expiration sweep's full scheduling/logic was only confirmed by a text search,
  not fully read — its guard condition differs slightly in shape from the save-time check and
  should be independently verified before treating the Expired transition as fully understood.
- The order-acknowledgement/ship-notice status field has no confirmed write path anywhere in the
  traced code.
- Whether the "Packing" fulfillment stage's configured action label actually triggers an automatic
  document print, or is inert configuration, was not confirmed.
- The dedicated Status History audit entity is confirmed completely empty in the live system
  despite having a read function — either written from a code path entirely outside everything
  traced, or genuinely dead infrastructure. A new implementation should give this concept an
  actual, reliable write path.
- The coupon/promotion discount-ratio origin referenced elsewhere in the module's calculation logic
  was never traced back to its calling context (noted here only for cross-reference; detailed in
  calculations.md).
