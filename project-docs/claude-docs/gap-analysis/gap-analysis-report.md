# Gap Analysis Report

Cross-checked: `sot-docs/index.md` + raw SoT, `claude-docs/analysis/*.md` (project-summary,
module-list, business-rules-summary, workflow-summary). Blocking items were resolved directly with
the developer and are locked in `decisions-log.md` (ADR-001/002/003) — listed here for traceability,
not left open.

## Resolved (were Blocking, now locked)

| # | Gap | Found in | Resolution |
|---|---|---|---|
| G-01 | Every module's risk register recommends immediate legacy-system remediation — is that in this project's scope? | All 18 `risks-and-open-questions.md` files | ADR-001: rewrite-only, legacy fixes out of scope. |
| G-02 | No formal role catalog exists in the legacy system or SoT, but every module's permission docs need one | All 18 `permissions.md` files; `stakeholders.md` | ADR-002: starter 6-role catalog locked. |
| G-03 | Long-term module count conflicts: 93 (4 documents) vs. 111 (1 document) | `scope.md` vs. `1-business-requirements/tech-stack.md` | ADR-003: neither locked as fact — legacy figures are provisional/unreliable per developer; only MVP-18 is firm. |

## Missing requirements (referenced but never defined)

| # | Gap | Found in | Impact | Blocking? |
|---|---|---|---|---|
| G-04 | No named personas/demographics for target users — only role-shaped actor lists scattered per module | `project-overview.md`, every module's `module-overview.md` §Actors | Low — role catalog (ADR-002) substitutes for `1-project/1-project-overview.md`'s Target Users section; richer personas only matter if UI design wants them | Non-blocking |
| G-05 | No measurable business KPIs/success criteria beyond "close-by-construction security" | `project-charter.md`, `feasibility-study.md` | `1-project/1-project-overview.md` §14 Success Criteria will need developer input at generation time | Non-blocking — flag `[NEEDS INPUT]` when that doc generates |
| G-06 | No data-migration/cutover strategy for moving live legacy data into the new Postgres schema | Absent from all of `raw/` | `2-database/3-migration-strategy.md` cannot be filled from SoT alone | Non-blocking now — becomes relevant near first real cutover, not at doc-generation time |
| G-07 | No numeric NFR targets (response time, uptime %, throughput) anywhere in the SoT — `non-functional-requirements.md` explicitly states these as "unassessed" | `1-business-requirements/non-functional-requirements.md` | `7-cross-cutting/1-non-functional-requirements.md` §2 Performance, §3 Availability will need developer input | Non-blocking — flag at generation |
| G-08 | No MFA requirement stated anywhere; no rate-limit numeric values for API keys (tech-stack says "rate-limited," no numbers) | `3-tech-stack-decision/tech-stack.md` | `3-api/2-authentication.md` §11 MFA, §15 Rate Limiting need developer input | Non-blocking — flag at generation |
| G-09 | No CI/CD platform, git branching model, or accessibility target (WCAG level) decided | Absent from `raw/` | `6-development/9-ci-cd.md`, `4-git-workflow.md`, `4-ui/7-accessibility.md` need developer input | Non-blocking — flag at generation |
| G-10 | No budget, timeline, or named executive sponsor anywhere in the project record | `feasibility-study.md`, `stakeholders.md` | Sprint capacity/pacing can't be estimated from SoT — developer supplies at `7-sprint-planning/1-sprint-planning.md` time | Non-blocking |

## Conflicting information (surfaced, not resolved)

| # | Conflict | Documents | Note |
|---|---|---|---|
| G-11 | Tech-stack decision restated 4× with near-identical content | `1-business-requirements/tech-stack.md`, `3-tech-stack-decision/tech-stack.md`, `project-charter.md`, `assumptions-and-constraints.md` | Not contradictory — `3-tech-stack-decision/tech-stack.md` is most complete, treated as authoritative reference throughout docs-kit generation. |
| G-12 | Cross-tier account-assignment column named two different ways | Pricebooklevel200 (`cf_984`) vs. Pricebooklevel300 (`cf_986`) `entities-and-fields.md` | **Superseded** — `decisions-log.md` ADR-029 replaces the 4 legacy pricing modules with one unified `pricing` module; its own schema is designed fresh, not reconciled from legacy column names. |
| G-13 | Cross-sibling pricing-tier precedence (200/300/800) unresolved | All three tier modules' `integrations.md` | **Superseded** — ADR-029, same reasoning as G-12. |
| G-14 | Pricebooklevel300's coupon subsystem — build out or retire? Explicitly deferred pending SME sign-off | `Pricebooklevel300/build-guidance.md` | **Resolved** — ADR-029 builds it in, wired to actually affect price. |
| G-15 | SalesHistory/PurchaseHistory canonical total-formula choice needs SME sign-off before being finalized | `SalesHistory/calculations.md`, `PurchaseHistory/calculations.md` | Same — blocking only at those modules' JIT cycle, not now. |

