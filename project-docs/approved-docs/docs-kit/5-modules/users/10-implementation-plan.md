# Implementation Plan — Users

# Module

Users

# Status

Planning (v1.1 — see Revision History)

# Dependencies

Schema (`4-schema.md`) · API (`8-api.md`) · Permissions (`7-permissions.md`) · Validation
(`6-validation.md`) — all Draft, pending review/approval before implementation starts.

---

# Rule-to-Enforcement-Layer Mapping

Adopted from `sot-docs/raw/2-module-specs/Users/build-guidance.md` (all 66 rules mapped, none
omitted) — reproduced in summary; full table at that source. **Note**: the source blueprint's own
`RecalculateSharingRules`/Sharing-Rule-computation groupings (rule IDs 045–047, 060–061 in its
original framing) are re-scoped below — Sharing Rules themselves don't exist in this design
(ADR-081), but the underlying rule IDs still map to real permission-computation work (privilege
read-model resolution), just without any sharing-rule-specific machinery.

| Rule group | Rule IDs | Suggested primary layer |
|---|---|---|
| Save-orchestration | USR-RULE-001–012 | Domain invariant (001–004) / Application service (005–012) |
| Entity-level | USR-RULE-013–026 | Domain invariant / Excluded (014, dead) / Application service |
| Auth/session/2FA | USR-RULE-027–044 | Domain invariant / Application service / Excluded (037, 043) |
| Permission-computation | USR-RULE-045–047 | Domain invariant / Application service — role→profile permission resolution only, no sharing-rule layer (ADR-081) |
| Profile-save | USR-RULE-048–051 | Application service / Domain invariant |
| **Delete-family (highest-stakes)** | USR-RULE-052–059 | Domain invariant — one shared identifier-validation boundary (ADR-154) |
| Background jobs | USR-RULE-060–061 | Application service — re-scoped to the auto-clock-out safety net and QuickBooks sync (ADR-074); the legacy `RecalculateSharingRules` job itself has no equivalent (ADR-081) |
| CSV import validation | USR-RULE-064–066 | Domain invariant / Application service |

---

# Task Breakdown

## Phase 1 — Confirm already-locked policy decisions before dependent work starts

**Not open decisions — already resolved in `decisions-log.md`, listed here only so implementation
has one checklist confirming each was actually read before the phase it gates starts** (v1.0 of
this plan incorrectly treated several of these as still-open "pending SME sign-off" items):

- Password complexity + lockout policy: ADR-155 (min 8 chars/1 upper/1 lower/1 number; 5 attempts →
  15-min lockout).
- Overtime formula: ADR-036 (flat US 1.5x over 40hrs/week, not tenant-configurable).
- Open/unclosed punch handling: ADR-037 (explicit "unclosed punch" state requiring manager
  resolution, never silent exclusion).
- 2FA policy: ADR-075 (per-role, Admin-configurable, rate-limited regeneration, conditional-
  required Email).
- Sharing Rules: ADR-081 (dropped entirely — do not build).
- QuickBooks: ADR-074 (revived — do build, async via BullMQ).
- Payroll CSV export: ADR-078 (deferred past MVP — do not build in this phase).
- Role-edit consolidation: ADR-134 (one save path, no orphaned Profile rows).

**Verify**: a decision log, one line per item above confirming it was read and applied, checked in
before Phase 2 starts.

## Phase 2 — Database

- Create migration for all entities (`4-schema.md`) — no Sharing Rule tables (ADR-081)
- Create indexes (`4-schema.md` §7)
- Seed data: ADR-002's 5 tenant-facing roles + default Profile template

**Verify**: migrations run clean; a unit test proving the identifier value-object rejects empty/
malformed input is the first test written for this module, before any command depending on it.

## Phase 3 — Backend: Auth/session/RBAC core

- Models/services for User, Role (hierarchical), Profile, Group
- Authentication (login by Username, logout, password-change collapsed to one command, per-role
  2FA per ADR-075, IP-restriction)
- New login-attempt/lockout policy (ADR-155)
- Permission-computation read model — real per-request resolution, no file cache, no sharing-rule
  layer (ADR-081)

**Verify**: integration tests cover every rule id in the auth-related groups; a test proving an
Inactive-status user cannot authenticate regardless of correct credentials; a test proving a
permission-read-model reflects a role change on the very next request. **This phase's output is the
hard prerequisite every other module's own authorization testing needs.**

## Phase 4 — Backend: Delete-family & security hardening

- Four delete commands (User/Role/Profile/Group) through the Phase 2 identifier-validation boundary
  (ADR-154)
- Parameterized-query-only data access for the confirmed-injection-prone paths (clock-in/out,
  personal-day submission) even though their owning commands aren't built until Phase 6

**Verify**: negative test reproducing the exact empty-role-identifier legacy failure mode, asserting
rejection; negative tests for each confirmed injection payload.

## Phase 5 — Backend: Groups/Profiles/Role-hierarchy administration

- Profile save — one consolidated Role-edit save path, no orphaned Profile rows (ADR-134), every
  permission explicitly set, denied unless granted (ADR-156)
- Role hierarchy management — reparenting + depth recomputation (`4-schema.md`)
- Group management (assignment/roster only, no sharing-actor role — ADR-081)

**Verify**: tests confirming every permission is explicitly set on Profile creation (no fail-open);
a test confirming Role edit never leaves an orphaned Profile row (ADR-134); reparenting tests
confirming `depth` recomputes correctly for the moved Role and all descendants.

