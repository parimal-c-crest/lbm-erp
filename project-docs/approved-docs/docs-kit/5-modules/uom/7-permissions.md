# Permissions — UOM

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

**Purpose**: define who can view, create, update, and delete UOM's Category/Type/Functional Role/
Group/Role Assignment/Conversion Factor/Picking Hierarchy data, and close legacy's confirmed
permission-enforcement gap (UOM-RISK-008 — a UI-only page-load flag that never actually gated the
write endpoints).

**Scope**: all UOM entities and their conversion/pick-breakdown read endpoints.

**Authorization model**: role-based access (ADR-002) enforced by real server-side NestJS Guards on
every endpoint (ADR-006) — no UI-layer-only check, no Sharing Rule mechanism (ADR-081, project-wide,
not UOM-specific). This directly closes UOM-RISK-008: legacy's only check was
`isPermitted()`-at-page-load in `uom_manage.php`, never re-enforced in the actual write dispatcher
`uom_ajax_action.php`.

---

# 2. Roles

Per ADR-002's starter role catalog (the only role list this project maintains — no UOM-specific role
is introduced):

- **Admin** — the role ADR-002 explicitly scopes to "system configuration," which UOM's Category/
  Type/Functional Role/Group CRUD falls under.
- **Counter/Sales Staff**, **Warehouse/Fulfillment Staff**, **Accounting/Management**, **Purchasing
  Staff** — read-only consumers of UOM's conversion/pick-breakdown queries as part of their own
  modules' workflows (SalesOrder, Receiving, StoreTransfer, PurchaseOrder, Accounting reports) — they
  do not administer UOM's own configuration screens.
- **B2B Customer** — no direct UOM access; any UOM-derived data (e.g. a unit label on a storefront
  product) is exposed only through Products'/Pricing's own B2B-facing endpoints, never a direct UOM
  call.

