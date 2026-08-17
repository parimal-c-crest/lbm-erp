# Vendors — Workflows

> Keep this file even if this module has no lifecycle/state behavior — state that explicitly below
> rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/Vendors/04-status-workflow.md`, itself derived from
`blueprint/module/Vendors/03-status-lifecycle.md`.

## Applicability

Applies, but narrowly. **Vendors has no business-level Active/Inactive status field of its own at all** —
a full scan of every header/custom-field column for any status/active/inactive/enable-shaped label found
no such field. The module's real lifecycle behavior is: (1) a genuinely-enforced generic soft-delete, (2) a
guarded delete transition, (3) a freely-re-editable (non-lifecycle) classification field with a live
cross-file 2017 rename bug, (4) a real, revocable Primary Supplier Assignment state, and (5) the SlipStream
Vendor Status field — the module's one genuine, webhook-driven state machine. These five are documented
below as the closest things this module has to workflow/state behavior.

## States

| State | Meaning |
|---|---|
| Deleted (soft-delete), `0`/`1` | The generic recycle-bin flag shared by every entity in the underlying CRM framework — the only lever gating whether a vendor can be selected. Confirmed both live-used and enforced at every point that matters (every vendor-picker autocomplete, Forecasting, primary-supplier candidate lists). |
| Manufacturer/Supplier/Subcontractors/All (classification) | A real, picklist-backed business classification — not a lifecycle. Freely user-editable at any time, no guard, no sequencing between values. |
| Primary Supplier Assignment | Assigned (to a specific vendor or location) vs. unassigned, per (vendor, location) pair — revocable to "none" explicitly, not merely reassignable. |
| SlipStream Vendor Status | blank / `Imported` / `Enrolled` (and, in principle, any other string — see Transitions). The module's one genuine, webhook-driven lifecycle. 100% blank on the checked dev snapshot; integration confirmed entirely unconfigured there. |
| Vendor Conversion Rule / Vendor Line Code Alias | Confirmed flat, state-free records — no enabled/disabled flag, no effective-date pair, no soft-delete column on either entity. |

## Transitions

| From | To | Trigger | Guard Condition | Side Effects |
|---|---|---|---|---|
| Deleted `0` | Deleted `1` | Vendor delete action | No unreceived POs **and** navigation context matches; both silently skip the delete if unmet | SlipStream disconnect fires if a linked SlipStream account exists: clears SlipStream identifiers/status on API success; satellite-table cleanup (Physical Address, Primary Supplier, Contact Relation, Conversion Rule, Line Code, Line Code Alias) **not confirmed** |
| Deleted `1` | *(no reverse transition traced)* | N/A | N/A | N/A — restore-from-recycle-bin was never searched for in any source pass |
| Primary Supplier Assignment: *(no row)* | Assigned | Change-primary-supplier action, non-empty selection | None enforced server-side (manufacturer-only client alert is cosmetic, VEN-RULE-037) | Lines Purchased cascade add/remove onto the old/new supplier vendor |
| Primary Supplier Assignment: Assigned (supplier A) | Assigned (supplier B) | Change-primary-supplier action, different selection | Procedural delete-then-insert, not DB-constraint-backed, race-prone under true concurrency | Same Lines Purchased cascade |
| Primary Supplier Assignment: Assigned | *(none — revoked)* | Change-primary-supplier action, empty selection submitted | None | Row deleted, no insert; Lines Purchased cascade still runs against the old supplier |
| SlipStream Vendor Status: blank | `Imported` | Vendor linked/pushed to SlipStream (individual link flow or bulk "import vendors" admin action) | None found beyond the action itself | Vendor's SlipStream identifier also set |
| SlipStream Vendor Status: `Imported` (or any) | *(any string, e.g. `Enrolled`)* | SlipStream's own inbound webhook event | **None** — inbound status value is trusted and persisted verbatim, no allow-list | Payment-method identifier also set from the same payload |
| SlipStream Vendor Status: `Enrolled` | *(gates a downstream action, not a further transition)* | N/A — read, not written, by the consumer | Normalized status equals "enrolled" | Downstream reconciliation's SlipStream-payment-import eligibility is enabled; UI icon un-dimmed |
| SlipStream Vendor Status: *(any)* | blank | Vendor delete, conditional | A linked SlipStream account exists **and** the SlipStream delete-vendor API call returns success | SlipStream identifiers also cleared |
| Classification: Any value | Any other value | Normal vendor edit-form save | None — generic field, freely re-editable at any time | None on the classification field itself; downstream candidate-list/reorder-scope effects only |

## State Diagram

```
Vendor Active/Inactive — confirmed absent as a business concept:
  (vendor created) -> no Active/Inactive field anywhere in the schema.
  Only real lever: generic soft-delete (0->1), guarded by an unreceived-PO check
  -- confirmed enforced everywhere it matters (every vendor-picker autocomplete,
  Forecasting, primary-supplier candidate lists).

classification (buy-side/sell-side) -- a real classification, not a lifecycle,
with a live cross-file rename bug:
  Manufacturer <-> Supplier <-> Subcontractors <-> All
  (freely re-editable, any direction, any time -- no transition guard)
  2017: picklist label 'Both' renamed to 'All'. Five backend call sites across
  3 modules still test the literal 'Both' -- dead since 2017 for every vendor
  now classified 'All'.

Primary Supplier Assignment -- real, revocable, per (vendor, location):
  (no assignment) --[non-empty selection]--> Assigned
       ^                                        |
       +----------[empty selection]-------------+   (explicit revocation, confirmed real)
  Reassignment: delete-then-insert, procedural one-row-per-scope only.
  NO Purchase Order record ever references this table.

Vendor Conversion Rule / Line Code Alias -- confirmed flat, no state:
  Conversion Rule:  create/update (upsert) <-> hard DELETE (exists)
  Line Code Alias:  create/update (upsert) <-> [ no delete path found ]

SlipStream Vendor Status -- the module's one real, webhook-driven state machine
(100% unused on the checked dev snapshot -- integration unconfigured there):
  blank --[push to SlipStream]--> Imported --[SlipStream webhook,
                                                any value trusted]--> Enrolled
    ^                                                                    |
    +----------[vendor delete, conditional on API success]---------------+
  'Enrolled' gates: a downstream reconciliation module's SlipStream-payment-
  import eligibility.
```

## Open items (carried from the status/workflow source pass)

- Whether the six satellite tables are cleaned up on a vendor delete remains unconfirmed — the delete
  callee found is scoped exclusively to SlipStream integration fields.
- No restore-from-recycle-bin (deleted → not-deleted) path was searched for in any pass.
- The five dead classification="Both" call sites were confirmed by a static-code-plus-live-picklist-table
  cross-reference, not a behavioral reproduction against a live "All"-classified vendor.
- SlipStream Vendor Status's full value set beyond "Imported"/"Enrolled" is not enumerable from any pass's
  read scope — the webhook persists any string verbatim with no allow-list.
- Whether a vendor's SlipStream link can be re-established after a delete-triggered disconnect was not
  traced.
