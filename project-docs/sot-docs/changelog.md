# SoT Changelog

Populated by `prompts/5-update-sot/1-update-sot.md`. What was promoted or archived into the Source of Truth, when, and why.

## 2026-08-18 — First SoT update (initial run + Users module per-module run, combined)

This is the first execution of this prompt — it had not yet been run after the upfront categories
(`1-project`, `2-database`, `3-api`, `4-ui`, `6-development` early wave) were approved on 2026-08-17,
so that promotion and the Users module's own (2026-08-18) are both folded in together to bring the
index fully current, per this prompt's guardrail against leaving it partially updated.

**Promoted to `docs-kit/` and indexed as authoritative:**
- `1-project/` (4 docs) — approved 2026-08-17. See `review-log.md` rows 1-4.
- `2-database/` (4 docs) — approved 2026-08-17. New synthesis, no raw predecessor. See `review-log.md` rows 5-8.
- `3-api/` (10 docs) — approved 2026-08-17; `2-authentication.md` refreshed to v1.1 on 2026-08-18 (ADR-187, login identifier Email→Username, raised during Users module review). See `review-log.md` rows 9-16.
- `4-ui/` (8 docs) — approved 2026-08-17. Tokens sourced from reviewed Stitch mockup (ADR-177). See `review-log.md` rows 17-24.
- `6-development/` early wave (6 of 10 docs) — approved 2026-08-17. See `review-log.md` rows 25-31.
- `5-modules/users/` (11 docs) — approved 2026-08-18, after in-review correction (7 real conflicts found against 14 pre-existing Users-specific ADRs the v1.0 draft had not checked — most significantly a whole Sharing Rule subsystem designed for a feature ADR-081 had already dropped). See `review-log.md` rows 32-42.

**Archived (superseded raw material, moved whole and unmodified, never deleted):**
- `raw/1-business-requirements/project-overview.md` → `archive/1-business-requirements/project-overview.md` (superseded by `docs-kit/1-project/1-project-overview.md`)
- `raw/1-business-requirements/requirements.md` → `archive/1-business-requirements/requirements.md` (superseded by `docs-kit/1-project/2-requirements.md`)
- `raw/1-business-requirements/tech-stack.md` → `archive/1-business-requirements/tech-stack.md` (superseded by `docs-kit/1-project/4-tech-stack.md`)
- `raw/3-tech-stack-decision/tech-stack.md` → `archive/3-tech-stack-decision/tech-stack.md` (superseded by `docs-kit/1-project/4-tech-stack.md`; this was previously flagged as the more complete of the two duplicate tech-stack docs — both now superseded by the same authoritative doc, so the conflict is resolved, not just archived)
- `raw/2-module-specs/Users/*` (11 files) → `archive/2-module-specs/Users/` (superseded by `docs-kit/5-modules/users/*`)

**Not archived / still authoritative:**
- `raw/1-business-requirements/glossary.md`, `module-breakdown.md`, `non-functional-requirements.md`, `scope.md`, `stakeholders.md`, `assumptions-and-constraints.md` — no docs-kit equivalent exists yet (glossary and NFR doc are pending later phases: no `docs-kit` glossary was created during `1-project/` generation; `7-cross-cutting/1-non-functional-requirements.md` not yet generated).
- 17 remaining raw `2-module-specs/` module folders — each promotes only when that module goes through its own JIT documentation cycle (`5-modules/<module>/`), same as Users just did.

**Conflicts check:** no unresolved conflict found between the newly promoted documents and the
remaining SoT. The pre-existing duplicate-tech-stack-decision conflict (index item, `6-gap-analysis.md`
Conflicts #1 in the prior corpus) is now resolved as a side effect — both duplicates point to the same
authoritative `docs-kit/1-project/4-tech-stack.md`. The eventual-module-count numeric contradiction
(135→93 vs. "111 eventual") remains open, routed per this document's own tracking, not silently resolved.

**Glossary:** no `docs-kit` glossary exists to update (checked `docs-kit/1-project/`, none found). `raw/1-business-requirements/glossary.md` remains the authoritative glossary in full; no new terms from this batch required addition to it beyond what's already tracked in `decisions-log.md`.

## 2026-08-18 — UOM module per-module run (M3 foundation module, second module through the JIT cycle)

**Promoted to `docs-kit/` and indexed as authoritative:**
- `5-modules/uom/` (11 docs) — approved 2026-08-18, then amended in place three times same-session:
  ADR-190 (Group becomes fully immutable/undeletable once transaction-referenced, Name excepted),
  ADR-191 (Group name uniqueness is case-insensitive, checked on create and rename), ADR-192 (four
  bundled resolutions: optional `category_id` on Type, Base-Type role-resolution fallback, computed
  picking-hierarchy indicator, FunctionalRole delete guard). All originally-Blocking and
  Non-blocking field-extraction open questions (UOM-FX-OQ-001 through 008) are now resolved —
  `module-field-extraction/uom/open-questions.md` shows zero open items. See `review-log.md` for
  the full verdict trail across the original review pass and all three amendment rounds.
- `6-development/` late wave (4 of 10 docs: implementation-workflow, testing-strategy,
  deployment-strategy, debugging-guide) — approved 2026-08-18. **Process note**: this wave should
  have triggered after Users' module docs were approved (per `06-development/development.md`'s own
  trigger rule) but was missed at the time — caught and run now, informed by both Users' and UOM's
  already-approved module docs so Users' contribution isn't lost. `6-development/` is now complete,
  10 of 10. Two of its six open items were resolved with the developer this session (RTO 4 business
  hours / RPO 15 minutes as an approved default; UOM-unrelated ADR-066 debug-clone retention is
  manual-delete-only, no auto-expiry); four were explicitly deferred or confirmed-as-drafted
  (AWS service specifics, APM/log/CDN service choice, DR runbook detail level, solo-developer-plus-
  AI-assistant staffing model) — see `docs-kit/6-development/7-deployment-strategy.md` §12/§17/§21/
  §22 and `10-debugging-guide.md` §15/§20 for where these are recorded.

