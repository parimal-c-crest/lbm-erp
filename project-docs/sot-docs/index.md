# SoT Index

Populated by `prompts/1-discovery/3-sot-review.md`, kept current by `prompts/5-update-sot/1-update-sot.md`.
Catalog of every Source of Truth document. Two tiers:

- **Authoritative (docs-kit)** — approved, current. Always check this tier first.
- **Raw** (`project-docs/sot-docs/raw/`) — original material. Still authoritative wherever nothing has
  superseded it yet; superseded files are moved (whole, unmodified) to `project-docs/sot-docs/archive/`
  and listed there instead.

**Date note**: no raw document carries an explicit date. Relative sequencing exists in-text
(module blueprinting order, MVP confirmed 2026-08-15, a project-docs-loss incident 2026-08-14) but no
file has its own `**Date:**`-style header. Not repeated per-row below.

**Secrets scan result**: every file in `raw/` was read in full by the original cataloging pass. No live
credential, API key, token, or password *value* was found anywhere in the corpus. **Nothing excluded
from this index on secrets grounds.**

---

## Authoritative Documents (`project-docs/approved-docs/docs-kit/`)

All decisions cited below are locked in `project-docs/claude-docs/gap-analysis/decisions-log.md`
(ADR-###) — see that log for rationale, never re-decide something already there. Verdicts and
confidence detail: `project-docs/claude-docs/gap-analysis/review-log.md`.

| Category | Files | Approved | Supersedes (raw) |
|---|---|---|---|
| [1-project/](../approved-docs/docs-kit/1-project/) | 4 (overview, requirements, feature-breakdown, tech-stack) | 2026-08-17 | `raw/1-business-requirements/project-overview.md`, `requirements.md`, `tech-stack.md` (now `archive/1-business-requirements/`); `raw/3-tech-stack-decision/tech-stack.md` (now `archive/3-tech-stack-decision/`) |
| [2-database/](../approved-docs/docs-kit/2-database/) | 4 (design, ERD, migration strategy, standards) | 2026-08-17 | None — new synthesis, no single raw predecessor |
| [3-api/](../approved-docs/docs-kit/3-api/) | 10 (design, auth, authz, query/response standards, error handling, dev standards, versioning, OpenAPI spec, Postman collection) | 2026-08-17 (auth doc refreshed to v1.1 on 2026-08-18) | None — new synthesis |
| [4-ui/](../approved-docs/docs-kit/4-ui/) | 8 (navigation, user flows, design system, component/form/responsive/accessibility standards, frontend dev standards) | 2026-08-17 | None — new synthesis, tokens sourced from reviewed Stitch mockup (ADR-177) |
| [5-modules/users/](../approved-docs/docs-kit/5-modules/users/) | 11 (module spec through testing) | 2026-08-18 | `raw/2-module-specs/Users/*` (11 files, now `archive/2-module-specs/Users/`) |
| [5-modules/uom/](../approved-docs/docs-kit/5-modules/uom/) | 11 (module spec through testing), amended three times same-session (ADR-190/191/192) | 2026-08-18 | `raw/2-module-specs/UOM/*` (11 files, now `archive/2-module-specs/UOM/`). Field-extraction adaptation: `project-docs/claude-docs/analysis/module-field-extraction/uom/`. |
| [5-modules/location/](../approved-docs/docs-kit/5-modules/location/) | 11 (module spec through testing), one fixed in-review (`11-testing.md`, rejected then approved same session) | 2026-08-19 | `raw/2-module-specs/Location/*` (11 files, now `archive/2-module-specs/Location/`). Field-extraction adaptation: `project-docs/claude-docs/analysis/module-field-extraction/location/`. |
| [6-development/](../approved-docs/docs-kit/6-development/) | 10 of 10 (early wave: environment, folder structure, coding standards, git workflow, containerization, CI/CD; late wave: implementation-workflow, testing-strategy, deployment-strategy, debugging-guide), late wave now v1.1 folding in Location | Early wave 2026-08-17, late wave 2026-08-18, updated 2026-08-19 for Location | None — new synthesis, informed by Users', UOM's, and now Location's approved module docs. |
| 7-cross-cutting/ | Not yet generated — waits until every MVP module's docs are approved (see `documentation-plan.md`) | — | — |

## Raw Source of Truth (`project-docs/sot-docs/raw/`)

Still authoritative where not superseded above.

### 0 — Business Decision (`raw/0-business-decision/`)

| Document | Type | Summary |
|---|---|---|
| [business-case.md](../sot-docs/raw/0-business-decision/business-case.md) | business case | Argues rewrite over in-place patching — SQL injection in every module examined (Settings ~47), plaintext AWS/payment credentials, a prior data-loss incident traced to Users' `deleteRole()`; requests approval to continue blueprinting beyond the MVP-16. |
| [feasibility-study.md](../sot-docs/raw/0-business-decision/feasibility-study.md) | feasibility study | Confirms technical/organizational feasibility via the proven 9-pass extraction method on 16 modules; leaves tech stack, budget, timeline, and named sponsor explicitly open; flags UOM's missing tenant column. |
| [project-charter.md](../sot-docs/raw/0-business-decision/project-charter.md) | charter | Authorizes continuation of the rewrite; defines MVP-16 + UOM/Account Statement scope, success criteria, records the finalized stack decision inline. |

### 1 — Business Requirements (`raw/1-business-requirements/`)

| Document | Type | Summary |
|---|---|---|
| [assumptions-and-constraints.md](../sot-docs/raw/1-business-requirements/assumptions-and-constraints.md) | assumptions-and-constraints | Dev DB representative of prod, MVP-16 boundary holds, legacy code reflects deployed code; constraints include finalized tech stack, no budget/timeline, vtiger EOL. |
| [glossary.md](../sot-docs/raw/1-business-requirements/glossary.md) | glossary | Defines Blueprint/Doc1-3/Pass 0-8, MVP-16 module list, extracted modules (UOM, AccountStatement), confidence vocabulary (Confirmed/Inferred/Unclear), domain abbreviations. No docs-kit glossary exists yet — still authoritative in full. |
| [module-breakdown.md](../sot-docs/raw/1-business-requirements/module-breakdown.md) | module breakdown | One paragraph per MVP-16 + UOM + Account Statement module, each naming its headline confirmed defect. |
| [non-functional-requirements.md](../sot-docs/raw/1-business-requirements/non-functional-requirements.md) | non-functional-requirements | Security as headline NFR (structural SQLi elimination, encrypted credentials); data-integrity requirements; multi-tenancy/auditability/performance/availability flagged unassessed. Still authoritative — `7-cross-cutting/1-non-functional-requirements.md` not yet generated. |
| ~~project-overview.md~~ | — | **Superseded** by `docs-kit/1-project/1-project-overview.md` (2026-08-17). Moved to `archive/1-business-requirements/project-overview.md`. |
| ~~requirements.md~~ | — | **Superseded** by `docs-kit/1-project/2-requirements.md` (2026-08-17). Moved to `archive/1-business-requirements/requirements.md`. |
| [scope.md](../sot-docs/raw/1-business-requirements/scope.md) | scope statement | Defines in-scope MVP-16 + 2 extracted capabilities, deferred/excluded modules; excludes stack selection, UI/UX design, cutover execution from this phase. Not superseded — no docs-kit equivalent. |
| [stakeholders.md](../sot-docs/raw/1-business-requirements/stakeholders.md) | stakeholders | Derived from module specs, not a formal RACI; flags no named executive sponsor or IT/infra stakeholder. |
| ~~tech-stack.md~~ | — | **Superseded** by `docs-kit/1-project/4-tech-stack.md` (2026-08-17). Moved to `archive/1-business-requirements/tech-stack.md`. |

### 2 — Module Specs (`raw/2-module-specs/`) — 17 modules remaining × 11 files = 187 files (Users promoted, see below)

Each module folder: `build-guidance.md`, `business-rules-and-validation.md`, `calculations.md`,
`entities-and-fields.md`, `integrations.md`, `module-overview.md`, `outputs.md`, `permissions.md`,
`risks-and-open-questions.md`, `screens-and-user-flows.md`, `workflows.md` — all `module-spec:
<section>` type.

| Module | Provenance | Headline finding |
|---|---|---|
| [SalesOrder/](../sot-docs/raw/2-module-specs/SalesOrder/) | Blueprint-sourced, pilot module | 123 business rules; client-trusted finalize total (Critical) is the single most consequential finding in the whole blueprint; confirmed live SQL injection in `stockorder_ajax_action.php`. |
| [Accounts/](../sot-docs/raw/2-module-specs/Accounts/) | Blueprint-sourced | 112 rules; near-total absence of server-side hard blocks; missing `vtiger_accountcreditcards` table; two disagreeing finance-charge engines (÷12 vs ÷365, ~30x divergence). |
| ~~Users/~~ | — | **Superseded** by `docs-kit/5-modules/users/` (11 files, approved 2026-08-18). Moved whole to `archive/2-module-specs/Users/`. Field-extraction adaptation: `project-docs/claude-docs/analysis/module-field-extraction/users/`. |
| ~~Location/~~ | — | **Superseded** by `docs-kit/5-modules/location/` (11 files, approved 2026-08-19). Moved whole to `archive/2-module-specs/Location/`. Field-extraction adaptation: `project-docs/claude-docs/analysis/module-field-extraction/location/`. |
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
| ~~UOM/~~ | — | **Superseded** by `docs-kit/5-modules/uom/` (11 files, approved 2026-08-18, amended three times same-session for ADR-190/191/192). Moved whole to `archive/2-module-specs/UOM/`. Field-extraction adaptation: `project-docs/claude-docs/analysis/module-field-extraction/uom/`. |
| [AccountStatement/](../sot-docs/raw/2-module-specs/AccountStatement/) | Re-partitioned from Accounts (filtered subset, not independently re-swept, self-flagged) | B2B `isPermitted` check actively skipped for B2B-flagged requests; same ÷12-vs-÷365 finance-charge divergence as Accounts. |

### 3 — Tech Stack Decision (`raw/3-tech-stack-decision/`)

| Document | Type | Summary |
|---|---|---|
| ~~tech-stack.md~~ | — | **Superseded** by `docs-kit/1-project/4-tech-stack.md` (2026-08-17). Moved to `archive/3-tech-stack-decision/tech-stack.md`. |

---

## Archive (`project-docs/sot-docs/archive/`)

Superseded raw material — kept whole, unmodified, never deleted.

| Archived file | Superseded by | Date |
|---|---|---|
| `archive/1-business-requirements/project-overview.md` | `docs-kit/1-project/1-project-overview.md` | 2026-08-17 |
| `archive/1-business-requirements/requirements.md` | `docs-kit/1-project/2-requirements.md` | 2026-08-17 |
| `archive/1-business-requirements/tech-stack.md` | `docs-kit/1-project/4-tech-stack.md` | 2026-08-17 |
| `archive/3-tech-stack-decision/tech-stack.md` | `docs-kit/1-project/4-tech-stack.md` | 2026-08-17 |
| `archive/2-module-specs/Users/*` (11 files) | `docs-kit/5-modules/users/*` (11 files) | 2026-08-18 |

## Duplicates / Conflicts flagged (not resolved here — for `6-gap-analysis.md`)

1. **Numeric contradiction on eventual module count**: `scope.md`/`project-overview.md`(archived)/`business-case.md`/`project-charter.md` all state 135 total → 42 dead → **93** in scope long-term (78 remaining beyond MVP-16). `1-business-requirements/tech-stack.md`(archived) line ~104 instead states "18 of a probable **111** eventual modules." Not reconciled anywhere in the corpus. Not addressed by docs-kit promotion — still open.
2. **Cross-tier account-assignment column named two different ways**: Pricebooklevel200's spec cites `vtiger_accountscf.cf_984` as the shared, undifferentiated-across-tiers assignment column; Pricebooklevel300's spec cites `cf_986` for what's asserted to be the *same* physical field. Needs a direct schema check to resolve.
3. **Cross-sibling pricing-tier precedence** (Pricebooklevel200/300/800, and separately MPLPricePlan) is independently flagged as unresolved in multiple module specs — a real open cross-module dependency, not yet consolidated into one decision.
4. **Heavy intentional duplication, not contradiction**: several findings are deliberately restated across 2-4 sibling files per the corpus's own cross-referencing convention. Consistent, not conflicting — flagged here only so a synthesis pass doesn't double-count them as independent findings.
5. **Provenance/rigor is not uniform across modules** — UOM (session-found, no independent Pass-7 re-verification) and AccountStatement (filtered subset of Accounts' own register) are explicitly lower/differently-sourced rigor than the other 16 blueprint-sourced, Pass-7-re-verified modules. Should be reflected in any confidence rollup, not treated as equivalent.

No unresolved conflict exists between the newly promoted documents (1-project, 2-database, 3-api, 4-ui,
5-modules/users, 6-development early wave) and the remaining SoT — verified during this update pass.

## Excluded / Flagged

None excluded. No secrets found (see scan note above). No framework/process documents were found
mixed into `raw/` — everything under `raw/` is genuine project content.
