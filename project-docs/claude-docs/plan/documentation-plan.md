# Documentation Plan

Maps every `docs-templates/` template onto this project. Upfront batch = `1-project`, `2-database`,
`3-api`, `4-ui`, `6-development` (early wave), `7-cross-cutting`. `5-modules/` (all 18) and
`6-development`'s late wave are deferred — JIT-triggered per module by
`7-sprint-planning/1-sprint-planning.md` step 2a.

No template skipped. No document depends on an unresolved gap — all Blocking items are locked in
`gap-analysis/decisions-log.md`; remaining open items are Non-blocking and generate with an explicit
`[NEEDS INPUT]` marker per `gap-analysis/clarification-questions.md`.

## Upfront batch — generation order

### Stage 1 — `1-project/` (runs first, alone; nothing else may start before this is approved)

| Document | Depends on |
|---|---|
| `1-project/project.md` (batch: covers 1-project-overview.md, 2-requirements.md, 3-feature-breakdown.md, 4-tech-stack.md) | SoT + `claude-docs/analysis/*` + `decisions-log.md`. No dependency on any other category. |

All 4 templates apply — no skips. `4-tech-stack.md` is largely a restatement of the already-decided
stack (`3-tech-stack-decision/tech-stack.md`) into the fixed template shape, not a fresh decision.

### Stage 2 — parallel-safe once Stage 1 is approved

Each of these categories grounds only in `decisions-log.md` + SoT/analysis, never in another
upfront category's in-progress draft — safe to run in any order or concurrently (see prompt's own
"Why parallel is safe" note; re-evaluate if a future template change breaks that isolation).

| Document | Parallel with | Sequential after |
|---|---|---|
| `2-database/database.md` (covers 1-database-design.md, 2-erd.md, 3-migration-strategy.md, 4-database-standards.md) | `3-api/*`, `4-ui/*`, `6-development` early wave | `1-project` |
| `3-api/api.md` (covers all 8 `.md` templates + `9-openapi.yaml` + `10-postman-collection.json` — 10 documents) | `2-database/*`, `4-ui/*`, `6-development` early wave | `1-project` |
| `4-ui/ui.md` (covers all 8 templates) | `2-database/*`, `3-api/*`, `6-development` early wave | `1-project` |
| `6-development/development.md` — **early wave only** (1-development-environment.md, 2-folder-structure.md, 3-coding-standards.md, 4-git-workflow.md, 8-containerization.md, 9-ci-cd.md — 6 of 10 documents) | `2-database/*`, `3-api/*`, `4-ui/*` | `1-project` |

No template skipped in any of these four categories:
- `2-database`: all 4 apply (Postgres + Prisma decided; migration-strategy.md will carry `[NEEDS
  INPUT]` per gap Q-05 — cutover strategy not yet decided).
- `3-api`: all 10 apply (REST API-first, `/api/v1`, OpenAPI/Swagger already decided in tech-stack).
  `2-authentication.md` will carry `[NEEDS INPUT]` per gap Q-07 (MFA, rate-limit numbers).
- `4-ui`: all 8 apply (Next.js frontend decided). `3-design-system.md` follows whatever
  `design-source.md` resolves to when `4-design-creation.md` runs (still unchecked — developer
  deferred). `7-accessibility.md` will carry `[NEEDS INPUT]` per gap Q-08 (WCAG target level).
- `6-development` early wave: all 6 apply. `8-containerization.md` documents the already-decided "no
  Docker" choice (not a fresh decision — a stated reason, not a skip). `9-ci-cd.md` will carry
  `[NEEDS INPUT]` per gap Q-08 (platform not decided).

### Stage 3 — `7-cross-cutting/` (strictly last, after every upfront category above is approved)

| Document | Depends on |
|---|---|
| `7-cross-cutting/cross-cutting.md` (covers 1-non-functional-requirements.md, 2-threat-model.md) | Every upfront category above, fully approved. Also draws on all 18 modules' `risks-and-open-questions.md` for `2-threat-model.md`'s Threats & Mitigations. |

Both templates apply. `1-non-functional-requirements.md` will carry `[NEEDS INPUT]` per gap Q-06
(numeric targets — SoT states these as explicitly unassessed).

Per the JIT model (`prompts/README.md`), `7-cross-cutting` normally waits until the *last* module's
own JIT cycle finishes, not just the upfront categories — since it cross-checks every module's
decisions too. **This plan's Stage 3 covers only the upfront-category cross-check; a second
`7-cross-cutting` pass may be needed after the last of the 18 modules completes its own JIT cycle** —
noted here so it isn't missed, per this kit's own JIT documentation rule.

---

## Deferred — `5-modules/` (15 modules, JIT-triggered, not part of this upfront run)

**Updated per `decisions-log.md` ADR-029**: the legacy system's 4 separate pricing mechanisms
(MPLPricePlan, Pricebooklevel200/300/800) are unified into one `pricing` module — 18 blueprinted
legacy modules become 15 modules to actually build. Gap Q-10/Q-11 (account-column naming, cross-tier
precedence) are superseded by this decision, not answered; Q-12 (coupon build-or-retire) is resolved
(build it in).

Each module gets its own 11-document set (`0-field-extraction.md` first, then
`1-module.md` through `11-testing.md`) in `docs-kit/5-modules/<slug>/`, triggered the first time
that module's `<Module> — UI Design` or `<Module> — Backend/API` epic is selected into a sprint
(`7-sprint-planning/1-sprint-planning.md` step 2a). Listed here per the prompt's own "list every
module so scope is visible" instruction — **none of these run now**.

| Module | Slug | Provenance note |
|---|---|---|
| SalesOrder | `sales-order` | Pilot module, full 9-pass blueprint |
| Accounts | `accounts` | Full 9-pass blueprint |
| Users | `users` | Full 9-pass blueprint |
| Location | `location` | Full 9-pass blueprint |
| Products | `products` | Full 9-pass blueprint (largest, 209 files) |
| Vendors | `vendors` | Full 9-pass blueprint |
| SearchLineItem | `search-line-item` | Full 9-pass blueprint |
| Settings | `settings` | Full 9-pass blueprint (236 files, largest risk register) |
| SalesHistory | `sales-history` | Full 9-pass blueprint |
| PurchaseOrder | `purchase-order` | Full 9-pass blueprint |
| PurchaseLineItem | `purchase-line-item` | Full 9-pass blueprint |
| PurchaseHistory | `purchase-history` | Full 9-pass blueprint |
| Pricing (unified) | `pricing` | Replaces MPLPricePlan + Pricebooklevel200/300/800 — see `decisions-log.md` ADR-029. Input material is all 4 legacy specs; `0-field-extraction.md` produces one consolidated catalog, not four. Pricebooklevel800 liveness needs re-confirmation against real production data before its drop is final. |
| UOM | `uom` | **Lower rigor, self-flagged** (session-found, no Pass-7 re-verification) — `0-field-extraction.md` may need an extra SME confirmation pass |
| AccountStatement | `account-statement` | **Lower rigor, self-flagged** (filtered subset of Accounts' own register) — same note as UOM |

## Deferred — `6-development/` late wave (4 documents)

`5-implementation-workflow.md`, `6-testing-strategy.md`, `7-deployment-strategy.md`,
`10-debugging-guide.md` — per template rule, wait until **every module in `5-modules/` is done**
(references the finished module set). Re-run `6-development/development.md` scoped to the late wave
once that condition is met.

---

## Not applicable

None. Every template in all seven categories applies to this project (see per-category notes above)
— no ad hoc categories needed, no template skipped.
