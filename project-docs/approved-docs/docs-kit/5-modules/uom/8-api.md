# API Specification — UOM

# Document Information

| Field | Value |
|--------|-------|
| Module | UOM |
| Version | 1.0 |
| Status | Draft |
| API Version | v1 |
| Base Path | /api/v1 |
| Author | Claude Code (docs-kit generation) |
| Last Updated | 2026-08-18 |

---

# 1. Overview

**Purpose**: the REST contract for UOM's Category/Type/Functional Role/Group/Role Assignment/
Conversion Factor/Factor History/Picking Hierarchy CRUD, plus the conversion and pick-breakdown
queries every other module calls instead of reading UOM's tables directly (ADR-053, BR-015).

**Scope**: `/api/v1/uom/*`.

**Dependencies**: none inbound. Outbound consumers: Products, SalesOrder, PurchaseOrder, Receiving,
StoreTransfer, Manufacturing, Kits, SalesHistory, Settings, Pricing (`1-module.md` §11).

**Related project API documents**: `3-api/1-api-design.md`, `4-query-standards.md`,
`5-response-standards.md`, `6-error-handling.md`, `7-api-development-standards.md`.

---

# 2. API Summary

| Method | Endpoint | Description |
|----------|----------|-------------|
| GET | `/uom/categories` | List UOM Categories |
| POST | `/uom/categories` | Create a UOM Category |
| PATCH | `/uom/categories/{id}` | Update a UOM Category |
| DELETE | `/uom/categories/{id}` | Soft-delete a UOM Category (BR-014 guarded) |
| GET | `/uom/types` | List UOM Types |
| POST | `/uom/types` | Create a UOM Type |
| PATCH | `/uom/types/{id}` | Update a UOM Type |
| DELETE | `/uom/types/{id}` | Soft-delete a UOM Type (BR-014 guarded; cascades Pricing override delete, BR-016) |
| GET | `/uom/functional-roles` | List UOM Functional Roles |
| POST | `/uom/functional-roles` | Create a UOM Functional Role |
| PATCH | `/uom/functional-roles/{id}` | Update a UOM Functional Role |
| DELETE | `/uom/functional-roles/{id}` | Soft-delete a UOM Functional Role (BR-014 guarded) |
| GET | `/uom/groups` | List UOM Groups |
| GET | `/uom/groups/{id}` | Get a UOM Group, with its Role Assignments, Conversion Factors, Picking Hierarchy |
| POST | `/uom/groups` | Create a UOM Group (+ initial Role Assignments/Conversion Factors), validated per BR-019 |
| PATCH | `/uom/groups/{id}` | Update a UOM Group (+ Role Assignments/Conversion Factors), re-validated per BR-019; locked-field edits on a transaction-referenced Group are rejected per BR-020/ADR-190 (Name-only edit still allowed) |
| DELETE | `/uom/groups/{id}` | Soft-delete a UOM Group; always rejected once transaction-referenced (BR-020/ADR-190), independent of any Products FK reference |
| GET | `/uom/groups/{id}/conversion-factors/{typeId}/history` | Get effective-dated factor history for a (Group, Type) pair |
| GET | `/uom/groups/{id}/roles/{roleId}/resolve` | Resolve which Type fulfills a Functional Role for a Group, applying the Base-Type fallback (BR-021) when no explicit Role Assignment exists |
| POST | `/uom/conversions/resolve` | Resolve a conversion (qty or price, either direction) |
| GET | `/uom/groups/{id}/pick-breakdown` | Get the ordered picking-hierarchy sequence for a Group |
| POST | `/uom/groups/import` | Bulk import UOM Group data (FR-011) |
| GET | `/uom/groups/export` | Bulk export UOM Group data (FR-011) |

---

# 3. Endpoints

## GET /uom/categories

**Purpose**: list UOM Categories.

**Authorization**: Admin (`7-permissions.md` §8).

**Related Requirements**: FR-001.

**Related Business Rules**: none (read-only).

**Query Parameters**: standard pagination/search/sort (`3-api/4-query-standards.md`), search over
`name`.