Legacy's "Catalog administrator"/"Pricing administrator" actor labels (`module-overview.md`
§Actors) were confirmed **not** to be distinct permission roles in the legacy codebase itself — only
functional usage-pattern descriptions (`permissions.md` in the legacy source: "No separate 'Catalog
administrator' or 'Pricing administrator' role/permission constant was found"). This document maps
that functional pattern onto ADR-002's **Admin** role rather than inventing a new one.

---

# 3. Permission Matrix

| Permission | Admin | Counter/Sales Staff | Warehouse/Fulfillment Staff | Accounting/Management | Purchasing Staff | B2B Customer |
|---|---|---|---|---|---|---|
| View Category/Type/Functional Role/Group (admin screens) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create/Update/Delete Category/Type/Functional Role/Group | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Role Assignments / Conversion Factors / Picking Hierarchy | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Call conversion / pick-breakdown query (via own module) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Bulk import/export UOM Group data (FR-011) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

# 4. Ownership Rules

No per-user or per-tenant-role ownership model applies to any UOM entity — consistent with the
legacy finding carried forward in `module-field-extraction/uom/entities-and-fields.md` (no tenant/
company/per-user discriminator column on any UOM table; database-per-tenant, ADR-056, is the only
scoping boundary). `created_by`/`updated_by` record the acting user for audit purposes only — they
do not restrict who else may edit a row (legacy: "any permitted user can edit any row, not just
their own" — `permissions.md` in the legacy source, carried forward unchanged).

---

# 5. Record-Level Permissions

UOM has no Draft/Approved/Archived workflow states (`module-field-extraction/uom/workflow.md`: "No
status or lifecycle model exists"). Record-level permission is binary: Active (editable by Admin,
readable via the conversion service by any authenticated consuming-module caller) vs. Soft-deleted
(not editable, not returned by the conversion service — see BR-014's delete guard for how a record
becomes soft-deleted at all).

---

# 6. Field-Level Permissions

No field-level permission distinction exists within a UOM entity — an Admin who can edit a Group can
edit every field on it (name, Category, Base Type, picking-hierarchy flag, Role Assignments,
Conversion Factors). No hidden or read-only field was identified in any source for this module's own
records. (Audit columns — `created_by`/`updated_at`/etc. — are system-set and never
directly editable by any role, per the standard project-wide convention, not a UOM-specific rule.)

---

# 7. Action Permissions

**Create**: Admin only, all UOM entities.

**Update**: Admin only, all UOM entities.

**Delete**: Admin only, subject to BR-014's in-use guard (rejected regardless of role if the record
is referenced).

**Approve / Reject**: not applicable — no approval workflow exists for this module.

**Import**: Admin only (FR-011).

**Export**: Admin only (FR-011).

**Archive**: not applicable — soft-delete is the only "archival" concept, covered under Delete above.

**Restore**: no restore path was confirmed in the legacy source or introduced by any ADR
(`module-field-extraction/uom/workflow.md`) — carried forward as a gap, not a granted permission.

---

# 8. API Authorization

| Endpoint group | Required Role | Reference |
|---|---|---|
| `POST/PATCH/DELETE /uom/categories`, `/uom/types`, `/uom/functional-roles`, `/uom/groups` | Admin | `8-api.md` §3 |
| `GET /uom/categories`, `/uom/types`, `/uom/functional-roles`, `/uom/groups` (admin listviews) | Admin | `8-api.md` §3 |
| `POST /uom/conversions/resolve`, `POST /uom/groups/{id}/pick-breakdown` | Any authenticated user whose calling module has its own valid authorization for the underlying transaction (this endpoint itself only requires a valid session/API key — the calling module's own Guard governs whether that specific SalesOrder/PurchaseOrder/etc. action is permitted) | `8-api.md` §3 |
| `POST /uom/groups/import`, `GET /uom/groups/export` | Admin | `8-api.md` §3 |

Every row above is enforced by a real NestJS `RolesGuard` + `JwtAuthGuard` (or API-key equivalent)
on the endpoint itself — this is the specific, concrete closure of UOM-RISK-008 (BR-017).

---

# 9. UI Authorization

**Button visibility**: Create/Edit/Delete controls on UOM's admin screens (`9-ui.md`) render only
for the Admin role — but per this project's standing convention (and directly because of
UOM-RISK-008's lesson), button visibility is a UX convenience only; the server-side Guard is the
actual enforcement, never the reverse.

**Menu visibility**: UOM's own navigation entry (`1-module.md` §10) is visible only to Admin.

**Read-only behavior**: a non-Admin who somehow reaches a UOM admin screen (e.g. a direct URL) sees
a read-only, disabled state — but is still blocked server-side on any write attempt regardless.

---

# 10. Audit Requirements

**Logging**: every UOM write (create/update/delete on any entity) is recorded in the project-wide
audit log (`2-database/4-database-standards.md` — audit trail is both per-row columns and a separate
project-wide `audit_log`, ADR-005/068), including the specific field(s) changed for a Group save
(Role Assignments/Conversion Factors added, removed, or changed) — important given BR-019's
save-time validation makes the Group-save transaction a meaningful, multi-row atomic unit worth
auditing as one event, not just per-table.

**Approval history**: not applicable (no approval workflow).

**Permission failures**: every rejected write (missing role, in-use delete guard, Group-save
completeness rejection) is logged with the acting user, attempted action, and rejection reason —
this is what makes UOM-RISK-008's closure verifiable in production, not just in code review.

---

# 11. Related Documents

Module: `1-module.md` · Business Rules: `3-business-rules.md` · API: `8-api.md` · UI: `9-ui.md` ·
[Authentication](../../../../approved-docs/docs-kit/3-api/2-authentication.md) ·
[Authorization](../../../../approved-docs/docs-kit/3-api/3-authorization.md)

---

# Revision History

| Date | Change |
|---|---|
| 2026-08-18 | Initial draft. |

---

# Approval

Pending review per `4-document-review/1-document-review.md`.

---

# AI Generation Notes

Drafted from ADR-002 (starter role catalog — the only role list used, no UOM-specific role
invented), ADR-006 (standing server-side Guard rule), `permissions.md` in the legacy UOM blueprint
(confirming no distinct "Catalog administrator" permission constant exists), and
`module-field-extraction/uom/business-rules.md` UOM-RULE-014/017. UOM-RISK-008's closure is stated
concretely (§8, §10) rather than only referenced abstractly.
