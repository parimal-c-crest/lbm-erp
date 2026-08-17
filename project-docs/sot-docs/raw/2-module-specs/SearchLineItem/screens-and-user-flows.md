# SearchLineItem — Screens & User Flows

> Views, fields, interactions, states. No component library or framework assumption.

Source: `docs_from_blueprint/module/SearchLineItem/08-screens-and-user-flows.md`. The source blueprint
does not document UI screens directly (out of scope for the source blueprint's own passes, which catalog
entry points/functions/fields/rules, not screen layouts); this file's content is **inferred** from the
entities, rules, status model, and outputs documented elsewhere in this module's spec, following the
same inference method SalesOrder's own equivalent file establishes — flagged here as Inferred rather than
Confirmed throughout.

## Screen Inventory

| Screen | Purpose |
|---|---|
| List view | A filterable, paginated, sortable grid of line-item snapshot rows, with a basic-search header and an advance-search option, plus an export-to-CSV action. Given the module's role as a search index, the list view is arguably the module's primary screen — the entity's own name ("Search Line Item") signals this directly. |
| Detail view (read-mostly) | Displays a single row's full field set: identity/SO-line linkage, customer/job/people, pricing/margin, cost, tax, location/fulfillment, buyout, and kit/promotion/supersession context. Not fully read-only: a narrow set of fields (Extended Product Cost, Extended Original Product Cost) support an inline edit interaction directly from this view. |
| Edit/create view | Present in the legacy system's generic scaffolding, but per the module's own confirmed structural finding, never actually exercised by any user-facing flow in practice. A new implementation should not assume this view needs to be rebuilt in its legacy shape; if any create/edit capability is wanted at all, it should be scoped as a deliberate new decision, not a default port of vestigial scaffolding. |
| Superseded/Return Alert Worklist | A dedicated alert-triage screen (not a document — see `outputs.md`) listing rows currently flagged for supersede/return follow-up, with a per-row "dismiss" action and a bulk "dismiss selected" action. |
| Oversale Alert Worklist | Implied, but **does not exist in the legacy system today**. The legacy system has a read-only oversale-list report (living under SalesOrder's own screens) but no equivalent dismiss-capable worklist. A new implementation's governing requirement R4 calls for building this worklist with a real dismiss action, closing a gap the legacy screens never had. |

**A read-and-search surface, not a create/edit surface.** Unlike SalesOrder's two parallel client
experiences (a standard edit/detail flow and a faster "Quick" flow), SearchLineItem's implied screen
structure is dominated by a single fact the blueprint establishes repeatedly: this module's own
create/edit scaffolding is present but not the real write path. A new implementation's screen design
should follow that finding rather than build a full create/edit UI around a table that, in production,
is populated exclusively by SalesOrder's own finalize process. **Implied conclusion**: SearchLineItem's
screens are primarily **read** surfaces (search, list, detail, export) plus **two narrow, already-live
write interactions** (an inline single-field edit, and an alert-dismiss action) — not a general-purpose
record editor.

## Flows

- **Search/list flow.** Entry point: list view. Steps: basic search (a single search field/string
  against the module's searchable fields), or advance search (multi-field criteria against a broader
  field set), or a "dashboard drill-through" entry path used by Home-widget links. Decision points: none
  beyond filter/search criteria selection. Exit/success state: a filtered/sorted grid of rows, from which
  a user can drill into a Detail view or trigger a CSV export of the current filtered set.
- **Detail-view inline-edit flow.** Entry point: Detail view. Steps: user edits Extended Product Cost
  (recomputes and persists Margin Dollars/Margin Percentage) or Extended Original Product Cost
  (recomputes and persists Original Product Cost). Decision points: none surfaced to the user in the
  legacy system (no confirmation step). Exit/success state: fields update in place; both are currently
  unguarded against a zero-denominator input in the legacy system (silently coerces to zero — see
  `calculations.md`) and both should surface a real validation error in a new implementation rather than
  silently persisting a corrupted value.
- **Alert-dismiss flow (supersede/return).** Entry point: Superseded/Return Alert Worklist. Steps:
  per-row "Remove Alert" or bulk "Action Taken, Remove Selected." Decision points: none — no state check
  that the target row(s) are actually flagged (SLI-RULE-015). Exit/success state: flag reset, worklist
  reloads with a shorter list.
  An equivalent (new, not legacy-present) dismiss action for the oversale worklist should be scoped to
  the individual flagged row (`sliId`), not the legacy oversale script's unsafe bulk
  product+location+line-code match.
- **Delete flow.** Entry point: list view or detail view delete action. Steps: soft-delete action, gated
  only on the record id being present. Decision points: none — the legacy system performs no
  referencing-data integrity check before deleting (SLI-RULE-006/007/008). Exit/success state: row
  flagged deleted. Whether a new implementation needs a stronger integrity check depends on whether
  anything in the new design ever comes to depend on a specific row surviving — the blueprint found no
  such dependency in the legacy system (this module is a read-model nothing else writes back to), so no
  new guard is invented here without evidence.

## States

- **Row-level state (per screen where relevant)**: the two alert-flag states (not-flagged / flagged /
  dismissed, per `workflows.md`), the soft-delete flag, and Transaction Code as a read-only
  classification — none of these are a general order-status lifecycle (SearchLineItem carries no copy of
  its parent SO's own status).
- **Validation/error states**: the module's own confirmed-live validation surface is narrow — a hard
  block on a missing record id for both the inline-edit and delete actions (SLI-RULE-006, SLI-RULE-009),
  and (in a new implementation, not the legacy one) a rejection state for a division-by-zero-triggering
  inline edit rather than the legacy system's silent zero-coercion.
- **No-permission state**: the legacy DetailView/ListView gate the display of Edit/Delete controls on
  `isPermitted()` checks (see `permissions.md`) — a no-permission state hides those controls rather than
  showing a distinct error screen; not independently confirmed for the ajax inline-edit or alert-dismiss
  endpoints, which the blueprint found carry no permission check beyond session authentication.
- **Staleness state (implied, not a legacy UI concept)**: a row's fields other than Customer PO Number
  and (same-transaction) Line Number have no confirmed refresh path if the parent SO's line data changes
  after finalize. Whether a new implementation should surface a "this snapshot may be stale relative to
  its source SO line" indicator is a design choice the blueprint does not dictate either way — flagged
  here as a screen-design question worth resolving explicitly rather than silently inheriting the legacy
  system's lack of any such indicator.