**Response**: paginated list of `UOMCategory`.

**Errors**: standard 401/403 (`3-api/6-error-handling.md`).

---

## POST /uom/categories

**Purpose**: create a UOM Category.

**Authorization**: Admin.

**Request Body**: `{ name: string, sortOrder?: number }`.

**Validation References**: VR-001 (`6-validation.md`).

**Business Rule References**: BR-010.

**Success Response**: 201, created `UOMCategory`.

**Errors**: 400 (validation), 409 (duplicate name — BR-001-equivalent uniqueness on Category name),
401/403.

---

## PATCH /uom/categories/{id}

Same shape as POST, partial update. **Business Rule References**: BR-010.

---

## DELETE /uom/categories/{id}

**Purpose**: soft-delete a UOM Category.

**Authorization**: Admin.

**Business Rule References**: BR-014 (in-use guard).

**Success Response**: 204.

**Errors**: 409 if referenced by any `UOMGroup.category_id`, 401/403, 404.

---

## GET /uom/types, POST /uom/types, PATCH /uom/types/{id}

Same shape as the Category endpoints above, for `UOMType`. **Business Rule References**: BR-010.

**Request Body (create/update)**: `{ name: string, categoryId?: uuid, sortOrder?: number }` —
`categoryId` is an **optional** field (ADR-192, resolving UOM-FX-OQ-001): a Type may declare which
Category it belongs to but is never required to submit one.

**Response**: `UOMType` including `categoryId` (nullable) alongside `id`/`name`/`sortOrder`.

---

## DELETE /uom/types/{id}

**Purpose**: soft-delete a UOM Type.

**Authorization**: Admin.

**Business Rule References**: BR-014 (in-use guard across Base Type/Role Assignment/Conversion
Factor/Picking Hierarchy references); BR-016 (cascades a Pricing fixed-price-override delete if one
exists and the Type is otherwise deletable).

**Success Response**: 204.

**Errors**: 409 if referenced by any dependent row, 401/403, 404.

---

## GET /uom/functional-roles, POST /uom/functional-roles, PATCH /uom/functional-roles/{id}

Same shape as Category, for `UOMFunctionalRole`. **Business Rule References**: BR-010.

---

## DELETE /uom/functional-roles/{id}

**Business Rule References**: BR-014 (extension **confirmed** by **ADR-192**, resolving
`open-questions.md` UOM-FX-OQ-007 — no longer an unconfirmed extension).

**Errors**: 409 if referenced by any `UOMRoleAssignment.role_id`.

---

## GET /uom/groups

**Purpose**: list UOM Groups.

**Authorization**: Admin.

**Query Parameters**: standard pagination/search/sort, search over `name`.

**Response**: paginated list of `UOMGroup` summaries (name, Category, Base Type, computed
`usesPickingHierarchy` — see the read-only computed-field note under `POST /uom/groups` below —
and a `roleAssignmentCount: number` for the Group List's "UOM Roles" column; not the full nested
Role Assignment/Conversion Factor detail, which is fetched via the detail endpoint below).

---

## GET /uom/groups/{id}

**Purpose**: full detail for one Group, including nested Role Assignments, Conversion Factors, and
Picking Hierarchy rows.

**Authorization**: Admin (for the admin edit screen) or any authenticated consuming-module caller
that needs the full configuration for a product's assigned Group (e.g. Products rendering a unit
dropdown — `1-module.md` §11).

**Response**: `UOMGroup` + nested arrays, including a computed, **read-only** `usesPickingHierarchy:
boolean` field (ADR-192, BR-013) — true if the nested `pickingHierarchy` array is non-empty, false
otherwise. Not a stored column; never accepted on a create/update payload (see `POST /uom/groups`
below).

**Errors**: 404 if not found or soft-deleted.

---

## POST /uom/groups

**Purpose**: create a UOM Group, its Role Assignments, and its Conversion Factors together, in one
atomic request.

**Authorization**: Admin.

