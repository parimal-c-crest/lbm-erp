# Implementation Workflow

> **Purpose**
>
> This document defines the standard implementation lifecycle for developing new features,
> enhancements, bug fixes, and technical improvements. It provides a step-by-step workflow from
> approved requirements to deployment-ready code, ensuring consistency, quality, traceability, and
> efficient collaboration between developers and AI coding assistants.

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| Workflow Scope | Feature Development (per-module, JIT-documented) |
| Development Methodology | Solo developer + AI-assisted (Claude Code), JIT-documented per module — not a formal Scrum/Kanban ceremony set [Source: `CLAUDE.md` "Workflow entry point"; `1-project/4-tech-stack.md` §9] |
| Version | 1.1 (late wave — second run, folding in Location alongside Users and UOM) |
| Status | Draft |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-18 |
| Last Updated | 2026-08-19 |

---

# 1. Executive Summary

Every module in this project follows the same lifecycle: an approved module specification set
(`5-modules/<slug>/`, 11 documents) drives a per-module implementation plan
(`5-modules/<slug>/10-implementation-plan.md`), which is then executed phase-by-phase against this
project's already-locked architecture (`6-development/2-folder-structure.md`), coding standards
(`6-development/3-coding-standards.md`), and Git workflow (`6-development/4-git-workflow.md`). This
document generalizes the pattern the three already-documented modules — **Users** (M3's first
module, 19 backend tasks/T-046–T-064, fully Done), **UOM** (documented and implemented), and
**Location** (documented, not yet implemented — approved this run) — follow at the `5-modules/`
layer, restating it as the project-wide standard rather than re-deriving it per module.

- **Location's own shape**: unlike Users (security/RBAC-heavy) and UOM (a small, bounded
  foundational reference-data module), Location's own `10-implementation-plan.md` is explicit that
  it is **"not independently phaseable the way a more bounded module can be"** — its QoH-write core
  (Phase 3) is a hard prerequisite every other transactional module's own inventory-scoping logic
  needs, and its own build sequencing follows `sot-docs/raw/2-module-specs/Location/
  build-guidance.md` §Suggested Build Sequencing directly (9 phases) rather than the generic
  document-order default — the first module in this project to have its phase order sourced from a
  dedicated build-guidance document rather than derived solely from its own `10-implementation-plan.md`.

- **Development lifecycle**: `2-document-generate` (module docs) → `4-document-review` (module docs
  approved) → this module's own late-wave fold-in (this document) → `7-sprint-planning` (tasks
  claimed) → implementation (phased, per `10-implementation-plan.md`) → verification → merge.
  [Source: `project-docs/prompts/README.md`; `CLAUDE.md` "Workflow entry point"]
- **Quality gates**: every phase in a module's own `10-implementation-plan.md` has an explicit
  "Verify" step before the next phase starts (§7 below) — both Users' and UOM's implementation
  plans follow this pattern without exception.
- **AI-assisted development**: this project is built with heavy AI-assisted development
  (`1-project/4-tech-stack.md` §9, Claude Code) — §14 states the specific rules that apply to
  AI-generated implementation work, carried forward unmodified from the early-wave
  `3-coding-standards.md` §19/`4-git-workflow.md` §18 rather than restated differently here.
- **Documentation requirements**: a module's own `5-modules/<slug>/` documentation is the
  requirement source for that module's implementation — no separate requirements-gathering step
  exists outside that JIT documentation cycle.
- **Testing expectations**: full detail in `6-development/6-testing-strategy.md` (this same late
  wave) — this document states the workflow-level gate (§8/§16), not the complete testing
  methodology.

---

# 2. Objectives

The implementation workflow should:

- Standardize development across every module — Users and UOM's implementation plans already prove
  the same 5-to-10-phase shape works for a security/RBAC-heavy module and a small foundational
  reference-data module alike; this document generalizes that shape rather than inventing a new one.
- Improve code quality — every phase gates on the coding standards already locked
  (`6-development/3-coding-standards.md`).
- Reduce implementation errors — a module's own `10-implementation-plan.md` maps every one of that
  module's business rules to an explicit enforcement layer (Users: 66 rules; UOM: 21 business rules
  + 20 validation rules) before implementation starts, so no rule is discovered mid-build.
