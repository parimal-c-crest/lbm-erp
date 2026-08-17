# PurchaseLineItem — Screens & User Flows

> Views, fields, interactions, states. No component library or framework assumption.
>
> Source: `docs_from_blueprint/module/PurchaseLineItem/08-screens-and-user-flows.md`, itself traced to
> `blueprint/module/PurchaseLineItem/00-pass0-inventory.md` (structural inventory of the module's
> view/controller files — the source blueprint does not document UI screens directly at layout level;
> this section infers the implied screen/interaction structure from the entities, rules, status model,
> and outputs documented elsewhere, the same method SalesOrder's own screens-and-user-flows spec
> follows).

## A read-model with a vestigial, largely non-functional write surface

Unlike SalesOrder's own two-parallel-client-experiences shape, PurchaseLineItem presents a **structurally
much simpler, mostly read-only surface**: standard vtiger scaffolding (list view, detail view, edit view,
quick-create) is present, but no confirmed live user-facing path was found anywhere in the codebase that
actually exercises the create/edit form's own save flow, and the one narrower inline-edit endpoint that is
genuinely reachable is confirmed broken (instantiates the wrong entity class — see
`business-rules-and-validation.md` PLI-RULE-010). A new implementation should treat this module's primary
user-facing surface as **read/search/export only**, with a narrow, correctly-scoped inline-edit capability
as the sole write-side interaction (per requirement R4 in `entities-and-fields.md`) — not a general
create/edit form the way the legacy scaffolding's presence might otherwise suggest.

## Screen Inventory

| Screen | Purpose |
|---|---|
| List View | A filterable, sortable grid of purchase line items, with an export-to-CSV action. The list view's own filter/search logic special-cases the linecode field (substituting a resolved display name for the raw code) per the shared search infrastructure it relies on. |
| Detail View (read-only) | Displays a single purchase line item's full field set: vendor, PO number, transaction type, PO date, product/line-code, purchased quantity/cost/core-cost and their extensions, location, and ASN number if matched. The legacy system's own detail view rewrites the PO-number field into a link to the parent PO's own detail view — a cross-module navigation affordance worth preserving conceptually, independent of implementation. |
| Edit View (vestigial in the legacy system, not carried forward as a general surface) | Standard vtiger create/edit scaffolding exists but has no confirmed live user-facing path in the legacy system. Not a capability a new implementation should reproduce as a general create/edit form — see the one narrow write interaction below instead. |
| Inline-edit interaction | A narrow, single-field edit affordance on the detail view. In the legacy system this is broken (wrong entity class); a new implementation should give this interaction a correctly-scoped home against the actual entity, restricted to an explicit allow-list of editable fields (per R4). |

## Flows

- **List/search flow**: entry point is the module's List View. Steps: user applies filter/search
  criteria (vendor, PO number, transaction type, PO date, product number, line code, location, purchased
  quantity/cost/core-cost and their extensions) → shared list-query infrastructure resolves the results,
  substituting a display name for the raw line-code value → user optionally clicks "Export" to download
  the current filtered/searched row set as CSV. Exit/success state: rendered grid, or a downloaded CSV
  file.
- **Detail-view flow**: entry point is a row selected from the List View (or a direct link, e.g. from the
  parent Purchase Order). Steps: full field set is rendered read-only, plus a resolved link back to the
  parent Purchase Order's own detail view. Exit state: the read-only detail page; no save/submit step
  exists on this path in the legacy system.
- **Inline-edit flow (legacy, broken)**: entry point is a single-field edit affordance on the Detail View.
  Steps: user submits a field name/value pair with the record identifier → endpoint instantiates the
  wrong entity class (per PLI-RULE-010) → the write, if it succeeds, lands on an unrelated module's table,
  not this one. No error is surfaced to the user in the success case. Exit state: apparent success from
  the user's perspective; no actual PurchaseLineItem field is changed.
- **Inline-edit flow (target, for a new implementation)**: same entry point, but the command is typed
  against the actual PurchaseLineItem aggregate specifically, with the submitted field restricted to an
  explicit allow-list of editable fields (per R4) — replacing the legacy system's broken equivalent.

## States

- **Row-level state**: whether a row is deleted (soft-delete flag) — the entity's only status-shaped
  state (see `workflows.md`). No sub-status, alert-flag, or workflow-state field exists to surface.
- **Data-freshness state**: a row is "mostly frozen after creation" — a new implementation's detail view
  should make clear that most fields reflect the state at the moment of the triggering PO event, not a
  live-recalculated value, with the two narrow exceptions (ASN-number match, vendor-number re-derivation)
  called out explicitly if surfaced to a user at all.
- **Validation/error states**: the one genuinely hard-blocked user action in the legacy catalog is delete
  without a record identifier present (PLI-RULE-007) — a generic request-shape error, not a business-rule
  rejection. No business-rule-shaped validation error states were found to surface, since this module's
  own write surface carries essentially no field-level business validation in the legacy system.
- **No-permission state**: not separately documented in the source blueprint beyond the generic
  `isPermitted()` gating on EditView/Delete actions — see `permissions.md`.
