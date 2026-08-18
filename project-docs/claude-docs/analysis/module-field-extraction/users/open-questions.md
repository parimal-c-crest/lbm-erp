# Users — Open Questions (Field-Extraction Pass)

**Origin**: Extracted-from-existing-system (Origin 1). Adopted from
`project-docs/sot-docs/raw/2-module-specs/Users/risks-and-open-questions.md`'s `## Open Questions`
table (19 items, `USR-OQ-001`–`USR-OQ-019`) and `entities-and-fields.md`'s Known Gaps (17 ambiguous
field-meaning pairs), re-flagged here per this document's Blocking/Non-blocking convention.

**2026-08-18 update**: 3 items below (`USR-OQ-012/013/019`) were closed as moot, and 1
(`USR-OQ-014`) resolved, once the module's 11 documents went through review against
`decisions-log.md`'s pre-existing ADR-074 (QuickBooks revived) and ADR-081 (Sharing Rules dropped
entirely) — neither had been checked when this file was first written.

## Blocking

**None.** No open item blocks drafting this module's 11 documents at a design level — every item
below is either a narrow field-meaning ambiguity carried forward as a documented assumption, or a
build-time (not documentation-time) sign-off already scheduled in
`sot-docs/raw/2-module-specs/Users/build-guidance.md` Phase 1 ("Resolve blocking open decisions").
This module's own blueprint explicitly separates "needs SME sign-off before *build*" from "blocks
*documentation*" — the payroll overtime-formula and open-punch-policy questions are the former, not
the latter, and are written up as explicit, flagged decisions in `calculations.md` rather than
silently resolved either way.

## Non-blocking (carried forward into the generated 11 documents as documented open items)

| ID | Question | Carried into |
|---|---|---|
| USR-OQ-001 | 17 ambiguous field-meaning pairs (Job Title vs. Title, etc.) — real distinction or legacy duplication? | `4-schema.md`, `5-data-dictionary.md` |
| USR-OQ-002 | Is a specific clock-out ajax action still live, or superseded by auto-clock-out? | `9-ui.md` (Time Clock screens) |
| USR-OQ-003 | What file writes non-default `typeofhours` classification? | `calculations.md` reference, `10-implementation-plan.md` (flagged follow-up read) |
| USR-OQ-004 | What drives the payroll listing widget now that its source is dead? | `9-ui.md`, `11-testing.md` (exclude from test scope) |
| USR-OQ-005 | Barcode-label ZPL: what happens for a non-default "environment" value? | `8-api.md`/`9-ui.md` (Barcode Label output) |
| USR-OQ-006 | Does Clock-In Task Detail's "Labor Status" have a confirmed enum? | `4-schema.md`, `6-validation.md` |
| USR-OQ-007 | Could the role/profile staleness finding be narrower/broader than documented? | `7-permissions.md` |
| USR-OQ-008 | Can admin time-card override reach another user's record by id? | `7-permissions.md`, `11-testing.md` (negative test candidate) |
| USR-OQ-009 | Do the SQL-injection sites have an access-control layer above the ajax dispatcher? | `7-permissions.md` (assume no, worst case, per source) |
| USR-OQ-010 | Is the dev-snapshot Personal Day truncation finding also true in production? | `10-implementation-plan.md` (migration audit script) |
| USR-OQ-011 | What does the shared settings-lookup toggle function actually do? | `2-functional-specification.md` (assumed key/value lookup, not independently confirmed) |
| USR-OQ-012 | Were the 6 QuickBooks GL-mapping fields' `tabid=0` bindings re-verified live? | Moot — the legacy GL-mapping columns aren't carried forward regardless; the sync itself uses a new, purpose-built pointer table (`quickbooks_sync_pointers`, `4-schema.md`), not the legacy columns this question was about |
| USR-OQ-013 | `vtiger_link_fuse5_sub_sharing`'s relationship to the 9 sharing-rule tables? | **Moot** — the whole Sharing Rule mechanism is dropped project-wide (ADR-081), so this table and its relationships have no successor in the new design |
| USR-OQ-014 | Should QuickBooks employee sync be treated as live for the rewrite? | **Resolved** — revived, not excluded (ADR-074, decided after this open-questions pass was first written) — `1-module.md`, `2-functional-specification.md` FR-013 |
| USR-OQ-015 | What did the hours-sum queries compute before the current guard clause? | Not carried forward — historical curiosity, explicitly non-blocking per source |
| USR-OQ-016 | Un-zero-padded-hour risk in one overtime formula's string parsing? | `calculations.md` (flagged before overtime formula finalized) |
| USR-OQ-017 | Is the payroll CSV export actually reachable from the current UI? | `9-ui.md`, `outputs.md` reference |
| USR-OQ-018 | Shared field-picker/export engine's full internal mechanics? | Out of scope unless that shared mechanism itself is rewritten |
| USR-OQ-019 | Sharing-rule precedence/conflict-resolution logic inside the privilege engine? | **Moot** — the whole Sharing Rule mechanism is dropped project-wide (ADR-081); there is no precedence/conflict-resolution logic to build, so nothing to answer |

Plus: whether an outer module-action-routing layer independently enforces `is_admin` before any of
the 7 admin-screen files is reached — the single largest open question in `permissions.md`, carried
into `7-permissions.md` as an explicit gap, not assumed resolved.

## Coverage Statement

**Read for this pass**: `risks-and-open-questions.md` (101 lines) in full, `entities-and-fields.md`
Known Gaps section, `permissions.md` Open Items section, `outputs.md` Output Open Items section —
all open-question sources across the blueprint's 11 documents cross-checked for completeness.

**Not read**: none of these items required additional reading beyond the blueprint itself to
classify as Blocking/Non-blocking — the classification is a judgment call on documentation-readiness
vs. build-readiness, made directly against the blueprint's own stated scope for each item.