- Ensure documentation remains current — a module's `5-modules/<slug>/` documents are living
  documents; an implementation divergence updates the doc, not the other way around
  (`6-development/4-git-workflow.md` §18).
- Support AI-assisted development — §14.
- Increase delivery consistency — the same phase structure (§7) applies whether a module is
  security-critical (Users) or a small foundation module (UOM), scaled by that module's own risk
  register, not restructured per module.

---

# 3. Workflow Overview

Restated for this project's actual JIT-per-module process (the generic template sequence below still
holds; this project's own concrete artifact names are layered on top per phase in §4-§13):

```text
Module Field-Extraction / Blueprint Adaptation (project-docs/claude-docs/analysis/module-field-extraction/<slug>/)
        ↓
Module Specification Set — 11 documents (5-modules/<slug>/1-module.md through 11-testing.md)
        ↓
Document Review & Approval (4-document-review/1-document-review.md, scoped to 5-modules/<slug>)
        ↓
Late-Wave Fold-In (this document + 6-testing-strategy.md/7-deployment-strategy.md/10-debugging-guide.md, per 7-sprint-planning step 2a)
        ↓
Implementation Planning (5-modules/<slug>/10-implementation-plan.md, phased)
        ↓
Development (per phase)
        ↓
Unit Testing (per phase's own "Verify" step)
        ↓
Code Review (6-development/3-coding-standards.md §17 checklist)
        ↓
Integration Testing
        ↓
Documentation Update (if implementation diverges from 5-modules/<slug>/*)
        ↓
Final Validation (10-implementation-plan.md Checklist)
        ↓
Deployment (6-development/7-deployment-strategy.md)
```

---

# 4. Phase 1 – Requirement Review

Before development begins on a module, verify:

