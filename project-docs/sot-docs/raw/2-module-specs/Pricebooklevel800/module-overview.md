# Pricebooklevel800 — Module Overview

> Copy this whole `2-module-spec-template/` folder per module, rename, fill in. Stay tech-agnostic
> throughout — no framework/database/language references anywhere in Stage 2.

## Purpose

Pricebooklevel800 is a customer-facing pricing-tier module in a vtiger-5.0.4-derived multi-tenant
ERP system, informally called **"500 Level"** internally (per the module's own UI copy and its core
pricing function's name, `find500LevelSalesPricesByParams()`). It defines named "Price Book" headers
and, through a formally separate but inseparably-coupled sibling module (`Level800rules`), a set of
per-line-code/subline/division/product/price-code pricing rules used to compute the sell/list price
shown to a customer whose Account is assigned to that price book (via the single picklist field
`Accounts.cf_988`, "List Price"). The module's pricing data is genuinely, actively consumed:
`find500LevelSalesPricesByParams()` is called both from within the wider inventory/pricing utility
layer's own main sell-price computation routine and directly from SalesOrder's own line-item pricing
ajax endpoint (`getSellPrice.php`), invoked live every time a sales-order line item's price is
(re)computed in the UI — a real, live pricing dependency, not a dormant sub-system. Pricebooklevel800
is one of three near-identical sibling pricing-tier modules (`Pricebooklevel200`, `Pricebooklevel300`,
`Pricebooklevel800`), each blueprinted independently but sharing the identical `Level*rules`-coupling
shape and at least one identically-shared piece of dead infrastructure (a cascade-delete function
written for exactly this module's headline orphaning defect but never called — see
`entities-and-fields.md` §4/§5 and `risks-and-open-questions.md`).

## Actors

- **Customer** — the party assigned (via their Account's `cf_988` value) to a price book; the
  resulting sell/list price is what they see on sales orders, though no module output in this
  module's own scope is directly customer-facing (pricing is consumed downstream by SalesOrder's own
  outputs).
- **Pricing/merchandising administrator** — creates and edits price-book headers, authors and
  duplicates pricing rules via the rule-editing grid and duplicate-rule modal, sets the system-wide
  default price book via the mass-action UI, and bulk-assigns/un-assigns Accounts to a price book via
  the Apply-to-Accounts modal.
- **Counter/sales staff (indirect)** — never directly interact with this module, but their SalesOrder
  line-item pricing actions trigger this module's pricing lookup as a downstream, invisible
  dependency.
- **System/integration processes** — an unconfirmed, out-of-scope "PCB" (inferred: Product Cost Book)
  sync process referenced by the `autoupdatefrompcb`/`Level800rules.createdfrom` toggle pair, if it
  exists at all.

## Scope within this module

**In scope**: the price-book header entity and its lifecycle (create, edit, soft-delete, "set as
default"); the inseparably-coupled `Level800rules` pricing-rule entity as read and written by this
module's own files; the specificity-scored rule-matching/price-code-range-filter pricing algorithm as
this module's own contribution to the wider sell-price pipeline; the Accounts-assignment boundary
(`cf_988`); the module's output surfaces (ListView, the separate rule-editing grid, CSV export, the
Apply-to-Accounts bulk-write UI); and the four Critical + two High security findings confirmed live in
this module's code.

**Out of scope**:
- The `Level800rules` sibling module's own full entity-save validation/hooks — only characterized here
  to the extent this module's own files touch it.
- The other ~125 modules of the wider ERP, including the two sibling pricing tiers
  (`Pricebooklevel200`/`300`), each blueprinted independently — this document covers Pricebooklevel800
  on its own; a separate cross-sibling consolidation pass is referenced but not itself part of this
  module's own blueprint.
- The broader pricing-utility sell-price waterfall beyond this module's own contribution (the header
  lookup, rule-match/pcrange-filter, and floor-guard steps) — whether a fallback exists elsewhere in
  that waterfall for a failed lookup was not confirmed (see `risks-and-open-questions.md`, Open
  Question 1).
- Whatever external "PCB" (Product Cost Book, inferred label) sync process the `autoupdatefrompcb`
  toggle is meant to gate — no such process was found anywhere within this module's own files.
- Deployment/rollout sequencing across the wider system beyond outline depth (see `build-guidance.md`).
- Selecting an implementation technology stack (explicitly deferred).

## Origin

Extracted-from-legacy, blueprint-sourced, see `blueprint/module/Pricebooklevel800/`. This file is
drawn from `docs_from_blueprint/module/Pricebooklevel800/01-module-overview.md`, which is itself
sourced from `blueprint/module/Pricebooklevel800/00-README.md` and `00-pass0-inventory.md` (Doc1 §00).
Pricebooklevel800 was the sixteenth module processed in a 126-module-wide (93-module-in-scope)
documentation/modernization initiative, and the fourth pricing-tier module in that queue after
`MPLPricePlan`, `Pricebooklevel200`, and `Pricebooklevel300`. No open questions were raised
specifically by this overview-level material; open questions surfaced elsewhere in the blueprint are
carried into this spec's other files (`entities-and-fields.md`, `calculations.md`,
`risks-and-open-questions.md`) where they apply.

## Dependencies

Drawn from the module-overview's own §1.3 "In Scope"/cross-module material, the module depends on /
interfaces with:
- **Level800rules** — the sibling module owning the pricing-rule table this module reads/writes
  directly; treated in the blueprint's own recommendation as one bounded context together with this
  module's header entity (see `build-guidance.md`).
- **Accounts** — the customer Account assigned to a price book via `cf_988`; source of the assignment
  value the pricing lookup keys on.
- **Products** — the pricing engine's rule-matching (outside this module) and this module's own
  product-count lookup both read product custom-field columns (line code/subline/division/product
  id/price code) to match against the rule table's own scoping columns.
- **Core CRM field metadata** — the "set as default" mass-action writes directly to the platform's own
  field-definition table, mutating the global default value for the Accounts assignment field.
- **SalesOrder** — the actual downstream consumer of this module's pricing computation, via
  `getSellPrice.php`; see the SalesOrder module spec for how the resulting price is used.

No external system integration was found anywhere in this module's own file set (see
`integrations.md` §External Systems).
