# MPLPricePlan — Module Overview

> Copy this whole `2-module-spec-template/` folder per module, rename, fill in. Stay tech-agnostic
> throughout — no framework/database/language references anywhere in Stage 2.

## Purpose

MPLPricePlan ("MPL" = **Master Price List**, confirmed by the module's own language string
`LBL_MPLPRICEPLAN_INFORMATION` = "MPL Price Plan Information") is a genuine, actively-authored
**pricing-rule authoring module** in this vtiger-5.0.4-derived multi-tenant ERP. A merchandising/pricing
user defines a named plan (e.g. "FIRST PLAN," "20-WBS," "AIR GUN NAILS 3"), configures a per-pricing-level,
optionally per-location, formula grid (Take/Formula/Value — e.g. "sell at 2× weighted-average cost"), and
assigns that plan to products via a location-scoped default. The plan's own save/edit surface is real and
actively exercised (7 live plans, 34 per-location grid rows), and the plan's data is read live by the
sales/quote pricing engine every time a priced sale line is evaluated. The module also carries a second,
structurally real sub-system — a date-ranged, linecode/subline/division/product-scoped "Rule" mechanism,
with its own actively-maintained UI — that is confirmed **never read by the live pricing engine at all**: a
merchandiser using the Rule Section today is authoring data with no effect on any product's actual price.

## Actors

- **Merchandising/pricing administrator** — creates and edits named plans, configures the per-pricing-
  level/per-location formula grid, manages the Rule Section (a UI-real but pricing-engine-unconsumed
  sub-system), and deletes plans (subject to a usage guard).
- **Products module (and its own users)** — assigns a plan to a product, per location, as the source of
  that product's computed sell price at that location; the sole writer of plan *assignment*, never plan
  *definition*.
- **Sales/quote pricing engine (system process)** — reads a plan's per-location formula grid live, once per
  priced sale line, to compute a sell price; never writes to any MPLPricePlan-owned table.
- **Import process (system process)** — resolves an imported plan-assignment column value (by plan name, or
  the literal "custom" sentinel) at product-import time.

## Scope within this module

**In scope**: the MPL Price Plan header entity, the per-location pricing-level formula grid
(Take/Formula/Value), the shared pricing-level reference data the grid is keyed against, the dormant Rule
sub-entity (carried forward as a documented capability whose fate is an open question), the
plan-assignment relationship to products/locations, and this module's own read/search surface (ListView,
the Edit screen's ajax fragments).

**Out of scope**:
- The upstream pricing-level resolution chain (an account's assigned pricing level, account/job-level "MPL
  Exception" overrides, a line-level override) — confirmed to live entirely outside this module's own
  files (Accounts/SalesOrder-owned).
- The cost/price-basis resolution a plan's `take` value selects from (`whichPriceLevelToSelect()`) — not
  traced; treated as an external dependency.
- UOM conversion and penny-rounding algorithm internals — not traced; treated as external dependencies.
- The legacy fallback/override mechanisms this module's precedence chain routes around (non-stock/
  "fasterbid" pricing, product-group-level pricing, the legacy per-product flat-pricing table) — owned by
  Products/a shared pricing-fallback context, not this module.
- The full caller enumeration of the shared pricing-computation function within the SalesOrder/Quotes
  line-item pricing flow — confirmed to exist, not enumerated file-by-file in the source blueprint.
- Deployment/rollout sequencing (kept at outline depth per the source blueprint).
- Selecting an implementation technology stack (explicitly deferred).

**Business context / narrow adoption**: MPLPricePlan is one link — the module-owned, named-plan link — in
a five-step precedence chain a sale line walks through (non-stock/"fasterbid" short-circuit →
product-group-level override → this module's own plan/location grid → a legacy per-product flat-pricing
fallback → a UOM-specific "special MPL" override). Of 72,104 live product/location assignment rows, 99.90%
(72,033) still carry the reserved "Custom" sentinel value — almost every product/location combination has
**no** named MPL Price Plan assigned and falls through to the legacy per-product mechanism instead. Only 71
rows actually reference one of the module's own 6 non-sentinel live plans. Whether this module is the
intended long-term replacement for the legacy mechanism, or a narrower, permanently-coexisting one, is an
open business-scoping question, not resolvable from code alone (see `risks-and-open-questions.md`).

## Origin

**Extracted-from-legacy.** Source: `docs_from_blueprint/module/MPLPricePlan/01-module-overview.md`
(itself consolidated from the 12-file `blueprint/module/MPLPricePlan/` Business Blueprint, starting at
`blueprint/module/MPLPricePlan/00-README.md` and `00-pass0-inventory.md`). Every claim above traces back to
that blueprint; nothing here is invented. This is the thirteenth module processed in this
documentation/modernization series and, per the source blueprint, the module with the widest confirmed
SQL-injection surface of any module blueprinted in this series to date (4 Critical findings, 14+ raw-SQL
statements — see `risks-and-open-questions.md` and `permissions.md`), and it carries one especially severe
standalone defect: a delete script (`DeleteRule.php`) that deletes from a live table belonging to a
completely unrelated module (see `permissions.md`).

## Dependencies

Per the source blueprint's cross-module documentation (`docs_from_blueprint/module/MPLPricePlan/
07-cross-module-integrations.md`): Products (writes the plan-assignment relationship), Location (physical
owner of the plan-assignment column), the shared sales/quote pricing engine (sole reader of plan
definitions), and Import (resolves an imported plan-assignment value). See `integrations.md` for the full
breakdown, including the confirmed cross-module reach of `DeleteRule.php` into an unrelated module's table
(Pricebooklevel800), which is not a designed dependency.
