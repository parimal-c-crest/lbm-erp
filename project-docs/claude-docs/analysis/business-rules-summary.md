# Business Rules Summary

Full per-rule catalogs (700+ numbered rules total, `<MOD>-RULE-###`) live in each module's own
`raw/2-module-specs/<module>/business-rules-and-validation.md`. This summary lists the **governing
architectural requirements** (the forward-looking rules a new implementation must satisfy) and the
**headline validation/security findings** per module — not every numbered rule. Every bullet is
traceable to its cited source file.

## Cross-cutting rules (apply to every module)

- **No field is confirmed enforced as required at save time**, in any module examined — presence
  gates, where they exist at all, are client-side only. Confirmed independently in SalesOrder,
  Accounts, Products, and others. *(Source: each module's `business-rules-and-validation.md` /
  `risks-and-open-questions.md`.)*
- **Totals/derived values must never be accepted as direct client input** — must always be
  server-recomputed. Stated as a governing requirement (R3-class) in SalesOrder, restated in
  SalesHistory (R1) for its `total_activity` field, and implied by the finance-charge/pricing findings
  in Accounts/AccountStatement and the pricing-tier modules. *(Source: `calculations.md` in each.)*
- **Permission checks exist only at the UI-rendering layer** (List/Detail view button visibility),
  not on the actual write endpoints (Save/Delete/mass-update/ajax handlers) — confirmed independently
  in all 18 modules' `permissions.md`. The single most repeated finding in the entire corpus.
