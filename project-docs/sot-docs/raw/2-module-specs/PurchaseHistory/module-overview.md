# PurchaseHistory — Module Overview

> Copy this whole `2-module-spec-template/` folder per module, rename, fill in. Stay tech-agnostic
> throughout — no framework/database/language references anywhere in Stage 2.

## Purpose

PurchaseHistory is a rolling weekly purchase-activity aggregate: one row per (product number, line code,
calendar week, year, main location) combination, accumulating a buy quantity and a return quantity into a
derived `total_activity` figure. It is the purchase-side counterpart of the `SalesHistory` module. It
records net purchase activity — how much of a product was bought and how much was returned within a given
calendar week, bucketed by line code and location — as a read-model aggregate supporting purchase-side
reporting and trend visibility, the mirror image of what SalesHistory does for sales activity. Unlike
SalesHistory's six-counter shape (sell/return/lost-sale/transfer-in/transfer-out/false-loss), PurchaseHistory
tracks only two raw counters (buy, return) — a materially narrower business-activity surface.
(`docs_from_blueprint/module/PurchaseHistory/01-module-overview.md` §1.1-1.2)

## Actors

- **PurchaseOrder-side system process** — the sole confirmed writer of this module's own accumulator
  counters, via three call sites triggered by ordinary PO finalize/line-append/reverse-RGN user actions; no
  human actor interacts with PurchaseHistory's own accumulation logic directly.
- **Purchasing/inventory staff** — consume the module's own ListView/DetailView screens and the CSV export to
  review purchase-activity trends; may perform a manual single-field correction via the module's own
  inline-edit endpoint.
- **System/administrative user** — the module's own audit-owner convention: nearly all live rows are
  system-owned (owner id 1) rather than attributed to an individual buyer.

(`docs_from_blueprint/module/PurchaseHistory/01-module-overview.md` §1.4)

## Scope within this module

**In scope**: the weekly product/line-code/week/year/location purchase-activity aggregate entity, the
accumulate-delta semantics its three confirmed writers implement, the `total_activity` derived formula, the
module's own read/search/export surface, and its interface to its sole confirmed writer family
(PurchaseOrder's three call sites).

**Out of scope**:
- Redesigning PurchaseOrder's own line-append/RGN-reversal/finalize business logic in full — this spec
  covers the **contract** PurchaseOrder's call sites publish against, not PurchaseOrder's own upstream logic.
- `db_utilities/load_data_ph.php`, `remove_dups_merge_2pids_ps.php`, and `clearSampleData.php` — confirmed
  one-off historical migration/backfill/cleanup tooling, not live runtime writers.
- `fillinventorycost.php` — confirmed to never reference this module's own table at all despite living
  inside this module's directory; a misplaced file whose business logic belongs to a different module.
- `CallRelatedList.php`/`updateRelations.php` — confirmed verbatim Campaigns-pattern leftovers that never
  touch this module's table.
- `PurchaseOrder/EditView.php`'s commented-out, never-executed fourth writer candidate — confirmed dead code.
- Deployment/rollout sequencing across the wider system, kept at guidance depth.
- Selecting an implementation technology stack (explicitly deferred).

(`docs_from_blueprint/module/PurchaseHistory/01-module-overview.md` §1.3)

## Origin

**Extracted-from-legacy.** This module was blueprint-extracted from the legacy vtiger-5.0.4-derived
`modules/PurchaseHistory/` source tree (`blueprint/module/PurchaseHistory/`), consolidated into
`docs_from_blueprint/module/PurchaseHistory/`, and this Stage 2 spec is filled from that consolidated
material. One corrected initial hypothesis is carried forward from the source: the blueprint-extraction
process began by hypothesizing this module would be a close structural analog of SalesHistory (own `Save.php`
implementing live accumulator logic). Direct code reading corrected this — PurchaseHistory's own `Save.php`/
`DetailViewAjax.php` are vestigial; the module's real accumulate-delta logic lives entirely in three call
sites inside the sibling `PurchaseOrder` module, confirmed by a repo-wide sweep. This module's own writers
are also confirmed byte-for-byte formula-consistent across all three — the cleanest cross-module writer
posture found in the module series so far — and its recommended rewrite schema (see
`entities-and-fields.md` §5) models PurchaseHistory as a derived read-model owned by PurchaseOrder's write
path rather than an independently-writable entity. (`docs_from_blueprint/module/PurchaseHistory/
01-module-overview.md` §1.1; `02-entities-and-fields.md` §5)

## Dependencies

- **PurchaseOrder** — the sole confirmed writer of this module's aggregate rows, via three call sites
  (finalize, line-append, reverse-RGN). PurchaseHistory has no confirmed write-back to PurchaseOrder.
- **PurchaseLineItem** — a coordination point, not a direct dependency: both are triggered by the same three
  PurchaseOrder-side events, so their event contracts need to be designed together.
- **Line Code lookup entity** — referenced by the aggregate's line-code field (a genuine integer foreign key
  in the legacy physical schema, though the legacy metadata mislabels its type).
- **Products** and **Location** — referenced today by loose, convention-only (non-enforced) business-key/
  name matches rather than true foreign keys; see `entities-and-fields.md` for the recommended fix.

(`docs_from_blueprint/module/PurchaseHistory/07-cross-module-integrations.md` §7.1; `02-entities-and-fields.md`
§2, §5)
