# Users — Build Guidance

> Guidance for Stage 4, stated stack-neutrally.

Source: `docs_from_blueprint/module/Users/10-build-guidance.md`, itself from
`blueprint/module/Users/09-implementation-plan.md` ("Doc2"), §3 (rule-to-enforcement mapping), §11
(security-by-construction mitigations), §14 (build sequencing), §15 (test strategy). This section
is guidance for however a downstream process structures its own implementation plan and testing
documentation — it is not itself an implementation plan, a schema migration script, or an API
specification.

## Why this module's build guidance carries more weight than a typical module's

Users is the identity/RBAC backbone — every other module's rewrite depends on its role/profile/
permission/sharing-rule model existing and being correct before that module's own authorization
behavior can even be meaningfully tested (per the blanket cross-module architectural fact in
`integrations.md` that every other module reads this module's context for permission checks). This
document's enforcement-layer decisions and its security-by-construction mitigations are treated as
load-bearing for the rest of a rewrite program, not just for this module.

## Rule-to-Enforcement-Layer Mapping Approach

Each of the 66 rules catalogued in `business-rules-and-validation.md` should be enforced at the
most appropriate layer for its nature: **domain model invariant** (enforced inside the relevant
business-entity boundary itself, cannot be bypassed by any operation reaching that entity),
**application-level orchestration/service** (multi-step workflows, external-call gating,
rate-limiting), **DB constraint** (a last-resort integrity backstop, not the primary enforcement
point), or **excluded** (confirmed-dead/unconfirmed legacy code, not reimplemented).

| Rule group | Rule IDs | Count | Suggested primary layer |
|---|---|---|---|
| Save-orchestration | USR-RULE-001–012 | 12 | Domain invariant (001–004) / Application service (005–012). The duplicate-username check (001, currently informational-only) becomes a real domain invariant — a DB uniqueness constraint plus an application-service pre-check for a friendly error. The two divergent password-change paths (009/010) collapse into **one** command with one, correct argument. |
| Entity-level | USR-RULE-013–026 | 14 | Domain invariant (013, 015-016, 019-022) / Excluded (014, dead code) / Application service (017-018, 023-026). The dead server-side duplicate-username/last-admin guard (013) is folded directly into the user-save command's own precondition, not carried forward as a separate function a future refactor could omit calling again. |
| Auth/session/2FA | USR-RULE-027–044 | 18 | Domain invariant (028-030, 034, 038, 044) / Application service (027, 039-042) / Excluded (037, dead code; 043, pending explicit SME-approved reintroduction). The 10+-branch hardcoded lockout-role resolution (036) is replaced by one generalized, tenant-configurable "protected-action role requirement" concept. |
| Privilege/sharing computation | USR-RULE-045–047 | 3 | Domain invariant / Application service. The file-ordering dependency (046) is closed structurally by computing privileges and sharing rules as one atomic operation, not two sequentially-dependent file-generation steps. |
| Profile-save | USR-RULE-048–051 | 4 | Application service (048-049) / Domain invariant (050-051). The lowest-id-profile baseline (048) is replaced by an explicit, named default-profile-template concept. The fail-open permission default (050) becomes a domain invariant requiring every permission to be explicitly set. |
| Delete-family | USR-RULE-052–059 | 8 | Domain invariant. **The module's highest-stakes group** — every rule here is superseded by one blanket parameter-validation pattern at the shared command-handling boundary (see Security-by-Construction below), not patched individually per legacy function. |
| RecalculateSharingRules | USR-RULE-060–061 | 2 | Application service (background job). The unbounded, synchronous, no-time-limit recomputation becomes a tracked, resumable background job with progress reporting and partial-failure recovery. |
| Shared mass-delete | USR-RULE-062–063 | 2 | Application service, out of this module's own build scope (a shared ~30-module mechanism) — noted here only because the source blueprint catalogued it under Users; the UX inconsistency it found (status-guard failures aren't reported back the way permission failures are) is flagged for whichever module ends up owning that shared mechanism's rewrite. |
| CSV import validation | USR-RULE-064–066 | 3 | Domain invariant (064-065) / Application service (066). The zero-password-validation gap on the import path (066) is closed by routing import-time password-setting through the same complexity-enforcing command as every other password-set path — no import-specific carve-out. |

**Total: 66 of 66 rules mapped, none omitted.**

## Suggested Build Sequencing