- **Every entity must carry a tenant reference**, uniqueness constraints scoped per-tenant not
  global — stated as a governing requirement in SalesOrder (R5), Location, SalesHistory (R6); UOM is
  the confirmed counter-example (missing tenant column in the legacy system, a real open gap the new
  stack's RLS decision closes).

## SalesOrder (123 rules, SO-RULE-001–123)
- R3: totals always computed, never accepted as direct input — closes the module's Critical finding
  (client-trusted finalize total, SO-RISK-002).
- R4: status split into three explicit concepts (Primary/QuoteLifecycle/Fulfillment), not one
  overloaded legacy column.
- SO-RULE-001–003: order-number duplicate handling is inconsistent (hard block on one path, silent
  auto-correct on others).
- No rule anywhere enforces account/order-number/location/deposit-amount as required at save,
  despite being documented as required fields (SO-OQ-054, highest-priority open question in the
  module).
*(Source: `raw/2-module-specs/SalesOrder/business-rules-and-validation.md`,
`entities-and-fields.md` R1-R5.)*

## Accounts (112 rules, ACC-RULE-001–112)
- D3/D4 (build-guidance): unified statement service, unified finance-charge formula — direct response
  to the confirmed ÷12-vs-÷365 divisor divergence (~30x on "Net 1" terms).
- ACC-RULE-109: no `vtiger_accountcreditcards` table exists despite being referenced — Critical
  schema-drift finding.
- Term-schedule/date-boundary parsing independently reimplemented four times (quadruplicated).
*(Source: `raw/2-module-specs/Accounts/business-rules-and-validation.md`, `build-guidance.md`.)*

## Users (66 rules, USR-RULE-001–066)
- Zero server-side validation on the save path; client-side-only password complexity.
- All four delete entry points (Role/User/Profile/Group) lack id-parameter validation — the traced
  root cause of a real production data-loss incident.
- This module's own admin screens are gated only by a simple `is_admin` check, not through the
  Role/Profile permission system the module itself implements for every other module.
*(Source: `raw/2-module-specs/Users/business-rules-and-validation.md`,
`risks-and-open-questions.md`.)*

## Location (31 rules, LOC-RULE-001–031)
- No negative-quantity-on-hand floor check exists across any of the four QoH-write paths — headline
  data-integrity finding.
- A "kit" endpoint performs zero kit-component propagation despite its name.
*(Source: `raw/2-module-specs/Location/business-rules-and-validation.md`.)*

## Products (65 rules, PROD-RULE-001–065)
- R1/R6: no field enforced required at save time anywhere in traced code; no dynamic SQL construction
  permitted in the new design.
- Confirmed Global-WAC (weighted-average-cost) defect: a hardcoded-zero quantity term collapses the
  cost blend, pending SME sign-off.
*(Source: `raw/2-module-specs/Products/business-rules-and-validation.md`, `calculations.md`.)*

## Vendors (48 rules, VEN-RULE-001–048)
- Vendor Line Code Description UPDATE has no vendor-scoping in its WHERE clause — silently overwrites
  every other vendor's row sharing the same line-code number, on every save.
- Freight PPD (dollars↔units) has three independently-behaving write paths; only one is correct.
*(Source: `raw/2-module-specs/Vendors/business-rules-and-validation.md`, `calculations.md`.)*

## SearchLineItem (19 rules, SLI-RULE-001–019)
- 2 confirmed unmitigated SQL injections (SLI-RULE-014, SLI-RULE-019).
- Confirmed formula-divergence bug between the live finalize routine and a batch backfill script.
*(Source: `raw/2-module-specs/SearchLineItem/business-rules-and-validation.md`.)*

## Settings (209 rules)
- ~47 confirmed SQL injection sites across ~22 files — the widest injection surface of any module.
- Only 3 of ~236 endpoints have confirmed access-control gates.
- VDP tier rebate calculation bug; currency-cascade mass-recompute bug.
*(Source: `raw/2-module-specs/Settings/business-rules-and-validation.md`,
`risks-and-open-questions.md`.)*

## SalesHistory (16 rules, SLH-RULE-001–016 + 1 unnumbered)
- R1: exactly one service computes/writes `total_activity` — closes a confirmed 3-way formula
  divergence across 4 independent writers with no locking.
- R2: no raw string-interpolated SQL — closes 2 confirmed Critical SQL injections on the module's own
  everyday save-form path (SLH-RULE-001 and an unnumbered finding in a shared side-effect function).
*(Source: `raw/2-module-specs/SalesHistory/business-rules-and-validation.md`,
`entities-and-fields.md` R1-R6.)*

## PurchaseOrder (26 rules, PO-RULE-001–026)
- Only 3 of 26 rules have confirmed server-side enforcement.
- CalcTotal.php: column-name SQL injection — worst single finding in the module.
- setPPDValues.php writes cross-module directly into Vendors' own Freight PPD fields, unsanitized,
  bypassing Vendors' own save machinery.
*(Source: `raw/2-module-specs/PurchaseOrder/business-rules-and-validation.md`,
`risks-and-open-questions.md`.)*

## PurchaseLineItem (14 rules, PLI-RULE-001–014)
- PLI-RULE-005: Critical SQL injection in an audit-timestamp re-stamp hook.
- PLI-RULE-010: wrong-entity-class bug (inline-edit instantiates an unrelated module's class) — judged
  the module's worst finding since it fires on every legitimate use, not just under exploitation.
*(Source: `raw/2-module-specs/PurchaseLineItem/business-rules-and-validation.md`.)*

## PurchaseHistory (13 rules, PH-RULE-001–013)
- PH-RULE-008: Critical SQL injection in an edit-branch UPDATE, reachable via two independent routes.
- All three confirmed writers compute `total_activity = buy_qty − return_qty` identically — cleanest
  cross-writer agreement of any accumulator module in the series.
*(Source: `raw/2-module-specs/PurchaseHistory/business-rules-and-validation.md`, `calculations.md`.)*

## MPLPricePlan (29 rules, MPL-RULE-001–029)
- 14 of 29 rules are confirmed unmitigated SQL injections — the widest injection surface in the series
  to date at the time of blueprinting.
- Unguarded divide-by-zero at GP%/value = 100.
*(Source: `raw/2-module-specs/MPLPricePlan/business-rules-and-validation.md`, `calculations.md`.)*

## Pricebooklevel200 (42 rules, PBL200-RULE-001–042)
- 16 of 42 rules document confirmed unmitigated SQL injection.
- A wrong-entity-class arbitrary write into Campaigns records, reachable with no permission check.
*(Source: `raw/2-module-specs/Pricebooklevel200/business-rules-and-validation.md`.)*

## Pricebooklevel300 (34 rules, PBL300-RULE-001–034)
- 12 confirmed live SQL-injection points across 6 files.
- Coupon subsystem gates pricing eligibility but its discount value is never consumed downstream —
  unresolved "dead-end," pending a build-or-retire decision.
*(Source: `raw/2-module-specs/Pricebooklevel300/business-rules-and-validation.md`,
`build-guidance.md`.)*

## Pricebooklevel800 (14 rules, PBL800-RULE-001–014)
- Header table confirmed to have 0 live rows — every non-"LP" tier lookup silently fails.
- Dead cascade-delete function is the confirmed root cause of 8 orphaned rules / 932 orphaned account
  assignments.
*(Source: `raw/2-module-specs/Pricebooklevel800/business-rules-and-validation.md`,
`workflows.md`.)*

## UOM (no formal `UOM-VAL-###` catalog — self-flagged lower rigor)
- 2 confirmed SQL injections; permission check exists at page-load only, not re-checked in the actual
  AJAX dispatcher.
- 46+ files across a dozen-plus modules bypass the shared conversion function via direct table access,
  including one independent SQL reimplementation of the conversion formula.
*(Source: `raw/2-module-specs/UOM/business-rules-and-validation.md`, `integrations.md`.)*

## AccountStatement (3 filtered rules, STMT-RULE-001–003 — filtered subset of Accounts', self-flagged)
- `isPermitted('AccountStatement','ListView')` is actively skipped for B2B-flagged requests, relying
  solely on weak upstream B2B auth with no defense-in-depth.
*(Source: `raw/2-module-specs/AccountStatement/business-rules-and-validation.md`,
`permissions.md`.)*

## Not resolved here

Rule-level conflicts and duplication across modules (e.g. the divisor-divergence, GP%-divide-by-zero,
and wrong-entity-class-write patterns each appearing in 2-4 sibling modules) are listed in
`sot-docs/index.md`'s Conflicts section — carried forward to `6-gap-analysis.md`, not resolved here.
