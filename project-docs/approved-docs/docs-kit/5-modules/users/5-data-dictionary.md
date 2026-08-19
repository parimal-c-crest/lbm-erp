# Data Dictionary — Users

# Document Information

| Field | Value |
|---|---|
| Module | Users |
| Version | 1.1 |
| Status | Draft |
| Author | Developer (AI-assisted) |
| Last Updated | 2026-08-19 |

---

# 1. Overview

**Business purpose**: define the business meaning, governance, and lifecycle of every data element
this module owns, independent of database implementation (`4-schema.md` covers the implementation
side). **Scope**: the ~26 entities in `4-schema.md` §1. **Naming conventions**: business names in
Title Case (e.g. "Ship Date," never `ship_dt`) per `4-ui/5-form-standards.md` §7 — the full
field-by-field catalog with each legacy name mapped to its new business name is the field-extraction
pass's `entities-and-fields.md` (adopted by reference, not re-transcribed here — see §3 below).

---

# 2. Entity Definitions

## User

**Description**: a login/employee identity record. **Business Purpose**: authentication, session
context, HR-adjacent record-keeping. **Owner**: Admin role (create/edit/delete); every authenticated
user owns their own record for self-service fields. **Lifecycle**: created by Admin (or CSV import)
→ active/inactive via Account Status → soft-deleted (ADR-005 `is_deleted`/`deleted_at`), never hard
deleted.

## Role / Profile / Group

**Description**: the RBAC primitives — see `4-schema.md` §3. Role is hierarchical (parent/child +
depth, kept from the legacy design per developer decision) and carries a per-role 2FA requirement
(Admin-configurable). **Business Purpose**: express who can do what, and who can see which records.
**Owner**: Admin role exclusively. **Lifecycle**: create/edit/delete/reparent, gated by the
transfer-target-required delete flow (`3-business-rules.md` BR-001).

## Time Clock Record

**Description**: a single clock-in/out punch. **Business Purpose**: the source data for payroll
hours/overtime. **Owner**: system-set on clock action; admin/manager override for corrections.
**Lifecycle**: created open (`CLOCK IN`) → closed (`CLOCK OUT`) via client action, auto-close, or
override — never deleted (audit/payroll trail).

## Personal Day / Holiday

**Description**: scheduled time-off. **Owner**: self-service submission (Personal Day), Admin
(Holiday catalog/assignment). **Lifecycle**: submitted → (new design) bridged into a Time Clock
Record with the matching hours-type classification (`3-business-rules.md` §7).

---

# 3. Field Definitions

The complete field-by-field table (every field individually listed, never grouped — business name,
business meaning, logical type, required/default, source-of-truth) is maintained in the
field-extraction pass: `project-docs/claude-docs/analysis/module-field-extraction/users/
entities-and-fields.md`, which adopts `sot-docs/raw/2-module-specs/Users/entities-and-fields.md`'s
~120-row User Header catalog plus every other entity's field list by reference. Reproducing that
table a third time here (having already been adopted once by the field-extraction pass) would risk
a silent drift between three copies of the same data — this document points to the one authoritative
copy instead.

Selected fields worth calling out at the business-meaning layer specifically (not just structurally):

| Field | Description | Business Purpose | Example |
|---|---|---|---|
| Account Status | Active/Inactive | The one real, enforced login gate in this module | `Active` |
| Role | The user's assigned business role | Drives every module/field/action permission check | `Purchasing Staff` |
| Is Super Admin | Platform-support account flag (ADR-057) | Bypasses all permission checks; one per tenant, created at provisioning | `false` for ordinary business users |
| Hours Type | Time-clock punch classification | Feeds the 5 payroll report columns (Regular/Holiday/Personal/Sick/Vacation) | `Regular` |

---

# 4. Enumerations