**Archived (superseded raw material, moved whole and unmodified, never deleted):**
- `raw/2-module-specs/UOM/*` (11 files) → `archive/2-module-specs/UOM/` (superseded by
  `docs-kit/5-modules/uom/*`). Note UOM's own provenance caveat carries forward: this raw material
  was itself session-sourced/lower-rigor (no independent vtiger module, no Pass-7 re-verification —
  see the archived `module-overview.md`'s own Origin section), not a full blueprint-pipeline module
  the way Users was.

**Not archived / still authoritative:**
- 16 remaining raw `2-module-specs/` module folders — each promotes only when that module goes
  through its own JIT documentation cycle, same as Users and UOM just did.
- `raw/1-business-requirements/glossary.md`, `module-breakdown.md`, `non-functional-requirements.md`,
  `scope.md`, `stakeholders.md`, `assumptions-and-constraints.md` — unchanged from the prior entry.

**Conflicts check:** no unresolved conflict found between the newly promoted documents and the
remaining SoT. UOM's field-extraction pass surfaced an internal inconsistency in ADR-096 itself
(Decision text said conversion-factor history keys "at the UOM Type level," but the entity it
tracks is keyed per Group+Type) — resolved with the developer and recorded as a same-session
Amendment note under ADR-096 in `decisions-log.md`, not routed back to gap-analysis since it was a
same-session, immediately-resolved drafting-time catch rather than a standing unresolved conflict.

**Glossary:** no new terms required addition — UOM introduces module-internal entity names
(`UOMFunctionalRole`, `UOMTypeFactorHistory`, etc.) already fully defined within
`docs-kit/5-modules/uom/` itself; none are cross-cutting terms the project-wide glossary needs.

## 2026-08-19 — Location module per-module run (M3 foundation module, third module through the JIT cycle)

**Promoted to `docs-kit/` and indexed as authoritative:**
- `5-modules/location/` (11 docs) — approved 2026-08-19. Field-extraction surfaced 3 Blocking open
  questions (B-1 reorder-formula unrecoverable, B-2 uncatalogued field, B-3 undefined delete
  behavior), all resolved with the developer and locked as ADR-196 (fresh reorder-point formula)
  and ADR-197 (no hard delete, Active/Inactive toggle only). Drafting the 11 documents then
  surfaced 10 further `[NEEDS INPUT]` items, bundled and resolved as ADR-198. `11-testing.md` was
  initially rejected on review (missing template-required §8 UI Tests section, a mis-numbered extra
  section, and one ADR-198 resolution — the 14-day Avg Lead Time fallback — never applied to
  TC-019); fixed in place and approved same session. See `review-log.md` for the full verdict
  trail.
- `6-development/` late wave (4 docs: implementation-workflow, testing-strategy,
  deployment-strategy, debugging-guide) — updated to v1.1, folding in Location's implementation
  phasing, cross-module chain tests, and stock-discrepancy debugging checklist alongside Users' and
  UOM's existing content. Approved 2026-08-19.

**Archived (superseded raw material, moved whole and unmodified, never deleted):**
- `raw/2-module-specs/Location/*` (11 files) → `archive/2-module-specs/Location/` (superseded by
  `docs-kit/5-modules/location/*`). Field-extraction adaptation used this raw blueprint directly as
  Origin 1 source material, per this project's standing practice of reusing an already-exhaustive
  legacy extraction rather than re-reading live legacy code/DB from scratch.

**Not archived / still authoritative:**
- 15 remaining raw `2-module-specs/` module folders — each promotes only when that module goes
  through its own JIT documentation cycle, same as Users, UOM, and Location just did.
- `raw/1-business-requirements/glossary.md`, `module-breakdown.md`, `non-functional-requirements.md`,
  `scope.md`, `stakeholders.md`, `assumptions-and-constraints.md` — unchanged from the prior entry.

**Conflicts check:** no unresolved conflict found between the newly promoted documents and the
remaining SoT. Location's nav placement (moving from top-level sidebar into Settings, matching
UOM's own precedent) was locked as a new decision, ADR-195, before this module's JIT cycle began —
`4-ui/1-navigation.md`'s top-level-item count is now stale (still shows 10, and never got updated
for UOM's own Settings move either) — flagged as a known, pre-existing gap, not resolved here since
`4-ui/` documents are only updated via their own draft→review→promote flow, not as a side effect of
a module's own JIT cycle.

**Glossary:** no new terms required addition — Location introduces module-internal entity names
(`ProductAtLocation`, `LocationAccountingConfig`, etc.) already fully defined within
`docs-kit/5-modules/location/` itself; none are cross-cutting terms the project-wide glossary needs.
