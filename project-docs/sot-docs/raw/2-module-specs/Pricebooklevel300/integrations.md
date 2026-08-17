# Pricebooklevel300 — Cross-Module & Integration Touchpoints

> Pricebooklevel300 is simultaneously (a) a self-contained plan/rule-authoring module, (b) a genuine **consumer**
> of the sibling `MPLPricePlan` module's own per-level price data (a one-directional dependency), (c) a
> **shared writer** into Accounts' own account-assignment column, (d) a module whose client-side logic routes
> several of its own actions through a **different, sibling module's own ajax handler** (`Level300rules`), and
> (e) a module whose directory contains multiple files that never actually belong to it at all — copy-paste
> leftovers from an unrelated module (`Campaigns`) that write to that unrelated module's own data
> (`docs_from_blueprint/module/Pricebooklevel300/07-cross-module-integrations.md` §7.1).

## Related Modules

| Module | What This Module Reads | What This Module Writes/Triggers | Direction | Sync/Async |
|---|---|---|---|---|
| Accounts | Not confirmed to read Accounts' own data directly beyond the shared `cf_986` column it writes. | The account-apply flow and the plan-delete cleanup both add/remove this plan's name to/from the pipe-delimited plan-assignment column (`vtiger_accountscf.cf_986`) on every affected account. | Pricebooklevel300 → Accounts' own assignment column, one-way for plan-assignment writes. Accounts' own module files were not found writing back to this module's own tables anywhere in the source blueprint's repo-wide search. | Synchronous, inline, at account-apply-action or plan-delete time. |
| The shared sales-pricing engine | This module's own plan/rule data is read live, matched by plan name, for every priced sale line. | Nothing — this module's own files never call into the pricing engine or any SalesOrder/Quotes file directly; the relationship is entirely the engine reading this module's tables. | The pricing engine → reads this module's tables, read-only. | Synchronous, inline at line-item pricing time (every priced sale line re-evaluates the full branch/precedence chain fresh). |
| `MPLPricePlan` (sibling module) | Branch C ("default") of this module's own pricing formula calls out to `MPLPricePlan`'s own per-level, per-location product price data before falling back to this module's own price-level lookup. | Nothing back into `MPLPricePlan`. | One-directional: Pricebooklevel300 reads `MPLPricePlan`'s data; `MPLPricePlan`'s own blueprint found no reverse relationship in either direction. | Synchronous, inline, part of the same pricing-computation call. |
| `Level300rules` (sibling module, distinct from this module despite the near-identical name) | Not confirmed. | This module's own client-side JS routes the rule's own delete action, and the plan's own default-start/end-date reset/update actions, to `Level300rules`'s ajax handler — a **legitimate, designed cross-module relationship**, not a copy-paste leftover. | Pricebooklevel300's own client-side JS → `Level300rules`'s own ajax handler, for rule-delete and default-date-reset actions specifically. | Synchronous (ajax request/response), client-initiated. `Level300rules`'s own internal logic was out of the source blueprint's own module-scoped budget to trace — flagged as an open question. |
| `Campaigns` (unrelated module, present only as copy-paste leftovers) | Nothing legitimately. | Four files under this module's own directory are wholesale, unadapted copies of `Campaigns`-module code: one ajax endpoint (`DetailViewAjax.php`) that edits an arbitrary field on an arbitrary `Campaigns` record (no allow-list, no caller found anywhere in this module's own UI), and three further files that write to `Campaigns`' own lead/contact junction tables, with their own internal redirects targeting `Campaigns` by name. | This module's own directory → `Campaigns`' own data, reachable only by direct URL construction, not through any documented UI affordance in this module. | Not a designed relationship at all — a structural leftover. Reachability is per-request, not scheduled. |
| `Pricebooklevel200` / `Pricebooklevel800` (sibling pricebook tiers) | Not confirmed to read either sibling's own tables. | Nothing directly — but all three tiers' own account-apply files write to the **same, shared, undifferentiated** `vtiger_accountscf.cf_986` column (see below). | Shared write target, not a direct module-to-module call. | Synchronous, inline, at each tier's own account-apply time. |

(`07-cross-module-integrations.md` §7.2)

## External Systems

| System | What Crosses the Boundary | Direction | Trigger | Sync/Async |
|---|---|---|---|---|
| *(none found)* | A case-insensitive grep across every file under this module for named external-system signatures (accounting/QuickBooks/EDI-style integration markers) returned zero matches. A separate check for any external-facing consumer reading this module's own tables directly also returned zero matches. | N/A | N/A | N/A |

