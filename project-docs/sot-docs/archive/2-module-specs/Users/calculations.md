# Users — Calculations

> Keep this file even if this module has no computed/derived logic — state that explicitly below
> rather than deleting the file. A missing file can't be told apart from "nobody got to it yet";
> an explicit "no calculation logic exists in this module" statement can't be. See
> `_deviations-from-original-template.md` in this folder for why.

Source: `docs_from_blueprint/module/Users/05-financial-pricing-logic.md`, itself from
`blueprint/module/Users/04-financial-pricing.md` ("Doc1 Pass 4"), design treatment from
`blueprint/module/Users/09-implementation-plan.md` §5 ("Doc2 §5").

## Applicability

This module has genuine computed/derived logic — applicable, not N/A. Users has no order/statement
pricing of its own; its structural equivalent (per the pattern established by SalesOrder's pricing
pipeline and other modules' finance-charge/aging pipelines) is **hours worked, overtime, and
pay-period aggregation**, computed from time-clock punch data and feeding the payroll report/export
(see `outputs.md`).

## Calculation Pipeline

### 1. Hours-worked calculation — elapsed time and its systemic undercount

**Formula (as documented)**: elapsed time is computed entirely in SQL — `SUM(TIME_TO_SEC(TIMEDIFF(
clock_out, clock_in)))` — implemented **identically eight separate times** across the two files
that render payroll reports/exports, not shared via a helper function.

**Guard clause and its direct business consequence**: both files apply an identical guard excluding
any row whose clock-out is still the sentinel "unset" timestamp value — this correctly prevents a
garbage negative duration from an open punch being summed in, but its consequence, given the Time
Clock's live 96%-open distribution (see `workflows.md`), is that **the vast majority of recorded
punches contribute zero hours to any payroll total** — a silent, systemic undercount affecting
nearly every punch in the system, not an edge case. Confirmed as the module's Master Risk Register
item R7 (see `risks-and-open-questions.md`).

**Rounding/formatting — two divergent conventions**: no rounding is applied to the underlying
seconds sum itself. Display formatting diverges between the two payroll files: one rounds the
displayed minute up by one whenever any seconds remainder exists; the other truncates the seconds
remainder with no rounding at all. A separate CSV-export decimal-hours conversion function
(minutes-of-60 converted to a fraction, rounded to 2 decimals) is used only for exported spreadsheet
rows.

### 2. Overtime calculation — two independently-implemented, materially divergent formulas

Overtime logic exists as two separate, non-shared implementations, with different trigger
conditions and configurability. Neither is a "daily overtime" rule — both are variants of *weekly*
overtime; no daily-overtime rule exists anywhere (confirmed by direct grep, not merely inferred
from silence).

- **Formula A (configurable-week-start rolling 40-hour bucket)**: an admin-configured setting names
  which day of the week the pay/overtime week starts on. Per user, iterating every date in the
  report range chronologically, hours accumulate into a running bucket that resets on the
  configured week-boundary day; overtime is the excess over a **hardcoded 40-hour threshold**
  computed once per reset — the threshold itself is not configurable, despite the week-start day
  being configurable.
- **Formula B (flat period-total-vs-40 comparison)**: compares the **entire report period's total
  hours** (not a per-week rolling bucket) against the same flat 40-hour threshold, with **no
  week-boundary concept at all**. For any report period longer than one week this is systematically
  wrong under a standard "40 hrs/week" policy — the source blueprint's own worked example: a
  bi-weekly period totaling 75 hours (37.5 hrs/week average, correctly zero overtime under Formula
  A) shows **35 hours of "overtime"** under Formula B for the identical underlying punches.

### 3. Pay-period aggregation

**No shared aggregation function exists** — both payroll files build and run their own inline SQL
`SUM()` queries directly, each independently resolving the tenant's configured pay-period setting
(weekly/bi-weekly/bi-monthly/monthly/custom-range) into a concrete date range via near-identical,
independently-maintained `switch` statements. One of the two files additionally supports a
prior/current/single-day/custom report-type override the other lacks — an inconsistent
feature-parity gap between two screens computing conceptually the same thing.

**`typeofhours` bucketing**: the payroll report is built from five independent per-type sums
(Regular/Holiday/Personal/Sick/Vacation Hours), each its own SQL query scoped to one hours-type
value. **No write site for a non-default hours-type classification exists anywhere in the module
itself** — the one confirmed write site lives entirely outside this module's scope and was never
read by any pass of the source blueprint (flagged as the single highest-priority follow-up read).
A separate legacy "payroll listing widget" ajax data-source file is confirmed **effectively dead**
— its entire computation/display body past an unused period-resolution switch is commented out.

### 4. Personal-day / time-off interaction with payroll — confirmed disconnected

Personal Day and Time Off entries are tracked in a completely separate table from clock punches. **No
aggregation path exists between the two tables** — the payroll report's Personal/Sick/
Vacation/Holiday-Hours columns are sourced entirely from `typeofhours`-classified time-clock
punches, not from anything submitted through the personal-day/time-off forms. The one function that
would bridge the two exists but is **dead code — never called anywhere** in the payroll report
file. A user or admin must separately "clock in as personal time" through an unrelated screen for
personal-day submissions to actually count toward payroll hours.

### 5. Editable time-card overrides — structurally unvalidated

Two admin/manager override screens allow direct editing of clock-in/out timestamps and status, with
**no derived hours/overtime recomputation triggered as a side effect** — payroll totals are always
computed fresh at report-view time from whatever's in the table, never cached/recomputed on edit.
**No numeric validation of the manually-entered hours exists** — a manager can set clock-out
earlier than clock-in, or an absurdly large gap, with no range check anywhere. One override screen
is timezone-aware (sets the timezone from the session's configured location before any date
arithmetic); its sibling has no equivalent, so the same raw timestamp can format/interpret
differently depending on which screen is used.

## Server-Side Recomputation Requirement

Any value derived by this pipeline must be recomputed server-side at every consuming step, never
accepted as caller-supplied input — the payroll report/export values in particular are always
computed fresh from the underlying time-clock rows at report-view/export time in the legacy system
(never cached from a prior edit), a property the new implementation must preserve deliberately
rather than assume by accident.

Per the source blueprint's design treatment (Doc2 §5), this pipeline is a **structural
requirement**, not an optional feature — one authoritative implementation, never duplicated:

- **One shared elapsed-time calculator, no sentinel-value guard needed.** Because the new Time
  Clock schema uses `NULL` (not a sentinel datetime) for an unset clock-out, an open punch is
  excluded from a completed-hours sum by a natural, correct predicate — not by eight independently-
  written queries each remembering to carry a defensive guard clause. Rounding convention: round to
  nearest minute — flagged for SME sign-off on whether this (or either legacy convention) is the
  intended business rule.
- **Open punches are a data-integrity error requiring resolution, not a silent exclusion.**
  **Recommended default**: an open punch spanning a payroll-report boundary (or exceeding a
  configurable max-shift duration) is surfaced as a distinct "Incomplete — requires resolution"
  state, and any payroll report/export covering an unresolved incomplete punch is flagged
  provisional/incomplete. The alternative — a tenant-configurable automatic-close policy — is a
  legitimate business decision some organizations may prefer, designed as an explicit, named,
  tenant-configurable policy rather than a silent default. **Both paths require SME/business-rule
  sign-off before this pipeline is built.**
- **One authoritative overtime formula, pending SME sign-off.** The rolling-week-bucket formula
  (Formula A) is **provisionally recommended** as the more structurally sound of the two, with the
  40-hour threshold itself made tenant-configurable. **Flagged as needing mandatory
  business-rule/SME sign-off before build** — this document does not silently pick one; getting it
  wrong has direct payroll/compliance consequences.
- **One pay-period resolver**, used by every report/export, with the fuller override-selector
  capability available uniformly rather than as an inconsistent feature-parity gap.
- **Personal Day / Time Off explicitly bridged to payroll, not left disconnected.** Submitting a
  personal-day/time-off entry triggers a corresponding time-clock record with the appropriate
  hours-type classification — a deliberate improvement over the legacy's disconnected two-system
  design.
