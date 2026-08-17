# PurchaseLineItem — Workflows

> Keep this file even if this module has no lifecycle/state behavior — state that explicitly below
> rather than deleting the file. See `_deviations-from-original-template.md` in this folder.
>
> Source: `docs_from_blueprint/module/PurchaseLineItem/04-status-workflow.md`, itself traced to
> `blueprint/module/PurchaseLineItem/03-status-lifecycle.md`.

## Applicability

**PurchaseLineItem has no status/sub-status/workflow-state field of any kind.** Unlike some sibling
modules (e.g. SearchLineItem, which carries two flag-shaped lifecycle fields used for triage/alerting),
this module carries no alert-flag, sub-status, or workflow-state field whatsoever. Its only status-shaped
column is the generic soft-delete flag (see States below). A full sweep of the module's 23-column field
catalog for status/flag/state-shaped names returns zero matches beyond that one flag.

This is stated explicitly, per this project's discipline against silently omitting a topic the module's
shape would otherwise lead a reader to expect: SalesOrder's own status-workflow spec is one of its
richest sections; PurchaseLineItem's equivalent finding is that **no such structure exists to document**.

This is a genuine structural difference from a triage-bearing module, not merely a smaller version of the
same shape. A triage/alert flag exists elsewhere in this codebase's other modules because a business
decision needs somewhere to be parked for later review. No equivalent triage/alert decision was found
anywhere in PurchaseLineItem's six writer call sites — the decision-making (PO status transitions,
reconciliation logic) lives entirely in PurchaseOrder's own status-transition/reconciliation workflow,
documented in that module's own spec, not here. PurchaseLineItem is a pure denormalized fact table with
no decision-bearing columns of its own.

Below, the soft-delete flag is documented as the module's sole lifecycle-shaped field, along with the two
narrow post-creation update paths that exist outside any status model.

## States

| State | Meaning |
|---|---|
| Not deleted | Live, active row — 1,100 of 1,100 rows on the dev snapshot examined (100%) |
| Deleted | Soft-deleted via the generic, shared delete mechanism used across this codebase — 0 live rows on the dev snapshot examined; structurally present, unexercised in practice |

## Transitions

| From | To | Trigger | Guard Condition | Side Effects |
|---|---|---|---|---|
| Not deleted | Deleted | A user or process deletes a Purchase Line Item record | Record identifier must be present in the request (`business-rules-and-validation.md` PLI-RULE-007) | Delegated to the generic delete mechanism's own mechanics — not independently re-derived in the source blueprint |
| Deleted | Not deleted | *(no reverse/undelete transition found anywhere in this module's own files)* | N/A | N/A |

## State Diagram

```
[Not deleted] --(delete, record id present)--> [Deleted]
[Deleted] --(no reverse transition found)--> (none)
```

## Record lifecycle — mostly frozen after creation

A row's core snapshot data is written once, at creation, by one of the module's six confirmed writers.
Beyond creation, exactly two genuine post-creation update paths were found in a repo-wide search — no
general refresh/resync mechanism exists for any other field:

1. **ASN-number backfill** — when an Advance Shipment Notice is matched to a PO line (either at PO append
   time or via the ASN-processing flow's own line-matching loop), the matched line's ASN-number field is
   written after the row's initial creation. This is a real, narrow, single-field sync-on-match, not a
   general resync. Whether the values used to locate the target row in this update are ever directly
   sourced from raw user input, or are always derived internally from the ASN/EDI-payload processing loop,
   was not traced to its ultimate origin in the source blueprint — the injection-shape characterization
   applies regardless of source.
2. **Vendor-number backfill** — every save (through any of the six writer paths, since this logic runs
   inside the entity's own generic save hook regardless of caller) re-derives the vendor-number field from
   the vendor's own record, keyed on the row's vendor reference. Technically a write on every save, not
   merely post-creation, but functionally idempotent — the same value is written back every time unless
   the vendor's own number changes between writes.

**No general refresh mechanism exists.** Beyond these two narrow paths, no code path was found that
re-derives or re-syncs a Purchase Line Item row's other snapshot fields (cost, qty, extensions, location,
etc.) after its initial write.

## Required resolution for a new implementation

Because no genuine status/lifecycle model exists to redesign, the only lifecycle-shaped requirement
carried forward from the governing architectural requirements (see `entities-and-fields.md`) is that the
soft-delete flag be preserved as the entity's sole lifecycle-shaped field, delegated to the same shared,
parameterized delete mechanism used elsewhere in a new implementation — no PurchaseLineItem-specific
transition logic needs to be designed. The two narrow post-creation update paths above should each become
their own explicit, narrowly-scoped operation (an ASN-match operation, and a vendor-number-derivation step
folded into row creation itself, closing the "silent no-op when vendor reference is falsy" gap noted in
PLI-RULE-004) rather than a general "resync everything" mechanism, since the source blueprint found no
evidence such a mechanism is needed.

## Open Questions

- Whether the ASN-number and vendor-number fields' live population rates have grown or changed since the
  blueprint's own snapshot was taken — not queried in the source pass to keep database footprint minimal;
  flagged as a safe, read-only re-run if ever needed.
- Whether the values used to locate the target row in the ASN-number backfill update are ever directly
  sourced from raw user input, or always derived internally from loop/payload processing — not traced to
  its ultimate origin.
- Whether the shared, generic delete mechanism's own internal mechanics (permission checks,
  referencing-data integrity checks) apply any PurchaseLineItem-specific logic, or are purely generic —
  not independently re-derived in the source blueprint.
