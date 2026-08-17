# Pricebooklevel300 — Risks & Open Questions

> Source: `docs_from_blueprint/module/Pricebooklevel300/09-risks-and-open-questions.md`, itself consolidated
> from `blueprint/module/Pricebooklevel300/07-risk-findings.md` (Pass 7) and `08-consolidation-review.md`
> (Pass 8, the master rollup — verdict: `status: reviewed`, no blocking corrections needed). The source
> register holds **17 findings (4 Critical, 3 High, 5 Medium, 5 Low/Informational)** and a **13-item**
> consolidated open-questions list; IDs below are renumbered to this template's `PBL300-RISK-###`/`PBL300-OQ-###`
> scheme, preserving the source's own order and severity grouping.

## Risk Register

| ID | Finding | Severity | Impact | Source |
|---|---|---|---|---|
| PBL300-RISK-001 | `DetailViewAjax.php` edits an arbitrary field on an arbitrary `Campaigns`-module record, via an unescaped field-name/field-value pair with **no column allow-list** — a wholesale copy-paste of a `Campaigns` inline-edit endpoint, never adapted to this module at all. Reachable by any authenticated user via a direct URL under this module's own ajax route, with no permission check beyond session auth (and even if there were, it would be checking the wrong module's own permission for an edit against `Campaigns`), no caller found anywhere in this module's own UI. Ranked this module's single most severe finding, ahead of its own injection-density findings, because its blast radius per successful request is broader than any single injection point in this module's own register (an arbitrary-column write, not a scoped delete or a read). | Critical | Arbitrary-column write on an arbitrary record of a completely different module (`Campaigns`), reachable by any authenticated user. See `permissions.md` for this finding's authorization framing. | `blueprint/module/Pricebooklevel300/07-risk-findings.md` |
| PBL300-RISK-002 | The everyday save path's two raw-SQL blocks — the header-field bulk update and the per-rule bulk update — are the module's own everyday, highest-traffic write path, both fully unmitigated (no escaping, no bind array). | Critical | Confirmed SQL injection on the module's most-used write path (PBL300-RULE-007, PBL300-RULE-010). | `07-risk-findings.md` |
| PBL300-RISK-003 | The plan's own soft-delete update splices the record id directly into the query string with no placeholder at all — the module's own record-delete path, reachable by any user who can delete a plan. | Critical | Confirmed SQL injection on the delete path (PBL300-RULE-002). | `07-risk-findings.md` |
| PBL300-RISK-004 | The account-apply flow's four raw-SQL read statements — the classic "`IN (...)`/`LIKE` built from a raw request array or a prior injectable query's own results" shape, compounded across statements. | Critical | Confirmed SQL injection, compounded (PBL300-RULE-027 to 030). | `07-risk-findings.md` |
| PBL300-RISK-005 | The rule-duplication feature's combined defect — 2 structurally broken SQL statements (the feature's own happy path is very likely non-functional as coded, independent of its security posture) plus 1 confirmed injection (reachable on every dialog open, not only submit) plus 1 reflected XSS. | High | Feature likely non-functional today; injection reachable on every dialog open; reflected XSS on submit (PBL300-RULE-017 to 020). | `07-risk-findings.md` |
| PBL300-RISK-006 | Three `Campaigns`-module copy-paste leftover files writing to `Campaigns`' own junction tables — reachable by direct URL, no caller found anywhere in this module's own UI, their own internal redirects even targeting the `Campaigns` module by name. Ranked below the wrong-entity-class write (PBL300-RISK-001) because these files' own SQL is correctly parameterized and the affected data is a many-to-many junction table, not a record's own field data — a real but narrower category of damage. | High | Writes to an unrelated module's junction tables, direct-URL-reachable (PBL300-RULE-033). | `07-risk-findings.md` |
| PBL300-RISK-007 | The rule-type priority-reorder update, reachable via the "Change Rule Types Priority" modal — a confirmed injection on a low-traffic but real admin action. | High | Confirmed SQL injection (PBL300-RULE-021). | `07-risk-findings.md` |
| PBL300-RISK-008 | Two independent formula-completeness gaps confirmed in the live pricing pipeline: the "default" branch's missing discount case (silently produces a zero price for a rule that would have discounted correctly under the "mix-match" branch), and the "combined quantity discount" branch's non-functional default-mode configuration (the plan's own DB default value never produces a computed price at all). Neither surfaces an error anywhere in the traced path. | Medium | Silent, incorrect pricing outcomes with no error/log; see `calculations.md`. | `07-risk-findings.md` |
| PBL300-RISK-009 | The coupon subsystem's actual price-computation consumer was not found anywhere in the traced pricing path — a live coupon on a rule causes that rule's own formula computation to be skipped, with no substitute price computed. Given the coupon subsystem's own status as this module's most distinctive feature, this is a significant open architectural question, not a confirmed-closed one: does coupon pricing genuinely take effect anywhere a customer's price is computed, via a code path outside this module's own directory-scoped search? | Medium | Coupon subsystem may have no real pricing effect at all; see `calculations.md` §6 and `PBL300-OQ-002` below. | `07-risk-findings.md` |
| PBL300-RISK-010 | The account-plan assignment column is confirmed shared, undifferentiated, across all three pricebook tiers — a structural cross-tier name-collision risk, not observed on live data the source blueprint sampled but real given the column's own design. | Medium | Potential false-positive cross-tier plan-assignment matches; see `integrations.md`. | `07-risk-findings.md` |
| PBL300-RISK-011 | One of the two rule-list rendering surfaces duplicates the other's entire logic under a misleading UI label — not a security finding, a maintainability/UX-clarity defect: the "Account Settings" button does not open account settings. | Medium | User confusion; duplicate-maintenance burden (PBL300-RULE-016). | `07-risk-findings.md` |
| PBL300-RISK-012 | The CSV export targets the wrong module's own field-permission scope and the wrong underlying table — a real SQL statement, not a broken stub, but exports rule rows scoped by session state when the ListView's own displayed entity is plan headers. | Medium | Export produces the wrong data (rule rows, not plan headers) with the wrong permission scope (PBL300-RULE-003). | `07-risk-findings.md` |
| PBL300-RISK-013 | The coupon-list-fragment render is a confirmed stored+reflected XSS vector via unescaped coupon code/comments/rule-id values, ranked Low given the module's internal-only, session-authenticated audience. | Low/Informational | Confirmed stored+reflected XSS (PBL300-RULE-026). | `07-risk-findings.md` |
| PBL300-RISK-014 | The ListView's own error-message reflection has no visible escaping in this file, informational pending confirmation of the rendering layer's own auto-escaping behavior. | Low/Informational | Potential reflected-XSS surface, unconfirmed exploitability (PBL300-RULE-034). | `07-risk-findings.md` |
| PBL300-RISK-015 | Two dead schema declarations on the plan header's own entity class (a mismatched table-index key, a group-relation table that does not exist live). | Low/Informational | No confirmed observable runtime effect; schema-drift only (PBL300-RULE-004, PBL300-RULE-005). | `07-risk-findings.md` |
| PBL300-RISK-016 | A stale, superseded duplicate JavaScript file containing the same form-validation function already present elsewhere. | Low/Informational | Maintenance/dead-code concern only. | `07-risk-findings.md` |
| PBL300-RISK-017 | The coupon-delete action's session-sourced (not request-sourced) user-id value is raw-interpolated rather than parameterized, low risk but inconsistent with the same statement's own use of placeholders elsewhere. | Low/Informational | Low risk (not directly request-controlled), inconsistent parameterization (PBL300-RULE-025). | `07-risk-findings.md` |

(`09-risks-and-open-questions.md` §9.1; full register with individual severity/source citations:
`blueprint/module/Pricebooklevel300/07-risk-findings.md` §"Consolidated Severity-Ranked Risk Register")

**Ambiguous/unconfirmed field meanings** (not itself a risk-register row, carried forward per §9.2): the
`Coupon Amount`/`Based On` fields' actual live usage pattern (every sampled live row shows NULL for both); what
populates the rule's own trailing-12-month aggregate columns; the full valid-value set for the plan's own type
discriminator on live production data beyond the blueprint's own all-`default` dev-snapshot sample. These
require subject-matter-expert input before being assigned normative meaning in a new schema; they are **not**
guessed at in this document.

## Open Questions

| ID | Question | Why It's Ambiguous | Current Best Guess | Needs Confirmation? |
|---|---|---|---|---|
| PBL300-OQ-001 | The exact resolution step from an account's multi-plan, multi-tier assignment list to the single plan code the pricing function receives. | Not traced by the source blueprint — the single most-cited open question across the whole document set. | None offered — genuinely unresolved. | Yes |
| PBL300-OQ-002 | What populates the rule's own trailing-12-month aggregate columns (Last 12 Months Ship Count/Sales Price/Product Cost)? | A true orphan — read by this module's own GP% recompute but never written by any file under this module's own directory; never touched by any later blueprint pass either. | Likely a scheduled/batch process elsewhere in the wider system. | Yes |
| PBL300-OQ-003 | Whether a plan-rename-without-cascade scenario (orphaning rule rows from pricing-match eligibility) has ever actually occurred on live production data. | Only testable against production data, not the blueprint's own dev snapshot. | Unknown — structurally possible per the name-based FK (R1), not confirmed to have happened. | Yes |
| PBL300-OQ-004 | The full live-production value distribution for the plan's own type discriminator, beyond the dev snapshot's own all-`default` sample. | Dev snapshot shows only `default`/`mixmatch`; whether `Combined Quantity Discount` is used live at all is unconfirmed. | Assume all three values are possible; do not assume `Combined Quantity Discount` is unused. | Yes |
| PBL300-OQ-005 | Where, if anywhere, a coupon's discount value is applied to a customer's paid price. | The single highest-priority open question this document set produces — no consumer of the coupon's own discount value was found anywhere in the traced pricing path, but a cart/checkout-level consumer entirely outside this module's own directory remains plausible and unexplored. | Unknown — not "confirmed absent" (unlike `MPLPricePlan`'s dormant Rule sub-entity), simply "not found within this pass's own directory-scoped budget." | Yes |
| PBL300-OQ-006 | The shared price-level-resolution/penny-rounding/UOM-conversion/minimum-price ("SP") sub-mechanisms' own internal logic. | None traced line-by-line by the source blueprint; each is cited only by call shape. | Unknown — treat as opaque, shared logic whose defects would affect every plan/rule using it. | Yes |
| PBL300-OQ-007 | Whether any live production tenant's plan carries the non-functional `Combined Quantity Discount` + default-mode combination. | Not testable against the blueprint's own dev snapshot — no live rows of this plan type exist there to sample. | Unknown. | Yes |
| PBL300-OQ-008 | Whether the everyday save path's GP% field has ever been saved as exactly the divide-by-zero-triggering value on any live production rule. | Not testable against the blueprint's own 20 rule rows alone. | Unknown — no confirmed live-data trigger found on the dev snapshot. | Yes |
| PBL300-OQ-009 | The CSV export's exact user-visible failure mode when its field-permission-scope mismatch is executed. | Depends on the shared export handler's own behavior when the requested field-permission scope doesn't match the requesting module — not traced by the source blueprint. | Unknown — could be a hard error or a silently-wrong export. | Yes |
| PBL300-OQ-010 | Whether the mislabeled "Account Settings" UI (which actually renders the rule-list) confuses real users in production, or is well-understood tribal knowledge. | Not resolvable from static code alone. | Unknown. | Yes |
| PBL300-OQ-011 | The exact caller(s) of the shared pricing engine's own dedicated function for this tier within SalesOrder/Quotes. | Confirmed to exist and to be called from the sales/quote line-item pricing flow, but the specific calling file(s) were not enumerated file-by-file by the source blueprint's own module-scoped budget. | Unknown at the file level; confirmed at the flow level. | Yes |
| PBL300-OQ-012 | `Level300rules`'s own internal logic — the actual owner of the rule-delete lifecycle. | Out of the source blueprint's own module-scoped budget; flagged for that sibling module's own future blueprint pass. | Unknown. | Yes |
| PBL300-OQ-013 | Whether the sibling pricebook tiers share byte-identical versions of the `Campaigns`-copy-paste/junction-leftover defects, and whether one sibling tier's account-apply-adjacent features represent genuine tier-exclusive functionality or a gap in this tier. | Confirmed only at the file-existence level this pass, not the content level; both questions explicitly deferred to the cross-sibling consolidation pass. | Unknown — plausible but unverified overlap. | Yes |

(`09-risks-and-open-questions.md` §9.3; full 13-item enumerated list with individual citations:
`blueprint/module/Pricebooklevel300/08-consolidation-review.md` §4)

## The Two Highest-Priority Unresolved Questions

Per the blueprint's own final consolidation verdict (Pass 8 §6), this module's overall risk profile requires a
framing distinct from a module whose central concern is injection density alone:

1. **The coupon subsystem (PBL300-OQ-005 / PBL300-RISK-009)** — this module's most distinctive feature relative
   to its two sibling pricebook tiers — remains the single largest unresolved architectural question in this
   document set. Not because its own CRUD surface is unclear (it is this module's cleanest corner from an
   injection standpoint) but because the pricing-engine trace found no consumer of a coupon's actual discount
   value anywhere in the traced path.
2. **The `DetailViewAjax.php` wrong-entity-class write (PBL300-RISK-001)** is this module's single most severe
   finding by blast-radius-per-request — ranked ahead of every one of the module's own confirmed injections
   precisely because its damage lands entirely outside this module's own data (an arbitrary column on an
   arbitrary `Campaigns` record), not because it is the highest-*count* defect class. A new implementation's
   own security posture should treat "no code path reachable under this module's own routes may ever write to
   another module's entity" as a structural invariant, not merely fix this one instance. **This finding is also
   covered as an explicit authorization gap in `permissions.md`** — an arbitrary field write bypassing any
   allow-list is fundamentally an authorization defect, not merely a data-integrity one.

This module's own injection density is real but narrower than the `MPLPricePlan` sibling module's own
14-injection-point profile — 12 confirmed injections across 6 files, comparable in Critical-finding *count* but
somewhat more concentrated (the account-apply flow and the everyday save path's two blocks account for the
majority) — and distinctively, this module additionally carries two structurally-broken (non-injection) SQL
statements and the one wrong-entity-class write, a defect-shape profile the blueprint's own author notes has
not been seen concentrated this tightly in one module before across this blueprinting series
(`09-risks-and-open-questions.md` §9.4).

<!-- Anti-hallucination discipline: nothing here should be silently resolved by guessing in
     downstream stages. Every item stays open until explicitly answered. -->
