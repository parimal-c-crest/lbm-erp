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