## Phase 6 — Backend: Time Clock

- Full transition table (`3-business-rules.md` §6), including the `labor_status` enum (ADR-077)

**Verify**: state-transition tests covering every row; a type-level test proving the auto-close
command cannot target the wrong id space (closes USR-RISK-011).

## Phase 7 — Backend: Payroll pipeline

- Hours-worked calculator, overtime (flat US 1.5x/40hr, ADR-036 — no formula selection needed),
  unclosed-punch handling (ADR-037), Personal-Day→hours-classification bridge
- **No CSV/ZIP export in this phase** (ADR-078, deferred past MVP) — on-screen report only

**Verify**: golden-output tests reproducing ADR-036's formula exactly; a test proving a report
covering an unclosed punch is flagged, never silently computed as if the hours didn't exist
(ADR-037).

## Phase 8 — Frontend

- List/Create/Edit/Detail pages (User, Role — with hierarchy tree picker, Profile, Group)
- Time Clock widget, Payroll Report (no export button, ADR-078), Personal Day/Time Off forms, CSV
  Import wizard, per-role 2FA-requirement config screen (ADR-075)
- Reuse `Badge`, `FormField`, dropdown/sheet primitives already built in the App Shell (T-013–T-021)

## Phase 9 — Outputs, QuickBooks & remaining cross-module surface

- Output catalog (barcode label — payroll/time-card exports excluded from this phase, ADR-078)
- Mail Account/Notification Scheduler/Word Template administration
- **QuickBooks employee sync — build it** (ADR-074 already confirms revival; v1.0 of this plan
  incorrectly gated this phase on "SME review confirms revival intent," which was already resolved)

**Verify**: snapshot tests for each output type; integration test confirming a User save enqueues
and completes a QuickBooks sync.

## Phase 10 — Testing & Documentation

- Full test suite per `11-testing.md`
- API documentation (OpenAPI, generated from NestJS decorators per project convention)

---

# Checklist

- [ ] Schema (`4-schema.md` reviewed/approved)
- [ ] Validation (`6-validation.md` reviewed/approved)
- [ ] API (`8-api.md` reviewed/approved)
- [ ] UI (`9-ui.md` reviewed/approved)
- [ ] Tests (`11-testing.md`)
- [ ] Phase 1 decision log checked in (confirming, not deciding — all 8 items already locked)
- [ ] All 66 rules mapped to an enforcement layer (this document, above)
- [ ] Every Critical/High risk has an explicit mitigation (see below)

---

# Security-by-Construction: mitigation for every Critical/High risk

Adopted from `sot-docs/raw/2-module-specs/Users/build-guidance.md` — 22 of 22 Master Risk Register
findings addressed. Summary of the two Critical + six High:

- **USR-RISK-001 (Critical)** — shared `EntityIdentifier` value object rejecting empty/malformed
  input at construction, applied at every command accepting an entity identifier (ADR-154).
- **USR-RISK-002/003 (Critical/High)** — parameterized queries/ORM by default, no raw-string escape
  hatch, for clock-in/clock-out/personal-day commands.
- **USR-RISK-004 (High)** — Personal Day owner as a real FK in the new schema.
- **USR-RISK-005 (High)** — password complexity as a domain invariant at every password-set call
  site, no disable toggle — **min 8 chars/1 upper/1 lower/1 number, ADR-155**.
- **USR-RISK-006 (High)** — DB-backed failed-attempt lockout policy, survives session loss —
  **5 attempts → 15-minute lockout, auto-unlock, ADR-155**.
- **USR-RISK-007 (High)** — open punches as an explicit "unclosed, needs resolution" state —
  **ADR-037, already resolved, not pending**.
- **USR-RISK-008 (High)** — one authoritative overtime formula — **flat US 1.5x/40hr, ADR-036,
  already resolved, not pending**.

---

# Risks

Full register: field-extraction `module-field-extraction/users/business-rules.md` cross-reference,
`sot-docs/raw/2-module-specs/Users/risks-and-open-questions.md`. Two findings flagged by the source
extraction as needing legacy-system remediation **now**, independent of this rewrite (USR-RISK-001,
USR-RISK-002) — outside this plan's own scope to action against the legacy system, noted so it
isn't lost.

---

# Revision History

| Date | Change |
|---|---|
| 2026-08-18 | Initial draft (v1.0). |
| 2026-08-18 | v1.1 — review pass found this plan's own Phase 1 had incorrectly treated 8 already-locked ADRs as open "pending SME sign-off" decisions (password/lockout policy ADR-155, overtime ADR-036, open-punch handling ADR-037, 2FA ADR-075, Sharing Rules ADR-081, QuickBooks ADR-074, payroll export ADR-078, role-edit consolidation ADR-134). Phase 1 rewritten from "resolve decisions" to "confirm already-resolved decisions were read." Phase 5 renamed (no Sharing-Rule administration). Phase 9's QuickBooks gate removed — it's already confirmed to build, not conditional. |

---

# AI Generation Notes

Phase structure and security mitigations adopted from the source blueprint's own build-guidance
document, corrected against this module's own set of 14 pre-existing locked ADRs that v1.0 of this
plan never checked (see `1-module.md`'s Revision History for the full list). This document is the
clearest illustration of the process gap: a "Phase 1 — resolve blocking decisions" section that
treats already-decided questions as open is worse than no such section at all, since it actively
tells a future implementer there's a decision left to make when there isn't.
