# SoT Index

Populated by `prompts/1-discovery/3-sot-review.md`. Catalog of every Source of Truth document under
`project-docs/sot-docs/raw/` — what it is and what's currently authoritative (all entries below are
raw material; nothing has been promoted to `approved-docs/docs-kit/` yet).

**Date note**: no document in this corpus carries an explicit date. Relative sequencing exists in-text
(module blueprinting order, MVP confirmed 2026-08-15, a project-docs-loss incident 2026-08-14) but no
file has its own `**Date:**`-style header. Not repeated per-row below.

**Secrets scan result**: every file in `raw/` was read in full by the cataloging pass. No live
credential, API key, token, or password *value* was found anywhere in the corpus. All
credential-adjacent content is either a column/field-name description (e.g. `.s3_secret`,
`.server_password`) or prose describing the legacy system's plaintext-credential-storage vulnerability
as a documented finding — never an actual secret string. **Nothing excluded from this index on
secrets grounds.**

**Design references**: `sot-docs/design/design-source.md` exists, left unchecked — developer chose to
defer this decision to `1-discovery/4-design-creation.md` rather than pick now. No design material
(Figma/screenshots/tokens) exists under `sot-docs/design/` yet.

---

## 0 — Business Decision (`raw/0-business-decision/`)

| Document | Type | Summary |
|---|---|---|
| [business-case.md](../sot-docs/raw/0-business-decision/business-case.md) | business case | Argues rewrite over in-place patching — SQL injection in every module examined (Settings ~47), plaintext AWS/payment credentials, a prior data-loss incident traced to Users' `deleteRole()`; requests approval to continue blueprinting beyond the MVP-16. |
| [feasibility-study.md](../sot-docs/raw/0-business-decision/feasibility-study.md) | feasibility study | Confirms technical/organizational feasibility via the proven 9-pass extraction method on 16 modules; leaves tech stack, budget, timeline, and named sponsor explicitly open; flags UOM's missing tenant column. |
| [project-charter.md](../sot-docs/raw/0-business-decision/project-charter.md) | charter | Authorizes continuation of the rewrite; defines MVP-16 + UOM/Account Statement scope, success criteria, records the finalized stack decision inline. |

## 1 — Business Requirements (`raw/1-business-requirements/`)

| Document | Type | Summary |
|---|---|---|
| [assumptions-and-constraints.md](../sot-docs/raw/1-business-requirements/assumptions-and-constraints.md) | assumptions-and-constraints | Dev DB representative of prod, MVP-16 boundary holds, legacy code reflects deployed code; constraints include finalized tech stack, no budget/timeline, vtiger EOL. |
| [glossary.md](../sot-docs/raw/1-business-requirements/glossary.md) | glossary | Defines Blueprint/Doc1-3/Pass 0-8, MVP-16 module list, extracted modules (UOM, AccountStatement), confidence vocabulary (Confirmed/Inferred/Unclear), domain abbreviations. |
| [module-breakdown.md](../sot-docs/raw/1-business-requirements/module-breakdown.md) | module breakdown | One paragraph per MVP-16 + UOM + Account Statement module, each naming its headline confirmed defect. |
| [non-functional-requirements.md](../sot-docs/raw/1-business-requirements/non-functional-requirements.md) | non-functional-requirements | Security as headline NFR (structural SQLi elimination, encrypted credentials); data-integrity requirements; multi-tenancy/auditability/performance/availability flagged unassessed. |
| [project-overview.md](../sot-docs/raw/1-business-requirements/project-overview.md) | vision/overview | Why LBM is replacing its vtiger-based ERP, the 9-pass extraction method, current progress (16/135 modules, 42 dead, 93 in scope), open items. |
| [requirements.md](../sot-docs/raw/1-business-requirements/requirements.md) | functional requirements (BRD) | Per-module functional requirements each tied to closing a specific confirmed legacy defect. |
| [scope.md](../sot-docs/raw/1-business-requirements/scope.md) | scope statement | Defines in-scope MVP-16 + 2 extracted capabilities, deferred/excluded modules; excludes stack selection, UI/UX design, cutover execution from this phase. |
| [stakeholders.md](../sot-docs/raw/1-business-requirements/stakeholders.md) | stakeholders | Derived from module specs, not a formal RACI; flags no named executive sponsor or IT/infra stakeholder. |
| [tech-stack.md](../sot-docs/raw/1-business-requirements/tech-stack.md) | tech-stack decision (detailed rationale) | Full stack writeup tied to specific legacy findings; **near-duplicate of `3-tech-stack-decision/tech-stack.md`, see Conflicts below.** |