## Unstated assumptions the analysis had to make

- Assumed all future (post-MVP-18) modules will go through the same 9-pass blueprint extraction
  process — never explicitly restated as a forward commitment, only demonstrated by the 18 already
  done. *(Low risk — consistent with `project-overview.md`'s stated method.)*
- Assumed UOM's and AccountStatement's self-flagged lower documentation rigor (session-found /
  filtered-subset, not independently Pass-7-verified) does not block generating their `docs-kit/`
  documents — just means those two modules' JIT gate may need an extra confirmation pass before their
  `4-schema.md`/`6-validation.md` draft, consistent with `05-modules/0-field-extraction.md`'s
  Underspecified tier.
- Assumed the "role catalog" (ADR-002) is sufficient for `1-project/2-requirements.md` §5 User Roles
  without further elicitation — revisit if module-specific sub-permissions turn out not to compose
  cleanly onto these six roles.

## Ambiguous terms / scope boundaries

- **"Admin" role** — used loosely across the corpus (legacy `is_admin` flag, various module admin
  screens) without a single definition. ADR-002 gives it a formal boundary (Users/Settings/pricing
  configuration) going forward; legacy code's looser usage is not binding on the new design.
- **MVP cutoff** — firm at MVP-18 (ADR-003) — not ambiguous going forward, but was ambiguous in the
  raw SoT before this pass (93-vs-111 conflict).

---

## Per-document, per-template-section gap sweep

Walked all seven `docs-templates/` categories against what's known from the SoT + locked decisions.
Findings folded into the table above where a specific document/section is named (G-05 through G-09).
Sweep confirmation:

- [x] `1-project/` walked — project-overview.md (Target Users→G-04, Success Criteria→G-05,
  Stakeholders→G-10), requirements.md (User Roles satisfied by ADR-002; NFR subsections echo G-07),
  feature-breakdown.md, tech-stack.md (no gap — decision already made and detailed).
- [x] `2-database/` walked — database-design.md/database-standards.md (no gap — ADR-004/005 cover
  naming, tenancy, audit columns), erd.md (no gap — module specs' entity lists feed this directly),
  migration-strategy.md → G-06.
- [x] `3-api/` walked — api-design.md (no gap — REST/versioning/auth already decided),
  authentication.md → G-08 (MFA), authorization.md (no gap — ADR-002/006 cover roles/enforcement),
  query/response/error-handling/versioning standards — generation-time detail, not SoT-dependent.
- [x] `4-ui/` walked — navigation.md/user-flows.md (no gap — module screens-and-user-flows.md files
  give strong raw material), design-system.md (no gap — deferred by developer choice, handled by
  `4-design-creation.md`'s own branch), accessibility.md → G-09 (WCAG target level), component/form/
  responsive standards — generation-time detail.
- [x] `5-modules/` walked (templates only) — every template section (functional-spec, business-rules,
  schema, data-dictionary, validation, permissions, api, ui, implementation-plan, testing) has strong
  raw material per module already (11 files × 18 modules). Per-module Known Gaps/Open Questions
  (hundreds, cataloged in each module's own `risks-and-open-questions.md`) are exactly the
  `[NEEDS INPUT]`/`Underspecified`-tier items `05-modules/0-field-extraction.md` is designed to
  surface per-module at JIT time — not re-listed here individually, per this prompt's own guardrail
  that unpredictable template-section gaps are expected to surface then, not now.
- [x] `6-development/` walked — development-environment.md/folder-structure.md/coding-standards.md
  (no gap — stack fully decided), git-workflow.md/ci-cd.md → G-09, testing-strategy.md (no gap —
  build-guidance.md files across all 18 modules already specify rule-ID-traceable/golden-output/
  security-regression test strategy patterns), deployment-strategy.md/containerization.md (no
  gap — "no Docker" already decided), debugging-guide.md (generation-time detail, not SoT-dependent).
- [x] `7-cross-cutting/` walked — non-functional-requirements.md → G-07, threat-model.md (no gap —
  every module's risk register is rich raw material; secrets-management approach already decided:
  hashed API keys, no plaintext credentials, closing the legacy AWS/payment-gateway findings directly).
- [x] Likely gaps from all seven added to the table above (G-04 through G-09).
