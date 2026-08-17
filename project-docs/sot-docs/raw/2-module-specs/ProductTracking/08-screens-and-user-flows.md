# ProductTracking — Screens & User Flows

Part of the ProductTracking tech-agnostic module spec. Source: inferred from this module's own module
overview, entity/field catalog, business rules, status workflow, and outputs documentation, following
the same inference method SalesOrder's own `08-screens-and-user-flows.md` establishes.

The blueprint does not document UI screens directly (that level of detail was explicitly out of scope
for the source blueprint's own passes, which catalog entry points/functions/fields/rules, not screen
layouts). This section infers the implied screen/interaction structure from the entities, rules, status
model, and outputs the blueprint does document, expressed as views/fields/interactions/states rather
than any specific UI framework or component library.

## 8.1 A read-and-search surface, not a create surface

ProductTracking's implied screen structure is dominated by the same fact its module-overview
documentation establishes repeatedly: **this module's own create/edit scaffolding is present but not the
real write path**. A new implementation's screen design should follow that finding rather than build a
full create/edit UI around a table that, in production, is populated almost exclusively by ≥11 other
modules' own save/finalize routines plus an external webservice.

**Implied conclusion**: ProductTracking's screens are primarily **read** surfaces (search, list, export,
detail) plus **two narrow, already-live write interactions** (an inline single-field edit, and a
product-variant detail popup) — not a general-purpose record editor, and — unlike a module with an
alert-dismiss worklist — with no triage/dismiss screen of any kind, since this module carries no
alert-flag field for one to surface.

## 8.2 Implied view structure

- **List view** — a filterable, sortable grid of QoH-change log rows, scoped by default to the current
  session's location, with an export-to-CSV action (this module's outputs documentation). Given the
  module's role as an audit log, the list view is arguably the module's primary human-facing screen.
- **Detail view (read-mostly)** — displays a single row's full field set: identity/location/product
  linkage, quantity before/after, reason, classification, attribution, the costing snapshot, and
  cross-references to the originating transaction. Not fully read-only: any single field supports an
  inline-edit interaction directly from this view (§8.3), and a dedicated action opens the
  product-variant detail popup.
- **Product-variant detail popup** — a read-only ajax fragment rendered inline into the detail view,
  showing a specific tracking row's product-variant breakdown (this module's business-rules
  documentation, PT-VAL-021; this module's outputs documentation §6.3). Not itself a document or export.
- **Edit/create view** — present in the legacy system's generic scaffolding, but per the module's own
  confirmed structural finding, the real write path in production is ≥11 other modules' own save/finalize
  routines plus a shared writer function plus an external webservice, not this module's own form. A new
  implementation should not assume this view needs to be rebuilt in its legacy shape; if any
  human-facing create/edit capability is wanted at all, it should be scoped as a deliberate new decision,
  not a default port of vestigial scaffolding.

## 8.3 Key fields and interactions surfaced across the flows

- **Search/list interactions**: a location-scoped list/search over the audit log, plus a
  `pricingavail`-flagged search branch confirmed as one of this module's four Critical SQL injections
  (this module's business-rules documentation, PT-VAL-019) — a new implementation should treat this
  branch's underlying use case (a product-number-scoped lookup) as a real requirement, but implement it
  through the same parameterized search path every other query uses, not as a special unguarded branch.
- **Detail-view inline-edit interaction**: an edit to any single field re-triggers the entity's entire
  cost/QuickBooks-push computation pipeline (this module's business-rules documentation, PT-VAL-018) —
  in the legacy system, this is also the delivery mechanism for one of the module's four Critical SQL
  injections. A new implementation's equivalent interaction should validate the submitted field name
  against an explicit allow-list of editable domain properties before any recomputation occurs, per this
  module's own security-by-construction requirement.
- **Product-variant detail interaction**: a button/link on the detail view opens the read-only
  variant-breakdown popup — in the legacy system, this is the delivery mechanism for a second of the
  module's four Critical SQL injections; a new implementation's equivalent interaction should resolve the
  row id through the same parameterized query path as every other lookup.
- **Delete interaction**: a hard block on a missing record id, then an unconditional delegation to the
  shared delete mechanism, with no referencing-data integrity check performed by the module itself (this
  module's business-rules documentation, PT-VAL-014/015). The blueprint's own "terminal audit-log leaf"
  finding (this module's entities-and-fields documentation) means no other entity depends on a specific
  ProductTracking row surviving — so no new integrity guard is invented here without evidence, the same
  treatment given to this finding across this series.
- **Export interaction**: CSV export of the current list-view's filtered/searched rows, unconditionally
  scoped to the user's current session location regardless of the caller's own filter state (this
  module's outputs documentation).

## 8.4 States surfaced to the user

- **Row-level state**: Change Type as a read-only classification set once at creation (this module's
  status-workflow documentation), Push To Quick Book as a one-shot trigger flag rather than a
  transitioning status, and the soft-delete flag — none of these are a general lifecycle; ProductTracking
  carries no copy of any other module's own status.
- **Validation/error states**: the module's own confirmed-live validation surface is narrow — a hard
  block on a missing record id for both the inline-edit and delete actions (PT-VAL-014, PT-VAL-016), and
  (in a new implementation, not the legacy one) a rejection state for any inline edit targeting a field
  name outside the new allow-list, rather than the legacy system's unrestricted mass-assignment
  acceptance.
- **No staleness concept applies** — unlike a read-model snapshot module whose fields might drift from a
  parent record after creation, ProductTracking is itself the audit log of record for each event; there
  is no upstream "source of truth" row for a ProductTracking entry to go stale relative to.
