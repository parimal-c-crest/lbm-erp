# Users — Entities & Fields (Field-Extraction Pass)

**Origin**: Extracted-from-existing-system (Origin 1). This document does not re-derive the field
catalog — it formally adopts `project-docs/sot-docs/raw/2-module-specs/Users/entities-and-fields.md`
as this module's field-extraction output, per `0-field-extraction.md`'s own trigger condition being
satisfied by prior work: that blueprint document already is an exhaustive, individually-listed,
never-grouped field catalog (31 entities, ~120 fields on the User Header alone) with a `Legacy
Trace` column citing the exact legacy table/column (or `vtiger_field` Studio label id) for every
field, produced by an eight-pass extraction effort against the live legacy `modules/Users/` source
and a read-only dev-DB snapshot (see that document's own `## Origin` section for the pass list).

**Confidence mapping**: the source blueprint doesn't use this document's exact
`Confirmed`/`Inferred`/`Underspecified` vocabulary, but carries an equivalent signal per field —
every field with a plain, unqualified `Legacy Trace` citation is `Confirmed`; every field whose
"Business Meaning" column contains an explicit "Open Question" note is `Underspecified` (17 such
fields, enumerated in the source's `## Known Gaps`); no field in this catalog is `Inferred` in the
sense of "deduced, not stated" — every row traces to a concrete schema column or `vtiger_field` row.

**Read**: `sot-docs/raw/2-module-specs/Users/entities-and-fields.md` in full for the entity list,
field catalog (31 entities), relationship summary, and Known Gaps section — reproduced here by
reference, not duplicated, to avoid transcription drift between two copies of the same 656-line
catalog.

## Coverage Statement

**Read for this pass**: the full `entities-and-fields.md` blueprint document (656 lines) plus its
own cited sources (`blueprint/module/Users/01-entities-fields.md` Pass 1,
`docs_from_blueprint/module/Users/02-entities-and-fields.md`).

**Not read for this pass** (and not read by the source blueprint either, per its own Known Gaps):
the legacy `DefaultDataPopulator.php` (likely source of the profile-baseline seed data referenced by
USR-RULE-048), the file governing `typeofhours` non-default-value writes (outside this module's
directory, never traced by any blueprint pass), and `vtiger_link_fuse5_sub_sharing`'s internals
(surfaced by table-name search only, never `DESCRIBE`'d). These gaps are carried forward as open
questions (see `open-questions.md`), not silently closed here.
