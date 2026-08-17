# Pricebooklevel800 — Screens & User Flows

> Views, fields, interactions, states. No component library or framework assumption.

Source: `docs_from_blueprint/module/Pricebooklevel800/08-screens-and-user-flows.md`, cross-read
against the rest of this module's own topic files, ultimately derived from
`blueprint/module/Pricebooklevel800/00-pass0-inventory.md` (Doc1 §00 Pass 0).

The blueprint does not document UI screens directly — that level of detail was explicitly out of
scope for the source blueprint passes, which catalog entry points/functions/routes rather than
screen layouts. **This section infers the implied screen/interaction structure** from the entities,
rules, status model, and outputs the blueprint does document, expressed as views/fields/interactions/
states rather than any specific UI framework or component library — the same inference approach the
SalesOrder pilot spec uses in its own `screens-and-user-flows.md`.

## Two parallel listing surfaces over related but distinct data

The legacy system exposes **two separate grid/listing surfaces that, despite both nominally belonging
to "the price book," actually list two different entities**:
- The **standard header ListView** — lists price-book *headers*.
- The **Rule Details grid** — a separate, parallel listing UI scoped to *one* price book's *rules*,
  reachable only from within a specific price book's own detail context, not from the standard
  list-view URL.

A new implementation should treat these as **two views into one bounded aggregate** (a price-book
tier and its owned rules — see `build-guidance.md` for the proposed domain model), not two
independently maintained listing implementations that happen to share a delete-button override and a
session-variable handoff, as the legacy system does today.

## Screen Inventory