(`07-cross-module-integrations.md` §7.3 — "every consumer identified is an internal module (Accounts, the
shared pricing engine, `Level300rules`) or a shared internal utility, consistent with this module's role as an
internal pricing/promotion-rule authoring tool with no customer/vendor/trading-partner-facing surface of its
own.")

## The Cross-Sibling Finding: Shared, Undifferentiated Account-Assignment Column

This module's single most consequential cross-module finding, restated here in full because it shapes how the
"Related Modules" table above should be read: **the account's own plan-assignment column
(`vtiger_accountscf.cf_986`) is confirmed shared, undifferentiated, across all three pricebook tiers, not
level-300-exclusive.** Every one of the three tiers' own account-apply files reference the same column. This
means **a single account's assignment column holds a pipe-delimited list of plan names drawn from all three
tiers, with no column or delimiter distinguishing which tier each name belongs to** — the same text value
could contain a level-200 plan name, a level-300 plan name, and a level-800 plan name all in the same list. Any
code path resolving "does this account have plan X assigned" (a pattern-match against the raw string, the
exact approach every tier's own apply-flow files use) risks a **false-positive cross-tier name collision** if
two different tiers ever have a plan with the same or a substring-overlapping name — not observed on the
blueprint's own dev-snapshot data, but a structurally real risk given the shared, undifferentiated column's own
design (`07-cross-module-integrations.md` §7.4).

**Precedence ordering between the three tiers, when an account carries assignments from more than one, is
unresolved.** Neither this blueprint nor its sibling-tier counterparts traced a definitive answer to which
tier's plan takes precedence, or whether all three are somehow meant to apply simultaneously, when an account
is assigned plans from multiple tiers at once. This is flagged explicitly as an **unresolved open question**,
not silently assumed one way or the other, consistent with this document set's own rigor principle: ambiguity
found in the blueprint is preserved as ambiguity here, not resolved into an invented, false-confident answer.

**Related cross-sibling structural findings, all deferred to a future cross-sibling consolidation pass**: a
dead "group relation" table declaration on this module's own entity class very likely traces back to a
copy-paste from the `Pricebooklevel200` sibling module's own entity class, whose equivalent table genuinely
does exist live; the three tiers' own group-relation table-naming convention is not perfectly consistent even
where such tables do exist across the tiers; the `Campaigns`-copy-paste-leftover pattern found in this module
appears to exist in at least one sibling tier's own directory too, though only confirmed at the file-existence
level, not the content level; the coupon subsystem was **not** found under either sibling tier's own directory,
consistent with the hypothesis that level 300 carries unique coupon functionality, but not exhaustively
re-verified against the other two tiers' own full file lists; one sibling tier (level 200) appears to carry
additional account-apply-adjacent features with no confirmed level-300 or level-800 equivalent, not
investigated further (`07-cross-module-integrations.md` §7.4).

## Cross-Module/Integration Open Items

- The exact caller(s) of the shared pricing engine's own dedicated function for this tier — confirmed to be
  called from the sales/quote line-item pricing flow, but the specific calling file(s) were not enumerated
  line-by-line by the source blueprint's own module-scoped budget.
- The exact resolution logic from the account's pipe-delimited, multi-tier, undifferentiated plan-name list
  down to the single plan code the pricing function actually receives — not traced by the source blueprint;
  given the confirmed cross-tier column-sharing finding above, this resolution step is also where a potential
  cross-tier name collision would actually manifest as a pricing defect (or not).
- `Level300rules`'s own internal logic — out of the source blueprint's own scope; flagged for that module's own
  future blueprint pass.
- Whether the sibling tiers share the exact same `Campaigns`-copy-paste defect verbatim — confirmed only at the
  file-existence level this pass, not the content level; deferred to the cross-sibling consolidation pass.
- Whether the level-200-only account-apply-adjacent features represent genuine level-200-exclusive
  functionality, or a feature that should also exist for level 300 but doesn't — not investigated in this pass.
- **The cross-tier precedence-ordering question itself** — the single most consequential open question this
  file documents, since it bears directly on how a new implementation's own account-plan assignment model must
  behave when an account is assigned plans from more than one pricebook tier. This document does not propose a
  resolution; it is preserved as an explicit open question pending the cross-sibling consolidation pass, framed
  as "a hard cutover blocker."

(`07-cross-module-integrations.md` §7.5)
