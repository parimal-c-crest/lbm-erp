# Business Rules — Users

# Document Information

| Field | Value |
|---|---|
| Module | Users |
| Version | 1.2 |
| Status | Draft |
| Author | Developer (AI-assisted) |
| Last Updated | 2026-08-18 |

---

# Revision History

| Date | Change |
|---|---|
| 2026-08-18 | Initial draft (v1.0). |
| 2026-08-18 | v1.1 — review pass: overtime formula locked to ADR-036 (flat US 1.5x/40hr, not the rolling-week-bucket "pending sign-off" v1.0 proposed); removed the non-existent "RecalculateSharingRules" background job (ADR-081); added ADR-075's 2FA rate-limit specifics; QuickBooks reframed as revived (ADR-074), not excluded. |
| 2026-08-18 | v1.2 — time-card override concurrency resolved to the standard project-wide lock (ADR-079/080/084), replacing the last-write-wins guess. |

---

# 1. Overview

**Purpose**: define this module's business rules and decision logic, independent of technical
implementation. **Business objectives**: close every confirmed defect from the legacy extraction
while preserving every genuinely-intended business behavior. **Scope**: all 66 rules catalogued by
the field-extraction pass (`module-field-extraction/users/business-rules.md`), reproduced below with
their new-system disposition.

---

# 2. Rule Categories

Save-orchestration · Entity-level (auth/save mechanics) · Auth/session/2FA · Privilege computation ·
Profile-save · Delete-family · CSV import validation · Time Clock (state) · Payroll calculations.
*(No sharing-rule category — dropped project-wide, ADR-081.)*

---

# 3. Business Rules

Rule IDs preserved from the source extraction (`USR-RULE-001`–`066`) for traceability — this
module's numbering is not restarted at `BR-001` since the field-extraction pass, `10-implementation-
plan.md`'s enforcement mapping, and `11-testing.md`'s test-naming convention all key off
`USR-RULE-###` directly.

## Headline finding (module-wide)

The legacy save/entity layer performs **zero** business-rule validation server-side; the one real
duplicate-username/last-admin guard that exists is never called from the real save path; none of the
four delete entry points validate their id before running destructive queries. **This document's
governing principle**: every rule below that legacy left as "no guard"/"client-side only" becomes a
real, server-side domain invariant in the new design — not carried forward as a gap.
[Source: `sot-docs/raw/2-module-specs/Users/business-rules-and-validation.md` Headline Finding]

## Full rule catalog

The complete 66-rule table (ID / Statement / Trigger / Scope / Severity / Confidence) is maintained
in `sot-docs/raw/2-module-specs/Users/business-rules-and-validation.md` §Business Rules and adopted
by reference in `module-field-extraction/users/business-rules.md`, to avoid a third
transcription of the same 66 rows. **New-system disposition for each rule group** is mapped in
`10-implementation-plan.md`'s Rule-to-Enforcement-Layer table (domain invariant / application
service / DB constraint / excluded), which this document treats as authoritative for "what changes
vs. what's preserved."

**BR-001 (worked example — the module's single highest-stakes rule group, USR-RULE-052–059,
Delete-family)**

- **Title**: Non-bypassable identifier validation on every delete command.
- **Description**: `deleteRole()`, `deleteProfile()`, `deleteUserFun()`, `deleteGroup()` — and their
  UI entry points — currently perform no validation on their id parameter before running
  destructive SQL. `deleteRole()`'s case was traced end-to-end as the confirmed root cause of a
  prior real data-loss incident: an empty/missing id flows past a parameterized lookup, the
  caller's own null-handling then constructs a second query whose `LIKE` pattern matches
  essentially every role, and every one of those roles' Profile/Role-Profile/Group-membership/
  Sharing-Rule rows is then unconditionally deleted.
- **Business Rationale**: an accidental or malicious empty delete request must never be able to
  wipe an unbounded set of records.
- **Trigger**: any delete request against User, Role, Profile, or Group.
- **Conditions**: id parameter present, non-empty, and resolves to an existing record; a valid
  transfer-target selected for members/dependents before the delete fires.
- **Expected Outcome**: request rejected before any query construction if the id is missing/invalid;
  otherwise, the target record and its owned dependents are deleted, with members reassigned to the
  transfer target.
- **Exceptions**: none — this is a hard, non-bypassable block by design (closes USR-RISK-001).
- **Related Requirements**: FR-002/003/004/005 (`2-functional-specification.md`).

The remaining 65 rules are enumerated in full in the source catalog (cited above); this document
does not re-narrate each one in BR-XXX prose form — their trigger/scope/severity/confidence columns
already carry that information, and duplicating it here in a different shape would risk the two
copies drifting.

---

# 4. Decision Tables

| Condition | Result |
|---|---|
| Delete request, id empty or malformed | Reject before query construction |
| Delete request, id valid, no transfer-target selected (Role/Profile/Group with dependents) | Reject — transfer-target required |
| Submitted role = the hierarchy's root Admin role (mirrors legacy's `H2`/President root) | `is_admin`-equivalent force-set true (preserves USR-RULE-005's intent, re-scoped to ADR-002's Role catalog, hierarchy kept) |
| Profile create, permission field absent from submitted form | Explicitly set to **denied** (closes the legacy fail-open default, USR-RULE-050) |
| Account Status = Inactive | Authentication denied regardless of correct credentials (preserves USR-RULE-022) |

