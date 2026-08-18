# Validation Rules — UOM

# Document Information

| Field | Value |
|--------|-------|
| Module | UOM |
| Version | 1.0 |
| Status | Draft |
| Author | Claude Code (docs-kit generation) |
| Last Updated | 2026-08-18 |

---

# 1. Overview

**Purpose**: define every validation rule gating UOM's writes, at the field, cross-field, and
business level.

**Scope**: Category/Type/Functional Role/Group/Role Assignment/Conversion Factor/Picking Hierarchy
create/update; the bulk import path (FR-011).

**Validation philosophy**: reject fast, at the point of write, with a specific error naming the
offending field/record — never a silent coercion or a partially-applied save. Group save validation
(VR-010, VR-011) is the module's signature design choice: prevent an inconsistent configuration
state from ever being saved, rather than handling it defensively at every later read (BR-019).

---

# 2. Validation Categories

- Required Fields (VR-001–VR-004)
- Format Validation (VR-005–VR-007)
- Range Validation (VR-006, VR-013)
- Cross-Field Validation (VR-008, VR-009, VR-014)
- Business Validation (VR-010–VR-016, VR-018, VR-019, VR-020)
- Import Validation (VR-017)

---

# 3. Field Validation

| Field | Rule | Error Message |
|--------|------|---------------|
| `UOMCategory.name` | Required, max 255 chars, unique (among non-deleted) | "Category name is required and must be unique." |
| `UOMType.name` | Required, max 255 chars, unique (among non-deleted) | "Type name is required and must be unique." |
| `UOMFunctionalRole.name` | Required, max 255 chars, unique (among non-deleted) | "Role name is required and must be unique." |
| `UOMGroup.name` | Required, max 255 chars, unique (among non-deleted), **case-insensitive** comparison, checked on both create and rename (VR-019) | "Group name is required and must be unique." |
| `UOMGroup.base_type_id` | Required, must reference an existing, non-deleted `UOMType` | "A Base Type is required to save this Group." |
| `UOMConversionFactor.units_per_base` | Required, positive, whole number | "Conversion factor must be a whole number greater than zero." |
| `UOMPickingHierarchy.sort_order` | Required, non-negative integer | "Sort order is required." |
| `UOMTypeFactorHistory.effective_from` | Required, valid date | (system-generated — not user-submitted; validation applies to the write path, not a user-facing form) |

---

# 4. Cross-Field Validation

- **VR-008** — `UOMRoleAssignment` uniqueness: (`group_id`, `role_id`) must not already exist for
  another row (BR-011).
- **VR-009** — `UOMConversionFactor` uniqueness: (`group_id`, `type_id`) must not already exist for
  another row (BR-006).
- **VR-014** — `UOMPickingHierarchy` uniqueness: (`group_id`, `type_id`) and (`group_id`,
  `sort_order`) must each be unique (BR-012).

---

# 5. Business Validation

- **VR-010** — **Group-save completeness**: for every `UOMRoleAssignment` that will exist after this
  save, if its Type is not the Group's own Base Type, a `UOMConversionFactor` row must already exist
  or be submitted in the same save for that (Group, Type) pair — otherwise reject the entire save,
  naming the Type/Role that's missing a factor (BR-019).
- **VR-011** — **Base-Type-is-smallest-unit**: every submitted non-Base `units_per_base` value must
  be a positive whole number (BR-003) — this is the concrete, implementable proxy for the
  smallest-unit invariant (see `3-business-rules.md` BR-003's Confidence note on the deeper,
  Underspecified enforcement question).
- **VR-012** — **Referenced record exists**: every `category_id`, `base_type_id`, `role_id`,
  `type_id` submitted must reference an existing, non-deleted record.
- **VR-013** — **Record is active**: a soft-deleted Category/Type/Functional Role/Group cannot be
  referenced by a new Role Assignment, Conversion Factor, or Picking Hierarchy row.
- **VR-015** — **In-use delete guard**: a delete request for a Category/Type/Functional Role/Group
  referenced by any dependent row is rejected — enforced at the database level (`RESTRICT`, BR-014),
  surfaced to the caller as a clear "still in use" validation error rather than a raw constraint-
  violation message.
- **VR-016** — **User owns the record**: not applicable — no per-user ownership model exists for any
  UOM entity (`permissions.md` §Ownership / Record-Level Rules in the legacy source, carried
  forward: "any permitted user can edit any row, not just their own").
