# Pricebooklevel200 — Module Overview

> Copy this whole `2-module-spec-template/` folder per module, rename, fill in. Stay tech-agnostic
> throughout — no framework/database/language references anywhere in Stage 2.

## Purpose

Pricebooklevel200 is a customer/account-facing pricing-configuration module in a vtiger-5.0.4-derived
multi-tenant ERP system ("lbm-integer"). The module's own UI/language strings call its core concept an
**"MPS" — Master Price Sheet**: a named, optionally account- and/or job-scoped list of pricing rules that
determines what price a specific customer pays for specific products. A user creates a named price sheet,
optionally scopes it to one master account and/or one job, populates it with pricing rules that can each be
narrowed against up to seven product-scope dimensions (line code, subline, product division, product, brand,
color, manufacturer), and assigns the sheet to one or more customer accounts. The sheet's rules are then read
**live** by the sales-order pricing engine to determine the price a line item receives at sale time. This
mechanism is confirmed, by direct trace of the pricing-computation function, to be the real, live, primary
pricing-resolution path for any account whose price-sheet assignment resolves to a Pricebooklevel200 sheet —
distinct from the immediately-prior module in the same blueprinting series (`MPLPricePlan`), whose own rule
sub-entity was found to have zero confirmed live consumers (`docs_from_blueprint/module/Pricebooklevel200/01-module-overview.md`
§1.1-1.2).

The module also implements a 7-dimension specificity-scored rule-precedence engine (the most specific matching
rule wins, not the first-created or first-matched one), account assignment via a shared multi-value account
field, job linkage (including auto-seeding a sheet's rules from an existing sales order's own line items), a
fixed 5-level GP (gross profit) color-code settings entity used to visually flag a rule's margin health, and a
customer-facing Master Price Sheet PDF output (`01-module-overview.md` §1.2).

The module also carries a substantial amount of confirmed-dead legacy content — a second, unreachable entity
class, two ajax scripts, and part of an export method, all referencing a "100 level" pricing tier and its
module/tables that no longer exist anywhere in the codebase or database — and a cross-module structural
finding: the module's rule table is physically declared as belonging to a separate, sibling module
(`Level200rules`), yet Pricebooklevel200 is confirmed to be that table's dominant, real-world writer
(`01-module-overview.md` §1.2).

## Actors

- **Sales/pricing administrator** — creates and edits price sheets, authors pricing rules, assigns sheets to
  accounts, configures GP color-code settings.
- **Sales rep / counter staff** — reviews a price sheet, prints or emails the Master Price Sheet PDF to a
  customer.
- **Customer** — the recipient of the Master Price Sheet PDF; the party whose sale-line pricing is actually
  determined by this module's live rule-matching mechanism at sale time, without necessarily interacting with
  the module's own screens directly.
- **SalesOrder/Quotes pricing flow (system/integration process)** — the actual live consumer of this module's
  pricing-resolution mechanism at the moment a sale line is priced.
- **Jobs subsystem (system/integration process)** — linked bidirectionally: a job records which price sheet
  applies to it, and a price sheet may be auto-seeded from a job's associated sales order.

(`docs_from_blueprint/module/Pricebooklevel200/01-module-overview.md` §1.4)

## Scope within this module

**In scope** (per the full set of source documents `00-pass0-inventory.md` through
`10-deployment-cutover-outline.md` in the underlying blueprint): price sheet (header) authoring and lifecycle,
price-sheet-rule (line-item) authoring, the 7-dimension specificity-scored pricing-resolution mechanism, GP
color-code settings, the account-assignment relationship, the job-linkage relationship (including
sales-order-line-item seeding), the Master Price Sheet PDF output, and this module's cross-module boundary with
`Level200rules`, Accounts, Jobs, SalesOrder, Products, and Location.

**Out of scope**:
- The upstream resolution of which price sheet applies to a given account — confirmed to happen entirely
  outside this module's own files, in code not read by the source blueprint.
- The internals of several helper functions the pricing computation depends on (`getLocationBasePrice()`,
  `getPriceDropdown()`, `conversion_base_or_uom_for_qty_sellprice()`, `common_decimal_round_cost()`) — not
  traced to completion in the source blueprint.
- The `Level200rules` sibling module's own entity/CRUD design — deferred to that module's own,
  separately-authored blueprint.
- The `Pricebooklevel300`/`Pricebooklevel800` sibling modules' own entities — each has (or will have) its own
  blueprint; this document covers Pricebooklevel200 only.
- Deployment/rollout sequencing.
- Selecting an implementation technology stack.

(`docs_from_blueprint/module/Pricebooklevel200/01-module-overview.md` §1.3)

## Origin

**Extracted-from-legacy.** This spec is transcribed and re-organized from the 11-file Pricebooklevel200
Business Blueprint at `blueprint/module/Pricebooklevel200/`, consolidated into the tech-agnostic intermediate
form at `docs_from_blueprint/module/Pricebooklevel200/` (source system: the legacy vtiger-5.0.4-derived
`lbm-integer` codebase, module directory `modules/Pricebooklevel200/`, entity table `vtiger_pricebooklevel200`,
rule table `vtiger_level200rules`). No BRD-derivation or invented content is present in this module spec; every
claim traces back to a specific blueprint pass, cited inline throughout this folder's other files.

## Dependencies

Per the cross-module discussion in `docs_from_blueprint/module/Pricebooklevel200/07-cross-module-integrations.md`:
- **`Level200rules`** — the sibling module that physically declares the rule table as its own entity, while
  Pricebooklevel200 is that table's dominant real-world writer via raw SQL (unresolved dual-ownership boundary).
- **Accounts** — the account-assignment relationship (a shared, pipe-delimited multi-value field on the Account
  entity's own extension table).
- **Jobs** — bidirectional: a job records which price sheet applies to it; a price sheet may be job-scoped and
  auto-seeded from a job's associated sales order.
- **SalesOrder / Quotes** — the live consumer of this module's pricing-resolution mechanism at sale-line pricing
  time.
- **Products** and **Location** — read as part of the 6-table sales-order-line-item auto-seed join and the
  location-base-price fallback lookup.
- **Pricebooklevel300 / Pricebooklevel800 (sibling tiers)** — share a joint pricing-decision result set (each
  tier's pricing function tags its contribution with a literal tier identifier) and, per a blueprint-program-level
  finding, likely share the same undifferentiated account-assignment field — both cross-tier questions are
  unresolved, carried forward in `risks-and-open-questions.md` and `integrations.md`.
- **Campaigns** and **Deliverylog** — not a designed dependency: four confirmed leftover files write Campaigns'
  own tables from inside this module's directory, and the module's own delete action instantiates Deliverylog's
  entity class instead of its own. Carried forward as risk-register findings, not legitimate integrations.