**Request Body**:
```
{
  name: string,
  categoryId?: uuid,
  baseTypeId: uuid,
  roleAssignments: [{ roleId: uuid, typeId: uuid }],
  conversionFactors: [{ typeId: uuid, unitsPerBase: number }]
}
```

> **Removed field — `usesPickingHierarchy` (ADR-192, BR-013)**: earlier drafts of this payload
> accepted a submittable `usesPickingHierarchy` boolean. It is removed — the value is computed from
> Picking Hierarchy row presence (see `GET /uom/groups/{id}` above), never accepted on create or
> update. Submitting it is ignored by the API, not rejected as an error (consistent with the
> project-wide DTO convention of stripping unrecognized fields), so older client code that still
> sends it does not hard-fail.

**Validation References**: VR-001, VR-003, VR-008 through VR-013 (`6-validation.md`).

**Business Rule References**: BR-001, BR-002, BR-003, BR-004, BR-006, BR-011, BR-019 (the
save-time completeness check runs here, atomically with the Group/Role-Assignment/Conversion-Factor
insert).

**Success Response**: 201, created `UOMGroup` with nested detail.

**Errors**: 400 (validation), 409 (duplicate Group name — BR-001; or BR-019's completeness rejection,
naming the specific Type/Role at fault), 401/403.

---

## PATCH /uom/groups/{id}

**Purpose**: update a Group, and/or its Role Assignments/Conversion Factors, atomically.

**Authorization**: Admin.

**Request Body**: same shape as POST, all fields optional/partial.

**Validation References**: same as POST.

**Business Rule References**: same as POST, plus BR-009 (a Conversion Factor value change writes a
`UOMTypeFactorHistory` row as part of this same transaction), plus **BR-020/ADR-190**: before any
other field-level validation runs, the handler checks whether the Group has at least one
transactional reference (`4-schema.md` §9's Transaction-Reference Lock Check / VR-018). If it does
and the request body changes any field other than `name`, the request is rejected outright — the
locked-field values are not silently dropped or ignored, the whole request fails so the caller knows
exactly why. A request that changes only `name` proceeds normally regardless of transactional-
reference status.

**Success Response**: 200, updated `UOMGroup` with nested detail.

**Errors**: same as POST, plus 404, plus **409** (`GROUP_LOCKED` — a locked field was included in
the update body for a transaction-referenced Group; the error body names every rejected field, e.g.
`{ code: "GROUP_LOCKED", lockedFields: ["baseTypeId", "roleAssignments"] }`, per BR-020).

---

## DELETE /uom/groups/{id}

**Purpose**: soft-delete a Group.

**Authorization**: Admin.

**Business Rule References**: **BR-020/ADR-190** — delete is rejected outright, with no exception,
once the Group has at least one transactional reference (`4-schema.md` §9's Transaction-Reference
Lock Check). This check is independent of, and runs alongside, any FK-level guard Products' own
schema may separately enforce against a live `uom_group_id` assignment — a Group can be
Product-assigned but still deletable if it has zero transactional references, and is never
deletable once transaction-referenced even if no Product currently points at it.

**Success Response**: 204.

**Errors**: **409** (`GROUP_LOCKED` — the Group has at least one transactional reference, per
BR-020), 401/403, 404.

---

## GET /uom/groups/{id}/conversion-factors/{typeId}/history

**Purpose**: return the effective-dated rate history for a (Group, Type) pair (FR-007).

**Authorization**: any authenticated consuming-module caller (e.g. SalesHistory resolving a
historical rate).

**Query Parameters**: optional `asOfDate` — if given, returns the single row effective on that date
instead of the full history array.

**Response**: array of `UOMTypeFactorHistory` rows (or a single row if `asOfDate` given).

**Errors**: 404 if no history exists for the pair; 404-with-specific-message if `asOfDate` given and
no row covers that date (FR-007 Exception Flow).

---

## GET /uom/groups/{id}/roles/{roleId}/resolve

**Purpose**: resolve which `UOMType` fulfills a given Functional Role for a Group (FR-005/FR-009) —
the canonical role-resolution query every consuming module should call instead of independently
inspecting the nested `roleAssignments` array from `GET /uom/groups/{id}` and re-implementing the
fallback itself (ADR-053, BR-015).

**Authorization**: any authenticated consuming-module caller.

**Business Rule References**: **BR-021 (ADR-192)** — if no `UOMRoleAssignment` row exists for the
(Group, Role) pair, the response resolves to the Group's own Base Type rather than a null/empty
result or an error. The response always names which of the two happened, so a caller can distinguish
an intentional Base-Type assignment from a fallback if it needs to (e.g. for an admin-facing
diagnostic screen).

**Response**: `{ typeId: uuid, resolution: "explicit" | "base_type_fallback" }` — `"explicit"` means
an actual `UOMRoleAssignment` row was found; `"base_type_fallback"` means none existed and the
Group's `base_type_id` was returned instead.

**Errors**: 404 if the Group or Role does not exist.

**Note**: `GET /uom/groups/{id}`'s own nested `roleAssignments` array (above) still reflects only the
explicit, persisted assignments — it does not itself apply the fallback. Any caller resolving a
specific role's Type for actual use (not just displaying the admin edit screen's current explicit
configuration) should call this endpoint, not infer availability from the nested array's absence of
a row.