## 2 — Module Specs (`raw/2-module-specs/`) — 18 modules × 11 files = 198 files

Each module folder: `build-guidance.md`, `business-rules-and-validation.md`, `calculations.md`,
`entities-and-fields.md`, `integrations.md`, `module-overview.md`, `outputs.md`, `permissions.md`,
`risks-and-open-questions.md`, `screens-and-user-flows.md`, `workflows.md` — all `module-spec:
<section>` type. One-line-per-module summary below (full per-file detail was reviewed in full during
cataloging; module-level summary given here to keep the index scannable — see individual files for
detail).

| Module | Provenance | Headline finding |
|---|---|---|
| [SalesOrder/](../sot-docs/raw/2-module-specs/SalesOrder/) | Blueprint-sourced, pilot module | 123 business rules; client-trusted finalize total (Critical) is the single most consequential finding in the whole blueprint; confirmed live SQL injection in `stockorder_ajax_action.php`. |
| [Accounts/](../sot-docs/raw/2-module-specs/Accounts/) | Blueprint-sourced | 112 rules; near-total absence of server-side hard blocks; missing `vtiger_accountcreditcards` table; two disagreeing finance-charge engines (÷12 vs ÷365, ~30x divergence). |
| [Users/](../sot-docs/raw/2-module-specs/Users/) | Blueprint-sourced | 66 rules; zero server-side validation on save; all 4 delete entry points lack id validation — root cause of a real data-loss incident; live SQLi in clock-in/out. |
| [Location/](../sot-docs/raw/2-module-specs/Location/) | Blueprint-sourced, 4th module | 31 rules; total absence of a negative-QoH floor check across all 4 QoH-write paths; 4 confirmed SQL injections. |
| [Products/](../sot-docs/raw/2-module-specs/Products/) | Blueprint-sourced, 5th module, largest (209 files) | 65 rules; 11 confirmed SQL injections (5 Critical, highest raw count in series); no field enforced required at save time anywhere. |
| [Vendors/](../sot-docs/raw/2-module-specs/Vendors/) | Blueprint-sourced, 6th module | 48 rules; Vendor Line Code Description UPDATE has no vendor-scoping in its WHERE clause — silently overwrites other vendors' rows; highest Critical-finding density in series. |
| [SearchLineItem/](../sot-docs/raw/2-module-specs/SearchLineItem/) | Blueprint-sourced | 19 rules; materialized read-model off SalesOrder finalize; 2 confirmed unmitigated SQL injections. |
| [Settings/](../sot-docs/raw/2-module-specs/Settings/) | Blueprint-sourced, largest/worst-risk module | 236 files, 209 rules; ~47 confirmed SQL injection sites across ~22 files; plaintext AWS/payment-gateway credential storage; only 3 of ~236 endpoints have confirmed access-control gates. |
| [SalesHistory/](../sot-docs/raw/2-module-specs/SalesHistory/) | Blueprint-sourced, 2nd module (small, 21 files) | 2 Critical SQL injections on the everyday save form; `total_activity` computed independently by 4 writers, 3 confirmed to disagree with each other; no locking. |
| [PurchaseOrder/](../sot-docs/raw/2-module-specs/PurchaseOrder/) | Blueprint-sourced, hub module (129 files) | 26 rules; 14 confirmed SQLi findings/27 statements across 20 files; `CalcTotal.php` column-name injection is worst finding. |
| [PurchaseLineItem/](../sot-docs/raw/2-module-specs/PurchaseLineItem/) | Blueprint-sourced | 14 rules; Critical SQLi in audit-timestamp re-stamp hook; wrong-entity-class bug fires on every legitimate use (judged worse than the SQLi). |
| [PurchaseHistory/](../sot-docs/raw/2-module-specs/PurchaseHistory/) | Blueprint-sourced | 13 rules; Critical SQLi in edit-branch UPDATE reachable via two routes; cleanest cross-writer formula agreement in the series. |
| [MPLPricePlan/](../sot-docs/raw/2-module-specs/MPLPricePlan/) | Blueprint-sourced | 29 rules; 14 of 29 confirmed unmitigated SQL injections — widest injection surface in series to date; 99.9% of assignments use the "no plan" sentinel. |
| [Pricebooklevel200/](../sot-docs/raw/2-module-specs/Pricebooklevel200/) | Blueprint-sourced | 42 rules; 16 of 42 confirmed SQL injection; wrong-entity-class arbitrary write into Campaigns with no permission check; the real live primary pricing path. |
| [Pricebooklevel300/](../sot-docs/raw/2-module-specs/Pricebooklevel300/) | Blueprint-sourced | 34 rules; 12 confirmed live SQL-injection points across 6 files; unresolved "coupon dead-end" (coupons gate pricing but discount value never consumed). |
| [Pricebooklevel800/](../sot-docs/raw/2-module-specs/Pricebooklevel800/) | Blueprint-sourced | 14 rules; 4 confirmed SQL injections; header table has 0 rows — every non-"LP" pricing lookup fails; dead cascade-delete leaves 8 orphaned rules, 932 orphaned accounts. |
| [UOM/](../sot-docs/raw/2-module-specs/UOM/) | Session-found (no separate vtiger module; lower rigor, self-flagged) | 2 confirmed SQL injections; 46+ files bypass the shared conversion function via direct table access; permission check not re-enforced in the AJAX dispatcher. |
| [AccountStatement/](../sot-docs/raw/2-module-specs/AccountStatement/) | Re-partitioned from Accounts (filtered subset, not independently re-swept, self-flagged) | B2B `isPermitted` check actively skipped for B2B-flagged requests; same ÷12-vs-÷365 finance-charge divergence as Accounts. |

