# Testing Strategy

> **Purpose**
>
> This document defines the project's overall testing strategy, testing levels, quality objectives,
> testing responsibilities, automation approach, and acceptance criteria. It establishes a consistent
> framework to ensure software quality, reliability, security, performance, and maintainability
> throughout the Software Development Life Cycle (SDLC).

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| Testing Approach | Automated-first (Jest + Playwright), rule-ID-traceable, per-module [Source: ADR-015, ADR-027] |
| Development Methodology | Solo developer + AI-assisted, JIT per module (`6-development/5-implementation-workflow.md`) |
| Version | 1.0 (late wave — first run, folding in Users and UOM) |
| Status | Draft |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-18 |
| Last Updated | 2026-08-18 |

---

# 1. Executive Summary

Testing in this project is **rule-ID-traceable by construction**: every module's own
`11-testing.md` maps each test case back to a Functional Requirement, a Business Rule ID
(`<MODULE>-RULE-###`/`BR-###`), a Validation Rule ID (`VR-###`), and a permission — both Users (66
business rules, 23 test cases shown, full catalog referenced) and UOM (21 business rules, 36+ test
cases, all individually enumerated) already demonstrate this pattern in full. This document
generalizes that pattern as the project-wide standard, rather than introducing a separate abstract
testing framework the actual modules don't follow.

- **Quality objectives**: zero untested Critical/High security finding (both modules' §12 Security
  Tests sections name a specific test per finding, not a general assurance); 100% business-rule
  coverage, mechanically auditable by grepping test names against the rule catalog (both modules
  state this explicitly).
- **Testing philosophy**: reproduce the exact legacy failure mode as a negative test wherever a
  security/data-integrity defect was the reason a rule exists (e.g. Users' TC-013 reproduces the
  legacy `deleteRole()` empty-id failure and asserts rejection) — a test that only checks the happy
  path doesn't close the finding it's meant to close.
- **Automation goals**: Jest (ADR-015) for unit/integration, Playwright (ADR-027) for E2E/regression
  — one framework per tier, project-wide, no per-module tooling divergence.
- **Risk-based testing approach**: a module's own Critical/High risk register
  (`1-module.md` §16) drives which tests are marked Critical priority — not every test case carries
  equal weight, and both modules' `11-testing.md` documents mark priority explicitly per case.
- **AI-assisted testing**: §17, restated at the project level from
  `6-development/3-coding-standards.md` §16/§19.

---

# 2. Objectives

The testing strategy should:

- Verify business requirements — every FR maps to at least one test case (§8, both modules'
  Traceability Matrix §3).