---

## POST /uom/conversions/resolve

**Purpose**: the canonical conversion query (FR-009).

**Authorization**: any authenticated consuming-module caller.

**Request Body**: `{ groupId: uuid, typeId: uuid, direction: "base_to_uom" | "uom_to_base", kind:
"qty" | "price", value: number, asOfDate?: date }`.

**Business Rule References**: BR-005, BR-007, BR-008 (this endpoint IS the base-unit-pivot,
always-fractional conversion arithmetic).

**Success Response**: 200, `{ result: number }`.

**Errors**: 400 if `typeId` is not reachable through `groupId` at all (not Base, no Role Assignment,
no Conversion Factor — a different situation from a missing factor, which BR-019 prevents from ever
occurring for a reachable Type); 404 if Group not found.

---

## GET /uom/groups/{id}/pick-breakdown

**Purpose**: the pick-unit-breakdown query (FR-010) — replaces legacy's direct three-table join in
`wmsSalesOrderAllocation.php`.

**Authorization**: any authenticated consuming-module caller (SalesOrder's WMS allocation,
StoreTransfer's pick/pack flow).

**Response**: ordered array of `{ typeId, sortOrder, unitsPerBase }`.

**Errors**: 404 if Group not found; empty array (not an error) if no Picking Hierarchy rows exist for
the Group — which is also, per BR-013 (ADR-192), precisely the condition under which
`usesPickingHierarchy` computes to `false`. There is no longer a separate flag/row-presence
inconsistency to worry about here — the computed indicator and this endpoint's own emptiness always
agree by construction.

---

## POST /uom/groups/import

**Purpose**: bulk import UOM Group data (FR-011, ADR-098).

**Authorization**: Admin.

**Business Rule References**: VR-017 — every row validated per the same rules as an interactive
Group save, including BR-019.

**Success Response**: 202, background job reference (per the project-wide standard import-job
pattern).

---

## GET /uom/groups/export

**Purpose**: bulk export UOM Group data (FR-011, ADR-098).

**Authorization**: Admin.

**Success Response**: 200 or 202 (background-job reference for a large export), per the project-wide
standard export pattern.

---

# 4. Request Models

`UOMCategory`, `UOMType`, `UOMFunctionalRole`, `UOMGroup` (+ nested `roleAssignments`/
`conversionFactors`/`pickingHierarchy` arrays) — field shapes per `4-schema.md` §4, DTO'd per the
project-wide DTO convention (`3-api/1-api-design.md`). No UOM-specific request model beyond these —
common objects (pagination envelope, error envelope) are reused from Project API Contracts, not
redefined here.

---

# 5. Response Models

Standard **Success Response**, **Pagination Response**, and **Error Response** envelopes from
`3-api/5-response-standards.md` — reused as-is, not redefined.

---

# 6. Validation References

VR-001 through VR-020 (`6-validation.md`).

---

# 7. Authorization References

Admin role (ADR-002); enforced per endpoint in `7-permissions.md` §8. No PERM-### ID scheme exists
in this project's convention beyond the role name itself — `7-permissions.md`'s Permission Matrix
(§3) is the authoritative mapping.

---

# 8. Business Rule References

BR-001 through BR-021 (`3-business-rules.md`).

---

# 9. Events

**Emails / SMS**: none.

**Notifications**: none UOM-specific.

**Queues**: `POST /uom/groups/import` and `GET /uom/groups/export` dispatch to the project-wide
background-job queue (ADR-098's standard mechanism) — no UOM-specific queue.

**Webhooks**: none.

---

# 10. Integrations

**External APIs**: none. **Third-party systems**: none (`integrations.md` §External Systems in the
legacy source, carried forward — UOM's integration surface is entirely intra-codebase).

---

# 11. Performance

**Caching**: none — conversions resolve live, no cache layer (`1-module.md` §9).

**Pagination**: standard project-wide cursor/offset pagination on all list endpoints
(`3-api/4-query-standards.md`).

**Timeouts**: standard project-wide.

**Rate limits**: reference project standards (`3-api/7-api-development-standards.md`) — no
UOM-specific override. `POST /uom/conversions/resolve` and `GET /uom/groups/{id}/pick-breakdown` are
expected to be high-frequency, synchronous, per-line calls from transactional modules (legacy's own
46+ call-site survey) — the pick-breakdown endpoint is deliberately a single batched call per Group
rather than N per-Type calls, specifically to keep this endpoint's real call volume manageable under
the project's standard rate limits (`build-guidance.md`'s stated recommendation).

---

# 12. Related Documents

Module: `1-module.md` · Functional Specification: `2-functional-specification.md` · Validation:
`6-validation.md` · Business Rules: `3-business-rules.md` · Permissions: `7-permissions.md` ·
Project API Standards: `3-api/`

---

# Revision History

| Date | Change |
|---|---|
| 2026-08-18 | Initial draft. |
| 2026-08-18 | Amendment (ADR-190): updated the Group PATCH/DELETE endpoints for BR-020's transaction-reference lock; added the `GROUP_LOCKED` 409 error shape. |
| 2026-08-18 | Amendment (ADR-192): added `GET /uom/groups/{id}/roles/{roleId}/resolve` (Base-Type fallback, BR-021); removed `usesPickingHierarchy` from Group create/update payloads and documented it as a computed, read-only response field (BR-013); added `categoryId` to Type create/update/read payloads (`UOMType.category_id`); confirmed the Functional Role delete guard (BR-014). |

---

# Approval

Pending review per `4-document-review/1-document-review.md`.

---

# AI Generation Notes

Every endpoint traces to a Functional Requirement (`2-functional-specification.md`), a Business
Rule (`3-business-rules.md`), and/or a validation rule (`6-validation.md`). The Group create/update
endpoints are deliberately modeled as one atomic request (Group + Role Assignments + Conversion
Factors together) because BR-019's completeness validation is only meaningful evaluated across all
three at once — splitting them into separate calls would reopen the exact race BR-019 exists to
close.

**Amendment (ADR-190)**: the PATCH/DELETE `/uom/groups/{id}` sections and the `GROUP_LOCKED` error
shape were added after this document's original review/approval pass, to transcribe ADR-190/BR-020.
This is a targeted amendment, not a re-review of the rest of the document.

**Amendment (ADR-192)**: added the `GET /uom/groups/{id}/roles/{roleId}/resolve` endpoint to
transcribe BR-021's Base-Type fallback; removed `usesPickingHierarchy` from the Group create/update
request body and documented it as a computed, read-only field on Group read responses instead
(BR-013); added `categoryId` to the Type endpoints' request/response shape (`UOMType.category_id`,
BR-010/`4-schema.md`); confirmed the Functional Role delete guard's Business Rule Reference. This is
a targeted amendment, not a re-review of the rest of the document.
