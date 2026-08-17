# SalesOrder — Screens & User Flows

> Views, fields, interactions, states. No component library or framework assumption.

Source: `docs_from_blueprint/module/SalesOrder/08-screens-and-user-flows.md`, ultimately derived
from `blueprint/module/SalesOrder/`. The blueprint does not document UI screens directly (screen
layout was explicitly out of scope for the source blueprint passes, which catalog entry
points/functions, not screen layouts). This section infers the implied screen/interaction structure
from the entities, rules, status model, and outputs documented elsewhere in this module's spec,
expressed as views/fields/interactions/states rather than any specific UI framework or component
library.

## Two Client Experiences Over One Capability Set

The legacy system exposes **two parallel user-facing surfaces that ultimately drive the same
underlying entities and (mostly) the same rule set**:
- A **standard order view/edit flow** — a fuller, more traditional create/edit screen plus a separate
  read-only detail view.
- A **"Quick" order flow** — a faster, more interaction-heavy alternative for the same underlying
  order-creation/editing task, with its own dedicated create screen.

A new implementation should treat these as **two different client experiences (or even the same
client experience revisited later) consuming one shared capability layer**, not two independently
built and independently maintained implementations of the same business logic — the source blueprint
specifically flags the legacy system's dual-path implementation as a maintenance burden worth not
repeating.

## Screen Inventory

| Screen | Purpose |
|---|---|
| List view | A filterable, paginated, sortable grid of orders, with an export-to-file action. |
| Detail view (read-only) | Displays the order header, line items, addresses, linked invoices/payments, and status history for an existing order. |
| Edit view (standard) | The full create/edit screen: header fields, a line-item entry block, pricing block, and address block, assembling all the same underlying data the detail view displays but in an editable form. |
| Quick create/edit view | A faster, more AJAX-driven equivalent of the edit view, covering the same fields and rules but optimized for rapid line-item entry (barcode/catalog/NS-code lookup, kit expansion, bulk qty/price update). |
| Status-change modal/interaction | A dedicated interaction for changing the fulfillment sub-status, gated by the job-type-scoped allow-list, with forward/backward movement both permitted and stage-skip history preserved (see workflows.md). |
| Deposit modal/interaction | A dedicated interaction for viewing/applying deposit-schedule entries against an order. |
| Document generation/print actions | One action per output type (outputs.md), most read-only against the order's current server-computed state; the Quote print action is the one exception that is also a state-changing action. |

## Flows

**Standard order create/edit flow**
- Entry point: List view "create" action, or "edit" action on an existing order (subject to the
  Finished-status edit lock — see permissions.md).
- Steps: select/enter account and contact → set location, order classification (plain/quote/
  contract), delivery preference and target delivery window → add line items (product lookup /
  barcode scan / catalog selection / historical-quote copy; bulk quantity/price update; kit
  expansion) → apply coupons, manual price overrides, or docket/contract-amount rounding as needed →
  enter deposit/payment details via the deposit modal → save.
- Decision points: whether the order is a quote/contract vs. a plain order (routes sub-status track
  differently, see workflows.md); whether a credit-hold interrupt fires (SO-RULE-005, forces
  sub-status to an approval-hold state, superseding whatever would otherwise apply).
- Exit/success state: order persisted as Pending (or a quote/contract-flavored Pending sub-status);
  user redirected to the detail view.

**Quick order create/edit flow**
- Entry point: dedicated Quick SO create screen.
- Steps: same underlying fields/rules as the standard flow, but optimized for rapid line-item entry
  (barcode/catalog/NS-code lookup, kit expansion, bulk qty/price update) via AJAX-driven interactions
  rather than full-page submits.
- Decision points: same as standard flow, plus role-gated restrictions on "Return" transaction types
  and tax-field editing (SO-RULE-106/SO-RULE-108) — enforced only as UI-level flags per the source
  blueprint, with server-side enforcement unconfirmed; see permissions.md.
- Exit/success state: same as standard flow. An order already in Finished status is rejected outright
  on this path (SO-RULE-096) rather than silently accepting an edit.

**Finalize flow**
- Entry point: finalize action on an in-progress order (standard or Quick).
- Steps: lock delivery-preference/freight/labor snapshot into the Finalization Record → resolve
  cost/margin per line (FIFO/LIFO/buyout/manual-override chain) → recompute totals server-side (per
  R3 / the server-side recomputation requirement in calculations.md) → write invoice metadata → push
  to external integrations (accounting sync, delivery-dispatch, document-management, loyalty
  platform) → generate outputs.
- Decision points: whether the client-displayed total disagrees with the server-recomputed total
  (should surface as a distinct, reviewable state — see States below); whether the order is already
  Finished (must be rejected, not silently re-finalized — see risks-and-open-questions.md, High risk
  #4, the broken legacy guard this module's design must not reproduce).
- Exit/success state: order locked in Finished primary status; SO Final Total set; outputs available
  for print.

**Document print flow**
- Entry point: a print/document-generation action from the detail view or edit view.
- Steps: select output type (outputs.md) → render from server-computed, persisted order state.
- Decision points: the Quote print action is a side-effecting status transition, not read-only — if
  the order is classified as a contract, it routes as a Contract print instead (see workflows.md,
  Transitions table).
- Exit/success state: document rendered/downloaded; for the Quote print action, the order's
  quote/COD sub-status classification is also updated as a side effect.

## States

- **Order-level state**: primary status, quote/contract sub-status or fulfillment sub-status, paid
  status, hold flag, approved flag — all should be visible/filterable in the list and detail views
  per the legacy system's field catalog (entities-and-fields.md).
- **Line-item-level state**: picked flag, quantity-backordered/cancelled/returnable, kit-membership
  indicator, serial/lot assignment state.
- **Loading / empty / error states**: not documented in the source blueprint (screen-layout detail was
  out of scope for the underlying blueprint passes) — not fabricated here; treat as an implementation
  decision for Stage 4, not a legacy behavior to reproduce.
- **No-permission state**: return-transaction entry and tax-field editing are both intended to be
  role-restricted per SO-RULE-106/SO-RULE-108 — but enforcement was confirmed only as a
  user-interface-level flag in the source blueprint, with server-side enforcement unconfirmed. A new
  implementation should treat server-side enforcement of these restrictions as a requirement, not an
  assumption already satisfied (see permissions.md).
- **Read-only state**: the Finished-status edit lock (see permissions.md, Ownership / Record-Level
  Rules) — an order in Finished status cannot be re-saved through the Quick SO edit flow
  (SO-RULE-096), and the legacy Delete action/button is likewise suppressed once status is Finished.
- **Validation/error states**: hard-blocked actions should surface clear, specific error messaging
  tied to the blocking rule (e.g., duplicate order number, invalid coupon, docket amount not eligible
  for rounding, insufficient unapplied credit) rather than a generic failure.
- **Finalize-specific state**: per the server-side recomputation requirement in calculations.md, a
  finalize attempt whose displayed total disagrees with the server-recomputed total should present as
  a distinct, reviewable state to the user — not a silent commit and not a silent rejection without
  explanation.