- Detect defects early — unit tests written before dependent phases start (Users' Phase 2: "a unit
  test proving the identifier value-object rejects empty/malformed input is the first test written
  for this module, before any command depending on it").
- Prevent regressions — a Regression Checklist per module (`11-testing.md` §13), explicitly
  including "non-regression" cases for behavior that must *not* change when a new rule is added
  (UOM's TC-028: "the explicit non-regression check for the still-valid unused-Group delete path,"
  added alongside BR-020's new locking rule specifically so the lock's introduction couldn't be
  mistaken for blocking the still-valid case too).
- Improve software reliability — golden-output tests for anything with a canonical formula (UOM's
  conversion arithmetic, TC-015; Users' payroll overtime formula, ADR-036) so a future
  re-implementation can't silently drift, closing the exact defect class (a second, divergent SQL
  reimplementation of UOM's conversion formula) the legacy extraction found.
- Support continuous delivery — CI-blocking test gates (`6-development/9-ci-cd.md` §11), unaffected
  by this document.
- Reduce production defects — security regression tests reproduce documented legacy injection
  payloads (§12) as permanent, named tests, not one-time manual verification.
- Encourage automated testing — §11.

---

# 3. Testing Principles

- Test early — Phase-1-before-dependent-phases discipline (§2 above).
- Test continuously — one test suite run per implementation phase (`6-development/
  5-implementation-workflow.md` §8), not deferred to a single end-of-module pass.
- Automate where practical — Jest/Playwright cover unit, integration, and E2E; manual testing (§12)
  is reserved for what automation genuinely can't cover well (exploratory UX, visual review).
- Risk-based testing — Critical priority assigned to tests closing a Critical/High risk-register
  finding (§1); everything else prioritized by business impact, not uniformly.
- Shift-left testing — validation/business-rule tests written directly from `6-validation.md`/
  `3-business-rules.md` during implementation planning (`10-implementation-plan.md`), not authored
  after the fact by a separate QA pass.
- Repeatable and reliable tests — a dedicated test PostgreSQL database (§10), never the development
  database, per `6-development/1-development-environment.md` §11/§16.
- Independent verification where appropriate — cross-module chain tests (§7) independently confirm a
  consuming module can actually use what a producing module claims to expose, not just that each
  module's own isolated tests pass.

---

# 4. Testing Lifecycle

```text
Requirements (5-modules/<slug>/1-module.md, 2-functional-specification.md)
      ↓
Test Planning (11-testing.md §1-§3 — Overview, Scope, Traceability Matrix)
      ↓
Test Design (11-testing.md §4-§12 — Functional/Validation/Permission/API/UI/Business Rule/Edge Case/Performance/Security Tests)
      ↓
Environment Preparation (dedicated test PostgreSQL database, per-module seed data)
      ↓
Test Execution (per implementation phase, 6-development/5-implementation-workflow.md §8)
      ↓
Defect Reporting (code review, 6-development/3-coding-standards.md §17)
      ↓
Regression Testing (11-testing.md §13, run before a phase is considered complete)
      ↓
User Acceptance Testing (developer review — solo-developer model, §16)
      ↓
Release Approval (6-development/9-ci-cd.md §15)
```

---

# 5. Testing Levels

## Unit Testing

Purpose: verify individual functions, classes, and components — Jest (ADR-015).

Focus: business logic (one test per `<MODULE>-RULE-###`/`BR-###`, §9 below), validation (one test
per `VR-###`), error handling, edge cases. Both modules' `11-testing.md` §9 tables are the concrete
instance of this — e.g. UOM's BR-001 through BR-021, each mapped to one or more named test cases.

---

## Integration Testing

Purpose: verify interactions between components — a Controller exercised against a real (test)
database via Prisma, not fully mocked (`6-development/3-coding-standards.md` §16).

Examples

- API ↔ Database — every module's `11-testing.md` §7 (API Tests).
- API ↔ External Services — Users' QuickBooks sync integration test ("integration test confirming a
  User save enqueues and completes a QuickBooks sync," `10-implementation-plan.md` Phase 9 Verify).
- Frontend ↔ Backend — a module's `11-testing.md` §8 (UI Tests).
- **Cross-module** — the specific, separately-tracked category both modules name explicitly (§2 of
  each module's `11-testing.md`, "Cross-Module Data Flow" table) — see §7 below.

---

## System Testing

Purpose: validate the complete application.

Examples: end-to-end workflows (Playwright), authentication/authorization (every module's §6
Permission Tests confirm every "Denied" cell in `7-permissions.md` returns 403, not merely that the
UI hides the button — both modules state this explicitly), business processes (a module's own
`9-business-process` diagram exercised start-to-finish).

---

## User Acceptance Testing (UAT)

Purpose: validate the application against business requirements.

Performed by: the developer (Product Owner + Business User role collapsed under this project's
current solo-developer-plus-AI-assistant staffing model, `6-development/4-git-workflow.md` §11's own
note) — developer-confirmed as this project's actual team size; there is no separate QA team or
Product Owner role to itemize independently, not a gap, a stated fact about current staffing. This
project's own "Design-First live-browser review" practice
(`CLAUDE.md` "Where we are": Users' UI reviewed live via Playwright, 3 real bugs found and fixed) is
this project's concrete UAT-equivalent for UI-facing modules — restated here as the standing
practice, not module-specific.

---

## Regression Testing

Purpose: ensure existing functionality remains unaffected after changes — a module's own Regression
Checklist (`11-testing.md` §13), including explicit non-regression cases for a newly-introduced rule
(§2 above).

---

## Smoke Testing

Purpose: verify the application is stable enough for detailed testing — a minimal Playwright subset
(login, load Dashboard) run post-deploy (`6-development/9-ci-cd.md` §12).

---

## Sanity Testing

Purpose: validate specific fixes or enhancements — the targeted-amendment pattern both Users
(v1.1) and UOM (ADR-190/191/192) already use for their own documentation: a scoped addition to
`11-testing.md` covering exactly the new/changed behavior, explicitly not a full re-review of the
rest of the document (both modules' AI Generation Notes state this in identical terms).

---

# 6. Test Types

Testing may include:

- Functional Testing — §5 (Unit/Integration/System).
- UI Testing — §8 below.
- API Testing — §9 below.
- Database Testing — migration/seed correctness (`6-development/1-development-environment.md` §11),
  delete-guard `RESTRICT` behavior enforced at the database level, not only application pre-checks
  (UOM's `10-implementation-plan.md` Phase 2: "implement BR-014's delete guards as real Prisma/
  PostgreSQL `RESTRICT` FKs (not application pre-checks alone)").
- Security Testing — §12.
- Performance Testing — §11.
- Load / Stress Testing — not a distinct MVP-scope activity beyond ADR-028's stated NFR targets (API
  responses < 500ms at p95, low-hundreds of concurrent sessions as a starting design assumption) —
  no dedicated load-testing tool/cadence confirmed by any SoT source for this project
  `[Assumption: this document]`, revisit once real usage data exists (ADR-028's own stated
  revisit trigger).
- Accessibility Testing — WCAG 2.2 AA per `4-ui/3-design-system.md` §13; both modules' `11-testing.md`
  §8 name specific accessibility test cases (Users: password visibility-toggle `aria-label`, Time
  Clock widget `aria-live` region; UOM: Picking Hierarchy reorder keyboard-operable, not drag-only).
- Compatibility Testing — not itemized separately in any SoT source for this project; covered
  implicitly by `4-ui/6-responsive-design.md`'s already-locked breakpoint/browser-support scope, not
  a distinct test category here `[Assumption: this document]`.
- Localization Testing — not confirmed in scope for MVP for either module documented so far
  (`1-module.md` §13, both modules state "not confirmed in scope").
- Backup & Recovery Testing — delegated to the hosting provider's native capability (ADR-070) rather
  than an application-level test suite; `6-development/7-deployment-strategy.md` §17 covers the
  operational side, not this document.

---

# 7. Test Planning

Each module's `11-testing.md` §1-§2 defines:

- Test scope — Included/Excluded Features, explicitly naming what a related ADR removed from scope
  (Users: Sharing Rule tests excluded entirely, ADR-081, "no such feature exists to test"; UOM:
  legacy's "Manage UOM Qty Pricing" write-back behavior excluded, `1-module.md` §3).
- In-scope / out-of-scope items — mirrors the module's own `1-module.md` §3.
- Risks — the module's own Critical/High risk register (§1).
- Dependencies — which other modules this module's tests need real data from (§2's Cross-Module Data
  Flow table).
- Test data — §14 below.
- Success criteria — 100% rule-catalog coverage, every Critical-priority test passing (§1).

---

# 8. Test Design

Test cases (both modules' `11-testing.md` §4, one entry per `TC-###`) include:

- Preconditions.
- Test steps.
- Expected results.
- Test priority — Critical/High/Medium, assigned per §3's risk-based principle.
- Test category — Functional/Validation/Permission/API/UI/Business Rule/Edge Case/Performance/
  Security, matching this document's own §6 taxonomy.
- Requirement traceability — every test case ties back to an FR, a rule ID, and (where relevant) a
  permission, via the module's own Traceability Matrix (`11-testing.md` §3).

---

# 9. Test Data Management

Document, per module:

- Test datasets — a module's own seed data (`11-testing.md` §14): Users seeds ADR-002's 5
  tenant-facing roles + a default Profile template; UOM seeds its Functional Role starter set plus at
  least one fully-valid UOM Group so conversion-service tests don't have to construct one per test.
- Sample users / sample products — module-specific, per §14 above.
- Mock data — not used for anything a real (test) database and Prisma seed can provide instead
  (`6-development/3-coding-standards.md` §16: integration tests run against a real database, not
  fully mocked).
- Data refresh process — `pnpm prisma migrate reset` against the dedicated test database
  (`6-development/1-development-environment.md` §11), same mechanism as local development, scoped to
  the test database instance.
- Sensitive data masking — not applicable to seed/fixture data (no production data ever copied into
  a committed fixture, `6-development/4-git-workflow.md` §19); the one place real (unmasked) data
  does appear — a live-to-testing tenant clone for debugging (ADR-066) — is a
  `6-development/10-debugging-guide.md` concern, not this document's test-fixture strategy.

---

# 10. Test Environment

Document:

- Development environment — a developer's own local test database
  (`6-development/1-development-environment.md` §11, e.g. `lbm_erp_test`), never the development
  database.
- CI environment — a CI-provisioned test PostgreSQL instance, fresh per run, migrated via Prisma
  (`6-development/9-ci-cd.md` §5/§12).
- Staging environment — Playwright E2E/regression suite runs here (`6-development/9-ci-cd.md` §4/
  §12), not on every PR (too slow for the fast-feedback PR loop).
- Production validation — post-deploy smoke tests only (`6-development/9-ci-cd.md` §4/§14), not the
  full regression suite.

Specify

- Environment parity — Staging and Production point at entirely separate PostgreSQL databases and
  Redis instances (ADR-056 database-per-tenant, `6-development/9-ci-cd.md` §15), no shared-state risk.
- Configuration management — environment variables exclusively (`6-development/
  1-development-environment.md` §9).
- Test database — §9 above.
- External integrations — third-party services (QuickBooks, CardConnect, AWS S3) point at sandbox/
  test credentials in every non-production test environment
  (`6-development/1-development-environment.md` §18); a cloned testing tenant (ADR-066) is
  automatically neutralized to sandbox mode for exactly this reason.

---

# 11. Test Automation Strategy

Both frameworks already locked project-wide (ADR-015, ADR-027) — no per-module tooling choice:

- **Jest** — unit tests (Services, utility functions, `zod`/`class-validator` schemas), integration
  tests (Controllers against a real test database).
- **Playwright** — E2E suites, state-transition tests (e.g. Users' Time Clock transition table),
  user-acceptance-flow tests, the module-completion-review browser click-through this project's own
  "Design-First live-browser review" practice already uses (`CLAUDE.md` "Where we are").

Document

- Automation tools — Jest, Playwright (as above); Postman collection
  (`3-api/10-postman-collection.json`, ADR-018) for API-level tests, folded into CI's integration-test
  step or run as its own step — exact mechanism decided at implementation time
  `[Assumption: this document]`, restated from `6-development/9-ci-cd.md` §12's own identical
  assumption.
- Execution frequency — unit/integration tests on every PR and every push to `main`
  (`6-development/9-ci-cd.md` §6/§8); Playwright E2E against Staging on every merge to `main`
  (`6-development/9-ci-cd.md` §7/§12); smoke tests post-deploy to both Staging and Production.
- CI/CD integration — `6-development/9-ci-cd.md` §5/§11 — all merge-blocking on `main`.
- Maintenance strategy — a test's name is tied to the rule ID it verifies (§1); a rule renumbered or
  removed (e.g. Users' Sharing Rules, ADR-081) means its test is removed in the same change, not left
  as dead/skipped test code (`6-development/3-coding-standards.md` §20 Dead Code).

---

# 12. Manual Testing Strategy

Manual testing should cover:

- Exploratory testing — genuinely novel UI flows not yet covered by an automated Playwright script.
- User experience — the "Design-First live-browser review" practice (§5 UAT above) — a developer
  reviewing the built pages live, not solely trusting automated test pass/fail (concretely: Users' UI
  review found 3 real bugs — sidebar labels invisible at desktop width, FAB overlapping table
  actions, a mislabeled toggle bound to the wrong field — that automated tests alone hadn't caught).
- Edge cases — genuinely underspecified behavior flagged as an exploratory/pin-down test rather than
  asserted outright (UOM's original TC-014, before ADR-192 confirmed the behavior) — manual review
  confirms the actual outcome before the test is converted from exploratory to asserted.
- Visual validation — screenshot-based review, Playwright's own screenshot capability used ad hoc for
  this per `CLAUDE.md`'s own stated practice ("use npx playwright to real-browser-check frontend
  work; never commit it as a test suite unless asked") — a deliberate distinction between ad hoc
  verification and a committed, CI-run test.
- Business process verification — a module's full `9-business-process` flow walked through manually
  at least once before the module is considered UI-reviewed.

---

# 13. Defect Management

Document:

- Defect severity/priority — mirrors a test case's own priority (Critical/High/Medium, §8) rather
  than a separately-invented defect-severity scale — a failing Critical-priority test is a
  release-blocking defect by definition (§16).
- Reporting workflow — for this project's current solo-developer-plus-AI-assistant model, a failing
  test in CI (`6-development/9-ci-cd.md` §17) is the primary defect-reporting mechanism; a
  production-only issue not caught by CI is tracked in `claude-docs/incidents/` (this project's own
  working-area structure, `CLAUDE.md`'s "four `project-docs/` areas") — restated here, not
  re-invented, and detailed further in `6-development/10-debugging-guide.md`.
- Reproduction steps — `6-development/10-debugging-guide.md` §7 (this same late wave).
- Resolution process — `6-development/5-implementation-workflow.md`'s standard development/review/
  test cycle (§4-§9 of that document) applies identically to a bug fix as to new feature work.
- Verification process — the fix's own new/updated test case passes, plus the module's full
  Regression Checklist (§5 Regression Testing above).

Example severity mapping (no distinct numeric SLA per severity confirmed by any SoT source —
qualitative only `[Assumption: this document]`):

| Severity | Description |
|----------|-------------|
| Critical | A Critical-priority test case fails, or a Critical/High risk-register finding (§1) reopens. |
| High | A High-priority test case fails, or a confirmed regression in already-shipped functionality. |
| Medium | A Medium-priority test case fails; functionality degraded but a workaround exists. |
| Low | A Low-priority/cosmetic issue with no functional impact. |

---

# 14. Entry & Exit Criteria

## Entry Criteria

- Module specification approved (`5-modules/<slug>/`, `6-development/5-implementation-workflow.md`
  §4).
- `6-validation.md` and `3-business-rules.md` both approved.
- Test environment available (§10).
- Test data prepared (§9).

---

## Exit Criteria

- Every Critical/High test case passing (§8, both modules' security-test sections named explicitly).
- Acceptance criteria met (`1-module.md` §8).
- Regression checklist passed (§5 Regression Testing).
- Documentation updated (`6-development/5-implementation-workflow.md` §11).
- Developer approval received — the standing approval role for this project's current staffing model
  (§5 UAT).

---

# 15. Quality Metrics

Track metrics such as:

- Test coverage — rule-ID coverage is the primary metric this project actually tracks (100% of
  `<MODULE>-RULE-###`/`BR-###` mapped to at least one test, mechanically auditable per §1) — a
  numeric statement-coverage percentage is not separately confirmed as a merge-blocking gate in MVP
  (`6-development/9-ci-cd.md` §11's own identical `[Assumption: ...]`, restated here rather than
  re-decided).
- Pass rate — visible via CI run history (`6-development/9-ci-cd.md` §19).
- Defect density — no numeric target set by any SoT source; tracked qualitatively per module via
  `claude-docs/incidents/` `[Assumption: this document]`.
- Escaped defects — a production issue not caught by this module's own test suite is itself a signal
  to add the missing test case, not just fix the bug (`6-development/10-debugging-guide.md` §10 Root
  Cause Analysis: "how can recurrence be prevented?").
- Automation coverage — effectively 100% of the test taxonomy (§6) except manual/exploratory testing
  (§12) by design.
- Mean time to resolution — not automatically tracked in MVP, same `[Assumption: ...]` already
  carried by `6-development/9-ci-cd.md` §19.
- Test execution time — CI job timing, visible in GitHub Actions run logs
  (`6-development/9-ci-cd.md` §9/§19).

---

# 16. Roles & Responsibilities

| Role | Responsibility |
|------|----------------|
| Developer (solo, AI-assisted) | Unit testing, integration testing, functional testing, UAT, defect triage, release approval — this project's current staffing model collapses every role below into one person plus an AI development partner (developer-confirmed, restated from `6-development/4-git-workflow.md` §11's own note) |
| Claude Code (AI development partner) | Generates test cases, suggests edge cases, executes the test suite, flags missing scenarios (§17) |
| Technical Lead / Solution Architect (future roles) | Review quality, once a second contributor joins — not currently a separately staffed role |

This project's actual staffing is solo-developer-plus-AI-assistant — developer-confirmed as matching
the real team size, not a guess. The templated multi-role QA org chart (separate QA Engineer/Product
Owner/DevOps roles) doesn't apply here; the role table above is collapsed to reflect that reality, per
the same note already carried in `6-development/4-git-workflow.md` §11 and §21.

---

# 17. AI-Assisted Testing

When AI is used (restated from `6-development/3-coding-standards.md` §16/§19 at the testing-strategy
level, not a separate rule set):

- Generate test cases — from a module's own `3-business-rules.md`/`6-validation.md`, not invented ad
  hoc (§8).
- Suggest edge cases — sourced from that module's own business-rules documentation
  (`6-development/3-coding-standards.md` §16).
- Generate API tests, unit tests — §11.
- Detect missing scenarios — the rule-ID-coverage audit (§1) is itself a mechanical way an AI
  assistant can confirm no rule was left untested.
- Assist regression analysis — §5 Regression Testing, including flagging when a new rule needs an
  explicit non-regression counterpart test (UOM's TC-028 pattern, §2 above).
- Never replace human validation for critical business logic — every Critical-priority test case
  still requires the developer's own review/approval (§16) before a module is considered complete;
  an AI assistant proposing a test's expected result for a genuinely Underspecified rule writes it as
  exploratory (§5 Sanity Testing, UOM's original TC-014), never silently asserts a guessed outcome.

---

# 18. Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Incomplete requirements | Decision-confirmation phase before implementation (`6-development/5-implementation-workflow.md` §6) |
| Insufficient test coverage | Rule-ID-coverage audit, mechanically auditable (§1, §15) |
| Environment instability | Dedicated, reset-on-demand test database (§10, `6-development/1-development-environment.md` §11) |
| Late defect discovery | Shift-left testing (§3), Phase-1-first-test discipline (§2) |
| A genuinely open business rule tested as if resolved | Exploratory-test convention (§5 Sanity Testing, §17) |
| Cross-module chain untested despite each module's own tests passing | Explicit Cross-Module Data Flow table per module's `11-testing.md` §2, own dedicated test cases (§7) |

---

# 19. Best Practices

- Test every requirement — traceability matrix (§8).
- Automate repetitive tests — §11.
- Keep test cases maintainable — name tests after the rule ID they verify (§1, §11).
- Reuse test data — shared seed data per module (§9).
- Execute regression regularly — every implementation phase (§5 Regression Testing).
- Keep environments consistent — §10.
- Update test cases with implementation changes — targeted amendments (§5 Sanity Testing), not
  silent drift.
- Measure testing effectiveness — §15.

---

# 20. Assumptions

- No numeric statement/branch code-coverage threshold is confirmed as a merge-blocking CI gate in
  MVP — rule-ID coverage (§1/§15) is this project's actual tracked metric instead
  `[Assumption: this document, restated from `6-development/9-ci-cd.md` §11]`.
- No dedicated load/stress-testing tool or cadence is confirmed for MVP beyond ADR-028's stated NFR
  targets `[Assumption: this document]`.
- The role table (§16) reflects this project's current solo-developer-plus-AI-assistant staffing
  model — developer-confirmed as accurate, not a guess; it will need genuine role separation if a
  second contributor joins `[Assumption: this document — staffing may change in future, not that the
  current staffing figure itself is uncertain]`.
- Compatibility testing (browser/device matrix) is covered implicitly by
  `4-ui/6-responsive-design.md`'s existing scope rather than tracked as its own separate test
  category `[Assumption: this document]`.

---

# 21. Constraints

- Testing must begin after approved module documentation
  (`6-development/5-implementation-workflow.md` §4).
- Critical/High-priority test failures block release (§13/§14).
- Automated tests (Jest/Playwright) must pass before deployment
  (`6-development/9-ci-cd.md` §11).
- Test environments must closely match production for database/Redis topology (ADR-056), even though
  no container parity applies (`6-development/8-containerization.md`).

---

# 22. Related Documents

- `6-development/5-implementation-workflow.md` (this same late wave)
- `6-development/3-coding-standards.md` §16 (baseline testing standard every change meets)
- `6-development/9-ci-cd.md` (CI-level test execution and gates)
- `6-development/7-deployment-strategy.md` (this same late wave)
- `6-development/10-debugging-guide.md` (this same late wave)
- `5-modules/users/11-testing.md`, `5-modules/uom/11-testing.md`
- `decisions-log.md` (ADR-015, ADR-018, ADR-027, ADR-028, ADR-053, ADR-056, ADR-066, ADR-070,
  ADR-081, ADR-190–192)

---

# 23. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-18 | Claude Code (docs-kit generation) | Initial Draft — first late-wave run, folding in both Users and UOM. |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| QA Lead | | Pending (no separately staffed role yet — see §16) | |
| Technical Lead | | Pending | |
| Product Owner | | Pending (developer, per §16) | |

---

# AI Generation Notes

- Defines a risk-based testing strategy grounded directly in both already-approved modules' own
  `11-testing.md` documents, rather than a generic testing-pyramid restatement.
- Every testing level, test type, and quality gate traces to either a locked ADR (ADR-015/027/028)
  or a concrete pattern already demonstrated in Users' or UOM's own testing document — no invented
  tooling or process not already evidenced in this project's real artifacts.
- The role table (§16) and defect-severity table (§13) are deliberately collapsed to reflect this
  project's actual current staffing rather than a templated multi-role org — flagged as
  `[Assumption: ...]` per this prompt's own instruction rather than silently guessed.
- The next module folded into this late wave should add its own concrete example wherever this
  document currently draws only on Users/UOM (e.g. §5 Regression Testing's non-regression pattern,
  §12's exploratory-test pattern), per `6-development/5-implementation-workflow.md`'s own closing note.
