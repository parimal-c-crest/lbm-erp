# RAID Log

Risks, Assumptions, Issues, Dependencies — written to throughout the project by
`7-sprint-planning/1-sprint-planning.md` and `8-implementation/2-code-review.md`. Initialized empty.

| ID | Type | Description | Impact | Owner | Status | Raised |
|----|------|--------------|--------|-------|--------|--------|
| R-001 | Issue | EPIC-002 (Platform Administration / FEAT-015 skeleton control panel) has no detailed documentation and no defined generation path — `1-project/3-feature-breakdown.md` §10 only says it "generates its own documentation outside the per-module `5-modules/` JIT cycle when scheduled," with no owning prompt file identified yet. | Not blocking M1 (build order doesn't need it first) or M2 (not a UI-Design epic in the module sense); will block whenever tenant-provisioning infra is actually needed for real deployment. | Developer | Resolved | 2026-08-17 |
| R-002 | Risk | M1 released without a real deploy/production-verification pass (`10-release/1-release.md` steps 5-9) — no hosting/staging environment provisioned yet despite ADR-071 deciding on AWS eventually. Developer explicitly chose a local-only release over blocking on infra setup. | Real deployment behavior (env config, migrations running against a real host, actual production smoke test) stays unverified until hosting exists. Must be closed out before any milestone that assumes a live environment ships for real. | Developer | Open | 2026-08-18 |
| R-003 | Issue | `epics.md` shows EPIC-004/EPIC-005 (Users) Design Status as `Approved`, set 2026-08-18 when the module's JIT *documentation* set (`docs-kit/5-modules/users/`) was reviewed and promoted. That is a different gate from the Module Design-First Strategy's real one (`8-implementation/1-implement-task.md`) — a developer's live-browser review of the *built* mock UI pages, which don't exist yet until Sprint 3 (EPIC-004) completes. | If read at face value, the pre-existing `Approved` label would incorrectly let EPIC-005's Backend/API tasks pass sprint planning's Definition of Ready (step 6e) before the real pages exist to review. Sprint 3 flags this explicitly rather than trusting the label. | Developer | Open | 2026-08-18 |
| R-004 | Issue | All 17 EPIC-004 (Users UI Design) pages were built and Sprint 3 completed, but the Module Design-First Strategy's real developer-review-and-approve loop (`8-implementation/1-implement-task.md` steps 3-5 — live browser walkthrough, explicit sign-off) never happened: the developer went offline mid-session and explicitly directed continuing autonomously into EPIC-005 (Backend/API) without waiting for it. Every page was still verified via automated Playwright checks (real navigation, form submission, screenshot review) each task, catching 3 real bugs along the way, but that is not a substitute for the developer's own review. | EPIC-005's backend work proceeded without the normal gate confirming the UI actually matches what the developer wants — if the developer's eventual review requests changes, some backend wiring done against these exact pages may need rework. Flagged so this isn't silently presented as a completed, approved design later. | Developer | Open | 2026-08-18 |

---

# Revision History

| Date | Change |
|------|--------|
| 2026-08-17 | Initialized empty. |
| 2026-08-18 | R-001 resolved — design doc (`epic-002-platform-administration/1-design.md`) written, approved, fully implemented (T-022–T-028, all Done). R-002 opened — M1 released local-only, no real deploy target exists yet. |
| 2026-08-18 | R-003 opened during Sprint 3 planning — EPIC-004/005's `Approved` Design Status conflates documentation approval with the Design-First Strategy's real live-browser page-review gate. |
| 2026-08-18 | R-004 opened — Sprint 3 (EPIC-004) completed and work continued into EPIC-005 on the developer's explicit instruction, without the Design-First Strategy's live developer review/approval loop actually running. |