| Enumeration | Values | Notes |
|---|---|---|
| Account Status | `Active`, `Inactive` | Real, enforced (see `3-business-rules.md` Decision Tables) |
| Role (ADR-002 starter catalog, hierarchical) | Counter/Sales Staff, Warehouse/Fulfillment Staff, Accounting/Management, Purchasing Staff, Admin | B2B Customer excluded from this application's own navigation (nav doc §10) — tracked for API/authorization purposes only, not seeded as a selectable Role here. Hierarchy (parent/child) kept per developer decision — the 5 roles are the initial flat seed, reparentable by Admin. |
| Two-Factor Required (per Role) | `true`/`false` | Admin-configurable per role, not hardcoded (developer decision) |
| Time Clock Status | `CLOCK IN`, `CLOCK OUT`, `Unclosed — Needs Resolution` | The one genuine DB-enum-backed status; the third value surfaces a punch still open at pay-period close (ADR-037), never silent exclusion |
| Labor Status | `Working`, `Break` (paid), `Lunch` (unpaid) | ADR-077 — the paid/unpaid split feeds the ADR-036 overtime calculation |
| Hours Type | `Regular`, `Holiday`, `Personal`, `Sick`, `Vacation` | Feeds payroll report columns |
| Group Membership Type | `USER`, `ROLE`, `ROLE_AND_SUBORDINATES` | Unifies 2 legacy tables (R4) — assignment/roster only, no sharing-rule role (ADR-081) |

*(No Sharing Rule Actor Type — that mechanism is dropped project-wide, ADR-081.)*

---

# 5. Reference Data

**Statuses**: Account Status, Time Clock Status (above). **Categories**: none module-specific beyond
the Role catalog. Countries/Currencies/Units: not owned by this module (see Location/Products
modules).

---

# 6. Default Values

Account Status defaults to `Active` on every save if submitted blank (preserves the legacy default
behavior, which was intentional, not a gap — `workflow.md` §1). New Profile's permission baseline
comes from an explicit, named default-profile template (closes the legacy lowest-id accident,
`3-business-rules.md` §4). Time Clock `hours_type` defaults to `Regular`.

---

# 7. Data Ownership

| Data | Business Owner | System Owner | Source |
|---|---|---|---|
| User records | Admin role | This module | User-entered (create/edit forms), CSV import |
| Role/Profile/Group | Admin role | This module | Admin-entered |
| Time Clock Records | Self (clock action) / Accounting-Management (overrides) | This module | System-set (punch) / admin-entered (override) |
| Personal Day / Holiday | Self (submission) / Admin (catalog) | This module | User-entered |

---

# 8. Data Classification

**Confidential**: password hash, SSN, salary, insurance detail (User HR profile fields).
**Internal**: role/profile/permission configuration, time-clock/payroll data. **Restricted**: 2FA
verification codes (short-lived, never logged in plaintext beyond the code itself). No field in this
module is classified **Public**.

---

# 9. Data Lifecycle

**Creation**: Admin-entered (User/Role/Profile/Group), self-entered (Personal Day, Mail Account,
preferences), system-set (Time Clock punch, Login History, 2FA codes).

**Modification**: standard audit columns (`updated_at`/`updated_by`, ADR-005) on every entity.

**Archival**: N/A — no module-specific archival state beyond standard soft-delete.

**Deletion**: soft-delete only (`is_deleted`/`deleted_at`, ADR-005) for User; hard-delete permitted
for Role/Profile/Group (through the transfer-target-required flow, `3-business-rules.md`
BR-001) since those have no independent audit-trail requirement beyond the standard audit columns
already on the row up to the point of deletion.

**Retention**: Login History and Time Clock Records are append-only/never deleted (payroll/audit
trail) — no retention-period limit specified by any SoT source for this module.

---

# 10. Related Documents

Schema (`4-schema.md`) · Validation (`6-validation.md`) · Business Rules (`3-business-rules.md`) ·
API (`8-api.md`) · UI (`9-ui.md`).

---

# Revision History

| Date | Change |
|---|---|
| 2026-08-18 | Initial draft (v1.0). |
| 2026-08-18 | v1.1 — review pass: removed Sharing Rule references throughout (ADR-081), added Labor Status enum (ADR-077) and the third Time Clock status value for unclosed punches (ADR-037). |
| 2026-08-19 | ADR-200: no field-level content change — this document never described the `id`/primary-key field's underlying database type; the dual-key retrofit (`id` real PK, `public_id` UUID external-facing) is fully described in `4-schema.md` §4/§6, which this document already defers to for implementation-level detail (§1 Overview). |

# Approval

| Role | Name | Status | Date |
|---|---|---|---|
| Developer | Parimal Chaudhari | Pending | |

# AI Generation Notes

Field-by-field detail adopted by reference from the field-extraction pass rather than transcribed a
third time (see §3) — this document's own contribution is the business-meaning/ownership/lifecycle/
classification layer the field-extraction catalog doesn't itself carry.