## 3 — Tech Stack Decision (`raw/3-tech-stack-decision/`)

| Document | Type | Summary |
|---|---|---|
| [tech-stack.md](../sot-docs/raw/3-tech-stack-decision/tech-stack.md) | tech-stack decision (Stage 2 template / decision table) | Same stack decision as `1-business-requirements/tech-stack.md`, reformatted as a decision table; adds API-design detail (REST API-first, dual JWT+API-key auth, `/api/v1` versioning) not in the other copy. **Authoritative version — see Conflicts below.** |

---

## Duplicates / Conflicts flagged (not resolved here — for `6-gap-analysis.md`)

1. **Tech-stack decision duplicated 4×**: `1-business-requirements/tech-stack.md`, `3-tech-stack-decision/tech-stack.md`, `project-charter.md`, and `assumptions-and-constraints.md` all restate the same Next.js/NestJS/PostgreSQL/Prisma/RLS/BullMQ/no-Docker decision. `3-tech-stack-decision/tech-stack.md` is the most complete (adds API/auth detail) — recommend treating it as authoritative and the others as historical echoes.
2. **Numeric contradiction on eventual module count**: `scope.md`/`project-overview.md`/`business-case.md`/`project-charter.md` all state 135 total → 42 dead → **93** in scope long-term (78 remaining beyond MVP-16). `1-business-requirements/tech-stack.md` line ~104 instead states "18 of a probable **111** eventual modules." Not reconciled anywhere in the corpus.
3. **Cross-tier account-assignment column named two different ways**: Pricebooklevel200's spec cites `vtiger_accountscf.cf_984` as the shared, undifferentiated-across-tiers assignment column; Pricebooklevel300's spec cites `cf_986` for what's asserted to be the *same* physical field. Needs a direct schema check to resolve.
4. **Cross-sibling pricing-tier precedence** (Pricebooklevel200/300/800, and separately MPLPricePlan) is independently flagged as unresolved in multiple module specs — a real open cross-module dependency, not yet consolidated into one decision.
5. **Heavy intentional duplication, not contradiction**: several findings are deliberately restated across 2-4 sibling files per the corpus's own cross-referencing convention (e.g. Accounts' finance-charge divisor mismatch, Pricebooklevel800's dead cascade-delete, GP%-divide-by-zero across all three pricing tiers, the "wrong-entity-class Campaigns write via `DetailViewAjax.php`" pattern repeated near-verbatim in Pricebooklevel200/300, PurchaseOrder/PurchaseLineItem/PurchaseHistory's "no `isPermitted()` on write endpoints" pattern). Consistent, not conflicting — flagged here only so a synthesis pass doesn't double-count them as independent findings.
6. **Provenance/rigor is not uniform across modules** — UOM (session-found, no independent Pass-7 re-verification) and AccountStatement (filtered subset of Accounts' own register) are explicitly lower/differently-sourced rigor than the other 16 blueprint-sourced, Pass-7-re-verified modules. Should be reflected in any confidence rollup, not treated as equivalent.

## Excluded / Flagged

None excluded. No secrets found (see scan note above). No framework/process documents were found
mixed into `raw/` — everything under `raw/` is genuine project content.