The source Implementation Plan reasons explicitly (§14) that this module's phase order **cannot**
simply mirror a "schema → invariants → state machine → calculations → screens/API → outputs →
integrations" shape the way a peer business-capability module's build order might: **auth and RBAC
must be usable before this module's own secondary concerns (time clock, payroll, outputs) are
built**, both because those secondary concerns' own commands need a real permission-check context
to be testable, and because other modules/teams may need to start integration-testing against this
module's auth/RBAC surface while its own payroll pipeline is still being built out. Eight phases —
this module has two genuinely separate "cores" (identity/RBAC, and time-clock/payroll) that do not
need to be built in lockstep, plus a dedicated security-hardening phase pulled forward given the
module's security-critical framing:

1. **Resolve blocking open decisions** — SME sign-off on the sharing-rule permission-level
   encoding, the sharing-rule precedence logic (USR-OQ-019, requires a dedicated read of the
   legacy privilege-computation engine's actual computation functions first), and the payroll
   open-punch/overtime-formula policy sign-offs (can be deferred closer to Phase 6, but should be
   scheduled now). **Verify**: a decision log, one paragraph per resolved item, checked in before
   Phase 1 starts.
2. **Core identity schema + security-by-construction infrastructure** — implement the core
   entities, with tenant scoping (R7). Build the shared identifier-validation command boundary and
   the parameterized-query-only data-access layer as reusable infrastructure — not per-command,
   since every later phase's commands depend on both existing first. **Verify**: migrations run
   clean; a unit test proving the identifier value-object rejects empty/malformed input is the
   first test written in this codebase, before any command that depends on it.
3. **Auth/session/RBAC core** — implement authentication, logout, password-change, the new
   login-attempt/lockout policy (closes USR-RISK-006), the 2FA flow (closes USR-RISK-010/014), and
   the permission-computation read model — no file-based cache, real invalidation on
   role/profile/sharing-rule change. **Verify**: integration tests cover every rule id in the
   auth-related groups; a test proving an Inactive-status user cannot authenticate regardless of
   correct credentials; a test proving the permission read model reflects a role change on the
   target user's very next query with no session-cache staleness. **This phase's output is the
   hard prerequisite every other module's own authorization testing needs — treat as blocking for
   cross-module integration work.**
4. **Delete-family & remaining security hardening** — implement the four delete commands through
   the Phase 2 identifier-validation boundary; close the time-clock/personal-day injection sites
   even though their owning commands aren't built until Phase 6, by ensuring the shared
   data-access layer makes the vulnerable pattern unavailable before those commands exist to use
   it. **Verify**: a negative test reproducing the exact empty-role-identifier legacy failure mode
   and asserting rejection; negative tests for each confirmed injection payload.
5. **Groups/Profiles/Sharing-Rule administration** — implement profile save (closes
   USR-RISK-013), sharing-rule create/delete against the unified entity, group/role-hierarchy
   management. **Verify**: tests confirming every permission is explicitly set on profile creation
   (no fail-open); a sharing-rule precedence test suite once Phase 1's precedence sign-off is
   available.
6. **Time Clock state machine** — implement the full transition table (`workflows.md`).
   **Verify**: state-transition tests covering every row; a test proving the auto-close command
   cannot target the wrong id space (closes USR-RISK-011) — a type-level test, not just a
   behavioral one.
7. **Payroll pipeline** — implement the hours-worked/overtime/pay-period calculators
   (`calculations.md`), the open-punch policy (whichever Phase 1 sign-off resolved to), and the
   personal-day/time-off → hours-classification bridge. **Depends on Phase 1's payroll-policy
   sign-offs.** **Verify**: golden-output tests reproducing the source blueprint's documented
   formulas; a test proving a payroll report covering unresolved open punches is flagged
   incomplete, never silently computed as if the hours didn't exist.
8. **Outputs & remaining cross-module surface** — implement the output catalog (`outputs.md`), the
   PendingDeliveries interface (pending its open consumer-confirmation question), and Mail
   Account/Notification Scheduler/Word Template administration. QuickBooks built only if SME
   review confirms it should be revived. **Verify**: snapshot tests for each output type; an
   explicit recorded decision on QuickBooks (built or formally retired) before this phase is
   considered done.

## Security-by-construction: explicit mitigation for every Critical/High risk

Every Critical and High item in `risks-and-open-questions.md`'s Master Risk Register gets a named,
structural mitigation — not a general assurance that "the new system will be more secure":

- **USR-RISK-001 (Critical)** — a blanket, shared `EntityIdentifier`-style value object that
  rejects empty/malformed input at construction time, applied at every command that accepts an
  entity identifier — making it structurally impossible for an empty/malformed role identifier to
  reach any query-construction step. A dedicated negative test reproducing this exact legacy
  failure mode (empty delete-identifier) and asserting rejection before any query runs is required.
- **USR-RISK-002/003 (Critical/High)** — parameterized queries/ORM by default, with no raw-string
  escape hatch for request-derived values, for every command touching the affected endpoints
  (clock-in, clock-out, personal-day/time-off submission).
- **USR-RISK-004 (High)** — typing the personal-day owner reference as a proper integer foreign
  key in the new schema. Already-corrupted legacy rows are a separate migration-time concern, not
  fixed by the schema change alone.
- **USR-RISK-005 (High)** — a password-change command that enforces complexity as a domain
  invariant at **every** password-set call site, with no toggle to disable it and no bypass path.
- **USR-RISK-006 (High)** — a new, DB-backed failed-attempt policy with a real, time-boxed lockout
  window that survives session loss — explicitly a **new** capability.
- **USR-RISK-007 (High)** — treating open time-clock punches as an explicit "Incomplete"
  data-integrity state (or an explicit, tenant-configurable auto-close policy) — requires SME
  sign-off on which policy before this pipeline is built.
- **USR-RISK-008 (High)** — one authoritative, tenant-configurable overtime calculator,
  provisionally the rolling-week-bucket formula, flagged for mandatory SME sign-off before build.
- **USR-RISK-009 (Medium-High)** — excluding QuickBooks employee sync from the new build entirely,
  pending explicit SME confirmation of whether it should be revived or formally retired.
- **USR-RISK-010 (Medium-High)** — excluding the admin-account 2FA-code CC mechanism from the new
  design by default; any equivalent requires an explicit, environment-gated, SME-approved decision.
- **USR-RISK-020 (Low, R16)** — folding both of the dead guard's protections (duplicate-username,
  last-admin-demotion) directly into the user-create/update command's own preconditions, with the
  duplicate-username half additionally DB-enforced as a uniqueness constraint.
