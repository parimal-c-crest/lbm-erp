# Users — Workflows

> Keep this file even if this module has no lifecycle/state behavior — state that explicitly below
> rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/Users/04-status-workflow.md`, itself from
`blueprint/module/Users/03-status-lifecycle.md` ("Doc1 Pass 3"), consolidated per
`blueprint/module/Users/08-consolidation-review.md` §3, with design treatment from
`blueprint/module/Users/09-implementation-plan.md` §4 ("Doc2 §4").

## Applicability

This module has genuine lifecycle/state behavior — applicable, not N/A. Unlike a module with one
overloaded status field, Users contains **five independent status-shaped concerns of materially
different character**, only one of which (Time Clock) is a real, actively-enforced, multi-writer
state machine warranting full transition-table treatment. The other four are documented at the
depth their own findings support: two are real-but-narrow (Account Status, Role/Profile
staleness), and two are confirmed **absent** despite superficially looking like state machines
(`is_login`, login lockout) — that absence is itself a load-bearing finding, not an omission.

## The five status-shaped concerns

### 1. Account Status (`status`: Active/Inactive) — real and enforced

Two values, hardcoded in the edit-form template — no backing picklist table exists. Write site: on
every save, unconditionally — if submitted and non-empty it passes through unchanged, otherwise
force-defaulted to `Active`, not just on create. No other write site exists (no admin
bulk-deactivate tool, no cron-driven auto-deactivation). **Enforcement is real and load-bearing**:
the login credential resolver sets the authenticated flag true only if status is not `Inactive` —
an Inactive user who supplies fully correct credentials, passes 2FA, and passes IP-restriction still
ends up unauthenticated (USR-RULE-022). Downstream consumer: the (confirmed dead) QuickBooks
employee-sync integration reads `status=='Active'` to set the pushed `isActive` flag.

### 2. `is_login` — a second status-shaped field that is pure audit exhaust

A distinct field from `status`. **Resolved: it is not enforced anywhere.** Only two write sites
exist (set 1 on login, 0 on logout, both unconditional/unguarded, raw string-interpolated SQL keyed
on username). **No read site was found anywhere** in the module that branches on this value. Live
data showed a plausible "who is currently logged in" snapshot, but since nothing reads it, it
functions purely as a write-only audit field.

### 3. Login Lockout — confirmed purely ephemeral, no persistent locked-out state

The session-scoped login-attempt counter (USR-RULE-017) only logs past 5 attempts and resets on any
successful login. A dedicated sweep of all 31 entities for any `locked`/`failedattempts`-shaped
column found **none anywhere** in this module's schema. The secondary "lockout password level" gate
(`logintoProtectedArea.php`) is a *different* concept — a per-action authorization re-check for
sensitive screens, not an account-lockout mechanism; it has no failure-counting or persistent-block
behavior of its own. **Conclusion: there is no persistent, DB-backed account-lockout state anywhere
in this module** — a deliberate absence, not a lockout state machine with a gap.

### 4. Role/Profile Assignment as a "state" — real but narrow staleness window

The privilege/sharing cache files regenerate synchronously and unconditionally on every save of the
target user (USR-RULE-012); module/field/action/sharing checks elsewhere read these cache files
fresh per request — **a role or profile change takes effect on the target user's very next
request, no re-login required**. One narrow exception: the user's role id is cached into a session
variable once, at login time; a small, specific set of three files read that session variable
directly rather than re-resolving per request — for exactly those features, a role change made
while the target user is logged in stays stale until their next login. `is_admin` was checked
separately and found not session-cached (every check re-reads the flag from the freshly-reloaded
user object in the paths examined; whether every request path reloads it fresh was not fully
confirmed — flagged open). Net finding: near-immediately effective for the primary permission-check
surface, with a narrow, specific staleness window — a real but small inconsistency, not a systemic
problem.

### 5. Time Clock — a real two-state machine

The one status-shaped field in this module that is both DB-enum-constrained *and* actively
read/written by multiple independent code paths. Given full transition-table treatment below.

## States

| State | Meaning |
|---|---|
| CLOCK IN | An open punch — clocked in, not yet clocked out. Live distribution: 651 of 681 rows (96%). |
| CLOCK OUT | A completed punch — both timestamps populated. Live distribution: 30 of 681 rows (4%). |

The heavily lopsided live distribution is itself a finding, with a direct downstream effect on
payroll totals (see `calculations.md`).

## Transitions

| From | To | Trigger | Guard Condition | Side Effects |
|---|---|---|---|---|
| *(none)* | CLOCK IN | User submits a clock-in ajax request | **None** — no check that the user doesn't already have an open CLOCK IN row for today before inserting a new one | New row inserted; two independently-implemented code paths write this transition, with different SQL-safety postures (one unparameterized, one parameterized) |
| CLOCK IN | CLOCK OUT | Client-initiated clock-out ajax request | **None** — keyed purely on the clock-record id from the request, with no check that it belongs to the requesting user, no check it's still open, and (in this specific path) no clock-out timestamp actually written | Status flip only; unparameterized SQL construction from a request-derived id |
| CLOCK IN | CLOCK OUT | Auto-clock-out safety net (fired after store-close) | Finds the current user's open CLOCK IN row for today | Status flip plus an explanatory note distinguishing a system-forced close from a user-initiated one |
| CLOCK IN | CLOCK OUT | A second, differently-named auto-clock-out path | **None** — and this path contains a confirmed bug: it reads a clock-record id from the request but then targets the update using the *User's own id* instead — two unrelated id spaces, so this either matches a coincidentally-numbered clock record or matches nothing | A confirmed defect, catalogued in the module's risk register (R9) |
| Any | Either state, arbitrary timestamps | Admin/manager time-card override screens | **None** — direct override of clock-in/out timestamps and status, no guard preventing an inconsistent state (e.g. a CLOCK OUT record with a blank clock-out timestamp); no numeric range validation (clock-out earlier than clock-in is possible) | Two independently-implemented override screens, one of which additionally applies timezone-aware date handling the other lacks |

### Adjacent sub-flow: "what are you working on" annotation — not a second state machine

A "what are you working on" annotation can be attached to a clock-in session, tagging it with
free-text or a Sales-Order/product/line-code link. Its own "Labor Status" field is written alongside
but has **no enum/allow-list validation** and no other confirmed write/read site — annotation
metadata riding alongside the clock-in state, not a second state machine.

### Related field found dead: `deliverystatus`

A field superficially resembling a sixth status-shaped concept — `vtiger_users`' live
delivery-clock status column (leading-space column name, Schema Drift #2). No write site anywhere
in the repo; all live users show the identical, unchanged default. **Conclusion: dead/unused
infrastructure**, not a live status field — see `entities-and-fields.md` Known Gaps. A separate
related field, "Pending Delivery Status" (`pdmstatus`), *is* written — by PendingDeliveries'
delivery-assignment logic, one-directionally into this User field (see `integrations.md`) — but no
reset-to-blank write site or confirmed consumer read site was found.

## State Diagram

```
Time Clock Record — the one real state machine in this module:

  (none) --clock-in ajax (no dup-open-punch guard)--> [CLOCK IN]

  [CLOCK IN] --client clock-out ajax (no ownership/open check)--> [CLOCK OUT]
  [CLOCK IN] --auto-clock-out safety net (finds user's own open row)--> [CLOCK OUT]
  [CLOCK IN] --second auto-clock-out path (confirmed wrong-id-space bug)--> [CLOCK OUT] (or no-op)

  [CLOCK IN] <--admin/manager time-card override (no range validation)--> [CLOCK OUT]
```

## New-implementation design treatment

Per the source blueprint's Doc2 §4, a new implementation should treat these five concerns
independently, not force them into one uniform model: **Account Status** carried forward as-is — a
real domain invariant on login, with the legacy default-to-Active-on-every-save behavior preserved
as a documented, deliberate default. **`is_login`** not ported as a separate field — a login-history
entity's own "most recent event has no logout timestamp yet" already expresses the same fact.
**Login lockout** designed as a **new**, real, persistent concept (a DB-backed failed-attempt
policy with a genuine time-boxed lockout window that survives session loss) — not carried forward,
since nothing exists to carry forward; a new requirement closing the confirmed gap (see
`risks-and-open-questions.md` R6). **Role/Profile staleness** closed by design: the
permission-check surface always resolves fresh per request; no session-cached role id anywhere in
the new design. **Time Clock** given a full command-based redesign: `NULL` (not a sentinel
datetime) for an unset clock-out, so nothing analogous to the legacy defensive guard clause is
needed; clock-out targets the record by a (user, record) composite, closing the ownership-check
gap; the auto-close command's only valid input is a domain-resolved record/user pair, structurally
preventing the legacy wrong-id-space substitution bug (R9).
