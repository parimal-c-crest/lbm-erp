# Pricebooklevel300 — Module Overview

> Copy this whole `2-module-spec-template/` folder per module, rename, fill in. Stay tech-agnostic
> throughout — no framework/database/language references anywhere in Stage 2.

## Purpose

Pricebooklevel300 is a genuine, actively-authored **discount/promotion plan module** in a vtiger-5.0.4-derived
multi-tenant ERP system ("lbm-integer"). It is one of **three near-identical sibling "pricebook tier" modules**
(`Pricebooklevel200`/`Pricebooklevel300`/`Pricebooklevel800`); this document covers level 300 only, on its own
evidence (`docs_from_blueprint/module/Pricebooklevel300/01-module-overview.md` §1.1). The module's own UI names
it a "**Sales & Promotions Book**": a merchandising user creates a named plan, attaches one or more scoped,
date-ranged discount rules to it (scoped by product linecode/subline/division/individual product/price-code/
sales-rank/order-quantity), and assigns the plan to one or more customer Accounts. **This module's rule data IS
read live by the sales-pricing engine** — confirmed by direct trace through three structurally distinct matching
branches, each with its own formula logic and precedence order — unlike the sibling `MPLPricePlan` module's own
dormant Rule sub-entity, which has zero confirmed live pricing-engine consumers (§1.1).

Level 300 uniquely carries a **coupon subsystem** among the three pricebook tiers (a shared `fuse5_coupons`
table, this module's own slice discriminated by `generatefrom='rule300'`) — not found under either sibling
tier's own directory in the source blueprint's own file listing. The blueprint's own pricing-engine trace,
however, found **no consumer of a coupon's actual discount value anywhere in the traced pricing path** — the
single largest open architectural question this module's blueprint produces, given the coupon subsystem's own
status as the module's most distinctive feature (§1.1).

The module carries four real entities: the Sales & Promotions Book (plan header), the Level300 Rule, the
Level300 Rule Type (a thin reference/priority catalog), and the Coupon (this module's slice of a shared table).
**Adoption note, DB-grounded**: 6 live plans, 20 live rules (avg. ~3.3 rules/plan), 8 live coupons (8 more
soft-deleted), and 10 accounts carrying at least one plan assignment (§1.2) — a materially smaller live
footprint than the `MPLPricePlan` sibling module's own assignment volume, but every one of this module's rule
rows is confirmed reachable by the live pricing engine, not dormant.

An Account is assigned one or more plans **by name**, stored as a single pipe-delimited text column
(`vtiger_accountscf.cf_986`) — not a normalized join table, and **confirmed shared, undifferentiated, across
all three pricebook tiers**: the same column can carry a mix of level-200, level-300, and level-800 plan names
with nothing distinguishing which tier each name belongs to (§1.2; `docs_from_blueprint/module/Pricebooklevel300/07-cross-module-integrations.md`
§1.4).

## Actors

- **Merchandising/pricing administrator** — creates and edits Sales & Promotions Book plans, authors and edits
  scoped rules, manages rule types, creates/edits/deletes coupons, and applies/removes plans to/from customer
  Accounts (`01-module-overview.md` §1.4).
- **Sales-pricing engine (system process)** — the sole reader of live plan/rule *definitions* for actual price
  computation; evaluates a fresh match against every priced sale line.
- **Customer Account** — the entity a plan is ultimately assigned to; the plan's rules affect what price that
  account's sale lines compute to, though the actual mechanism by which the price reaches the customer was only
  partially traced.
- **`MPLPricePlan` module (system dependency)** — a one-directional pricing data source this module's own
  "default"-branch formula can fall back to.
- **`Level300rules` module (system dependency)** — a separate, sibling module that owns the rule-delete
  lifecycle and the plan's default-date reset/update actions, both triggered from this module's own client-side
  JS but implemented in the sibling module.

(`docs_from_blueprint/module/Pricebooklevel300/01-module-overview.md` §1.4)

## Scope within this module

**In scope** (derived from `00-README.md`/`00-pass0-inventory.md`/`09-implementation-plan.md` §1): plan/rule/
rule-type/coupon authoring, the plan-to-account assignment relationship, the module's own three-branch
pricing-computation logic as consumed by the sales-pricing engine, the module's boundary with Accounts and the
one-directional pricing dependency on `MPLPricePlan`'s own data, and this module's interface with the sibling
`Level300rules` module (which owns the rule-delete lifecycle).

**Out of scope**:
- The two sibling pricebook tiers' own modules (`Pricebooklevel200`/`Pricebooklevel800`) — each has (or will
  have) its own blueprint and its own tech-agnostic spec; only the specific cross-sibling findings the blueprint
  itself surfaced (the shared `cf_986` column, the shared `DetailViewAjax.php`-shaped defect pattern) are noted
  here, not those modules' own full behavior.
- The `Level300rules` module's own internal rule-delete/default-date-reset logic — out of the source blueprint's
  own module-scoped budget; flagged as an open question.
- The full caller enumeration of the shared sales-pricing engine within SalesOrder/Quotes — confirmed to exist,
  not enumerated file-by-file by the source blueprint.
- Resolving the coupon subsystem's actual pricing-consumer question, the cross-tier `cf_986` precedence
  question, or selecting an implementation technology stack — all explicitly deferred.

(`01-module-overview.md` §1.3)

## Origin

**Extracted-from-legacy.** This spec is transcribed and re-organized from the 12-file Pricebooklevel300
Business Blueprint at `blueprint/module/Pricebooklevel300/`, consolidated into the tech-agnostic intermediate
form at `docs_from_blueprint/module/Pricebooklevel300/` (source system: the legacy vtiger-5.0.4-derived
`lbm-integer` codebase, module directory `modules/Pricebooklevel300/`, entity table
`vtiger_pricebooklevel300`, rule table `vtiger_level300rules`, rule-type table `vtiger_level300rules_types`,
coupon table `fuse5_coupons` (`generatefrom='rule300'` slice)). No BRD-derivation or invented content is
present in this module spec; every claim traces back to a specific blueprint pass, cited inline throughout
this folder's other files.

## Dependencies

Per the cross-module discussion in `docs_from_blueprint/module/Pricebooklevel300/07-cross-module-integrations.md`:
- **Accounts** — the shared write target of the account-apply flow and the plan-delete cleanup, both of which
  add/remove this plan's name to/from the pipe-delimited plan-assignment column (`cf_986`) on every affected
  account.
- **The shared sales-pricing engine** — reads this module's plan/rule data live, matched by plan name, for
  every priced sale line (read-only from this module's own perspective).
- **`MPLPricePlan` (sibling module)** — a one-directional dependency: Branch C ("default") of this module's own
  pricing formula calls out to `MPLPricePlan`'s own per-level, per-location product price data before falling
  back to this module's own price-level lookup.
- **`Level300rules` (sibling module, distinct from this module despite the near-identical name)** — this
  module's own client-side JS routes the rule's own delete action, and the plan's own default-start/end-date
  reset/update actions, to `Level300rules`'s own ajax handler — a legitimate, designed cross-module relationship.
- **Pricebooklevel200 / Pricebooklevel800 (sibling tiers)** — share the same undifferentiated `cf_986`
  account-assignment column, with cross-tier precedence unresolved; carried forward in
  `risks-and-open-questions.md` and `integrations.md`.
- **Campaigns** — not a designed dependency: four confirmed leftover files under this module's own directory
  write Campaigns' own data (one arbitrary-field-write ajax endpoint, three junction-table copy-paste files).
  Carried forward as risk-register and permissions findings, not a legitimate integration.

(`07-cross-module-integrations.md` §7.1-7.4)