| Screen | Purpose |
|---|---|
| List view (header grid) | A paginated grid of price-book header rows, with export and "Apply to Accounts"/"set as default"/"duplicate rules" mass-action affordances available per selection. |
| Detail view (read-only) | Displays a price-book header's own fields plus, structurally, its owned rule set (inferred: the "Rule Details" tab is reached from within a price book's own detail context). |
| Edit/create view (header) | The header create/edit screen: name, description, the floor-guard flag, default multiplier, PCB auto-update toggle, rounding-rule selector, default price-level code. |
| Rule Details grid (per price book) | A paginated (100 rows/page), inline-editable grid of a price book's own rules: line code/subline/division/product id/price code/sales rank scoping columns, plus the pricing-operation fields (price level, times, add-subtract, net price, GP%/markup%, penny round). |
| Duplicate-rule modal | A dedicated interaction for copying a source rule's scoping/pricing fields onto one or more destination price books, via a multi-select "destination book(s)" picker (rule PBL800-RULE-010; `duplicatePBRule.php`). |
| "Set as default" mass-action | A single-selection mass action on the header list that transitions the system-wide default flag, with a visible client-side "you can not select more than one" guard that is not mirrored server-side (rule PBL800-RULE-014). |
| PB Settings modal | A dedicated interaction for toggling the "auto-create rules from PCB updates" setting on one price book. |
| Apply-to-Accounts modal | A dual-listbox interaction for bulk-assigning/un-assigning Accounts to one or more selected price books, including a group-apply dropdown. |
| Export action | A single "Export" affordance on the header list view; per `outputs.md`, its actual result (a CSV of the in-session price book's rules, not the listed headers) is a real UX/correctness gap a new implementation should not reproduce without first resolving which entity "Export" is meant to target. |

## Flows

- **Header create/edit flow**: entry via the header list view's "New"/row-edit action → name,
  description, floor-guard flag, default multiplier, PCB auto-update toggle, rounding-rule selector,
  default price-level code → submit. Decision points: duplicate-name pre-check (client-side advisory
  only, PBL800-RULE-004) does not block a genuine race-condition duplicate at save time. Exit state:
  header saved, no confirmed uniqueness guarantee.
- **Rule-row edit flow**: entry via a price book's own "Rule Details" tab → inline-edit scoping
  columns (line code/subline/division/product id/price code/sales rank, blank = wildcard) and
  pricing-operation fields (price level, times, add-subtract, net price, GP%, markup%, penny round,
  PC $ range) → persisted via the header save flow's own rule-update loop (rule PBL800-RULE-009).
  Decision point: none — no allow-list of editable columns exists at this layer (see
  `risks-and-open-questions.md`, Critical Finding #1).
- **Duplicate-rule flow**: entry via a rule row's duplicate action → select a source rule, select one
  or more destination price books → copy the rule's 13 named fields onto each (rule PBL800-RULE-010).
  Exit state: new rule row(s) created via the sibling module's own real entity-save method.
- **Delete flow**: entry via the ListView's own row-delete affordance (guarded — blocks if any
  Account is currently assigned) **or** a second, unconditional delete path elsewhere in the system
  with no such guard (rule PBL800-RULE-007). A new implementation's UI should expose exactly one
  delete affordance backed by exactly one guarded code path, not two with different guarantees.
- **Bulk-assignment flow**: entry via "Apply to Accounts" on the header list → select one or more
  price books, select Account(s) (or a group) → apply or remove the assignment across the selected
  set. This flow is the module's confirmed SQL-injection vector reaching Accounts' own pricing-tier
  assignment column — see `risks-and-open-questions.md` Critical Finding #4.
- **"Set as default" flow**: entry via a single-selection mass action on the header list → clear the
  flag on every row, set it on the chosen row, push that row's name into core CRM field-metadata's
  default value for the Accounts assignment column. Client-side single-selection guard is not
  mirrored server-side (rule PBL800-RULE-014); server silently truncates a multi-id submission to
  just the first id rather than rejecting it.
- **Product-count indicator interaction**: a per-rule tooltip intended to show how many products a
  rule's scoping currently matches — per rule PBL800-RULE-011, this feature's underlying query is
  currently broken (a missing keyword causes a query syntax error), so this interaction does not
  currently return a real count; a new implementation should decide, as an explicit product-owner
  call, whether to rebuild this feature or drop it.
- **Color-code settings interaction**: a client-side button opens a settings modal for which **no
  corresponding server-side handler was found anywhere in this module** — either a dead button or a
  handler registered elsewhere in a shared action-dispatch table not read in this module's own scope.

## States

- **Header-level state**: soft-deleted flag, system-default flag, PCB auto-update toggle — all should
  be visible/filterable in the list and detail views per `entities-and-fields.md`.
- **Rule-level state**: soft-deleted flag, the (effectively write-only, from this module's own
  perspective) "Updated" dirty-flag column, provenance (hand-authored vs. PCB-sync-generated).
- **Validation/error states**: the delete-guard's "already in use" block should surface as a clear,
  specific error tied to the blocking condition, matching the legacy system's own message intent
  (rule PBL800-RULE-007) — but, per that same rule, a new implementation must ensure this guard
  cannot be bypassed by an alternate entry point the way the legacy system's unconditional delete
  path allows today.
- **Duplicate-name state**: since no uniqueness constraint exists at the legacy data-storage layer
  (PBL800-RULE-004), a new implementation's UI should treat "this name already exists" as a genuine,
  server-enforced rejection state, not merely an advisory pre-submit check as in the legacy system.
- **Pricing-lookup-failure state**: per `calculations.md`, an Account assigned to a price book whose
  header row does not (or no longer) exists currently computes a silent `0.0000` price with no
  visible error state anywhere in the traced legacy code — a new implementation should treat "assigned
  price book has no resolvable header" as an explicit, surfaced condition rather than a silent zero,
  consistent with the "no operation may silently produce an unverified/incorrect financial value"
  principle the SalesOrder pilot spec establishes for its own module.
- **No-permission state**: not documented at the screen level in the source material — see
  `permissions.md` for what this module's own code actually checks (limited to two generic
  EditView/Delete action-permission checks on the header entity; most of this module's own write
  flows have no in-file authorization check at all).