---

# 5. Calculations

Full formulas in `sot-docs/raw/2-module-specs/Users/calculations.md` (field-extraction pass reads it
directly, see `module-field-extraction/users/business-rules.md` Coverage Statement). Summary:

- **Hours worked**: one shared elapsed-time calculator (`clock_out - clock_in`), `NULL` (not a
  sentinel timestamp) for an unset clock-out — an open punch is excluded from a completed-hours sum
  by a natural predicate, not a defensive guard clause repeated per query.
- **Overtime**: standard US rule — 1.5x pay for hours worked beyond 40 in a work week (**ADR-036**,
  already locked — flat, not tenant-configurable, not the rolling-week-bucket formula v1.0 of this
  document proposed as "pending SME sign-off" before this review pass checked decisions-log.md).
  Flagged only for HR/payroll sign-off if LBM's actual employment jurisdiction needs a different
  rule — not a design-level open question.
- **Pay-period resolution**: one shared resolver (weekly/bi-weekly/bi-monthly/monthly/custom),
  replacing two independently-maintained legacy `switch` statements.

---

# 6. State Transition Rules

**Time Clock** (the one real state machine in this module):

```
(none) --clock-in--> CLOCK IN --clock-out (client / auto-close / admin override)--> CLOCK OUT
```

Full transition table with guard conditions in `module-field-extraction/users/workflow.md` and
`sot-docs/raw/2-module-specs/Users/workflows.md`. **Allowed transitions**: `(none) → CLOCK IN`,
`CLOCK IN → CLOCK OUT` (three distinct triggers). **Restricted**: no transition skips CLOCK IN
directly to a second CLOCK IN without an intervening CLOCK OUT — the new design's clock-in command
checks for an existing open punch first (closes the legacy system's confirmed absence of that guard).

The other four status-shaped concerns (Account Status, the confirmed-dead `is_login` field,
confirmed-absent persistent login lockout, Role/Profile-assignment staleness) are documented at the
depth their own findings support in `workflow.md` — not forced into a transition-table shape that
doesn't fit them.

---

# 7. Workflow Rules

**Approval**: none confirmed in this module — no record type here has an approval lifecycle.

**Escalation**: N/A.

**Auto assignment**: N/A — role/group assignment is admin-driven, not auto-assigned.

**Notifications**: 2FA verification-code email (see `2-functional-specification.md` FR-001).

**Background processing**: auto-clock-out safety net; QuickBooks employee-sync job (revived, ADR-074,
async via BullMQ). *(v1.0 of this section referenced a "RecalculateSharingRules" background job —
that job doesn't exist in this design; Sharing Rules were dropped entirely, ADR-081.)*

---

# 8. Exception Rules

**Duplicate records**: duplicate username → rejected as a domain invariant + DB uniqueness
constraint (closes USR-RULE-001).

**Expired records**: 2FA codes expire after a 15-minute window; regeneration is rate-limited
(one new code per 60 seconds, plus a max-attempts window) — closes the legacy system's missing rate
limit (ADR-075).

**Invalid states**: a CLOCK OUT record with a blank clock-out timestamp is structurally
unrepresentable in the new schema (NULL-based design, see `4-schema.md`) — not merely guarded
against.

**Concurrency**: time-card overrides use the standard project-wide concurrent-edit lock (ADR-079/
080/084) — see `2-functional-specification.md` §11.

---

# 9. External Dependencies

QuickBooks employee sync — **revived**, async via BullMQ (ADR-074) — see `1-module.md` §11. No other
scheduled jobs/queues/webhooks beyond the auto-clock-out and permission-invalidation background work
already listed in `2-functional-specification.md` §6.

---

# 10. Assumptions

See `1-module.md` §14 and `2-functional-specification.md` §12 — consolidated for developer
confirmation, not decided silently here.

---

# 11. Constraints

See `1-module.md` §15.

---

# 12. Traceability

| Rule | Requirement | API | Test |
|---|---|---|---|
| USR-RULE-052–059 (Delete-family) | FR-002/003/004/005 | `DELETE /users/{id}`, `/roles/{id}`, `/profiles/{id}`, `/groups/{id}` | `11-testing.md` §9, negative tests for USR-RISK-001 |
| USR-RULE-022 (Account Status gate) | FR-001 | `POST /auth/login` | `11-testing.md` §7 |
| USR-RULE-050 (Profile fail-open default, closed) | FR-005 | `POST /profiles` | `11-testing.md` §9 |
| Full mapping | — | — | See `10-implementation-plan.md`'s rule-to-enforcement table for all 66 |

---

# 13. Related Documents

Module (`1-module.md`) · Functional Specification (`2-functional-specification.md`) · Validation
(`6-validation.md`) · Permissions (`7-permissions.md`) · API (`8-api.md`) · UI (`9-ui.md`) · Testing
(`11-testing.md`).

---

# AI Generation Notes

The 66-rule catalog is adopted by reference (not re-transcribed a third time) to avoid drift between
copies — `10-implementation-plan.md`'s enforcement-layer mapping is the authoritative "what's new vs.
preserved" translation layer for the full set. One worked BR-001 example given in full narrative
form (the delete-family, the module's highest-stakes finding) to demonstrate the template's intended
depth without mechanically repeating it 65 more times.