- **VR-018** — **Transaction-reference lock (ADR-190, BR-020)**: before a `UOMGroup` update or delete
  commits, the write path checks whether the target Group has at least one transactional reference
  (any consuming module's `uom_group_id`-bearing transaction row — see `4-schema.md` §9's
  Transaction-Reference Lock Check). Three distinct outcomes:
  - **Name-only edit on a used Group**: **allowed** — no lock check blocks a submitted update whose
    only changed field is `name`.
  - **Any other field edit on a used Group**: **rejected** — the update is refused before commit if
    the submitted payload changes any field besides `name` and the Group has a transactional
    reference.
  - **Delete on a used Group**: **always rejected** — no exception, regardless of which fields would
    otherwise be affected.
  - **Any edit or delete on an unused Group** (zero transactional references): **allowed**, subject
    only to the module's other validation rules (VR-001–VR-015) — this lock check must not block the
    still-valid unused-Group delete/edit path.
- **VR-019** — **Group Name uniqueness is case-insensitive, checked on create and rename (ADR-191,
  BR-001)**: a submitted `UOMGroup.name` is compared to every other non-deleted Group's name
  case-insensitively (`lower(submitted) = lower(existing)`); a match against a *different* Group is
  rejected as a duplicate. This check runs on **every** write to `name` — both Group create and
  Group rename — not just initial creation, since Group Name stays editable indefinitely per
  ADR-190/BR-020. It is independent of, and runs alongside, VR-018's transaction-reference lock:
  renaming a used Group's Name is otherwise allowed under VR-018 (Name is the sole editable field on
  a locked Group), but VR-019 still applies to that rename — a used Group's Name cannot be renamed to
  a case-variant duplicate of a **different** Group's name. Renaming a Group's Name to its own
  current name in a different casing (e.g. "Test" → "TEST") is **not** a duplicate of a different
  Group and is allowed by VR-019 (it may still be rejected or allowed independently per VR-018,
  depending on whether the Group is used — but not for a VR-019 uniqueness reason).
- **VR-020** — **Functional Role in-use delete guard confirmed (ADR-192, BR-014)**: a delete request
  for a `UOMFunctionalRole` referenced by any `UOMRoleAssignment` row is rejected. This was already
  covered generically by VR-015's "Category/Type/Functional Role/Group" wording, but that coverage
  was previously an unconfirmed extension of the Type/Category pattern (`open-questions.md`
  UOM-FX-OQ-007, Non-blocking) — **ADR-192 confirms it directly**, so this is stated as its own
  numbered rule for traceability rather than silently folded back into VR-015's original text.
  Enforced at the database level (`RESTRICT`, `4-schema.md` §9), surfaced to the caller as a clear
  "still in use" validation error, same pattern as VR-015.

**Not a validation rule — Base-Type role-resolution fallback (ADR-192, BR-021)**: a Functional Role
with no explicit `UOMRoleAssignment` for a Group is not a validation failure — it resolves to the
Group's Base Type at read/resolution time rather than being rejected. This is resolution *behavior*,
not a write-time gate, so it is not numbered as a `VR-###` here; see `3-business-rules.md` BR-021 and
`8-api.md` for where this fallback is documented as a response-shaping concern.

**Not a validation rule — "Uses Picking Hierarchy" has no writable field to validate (ADR-192,
BR-013)**: no `VR-###` in this document ever validated `uses_picking_hierarchy` as a submittable
field (there was none to validate), and none does now — the indicator is a computed, read-only value
derived from `UOMPickingHierarchy` row existence, never accepted on a create/update payload. Noted
explicitly here so a later reader confirms this was checked, not merely omitted.

---

# 6. File Validation

Not applicable — UOM has no file-upload field of its own (no image, document, or attachment field
on any entity).

---

# 7. Import Validation

