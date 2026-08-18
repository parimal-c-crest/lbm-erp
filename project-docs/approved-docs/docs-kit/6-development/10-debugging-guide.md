# Debugging Guide

> **Purpose**
>
> This document defines the standard debugging practices, troubleshooting methodology, diagnostic
> tools, logging strategies, and root cause analysis process for the project. It provides developers
> and AI coding assistants with a structured approach to efficiently identify, reproduce, analyze,
> and resolve defects while minimizing downtime and preventing recurring issues.

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| Supported Platforms | Development / Staging / Production |
| Primary Languages | TypeScript |
| Frameworks | NestJS (backend), Next.js/React (frontend) |
| Version | 1.0 (late wave — first run, folding in Users and UOM) |
| Status | Draft |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-18 |
| Last Updated | 2026-08-18 |

---

# 1. Executive Summary

Debugging in this project starts from the same evidence base testing does: a module's own
`3-business-rules.md`/`11-testing.md` rule catalog (`6-development/6-testing-strategy.md` §1) and,
for a genuinely production-only issue, a full-fidelity **live-to-testing tenant clone** (ADR-066) —
an unscrubbed copy of a real tenant's database, automatically sandboxed, provisioned as its own
addressable environment purpose-built for exactly this. This is a real, already-decided project
capability, not a generic "reproduce it somehow" instruction — §15 details it.

- **Debugging philosophy**: reproduce before fixing (§3), and where a defect closes a legacy risk
  finding, the fix is verified by the same *named* regression test the module's own risk register
  already specifies (`6-development/6-testing-strategy.md` §12) — not a general assurance that "it's
  fixed now."
- **Root cause analysis**: §10 — every confirmed issue traces to a business-rule/validation-rule ID
  where one applies, closing the exact gap a missing or wrong rule enforcement represents.
- **Supported tools**: §8.
- **Logging strategy**: §9, restated from `6-development/3-coding-standards.md` §11 at the
  debugging-workflow level.
- **Production troubleshooting approach**: §15 — the live-to-testing clone (ADR-066) is this
  project's primary answer to "it doesn't reproduce locally."

---

# 2. Objectives

The debugging guide should:

- Reduce issue resolution time — a full-fidelity repro environment (§15) removes the single biggest
  time cost in production debugging: not being able to reproduce the issue at all.
- Standardize troubleshooting — one workflow (§4) regardless of which module the issue is in.
- Improve root cause identification — trace every issue back to a rule ID or an architectural
  boundary violation (§10, §12) rather than stopping at "the symptom went away."
- Minimize recurring defects — every confirmed defect gets a permanent, named regression test
  (§17/§18), the same pattern this project's own testing strategy already requires
  (`6-development/6-testing-strategy.md` §12).
- Support AI-assisted debugging — §16.
- Protect production stability — §15's read-only-diagnostics-first discipline, and the sandboxed
  clone's guarantee that a developer debugging live data never triggers a real email, payment, or
  QuickBooks call (ADR-066/ADR-058).

---

# 3. Debugging Principles

Every issue investigation should follow these principles:

- Reproduce before fixing — locally if possible, via a live-to-testing clone (§15) if not.
- Understand before modifying — trace the failure to a specific business rule, validation rule, or
  architectural boundary (§10) before changing code.
- Fix the root cause, not symptoms — the concrete standard this project already sets for itself:
  Users' USR-RISK-001 fix isn't "catch the exception the empty-id delete throws," it's "reject the
  empty id before any query is constructed" (a shared `EntityIdentifier` value object, ADR-154) — the
  structural fix, not a symptom patch.
- Minimize code changes — per `CLAUDE.md`'s own project-wide instruction, a bug fix doesn't need
  surrounding cleanup unless that cleanup is itself the task.
- Verify the solution — the fix's own new/updated test passes, plus the module's Regression Checklist
  (`6-development/6-testing-strategy.md` §5).