- **USR-RISK-021 (Low, R17)** — real required-field enforcement as a domain invariant on the
  user-create/update command, derived from each field's own declared-required metadata.
- **Remaining Medium/Low findings (USR-RISK-011, -012, -016, -017, -018, -019, -013, -014, -015,
  -022)** — each closed by construction as a direct consequence of the design decisions above (e.g.
  USR-RISK-011's wrong-id-space bug becomes structurally inexpressible once the auto-close
  command's only valid input is a domain-resolved record/user pair; USR-RISK-015's session-caching
  staleness is closed by never introducing a session-cached role id in the first place).

**Every one of the two Critical and six High findings gets an explicit mitigation above. 22 of 22
Master Risk Register findings addressed** (10 explicitly detailed; the remaining Medium/Low items
closed as direct consequences of the same decisions).

## Test/Verification Strategy Pointer

- **Rule-ID-traceable tests**: name or tag each test after its `USR-RULE-###` id so coverage
  against `business-rules-and-validation.md` is mechanically auditable (a script can grep test
  names against the rule catalog and report any rule with zero matching tests).
- **Security regression tests — one per Critical/High finding, explicit and named**: reproduce the
  empty-identifier delete request for Role/User/Profile/Group and assert rejection before any query
  construction (USR-RISK-001); attempt the exact injection payloads documented against the
  clock-in/clock-out/personal-day commands and assert parameterized rejection, not string-based
  sanitization (USR-RISK-002/003); attempt to create a personal-day row for a user id ≥ 100 and
  assert correct, untruncated ownership (USR-RISK-004); attempt a password change with a weak
  password via every entry point (interactive, import, admin-reset) and assert uniform rejection
  (USR-RISK-005); script repeated failed-login attempts across session boundaries and assert the
  DB-backed lockout activates regardless of cookie/session persistence (USR-RISK-006); attempt to
  create a duplicate username and to demote the organization's last remaining admin, and assert
  both are rejected via the real command path (USR-RISK-020); attempt to save a User missing a
  field declared required and assert server-side rejection with no client-side involvement in the
  test (USR-RISK-021).
- **Golden-output tests for the payroll pipeline**: known clock-in/out fixture data paired with
  exact expected hours/overtime totals, reproducing the documented formulas precisely once the
  overtime-formula and open-punch-policy sign-offs are confirmed; explicit fixtures for the
  "Incomplete" flag and for a multi-week period under the chosen overtime formula.
- **State-transition tests** covering every row of the Time Clock transition table
  (`workflows.md`), explicitly including a test that asserts the legacy wrong-id-space auto-close
  bug (USR-RISK-011) cannot occur — the command's own type signature should make the bug's input
  shape inexpressible, not merely behaviorally guarded.
- **Migration/data-integrity audit scripts** (not unit tests against new code) — run against the
  legacy system's live data to quantify how many Personal Day rows fall into the confirmed-
  truncated bucket (USR-RISK-004) and how many users have a non-1:1 legacy role assignment, before
  any migration decision is made about how to handle each.
