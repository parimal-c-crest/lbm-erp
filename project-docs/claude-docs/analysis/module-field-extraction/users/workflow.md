# Users — Workflow (Field-Extraction Pass)

**Origin**: Extracted-from-existing-system (Origin 1). This document formally adopts
`project-docs/sot-docs/raw/2-module-specs/Users/workflows.md` as this module's workflow
field-extraction output. This module has genuine lifecycle/state behavior (not N/A) — five
status-shaped concerns, of which one (Time Clock) is a real, actively-enforced two-state machine
with a full transition table (states, triggers, guard conditions citing the enforcing rule id, side
effects); the other four are documented at the depth their own findings support, including two
confirmed **absences** (`is_login`, persistent login lockout) that are themselves load-bearing
findings, not omissions.

**Read**: `sot-docs/raw/2-module-specs/Users/workflows.md` in full — states, transitions, guard
conditions (each citing its enforcing `USR-RULE-###`), and the state diagram, not reproduced here.

## Coverage Statement

**Read for this pass**: `workflows.md` (139 lines) in full, cross-referenced against
`business-rules-and-validation.md` for every guard condition's cited rule id (all resolve).

**Not read**: whether every request path reloads the `is_admin` flag fresh (vs. some path caching
it) was flagged open in the source document itself — not independently re-verified here.
