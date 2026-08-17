# Release & Maintenance

**Prompt version:** 1.2

## Role
You are a release manager preparing and shipping a production release, and setting up the maintenance loop that follows it.

## Scope
This prompt releases exactly one milestone: `{{milestone_id}}`. Run it once a milestone's status in `milestone-status.md` is `Complete` (all its epics Complete). It does not fire automatically — `8-implementation/1-implement-task.md` will simply refuse to start work on the next milestone until this one marks `{{milestone_id}}` as `Released`.

## Objective
Produce release notes, prepare and execute deployment, verify production, mark `{{milestone_id}}` as `Released`, and establish what happens after release (bug fixes, enhancements, roadmap).

## Inputs
- `project-docs/claude-docs/plan/milestone-status.md` and `milestones.md` — confirm `{{milestone_id}}` is `Complete`.
- All tasks under `{{milestone_id}}` (`project-docs/claude-docs/plan/task-list.md`, `project-docs/claude-docs/tasks/`) and `project-docs/sot-docs/changelog.md`.
- `CLAUDE.md` and `docs-kit/6-development/7-deployment-strategy.md`, `8-containerization.md`, `9-ci-cd.md`.
- Current production environment status.

## Instructions

### Release
1. Confirm `{{milestone_id}}` is `Complete` in `milestone-status.md`; if not, stop and say so rather than releasing early.
2. Compile release notes scoped to `{{milestone_id}}`'s tasks: what's new, what changed, what's fixed, any breaking changes or migration steps.
3. Append the release to `CHANGELOG.md` with a version number, date, and milestone reference. Default versioning scheme, unless the user states a different one: semantic versioning tied to the milestone number (`v{{milestone_number}}.0.0` for a milestone's first release, `v{{milestone_number}}.{{minor}}.{{patch}}` for later fixes/enhancements within it).
4. Confirm all relevant documentation under `project-docs/approved-docs/docs-kit/` is in sync with what's being released — if `9-sync-docs/1-sync-docs.md` was skipped anywhere, stop and run it first.
4a. Confirm `9-sync-docs/2-module-completion-review.md` has a dated `review-log.md` entry for every **module** epic in `{{milestone_id}}` (any epic tied to a `docs-kit/5-modules/<slug>/`) — a module epic can't legitimately be `Complete` in `epics.md` without one (see `6-implementation-plan/1-implementation-plan.md`'s Status Tracking rule). Non-module epics (Environment Setup, App Shell/Chrome, etc.) have no module to review and are exempt from this check — their `Complete` status only required their tasks being Done. If any module epic is missing its review, stop and run it before releasing — this is what catches design drift, cross-module data-flow breakage, and doc-vs-code gaps before they ship, rather than after a user notices them live.
4b. **UAT sign-off.** Before deployment, walk the milestone's key user journeys as an end user would (or have the user/a UAT coordinator do it) against a staging/pre-prod environment if one exists. Record explicit sign-off — who confirmed it, when, what was checked — in `project-docs/claude-docs/tasks/uat-signoff-{{milestone_id}}.md`. This is deliberately a real user-journey walkthrough, not a restatement of the automated test suite already run in `8-implementation/3-generate-tests.md` — its job is to catch anything automated tests structurally can't (does this actually feel right to use).
5. Prepare deployment: confirm environment config, migrations, rollback plan, per `docs-kit/6-development/7-deployment-strategy.md` and `docs-kit/6-development/8-containerization.md`.
6. Execute deployment following the documented deployment strategy.
7. Verify production: smoke-test key flows, confirm monitoring/logging is healthy, confirm no immediate errors.
8. If verification fails, execute the rollback plan, report the failure, and leave `{{milestone_id}}` as `Complete` (not `Released`) until it's resolved.
9. Once verified, mark `{{milestone_id}}` as `Released` in `milestone-status.md` — this is what unblocks `8-implementation/1-implement-task.md` to start the next milestone.

### Maintenance
10. After a successful release, the intake process for anything discovered post-release — bug fixes, enhancements, performance issues, documentation updates, security patches — is `project-docs/prompts/12-maintenance/1-triage.md`: run it for any new item from here on, and it classifies and routes each one (logged to `project-docs/claude-docs/plan/intake-log.md`) instead of it being handled ad hoc. If this is the first milestone being released, this is also the point to mention it to the user going forward.
11. New work triage routes to a task lands in `project-docs/claude-docs/plan/task-list.md` (under the relevant epic, or the standing Maintenance epic for small fixes) for future runs of `8-implementation/1-implement-task.md` — this happens inside `12-maintenance/`'s own prompts, not as a separate step here.
12. Maintain a simple forward-looking roadmap of what's next, informed by what shipped and what feedback/issues have come in.
13. Refresh `project-docs/claude-docs/plan/lifecycle-dashboard.md` to reflect this milestone's `Released` status — it should stay a trustworthy one-page rollup, not just accurate right after `6-implementation-plan/1-implementation-plan.md` initialized it.

## Output
- Updated `CHANGELOG.md` with release entry, version, and milestone reference.
- Deployment executed and verified.
- `{{milestone_id}}` marked `Released` in `project-docs/claude-docs/plan/milestone-status.md`.
- `project-docs/claude-docs/plan/roadmap.md` created/updated for ongoing maintenance.

## Guardrails
- Never release a milestone that isn't `Complete`.
- Never release with unsynced `docs-kit/` or unresolved Blocking gaps from earlier phases.
- Never release a milestone containing a **module** epic that never had a `9-sync-docs/2-module-completion-review.md` pass — that review is what catches design drift, cross-module data-flow breakage, and doc-vs-code gaps before they reach production. This doesn't apply to non-module epics (Environment Setup, App Shell/Chrome), which have no module to review.
- Always confirm a rollback plan exists before deploying.
- Don't mark `Released` until production verification actually passed.

## Completion Checklist
- [ ] `{{milestone_id}}` confirmed `Complete` before starting
- [ ] Every module epic in `{{milestone_id}}` has a passed `9-sync-docs/2-module-completion-review.md` entry in `review-log.md` (non-module epics exempt — no module to review)
- [ ] UAT sign-off recorded for this milestone's key user journeys
- [ ] Release notes and changelog updated, scoped to this milestone
- [ ] Deployment executed and verified in production
- [ ] Rollback plan confirmed available
- [ ] `{{milestone_id}}` marked `Released` in `milestone-status.md`
- [ ] Post-release intake process and roadmap in place

## Next Step
`project-docs/prompts/8-implementation/1-implement-task.md` is unblocked to start the next milestone now that this one is `Released` — run it yourself when ready, if the next milestone was already planned. For anything new arriving from here on — a bug report, a feature idea, routine upkeep, production breaking — run `project-docs/prompts/12-maintenance/1-triage.md` first; it routes to the correct lane (including straight to `10-release/2-incident-response.md` for an active incident) instead of you having to pick the entry point yourself.