- **VR-017** — bulk import (FR-011, ADR-098's standard mechanism) validates each row against
  VR-001 through VR-015 the same way an interactive Group save would — no bulk-import bypass of
  save-time validation, including VR-010's completeness check. A row failing validation is
  flagged/rejected per the standard import job's row-level error reporting, not silently skipped.

---

# 8. API Validation

**Headers**: standard project-wide (`3-api/` — Authorization bearer token or API key).

**Parameters**: standard project-wide pagination/filter parameter validation (`3-api/
4-query-standards.md`) — no UOM-specific exception.

**Request body**: validated per §3–§5 above via NestJS `ValidationPipe` + DTO class-validator
decorators (project-wide pattern).

**Authentication**: every UOM endpoint requires a valid JWT/API key (`7-permissions.md`).

---

# 9. Validation Order

1. **Required** — VR-001 through VR-004 (presence checks).
2. **Format** — VR-005 through VR-007 (length/type checks).
3. **Cross-field / uniqueness** — VR-008, VR-009, VR-014.
4. **Business Validation** — VR-010 through VR-016, VR-018, VR-019, VR-020 (includes the Group-save
   completeness check, VR-010 — deliberately sequenced after basic field/uniqueness checks pass, so a
   Group with, say, a duplicate name never even reaches the more expensive completeness check;
   VR-019's case-insensitive name-uniqueness check runs before VR-010, for the same reason a
   duplicate-name Group should never reach the completeness check; VR-018's transaction-reference
   lock check runs on every Group update/delete, ahead of VR-010's completeness check, so a
   locked-field edit on a used Group is rejected for the lock reason, not a secondary completeness
   reason; VR-019 and VR-018 are independent checks and both apply to a Group rename — a rename can
   be rejected by either).
5. **Database Validation** — VR-012 (referenced-record-exists) and VR-015 (in-use guard) are
   ultimately enforced by real FK/`RESTRICT` constraints (`4-schema.md`) as the final backstop, even
   though the application layer also checks them earlier for a clearer error message.

---

# 10. Error Messages

Centralized per the project-wide validation-message convention (`3-api/6-error-handling.md`) — every
message above names the specific field/record, never a generic "validation failed." VR-010's message
specifically names the offending Functional Role and Type, since a Group can have many role
assignments and a vague error would force the administrator to hunt for which one is the problem.

---

# 11. Related Documents

Functional Specification: `2-functional-specification.md` · Schema: `4-schema.md` · Business Rules:
`3-business-rules.md` · API: `8-api.md` · UI: `9-ui.md`

---

# Revision History

| Date | Change |
|---|---|
| 2026-08-18 | Initial draft. |
| 2026-08-18 | Amendment (ADR-190): added VR-018 (Group transaction-reference lock). |
| 2026-08-18 | Amendment (ADR-191): amended `UOMGroup.name`'s field validation row (§3) and added VR-019 (case-insensitive Group Name uniqueness, checked on create and rename). |
| 2026-08-18 | Amendment (ADR-192): added VR-020 (Functional Role in-use delete guard, confirmed) and notes clarifying the Base-Type role-resolution fallback (BR-021) is resolution behavior, not a validation rule, and that "Uses Picking Hierarchy" has no writable field to validate (§5). |

---

# Approval

Pending review per `4-document-review/1-document-review.md`.

---

# AI Generation Notes

Every validation rule traces to a `BR-###`/`UOM-RULE-###` in `3-business-rules.md` /
`module-field-extraction/uom/business-rules.md`, or to a standard project-wide pattern
(`3-api/`, `2-database/4-database-standards.md`) cited inline. VR-011's note on BR-003's
Underspecified enforcement mechanism is carried forward rather than silently resolved.

**Amendment (ADR-190)**: VR-018 was added after this document's original review/approval pass, to
transcribe ADR-190/BR-020's Group transaction-reference lock. This is a targeted amendment, not a
re-review of the rest of the document.

**Amendment (ADR-191)**: VR-019 was added, and §3's `UOMGroup.name` row amended, after this
document's original review/approval pass, to transcribe ADR-191/BR-001's case-insensitive Group Name
uniqueness check, applying on both create and rename. This is a targeted amendment, not a re-review
of the rest of the document.

**Amendment (ADR-192)**: VR-020 was added (§5) to firm up the Functional Role in-use delete guard,
previously only an unconfirmed extension under VR-015's general wording, as its own confirmed rule.
Two explanatory notes were added (§5) clarifying that the Base-Type role-resolution fallback (BR-021)
is resolution behavior rather than a validation rule, and that "Uses Picking Hierarchy" was never,
and is still not, a writable field with a validation rule of its own. This is a targeted amendment,
not a re-review of the rest of the document.
