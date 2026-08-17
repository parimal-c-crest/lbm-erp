# SearchLineItem — Module Overview

> Copy this whole `2-module-spec-template/` folder per module, rename, fill in. Stay tech-agnostic
> throughout — no framework/database/language references anywhere in Stage 2.

## Purpose

SearchLineItem is a per-sales-order-line **snapshot table** — a denormalized read-model/search-index
written once per finalized SalesOrder line, carrying enough of that line's sale/cost/margin/location
context (plus joined display labels such as counter-person name, transaction-code name, account name,
job name, and line-code/subline names) to be searched, listed, and exported independently of walking
the parent SalesOrder's own line-item structure. It also backs a specific superseded-product/
return-alert workflow that flags, and lets a user act on, line items whose product was superseded and
still shows a return/quantity-on-hand alert. **This module is fundamentally not an independently-
authored business entity** — its own Save.php/EditView CRUD is vestigial (no code path submits to it in
practice); the real, exclusive writer is SalesOrder's finalize routine (`saveFinalizeSOFunctions.php`).
Despite the vestigial write surface, it is a real, actively-growing operational asset: 7,074 live rows
at blueprint time, spanning mid-2022 through the blueprint's snapshot date.
(Source: `docs_from_blueprint/module/SearchLineItem/01-module-overview.md` §1.1.)

## Actors

- **Counter/sales/operations staff** — primary users of the search/list/export surface, and the
  audience for both alert worklists (superseded-return, oversale).
- **SalesOrder's finalize process** — the sole writer of SearchLineItem rows; a system/integration
  process, not a human actor, but the module's most important "actor" in a data-flow sense.
- **Warehouse/fulfillment context (indirect)** — location/zone/shelf/bin and buyout/kit fields carry
  fulfillment context copied at finalize time, though the module has no fulfillment workflow of its own.
- **Products' pricing-display screen (indirect, read-only)** — reads SearchLineItem data via a shared
  utility script for a customer's last-sell-price lookup.
- **Home-dashboard widget viewers** — internal staff who see summary counts of both alert flags on the
  home page.
- **External mobile-scanner app users** — an external-facing (though still internal-business) system
  that reads SearchLineItem data as a last-sell-price/historical-price cache.
- **Ford (external trading partner)** — recipient of a Ford-specific EDI-style export sourced from
  SearchLineItem data, via a standalone export script outside the module itself.

(Source: `01-module-overview.md` §1.4.)

## Scope within this module

**In scope**: the sales-order-line snapshot entity and its field catalog, the module's genuinely-live
write surfaces (an inline-edit ajax endpoint, an alert-dismiss ajax endpoint), the two alert-flag
mini-lifecycles, the module's narrow calculation surface (margin/extension figures computed once at
SalesOrder-finalize time, plus the module's own unguarded inline-edit division), the module's two
output surfaces (CSV export, alert-triage worklist), and this module's interfaces to SalesOrder (its
sole writer), Home, Products (indirect), and two external-facing read consumers.

**Out of scope**:
- Redesigning SalesOrder's own finalize routine or pricing engine — this spec documents the *contract*
  SalesOrder must publish against SearchLineItem, not SalesOrder's own pricing/tax/inventory logic
  (upstream inputs like `avgLandedCost`, `salepricevalue$i`, `corepricevalue$i`, `boBuyoutcost$i` were
  explicitly out of scope for the source blueprint's SearchLineItem-focused passes).
- The full `fuse5_so_transcationcode` reference-table enumeration (only 7 of an unknown fuller set of
  values were confirmed).
- The shared `CustomView.php` framework internals that `LoadList.php`'s `cvid` parameter reaches.
- The two external-facing read consumers' own internals (mobile-scanner webservice, Ford EDI export).
- `CallRelatedList.php`/`updateRelations.php` — confirmed verbatim/near-verbatim Campaigns-pattern
  leftovers, never adapted to SearchLineItem's own relation table; not carried forward as logic at all.
- Deployment/rollout sequencing.
- Selecting an implementation technology stack.
- "Fixing" every documented legacy behavior wholesale — the module's thin validation surface (19 rules)
  is carried forward faithfully where it reflects a genuinely-vestigial code path; only Critical/High
  risk findings and confirmed structural defects get an explicit architectural correction.

(Source: `01-module-overview.md` §1.3.)

## Origin

Extracted-from-legacy. Source system: the legacy vtiger-fork `modules/SearchLineItem/` codebase.
Consolidated via `blueprint/module/SearchLineItem/` (the 12-file/8-pass Business Blueprint) into
`docs_from_blueprint/module/SearchLineItem/` (the tech-agnostic spec this file distills). SearchLineItem
is the seventh module carried through this consolidation method (after SalesOrder, the pilot), and per
its own blueprint's headline finding, the smallest and structurally simplest so far: a 21-file,
single-real-entity, denormalized read-model over finalized SalesOrder line items. No open questions
were raised specific to this module's own scoping decisions beyond what is logged in
`risks-and-open-questions.md`.

## Dependencies

- **SalesOrder** — SearchLineItem's sole writer; deeply dependent on SalesOrder for its data (the write
  direction). SearchLineItem never writes back to SalesOrder.
- **Products** — indirect, read-only dependency via a shared utility script (last-sell-price lookup) and
  as the originating side of the supersession-merge chain SearchLineItem's alert flag reflects.
- **Location** — indirect, via the same supersession-merge chain (no direct code path found).
- **Home (dashboard)** — a read consumer, not a dependency in the write direction.

(Source: `01-module-overview.md` §1.2; `07-cross-module-integrations.md` §1.)