- The module's `5-modules/<slug>/` document set is approved under `approved-docs/docs-kit/5-modules/
  <slug>/` (not merely drafted) — Users and UOM both reached this state before their own
  implementation planning began [Source: `CLAUDE.md` "Where we are"].
- `1-module.md`'s Business Rules/Functional Requirements are complete and every developer-facing
  open question in that document is resolved (marked "Resolved (developer confirmed)") or
  explicitly deferred with a stated default — Users' v1.1 revision and UOM's ADR-190/191/192
  amendment cycle are the concrete precedent for this gate: both modules' first drafts missed
  pre-existing locked ADRs, caught only on a dedicated review pass before implementation.
- `3-business-rules.md` and `6-validation.md` are both approved.
- Out-of-scope items are confirmed (`1-module.md` §3 "Out of scope" for the module).

Deliverables

- Approved module specification set (`approved-docs/docs-kit/5-modules/<slug>/`, all 11 documents).
- This module's own late-wave content folded into `6-testing-strategy.md`/
  `7-deployment-strategy.md`/`10-debugging-guide.md` (per `7-sprint-planning/1-sprint-planning.md`
  step 2a — the trigger this very document exists to satisfy).

---

# 5. Phase 2 – Technical Analysis

Review, per the module's own `4-schema.md`/`7-permissions.md`/`8-api.md`/`9-ui.md`:

- Architecture — does the module fit the standard NestJS module shape
  (`6-development/2-folder-structure.md` §15) without a structural exception? (Neither Users nor UOM
  required one.)
- Database impact — new tables/migrations (`4-schema.md`), no `tenant_id` column
  (database-per-tenant, ADR-056/ADR-073) — restated per module, not re-decided.
- API impact — new endpoints (`8-api.md`), consistent with `3-api/7-api-development-standards.md`.
- UI impact — new screens (`9-ui.md`), consistent with `4-ui/8-frontend-development-standards.md`.
- Security considerations — every module's own Critical/High risk register
  (`1-module.md` §16) gets an explicit mitigation in `10-implementation-plan.md`'s
  "Security-by-Construction" section (Users) or equivalent cross-cutting note (UOM) before Phase 3
  starts — not deferred to a later security review.
- Performance implications — module-specific hot paths flagged in `1-module.md` §13 (e.g. UOM's
  conversion service being called synchronously many times per transaction line,
  `1-module.md` §13, requiring a batched pick-breakdown query rather than N sequential lookups).
- Existing reusable components — a module's own implementation plan explicitly calls out reuse of
  already-built shared primitives (Users' Phase 8: "Reuse `Badge`, `FormField`, dropdown/sheet
  primitives already built in the App Shell (T-013–T-021)") rather than rebuilding them.

Deliverables

- Technical design decisions folded into the module's own `10-implementation-plan.md`.
- Any newly-surfaced cross-cutting decision written to `decisions-log.md` as a new ADR (per this
  project's own confirmed-decisions convention), not left implicit in the plan alone.

---

# 6. Phase 3 – Implementation Planning

Every module's `10-implementation-plan.md` breaks work into the same task categories, evidenced by
both Users' and UOM's actual plans:

- Database tasks (migrations, indexes, seed data) — Phase 2 in both modules' plans.
- Backend tasks (models, services, controllers, guards) — Phase 3 (Users) / Phase 2 (UOM).
- Frontend tasks — Phase 8 (Users) / Phase 3 (UOM).
- Testing tasks — a dedicated final phase in both (Users' Phase 10, UOM's Phase 4).
- Documentation tasks — API documentation generation (OpenAPI, from NestJS decorators) is its own
  explicit line item in both modules' final phase, not assumed to happen automatically.

Estimate, per phase:

- Complexity — a module's own `10-implementation-plan.md` names its highest-complexity task
  explicitly where one exists (UOM Phase 3: "Group Detail/Edit screen — the highest-complexity
  frontend task in this module, given the atomic multi-section save").
- Risks — every module's plan carries forward its own `1-module.md` §16 risk register into a
  "Risks" section, not a generic restatement.
- Dependencies — a module's plan states whether any other module blocks it (UOM: "No cross-module
  Backend/API dependency blocks UOM within M3" — Users, Location, Products, UOM are scheduled
  together with no dependency among themselves, `plan/dependencies.md`) and whether that module's
  own UI-Design epic must precede its Backend/API epic (UOM: `UI_UOM --> BE_UOM`). **Location is the
  first module whose plan names a genuine, partially-blocking cross-module dependency rather than a
  clean "no dependency"**: BR-024's calls into UOM's conversion service require UOM to exist first
  (satisfied — UOM ships alongside Location in M3), and Phase 6's kit-quantity-as-computed service
  (BR-009) needs Products' own Kit Component interface, which had not yet been through its own JIT
  cycle at the time Location's plan was drafted — the plan's own stated mitigation is to build the
  Location-side contract now and integration-test it once Products' interface is confirmed, rather
  than blocking Location's entire build on Products.

A module's implementation plan additionally opens with a **decision-confirmation phase** where the
module has a substantial set of pre-existing locked ADRs a first documentation pass might not have
fully consulted — Users' Phase 1 is the concrete precedent ("not open decisions — already resolved
in `decisions-log.md`, listed here only so implementation has one checklist confirming each was
actually read"). This phase exists specifically because Users' v1.0 plan incorrectly treated 8
already-locked ADRs as open decisions requiring SME sign-off — a real process failure this workflow
now names explicitly so it doesn't recur silently in a future module (§17). **Location's own Phase 1
is the third instance of this pattern**, and folds in a second sub-case: this JIT drafting pass's own
originally-blocking `[NEEDS INPUT: ...]` questions (BR-011's cost-recompute formula, BR-015's
Projected Next Use Date formula, BR-016's no-history Avg Lead Time fallback, BR-018's safety-stock
method, Underspecified enum value lists, branch-name-uniqueness case sensitivity, GL-mapping storage
shape, the permissions role-split question) are all resolved by **ADR-198** (plus ADR-196/197) —
Location's Phase 1 is a build-time confirmation that each resolution was actually read and reflected
in the document it governs, the same discipline Users' Phase 1 applies to pre-existing ADRs, applied
here to ADRs locked during the module's own JIT drafting round instead.

---

# 7. Phase 4 – Development

Develop according to (all early-wave, already locked):

- `6-development/3-coding-standards.md`
- `6-development/2-folder-structure.md`
- `3-api/7-api-development-standards.md`
- `4-ui/8-frontend-development-standards.md`
- `6-development/3-coding-standards.md` §12 (Security Guidelines)

Requirements

- Reuse existing components — checked explicitly per module plan (§6 above), not assumed.
- Follow naming conventions — `6-development/3-coding-standards.md` §5.
- Write maintainable code — `6-development/3-coding-standards.md` §3 (SOLID/DRY/KISS/YAGNI).
- Avoid duplicate logic — a module never re-implements another module's exclusively-owned service;
  UOM's own module spec states this as a first-class architectural rule (ADR-053: "every consuming
  module must go through UOM's service," the exact failure mode — a legacy 46+-file direct-table-
  access pattern plus an independently drifted SQL reimplementation of the conversion formula — this
  rule exists to prevent). The same exclusive-service principle is stated to apply symmetrically to
  every module's own data (UOM's `10-implementation-plan.md` Phase 2: the Pricing-cascade "must go
  through Pricing's own API, not a direct write").

**Phase execution order within Phase 4**: a module's own plan sequences its phases so a hard
prerequisite is built before what depends on it — Users' Phase 3 (Auth/session/RBAC core) is
explicitly marked "the hard prerequisite every other module's own authorization testing needs,"
built before Phase 4's delete-family hardening even though both are early phases. Later modules'
phase ordering should make the same kind of dependency explicit rather than defaulting to numeric
document order alone. **Location's own plan is the clearest instance of this discipline to date**:
its 9 phases follow `build-guidance.md` §Suggested Build Sequencing verbatim — Phase 2 (core schema)
before Phase 3 (**QoH core** — the single shared QoH-write command every other transactional
module's own inventory-scoping logic needs), and Phase 3 before Phase 4 (**security hardening** —
closing all six confirmed legacy SQL-injection points by construction) specifically so the
commands that would misuse an unclosed injection point (kit adjustment, part supersession, the Lost
Sale Log Report, the Cost Detail tooltip) don't get built against a still-open hole. This
QoH-core-before-security-hardening ordering is named explicitly in Location's own plan as
deliberate, not incidental — a concrete second example (after Users' Phase-3-before-Phase-4
pattern) of a module sequencing around a real dependency rather than numeric document order.

---

# 8. Phase 5 – Unit Testing

Verify, per the module's own `11-testing.md` §9 (Business Rule Tests) and §5 (Validation Tests):

- Business logic — one test per business-rule ID (`USR-RULE-###`/`BR-###`), named/tagged so
  coverage against the rule catalog is mechanically auditable — both Users and UOM's testing
  documents state this explicitly as their own test-naming convention.