- Prevent regression — §17/§18.
- Document findings — `claude-docs/incidents/` (this project's own working-area structure,
  `CLAUDE.md`'s "four `project-docs/` areas") for anything beyond a routine bug fix; a targeted
  `11-testing.md` amendment (§18, the same pattern Users v1.1/UOM's ADR-190/191/192 already use) for
  anything that changes a module's documented behavior.

---

# 4. Debugging Workflow

```text
Issue Report (a failing test in CI, a live-browser review finding, or a production incident)
      ↓
Collect Information (§6)
      ↓
Reproduce Issue (locally, §7 — or via a live-to-testing tenant clone if production-only, §15)
      ↓
Analyze Logs (§9)
      ↓
Identify Root Cause (§10 — trace to a rule ID or architectural boundary where one applies)
      ↓
Implement Fix (minimal, per §3)
      ↓
Verify Fix (§3, the module's own test suite)
      ↓
Regression Testing (6-development/6-testing-strategy.md §5, plus a new named test, §17/§18)
      ↓
Document Resolution (claude-docs/incidents/ or a targeted 11-testing.md amendment)
```

---

# 5. Issue Classification

Categorize issues before investigation.

| Type | Examples |
|------|----------|
| Functional Bug | Incorrect business logic — e.g. a mis-mapped rule ID, a formula divergence (the exact class UOM's TC-015 golden-output test guards against) |
| Validation Issue | Invalid input handling — mapped to a specific `VR-###` in the module's `6-validation.md` |
| API Issue | Incorrect request/response — mapped to `8-api.md` |
| Database Issue | Query failures, a delete-guard `RESTRICT` misbehaving (`6-development/6-testing-strategy.md` §6) |
| Concurrency Issue | Two users editing the same record — the standard project-wide edit-lock pattern (ADR-079/080/084) either not applied to a module that needs it, or misbehaving where it is applied |
| Performance Issue | Slow execution — e.g. an N+1-shaped conversion lookup instead of UOM's required batched pick-breakdown query (`1-module.md` §13) |
| Security Issue | Authentication failures, a permission-escalation path (`6-development/6-testing-strategy.md` §12) |
| Infrastructure Issue | Deployment or networking — `6-development/7-deployment-strategy.md` |
| UI Issue | Rendering or layout problems — the exact class Users' own live-browser review (§16) caught (sidebar labels invisible at desktop width, FAB overlapping table actions) |

---

# 6. Information Collection

Before debugging, collect:

- Error messages, stack traces, log files (§9).
- User actions — the exact sequence, per the module's own `2-functional-specification.md` workflow
  it deviates from.
- Request payloads / response data.
- Environment details — which environment (Development/Staging/Production), which tenant (if
  Production — critical given database-per-tenant isolation, ADR-056, since the same bug may not
  exist in a different tenant's data).
- Browser/device information — for a UI issue.
- Application version — the Git commit SHA/tag the running deployment was built from
  (`6-development/9-ci-cd.md` §10).
- Screenshots or recordings — Playwright's own ad hoc screenshot capability
  (`6-development/6-testing-strategy.md` §12), per `CLAUDE.md`'s stated practice.

---

# 7. Issue Reproduction

Document:

- Preconditions, environment, test data, exact steps, expected behavior, actual behavior.
- Reproduction frequency.

Classify the issue as:

- Always reproducible — locally, against the standard local test database
  (`6-development/1-development-environment.md` §11).
- Intermittent — a concurrency issue is the most likely local-repro-resistant category in this
  project specifically, given the standard edit-lock pattern (ADR-079/080/084) — reproduce with a
  scripted two-session test, not manual double-clicking.
- Environment-specific — Staging vs. Production infrastructure differences (§ `6-development/
  7-deployment-strategy.md` §5's environment-parity note); rare given both point at the same AWS/
  PostgreSQL/Redis topology.
- **Production-data-specific** — the category this project has a dedicated mechanism for: the actual
  data shape/volume of one specific live tenant triggers the bug, and no synthetic local seed data
  reproduces it. This is exactly what the live-to-testing tenant clone (ADR-066) exists to solve —
  see §15.

---

# 8. Debugging Tools

Document approved tools, restated from `6-development/1-development-environment.md` §15 at the
debugging-workflow level (not a separate tool list):

### IDE Debuggers

- VS Code's built-in Node.js debugger (launch config targeting `backend/src/main.ts`).
- Browser DevTools' React/Next.js source-map support (frontend).

### Browser Tools

- Chrome DevTools / Firefox Developer Tools.
- React DevTools extension.

### API Debugging

- Postman (ADR-018), against the locally running or Staging backend.
- OpenAPI/Swagger UI (`/api/docs`, `1-project/...`/`CLAUDE.md`'s stated status — already live for
  Users) for interactive endpoint exploration.

### Database Tools

- Prisma Studio (`pnpm prisma studio`) — visual local/test database browser.
- Direct `psql`/pgAdmin access to a Staging or (read-only, where possible) Production tenant
  database, per §15's read-only-diagnostics-first discipline.

### Network Tools

- cURL, browser Network tab.

### Queue/Job Tools

- BullMQ's own dashboard tooling (e.g. Bull Board, if adopted) or direct Redis inspection for a
  stuck/failed background job (auto-clock-out, QuickBooks sync, notification schedulers) — exact
  tooling choice not confirmed by any SoT source `[Assumption: this document]`.

---

# 9. Logging Strategy

Restated from `6-development/3-coding-standards.md` §11 at the debugging-workflow level:

Use logs to identify: errors, warnings, important business events (order finalized, purchase order
received, user role changed — the audit-trail-shaped events this project's own security-driven
motivation makes especially important, `CLAUDE.md`), security events (failed login attempts,
permission-denied occurrences, API key authentication failures).

Logs should include: timestamp, severity, correlation ID, user ID (when appropriate), request ID,
module, error details.

Never log: passwords, JWT tokens/API keys, secrets/credentials of any kind, PII beyond what's
operationally necessary — restated as the exact rule this project's own founding motivation makes
non-negotiable ("plaintext integration credentials" was a confirmed legacy finding,
`6-development/3-coding-standards.md` §11).

**Log destination**: local development logs to console
(`6-development/1-development-environment.md` §15); Staging/Production log aggregation destination
is the same open item already flagged twice in the early wave
(`4-ui/8-frontend-development-standards.md` §17/§18, `6-development/9-ci-cd.md` §19) and once more in
`6-development/7-deployment-strategy.md` §15 — no dedicated log-aggregation/observability service
confirmed for MVP `[Assumption: this document, restated from the early wave and
`7-deployment-strategy.md`]`. Until one is chosen, Staging/Production logs are read via whatever the
hosting platform's own default stdout capture provides (e.g. CloudWatch Logs if the AWS service
chosen at implementation time provides it natively).

---

# 10. Root Cause Analysis

For every confirmed issue determine:

- What failed? — traced to a specific rule ID (`<MODULE>-RULE-###`/`BR-###`/`VR-###`) or an
  architectural-boundary violation (§12) where one applies; a genuinely new defect class not covered
  by any existing rule gets a new rule written into the module's `3-business-rules.md` as part of the
  fix, not left implicit in the code alone.
- Why did it fail? — the actual mechanism, not just the symptom (§3).
- When was it introduced? — `git blame`/`git log` against the specific file, cross-referenced with
  `6-development/4-git-workflow.md` §8's Conventional Commits scoping (module-slug-scoped commits
  make this search tractable).
- Why wasn't it detected earlier? — a missing test case (the concrete finding this project's own
  process has already produced twice: Users v1.0's Phase-1 decision-tracking gap, corrected in v1.1;
  UOM's three ADR-190/191/192 amendment rounds, each closing a genuinely underspecified rule) or a
  genuinely new scenario no prior documentation anticipated.
- How can recurrence be prevented? — a new, permanently-named test case added to the module's
  `11-testing.md` (§17/§18), not just a one-time manual fix.

Document corrective and preventive actions — `claude-docs/incidents/` for anything beyond a routine
fix (`CLAUDE.md`'s "four `project-docs/` areas": this working-area folder is exactly where an
incident record belongs, distinct from a final `approved-docs/` deliverable).

---

# 11. Performance Debugging

Investigate:

- Slow database queries — Prisma's `include`/`select` usage vs. N+1 sequential queries
  (`6-development/3-coding-standards.md` §13); this is the exact, named risk UOM's own module
  specification flags for its conversion service ("must support the pick-unit-breakdown query as a
  single batched call, not N sequential factor lookups," `1-module.md` §13) — a slow pick-breakdown
  query is the concrete, expected first place to look for this class of issue in that module.
- Memory usage, CPU utilization — standard Node.js process profiling (`node --inspect`, Chrome
  DevTools' Node profiler).
- Network latency — API response times against ADR-028's < 500ms p95 target (bulk operations
  excluded, own async budget).
- Cache efficiency — Redis cache hit rate for anything genuinely cached (`6-development/
  3-coding-standards.md` §13 — used deliberately, not blanket cache-everything).
- Background jobs — BullMQ queue depth/processing time (§8).
- API response times — measured against ADR-028's targets before optimizing (§ `6-development/
  3-coding-standards.md` §13: "measure before optimizing").

Use profiling tools where appropriate — Node's built-in `--prof`/`--inspect`, no dedicated APM
service confirmed for MVP (same open item as §9).

---

# 12. API Debugging

Verify:

- Request payload, authentication, authorization — a permission-denied case should be traced against
  the module's own `7-permissions.md` matrix before assuming a bug (the "Denied" cell may be correct
  behavior, `6-development/6-testing-strategy.md` §5).
- Headers, query parameters, response codes, response body — against the module's own `8-api.md`.
- Rate limits — where applicable (e.g. 2FA verification-code regeneration, ADR-075's rate-limiting).
- **Module-boundary violation** — a specific, named debugging check for this project: if a bug traces
  to one module's code reading or writing another module's data directly instead of through its
  exported service, that's not a normal bug, it's the exact architectural violation UOM's ADR-053
  exists to prevent (and the exact legacy pattern — 46+ files with direct UOM-table access — this
  project's whole module-boundary design exists to close). Flag this class of finding distinctly, not
  as a routine fix: it likely needs the architecture-review-level regression test
  `6-development/6-testing-strategy.md` §12 already calls for (TC-018 in UOM's own testing document).

---

# 13. Database Debugging

Check:

- Connection — per `6-development/1-development-environment.md` §19's troubleshooting table.
- Transactions — an atomic multi-table save (e.g. UOM's Group+RoleAssignments+ConversionFactors save,
  BR-019) failing partway through should never leave a partial row; if it does, that's the bug, not
  an acceptable partial-failure mode.
- Locks / deadlocks — the standard project-wide concurrent-edit lock (ADR-079/080/084, Redis
  TTL-based) — check the lock's own state (is it held, did its heartbeat expire, did it release on
  disconnect) before assuming a database-level deadlock.
- Indexes / execution plans — `EXPLAIN ANALYZE` against a slow query, cross-referenced with the
  module's own `4-schema.md` §"indexes" section (e.g. UOM's `uom_type_factor_history (group_id,
  type_id, effective_from)` performance index).
- Data integrity — a delete-guard `RESTRICT` FK firing (or *not* firing when it should) is a database-
  level check first, not just an application-level one (`6-development/6-testing-strategy.md` §6).
- Migration history — `prisma migrate status` against the target tenant database; for a
  Production-only schema-state question, check which migration each tenant database is actually on
  (the per-tenant fanout, `6-development/7-deployment-strategy.md` §9, means tenants could in
  principle be on different migration states mid-fanout).

---

# 14. Frontend Debugging

Inspect:

- Browser console, Network requests, JavaScript errors — standard.
- State management — TanStack Query cache state / Zustand store state
  (`6-development/2-folder-structure.md` §6).
- Component lifecycle, rendering issues.
- CSS layout, responsive behavior — the exact class of issue Users' own live-browser review already
  caught in this project (sidebar labels invisible at desktop width, a FAB overlapping table
  actions) — a concrete precedent that automated tests alone don't always catch this category, so a
  live visual check (§3, `6-development/6-testing-strategy.md` §12 Manual Testing) is a real part of
  this project's own frontend-debugging practice, not merely a nice-to-have.

---

# 15. Production Debugging

Production debugging should:

- Minimize system impact.
- Avoid direct database modifications against a real tenant's live data.
- Use logs before attaching debuggers.
- Prefer read-only diagnostics.
- Follow change management procedures — the deployment/rollback discipline in
  `6-development/7-deployment-strategy.md` §12.

**This project's primary production-debugging mechanism: the live-to-testing tenant clone
(ADR-066).** When a production-only issue doesn't reproduce locally or on Staging's synthetic data:

1. From the skeleton control panel, trigger a "create testing sub from existing tenant" action,
   naming the specific live tenant whose data triggers the bug.
2. This runs the **standard new-tenant provisioning pipeline** (ADR-056: new database, new registry
   entry, new subdomain), except the clone source is that chosen live tenant's database instead of
   the skeleton template — the result is a genuine, independently-addressable new tenant/subdomain,
   not a bare database copy with nothing attached to it.
3. The clone is an **exact, unscrubbed copy** — deliberately not anonymized, since a faithful repro
   environment is the entire point.
4. The clone is **automatically set to `sandbox` mode the moment the copy completes** (reusing
   ADR-058's tenant runtime-mode mechanism) — any transaction the developer creates while debugging
   never sends a real email, never triggers a real payment charge, and never touches the source
   tenant's real QuickBooks/integration credentials. This is what makes it safe to debug against real
   data without risking the source tenant's live operations.
5. The clone is **tagged `testing`** under ADR-056's tenant-type classification, fitting the same
   staged migration-rollout/control-panel visibility already designed for that type.
6. Debug against this clone using the full toolset (§8) as if it were any other environment — since
   it's a real, independent tenant, standard debugger attachment, direct (this time genuinely
   consequence-free) database inspection, and log analysis are all available without the production-
   system-impact concern §15's opening principles otherwise require avoiding.
7. **Retention/cleanup**: clones **persist until manually deleted — there is no auto-expiry/TTL job**.
   Deletion is a deliberate, on-demand admin action from the skeleton control panel, the same place
   the clone was created; nothing removes a testing clone on its own. **Security note**: because the
   clone is an exact, unscrubbed copy (point 3 above), an indefinitely-retained clone means real
   tenant data sits in the testing environment for as long as nobody deletes it — a developer should
   still delete a clone once its debugging purpose is served, as a matter of operational discipline,
   even though the system itself does not enforce or remind anyone to do so.

Document emergency debugging procedures — a `hotfix/*` branch
(`6-development/4-git-workflow.md` §5) follows the exact same PR/review/CI process as any other
change (§16 of that document) — there is no separate, lower-rigor emergency path, a deliberate
safeguard consistent with this project's own architecture.

---

# 16. AI-Assisted Debugging

When AI is used:

1. Review logs before suggesting fixes (§9).
2. Search existing code for similar implementations — check whether the same defect class already
   has a fix pattern elsewhere in the codebase (e.g. the shared `EntityIdentifier` value object,
   ADR-154, applied at every command accepting an entity identifier — a new module's equivalent
   defect should reuse this pattern, not invent a parallel one).
3. Identify probable root causes — traced to a rule ID or architectural boundary (§10/§12), not a
   guess.
4. Recommend minimal code changes (§3).
5. Suggest regression tests (§17/§18).
6. Update documentation when necessary — a targeted `11-testing.md`/`3-business-rules.md` amendment
   (§18), following the same scoped-amendment pattern Users v1.1 and UOM's ADR-190/191/192 already
   establish, explicitly not a full document re-review for a small, targeted fix.

AI should never:

- Guess without evidence — the exact failure this project's own two modules already caught and
  corrected: Users v1.0's Phase 1 treated already-locked ADRs as open decisions without checking
  `decisions-log.md` first; UOM's original TC-014 avoided exactly this by writing an exploratory test
  instead of asserting a guessed outcome for a genuinely Underspecified rule.
- Ignore existing architecture — module-boundary exclusivity (§12), layered dependency rules
  (`6-development/2-folder-structure.md` §14).
- Remove validation without justification — a validation rule exists because of a specific
  business-rule/security finding (`6-development/6-testing-strategy.md` §1); removing it to make a
  symptom go away is exactly the kind of "fix" this project's whole security-driven rewrite exists to
  prevent recurring.
- Recommend unsafe production changes — a direct write against a live tenant's database instead of
  going through the application's own service layer, or debugging against real production data
  outside the sandboxed clone mechanism (§15) when that mechanism is available and applicable.

---

# 17. Resolution Verification

Verify:

- Original issue resolved — the exact reproduction steps (§7) no longer trigger the failure.
- Acceptance criteria satisfied — the module's own `1-module.md` §8, if the fix touches acceptance-
  criteria-governed behavior.
- No regressions introduced — the module's full Regression Checklist
  (`6-development/6-testing-strategy.md` §5).
- Tests updated — a new, permanently-named test case added (§18), not a one-time manual check.
- Documentation updated — §18.
- Monitoring shows healthy behavior — post-fix, in whichever environment the issue originally
  surfaced (`6-development/7-deployment-strategy.md` §15).

---

# 18. Debugging Checklist

Before closing an issue verify:

- Root cause identified (§10).
- Fix implemented (§3, minimal).
- Peer review completed (`6-development/3-coding-standards.md` §17 — the same checklist as any other
  change, per `6-development/4-git-workflow.md` §18: an AI-generated fix goes through the exact same
  review, no fast-path exemption).
- Tests passed — including the new, permanently-named regression test (§17).
- Regression executed (§17).
- Documentation updated — a targeted `11-testing.md`/`3-business-rules.md` amendment where the fix
  changes documented behavior, following the same scoped pattern Users v1.1/UOM's ADR-190/191/192
  amendments already use: state exactly what changed and why, without re-reviewing the entire
  document.
- Monitoring confirmed (§17).

---

# 19. Best Practices

- Reproduce before fixing (§3, §7, §15).
- Keep changes minimal (§3).
- Use breakpoints strategically (§8).
- Analyze logs first (§9).
- Validate assumptions with evidence — trace to a rule ID (§10), not a guess (§16).
- Fix root causes (§3, §10).
- Add tests for resolved defects (§17/§18).
- Document recurring issues — a pattern seen more than once (e.g. a documentation-pass missing a
  pre-existing locked ADR, seen in both Users and UOM's revision histories) is worth naming as a
  standing risk in `6-development/5-implementation-workflow.md` §17, not just fixed silently each
  time it recurs.

---

# 20. Assumptions

- No dedicated APM/observability or log-aggregation service is confirmed for MVP (§9/§11) — the same
  open item already flagged in the early wave and in `6-development/7-deployment-strategy.md` §15,
  not re-decided here.
- Exact BullMQ/Redis queue-inspection tooling (§8) is an implementation-time choice, not specified
  further by any SoT source.
- Retention/cleanup for ad hoc live-to-testing debugging clones (§15) is a confirmed developer
  decision, not an assumption: clones persist indefinitely with no automatic expiry, deletion is a
  manual/on-demand admin action only. Cleaning up a clone once its debugging purpose is served is
  operational discipline, not a system-enforced policy — worth restating given these clones hold real,
  unscrubbed tenant data.
- No formal severity-based SLA for issue-resolution turnaround exists — the qualitative severity
  mapping already stated in `6-development/6-testing-strategy.md` §13 is the closest this project
  currently has, not a numeric SLA `[Assumption: this document]`.

---

# 21. Constraints

- Production debugging must follow operational procedures (§15) — no direct destructive database
  modification against live tenant data; the live-to-testing clone (§15) is the sanctioned path for
  anything beyond read-only diagnostics.
- Sensitive information must never be logged (§9).
- Root cause analysis required for major incidents (§10) — recorded in `claude-docs/incidents/`.
- All fixes require verification before release (§17/§18) — the same CI/review gates as any other
  change, no debugging-specific exemption.

---

# 22. Related Documents

- `6-development/3-coding-standards.md` §10/§11 (error handling, logging — the standard this
  document's own logging/error sections restate at the debugging-workflow level)
- `6-development/6-testing-strategy.md` (this same late wave — regression-test conventions this
  document relies on, §17/§18)
- `6-development/5-implementation-workflow.md` (this same late wave — the process-gap pattern this
  document names in §16/§19)
- `6-development/7-deployment-strategy.md` (this same late wave — rollback/deployment procedures
  §15/§21 reference)
- `6-development/9-ci-cd.md` (build/artifact traceability, §6)
- `6-development/1-development-environment.md` §15/§19 (tool setup and local troubleshooting this
  document's §8 restates at the debugging-workflow level)
- `5-modules/users/*`, `5-modules/uom/*` (the concrete rule-ID/risk-register examples cited
  throughout)
- `decisions-log.md` (ADR-053, ADR-056, ADR-058, ADR-066, ADR-079, ADR-080, ADR-084, ADR-154, ADR-028)

---

# 23. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-18 | Claude Code (docs-kit generation) | Initial Draft — first late-wave run, folding in both Users and UOM, and formally documenting the live-to-testing tenant clone (ADR-066) as this project's primary production-debugging mechanism. |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Technical Lead | | Pending | |
| QA Lead | | Pending (no separately staffed role yet — `6-development/6-testing-strategy.md` §16) | |
| Solution Architect | | Pending | |

---

# AI Generation Notes

- Follows `6-development/3-coding-standards.md` §10/§11 (error handling/logging),
  `6-development/6-testing-strategy.md` (regression-test conventions), and
  `6-development/9-ci-cd.md`/`7-deployment-strategy.md` (build traceability, rollback) — no new
  logging/error-handling rule introduced here beyond what those documents already lock.
- §15 (Production Debugging) is this document's most load-bearing section — ADR-066's live-to-testing
  tenant clone is a real, already-decided, fairly elaborate project capability
  (full provisioning pipeline + automatic sandbox neutralization) that no other `6-development/`
  document had previously documented as a debugging tool specifically; this document is its natural
  home given `6-development/9-ci-cd.md`/`8-containerization.md`'s own deferral pattern.
- Every recommended tool/practice traces to either an already-locked ADR, an early-wave
  `6-development/` document, or a concrete pattern already demonstrated in Users'/UOM's own module
  documentation — no invented tooling.
- Encourages safe debugging practices for development, testing, and production (§15), integrating
  logging, testing, and the module-boundary-violation check (§12) — a debugging-specific instance of
  UOM's own ADR-053 exclusivity principle — into the troubleshooting workflow.