- Validation — one test per `6-validation.md` row.
- Error handling — negative tests for every rejection path (e.g. UOM's TC-010: Group save rejected
  when a role-assigned Type lacks a factor, with atomicity confirmed — no partial row persisted).
- Edge cases / boundary conditions — a module's own `11-testing.md` §10 (Edge Cases) catalog, not
  invented ad hoc at implementation time (`6-development/3-coding-standards.md` §16).

Requirements

- All new functionality tested — full detail `6-development/6-testing-strategy.md` (this same late
  wave).
- Existing functionality unaffected — regression checklist (`11-testing.md` §13) run before a phase
  is considered complete.

---

# 9. Phase 6 – Code Review

Review against the already-locked checklist, `6-development/3-coding-standards.md` §17:

- Architecture compliance — layered dependency rules (`6-development/2-folder-structure.md` §14),
  module-boundary exclusivity (§7 above).
- Coding standards, naming conventions, security, performance, documentation, test coverage — the
  same checklist for every PR, backend or frontend, per `6-development/3-coding-standards.md` §17.

Address all review comments before proceeding (`6-development/4-git-workflow.md` §11).

---

# 10. Phase 7 – Integration Testing

Validate, per a module's `11-testing.md` §2 (Cross-Module Data Flow table):

- API integration, database integration, UI workflows, authentication, authorization — standard.
- **Cross-module chains** — both Users and UOM's testing documents make this an explicit,
  separately-tracked category: a test that exercises the real producing→consuming chain end-to-end
  (creating data in the producing module, confirming it's usable in the consuming module), not just
  each module's own isolated tests. Users' example: create a User with a scoped Role, confirm the
  target permission is actually enforced when calling a *different* module's endpoint. UOM's
  example: UOM Type deletion cascades a Pricing fixed-price-override deletion, verified via
  Pricing's own API, not a direct database check (TC-016).
- Third-party integrations — QuickBooks employee sync (Users, ADR-074), the standard project-wide
  bulk import/export background-job pattern (UOM FR-011, ADR-098).

Ensure no regressions — the module's own Regression Checklist (`11-testing.md` §13).

---

# 11. Phase 8 – Documentation Update

Update all affected documentation before implementation is considered complete:

- The module's own `5-modules/<slug>/` documents — if implementation diverges from what's
  documented, the documentation is updated to match, not left to drift
  (`6-development/4-git-workflow.md` §18). Both Users (v1.1, correcting 4 pre-existing ADRs its v1.0
  missed) and UOM (three amendment rounds — ADR-190/191/192, each adding targeted new test cases to
  `11-testing.md` rather than a full re-review) demonstrate this as a real, applied pattern, not a
  theoretical one.
- API documentation — OpenAPI/Swagger, auto-generated from NestJS decorators
  (`3-api/`'s standard pipeline) — both modules' plans state this as their final phase's own
  explicit line item, no manual step beyond what the decorators already produce.
- This document (`6-development/5-implementation-workflow.md`) and its late-wave siblings — folded
  in again the next time a module completes its own JIT cycle (per `7-sprint-planning/
  1-sprint-planning.md` step 2a, §1's process note).

Documentation currency is enforced via PR review (`6-development/4-git-workflow.md` §9/§18), not an
automated CI check, in MVP scope — the same `[Assumption: ...]` already carried by
`6-development/9-ci-cd.md` §11/§22, restated here rather than re-decided.

---

# 12. Phase 9 – Final Validation

Verify, per the module's own `10-implementation-plan.md` Checklist section:

- Acceptance criteria satisfied — `1-module.md` §8.
- Tests passing — `11-testing.md`'s full suite, "one per `BR-###`/`USR-RULE-###` at minimum" (UOM's
  own checklist wording).
- Code review approved (§9).
- Documentation updated (§11).
- Build successful — `6-development/9-ci-cd.md` §11's quality gates.
- No critical defects — every Critical-priority test case in `11-testing.md` passing (e.g. UOM's
  TC-010, TC-015, TC-025, TC-026, TC-027, TC-030, TC-034 are all explicitly flagged "Critical").

---

# 13. Phase 10 – Deployment Readiness

Confirm, per `6-development/7-deployment-strategy.md` (this same late wave):

- Release approved — the manual approval gate before Production (`6-development/9-ci-cd.md` §15).
- Configuration verified — environment variables for this module's own needs, if any beyond the
  project-wide set (`6-development/1-development-environment.md` §9).
- Migration scripts reviewed — the module's own Prisma migrations (§5 above).
- Rollback plan prepared — `6-development/7-deployment-strategy.md` §12/§18.
- Monitoring configured — `6-development/7-deployment-strategy.md` §15.

---

# 14. AI-Assisted Development Workflow

Given this project's own stated heavy AI-assisted development (`1-project/4-tech-stack.md` §9,
Claude Code) — restated here at the workflow level, not a separate rule set from
`6-development/3-coding-standards.md` §19 and `6-development/4-git-workflow.md` §18:

When AI is used:

1. Read the module's own `5-modules/<slug>/` documentation and `decisions-log.md` before drafting
   anything — Users v1.0/UOM's first draft both illustrate the cost of skipping this: pre-existing
   locked ADRs were missed and had to be corrected in a review pass (§6).
2. Review existing implementation — check `common/`/`lib/`/`components/shared/`
   (`6-development/2-folder-structure.md` §8) before writing a new helper.
3. Search for reusable components (§7).
4. Generate the implementation plan (`10-implementation-plan.md`), phased per §6.
5. Implement incrementally, one phase at a time (§7).
6. Run formatting and linting (`6-development/3-coding-standards.md` §18).
7. Execute tests (§8-§10).
8. Update documentation (§11).
9. Submit for human review (§9) — review may itself be AI-assisted (e.g. this project's own
   `/code-review` tooling) given the current solo-developer-plus-AI-assistant staffing model
   (`6-development/4-git-workflow.md` §11's own note), applying the same bar as human review, not a
   lowered one.

AI must never:

- Ignore architecture (`6-development/2-folder-structure.md` §14).
- Duplicate existing logic (§7).
- Skip documentation updates (§11).
- Bypass testing (§8-§10).
- Modify unrelated modules — module-boundary exclusivity (§7), the exact discipline UOM's ADR-053
  and its `10-implementation-plan.md` Phase 2 note exist to enforce.
- Silently re-decide something already locked in `decisions-log.md` — the specific, named failure
  mode both Users' and UOM's revision histories document and correct (§6, §17).

---

# 15. Deliverables Checklist

Each module implementation should include:

- Source code, organized per `6-development/2-folder-structure.md` §15's standard module shape.
- Unit + integration + E2E tests, per `11-testing.md`.
- Updated `5-modules/<slug>/` documentation (§11).
- Migration scripts (`4-schema.md`'s Prisma migrations).
- Configuration updates (`.env.example` additions, if any).
- Release notes — not applicable pre-release (both modules' own `10-implementation-plan.md` Phase 5/
  10 note "not applicable at this stage"); becomes a real deliverable once the project reaches its
  first tagged release beyond M1's v1.0.0 (`CLAUDE.md` "Where we are").
- Test evidence — `11-testing.md`'s traceability matrix (§3) mapped against the actual test run.

---

# 16. Quality Gates

A module cannot progress unless:

| Phase | Required Gate |
|--------|---------------|
| Module Specification (`5-modules/<slug>/`) | Approved under `approved-docs/docs-kit/5-modules/<slug>/` |
| Late-Wave Fold-In (this document + siblings) | Complete before `7-sprint-planning` continues (step 2a.4) |
| Implementation Plan (`10-implementation-plan.md`) | Reviewed, Phase 1 decision-confirmation checklist checked in (§6) |
| Development | Coding standards followed (§7) |
| Testing | All tests in `11-testing.md` passed (§8-§10) |
| Code Review | Approved (§9) |
| Documentation | Updated (§11) |
| Release | Approved (§13, `6-development/9-ci-cd.md` §15) |

---

# 17. Common Risks

Examples, evidenced by this project's own two modules to date:

- **Incomplete decision-log review** — a module's first documentation/planning pass treats an
  already-locked ADR as an open decision (Users v1.0's Phase 1, corrected in v1.1). Mitigation:
  `CLAUDE.md`'s own memory note ("Check decisions-log before JIT drafting") and this document's §6
  decision-confirmation phase, now standard for every module, not just Users.
- **Underspecified business rule shipped as if resolved** — UOM's `11-testing.md` names this
  explicitly: TC-014 was deliberately written as an exploratory/pin-down test rather than asserting
  a specific result, because BR-013 was genuinely Underspecified at draft time; asserting a result
  would have silently resolved an open question the test document wasn't authorized to resolve.
  Mitigation: mark genuinely open items as such (`[NEEDS INPUT: ...]`) rather than guessing, per this
  project's own document-generation discipline (`3-document-generate/06-development/development.md`
  §4).
- **Cross-module exclusivity violated** — a module reaches into another module's tables/files
  directly instead of its exported service (the exact legacy failure UOM's ADR-053 exists to
  prevent). Mitigation: §7's module-boundary rule, enforced at code review (§9).
- **Late-wave documents drift from what's actually built** — this document's own trigger was itself
  missed the first time Users' module docs were approved (a real process gap this run corrects,
  `3-document-generate/06-development/development.md`'s own prompt). Mitigation: the late-wave
  trigger is now explicit at `7-sprint-planning/1-sprint-planning.md` step 2a for every future
  module.

Mitigation, generally:

- Early review — the decision-confirmation phase (§6).
- Incremental development — one phase at a time (§7).
- Continuous testing — §8-§10.
- Frequent documentation updates — §11, including targeted amendments (UOM's ADR-190/191/192
  pattern) rather than full re-reviews for a small, scoped change.

---

# 18. Best Practices

- Implement one phase at a time (§6-§7) — both Users and UOM's plans are structured this way, never
  as one undifferentiated block of work.
- Commit small logical changes (`6-development/4-git-workflow.md` §20).
- Test continuously (§8).
- Keep documentation synchronized (§11) — including via targeted amendments, not only full
  re-reviews.
- Reuse existing code (§7).
- Avoid unnecessary refactoring — per `CLAUDE.md`'s own project-wide instruction, restated here as
  the workflow-level rule.
- Validate before requesting review (§8-§9).
- Follow established project patterns (`6-development/2-folder-structure.md`) — don't introduce a
  competing pattern for something already solved.

---

# 19. Assumptions

- The solo-developer-plus-AI-assistant staffing model (§14, `6-development/4-git-workflow.md` §11's
  own note) is assumed to hold through the modules folded into this document so far (Users, UOM); if
  a second contributor joins, this document's phase-review assignment guidance would need revisiting,
  not this document's own phase structure `[Assumption: this document]`.
- Release-notes-as-a-deliverable (§15) is deferred until the project's first tagged release beyond
  M1's v1.0.0 — exact trigger point not specified further than `6-development/4-git-workflow.md`
  §15's own versioning note `[Assumption: this document]`.
- Every future module's implementation plan will include the same Phase-1-style decision-
  confirmation step (§6) even though only Users' plan currently states it explicitly by that name —
  treated as the now-standard pattern going forward, not optional per module
  `[Assumption: this document]`.

---

# 20. Constraints

- A module's `5-modules/<slug>/` documentation must be approved before its implementation plan is
  written (§4) — no implementation starts against draft-only documentation.
- This document's own late-wave siblings must be current for a module before
  `7-sprint-planning/1-sprint-planning.md` continues past step 2a.4 for that module.
- Documentation updates are mandatory (§11) — not optional even for a small, targeted change.
- Code review required before merge (§9, `6-development/4-git-workflow.md` §13).
- Testing required before deployment (§8-§10, §12).
- All work must comply with `6-development/3-coding-standards.md` and
  `6-development/2-folder-structure.md`.

---

# 21. Related Documents

- `6-development/1-development-environment.md`
- `6-development/2-folder-structure.md`
- `6-development/3-coding-standards.md`
- `6-development/4-git-workflow.md`
- `6-development/6-testing-strategy.md` (this same late wave)
- `6-development/7-deployment-strategy.md` (this same late wave)
- `6-development/10-debugging-guide.md` (this same late wave)
- `5-modules/users/1-module.md`, `5-modules/users/10-implementation-plan.md`
- `5-modules/uom/1-module.md`, `5-modules/uom/10-implementation-plan.md`
- `5-modules/location/1-module.md`, `5-modules/location/10-implementation-plan.md`
- `7-sprint-planning/1-sprint-planning.md` (step 2a, this document's own generation trigger)
- `decisions-log.md` (ADR-002, ADR-006, ADR-053, ADR-056, ADR-074, ADR-078, ADR-081, ADR-098,
  ADR-134, ADR-154–157, ADR-174, ADR-190–192, ADR-146–153, ADR-195–198)

---

# 22. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-18 | Claude Code (docs-kit generation) | Initial Draft — first late-wave run, folding in both Users and UOM (the two modules approved to date). |
| 1.1 | 2026-08-19 | Claude Code (docs-kit generation) | Second late-wave run — folded in Location: the QoH-core-before-security-hardening phase ordering (§7), the partially-blocking Products/Kit-Component cross-module dependency (§6), and Location's own Phase 1 decision-confirmation pattern covering ADR-196/197/198 (§6). |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Product Owner | | Pending | |
| Technical Lead | | Pending | |
| Solution Architect | | Pending | |

---

# AI Generation Notes

- Generalizes the concrete phase structure both Users' and UOM's own `10-implementation-plan.md`
  documents already use, rather than inventing a parallel abstract lifecycle disconnected from what
  this project's actual module plans do.
- Deliberately preserves the real process failures both modules surfaced (Users v1.0's incorrect
  "pending SME sign-off" framing of 8 already-locked ADRs; UOM's exploratory-vs-confirmed test
  distinction) as named risks (§17) rather than smoothing them out of the record — a future module's
  implementer benefits more from seeing what actually went wrong once than from a generic risk list.
- Every AI Generation Notes-worthy structural choice traces to one of the two folded-in modules'
  real documents, cited inline, per this prompt's own citation requirement.
- On the next module to trigger this late wave, this document should gain that module's own concrete
  phase example wherever a section currently draws only on Users/UOM, per
  `3-document-generate/06-development/development.md` Instruction 7 (fold in, don't overwrite).
- This second late-wave run adds Location's own concrete examples (§1, §6, §7) alongside, not in
  place of, Users' and UOM's — Location is the first module whose own build-guidance document
  (`sot-docs/raw/2-module-specs/Location/build-guidance.md`) directly sources its implementation
  plan's phase order, and the first to carry a genuine partially-blocking cross-module dependency
  (Products' Kit Component interface) rather than a clean "no dependency" statement.
