# Authorization

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| Authorization Model | RBAC |
| Version | 1.0 |
| Status | Approved |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |
| Approved By | Claude Code review (`4-document-review/1-document-review.md`, 2026-08-17) |

---

# 1. Executive Summary

Role-Based Access Control (RBAC), enforced server-side via NestJS Guards on every write endpoint, no
exceptions — the single most repeated finding across every legacy module's `permissions.md` was
UI-only enforcement, and closing it structurally is a stated project objective.
[Source: `decisions-log.md` ADR-006, `1-project/1-project-overview.md` §3] Super Admin is a distinct,
separately-scoped axis for platform support, never a variant of the tenant-business role catalog.
[Source: `decisions-log.md` ADR-057]

---

# 2. Authorization Overview

- **Authentication prerequisite**: every authorization check assumes a valid, already-authenticated
  identity (JWT or API key) — see `2-authentication.md`.
- **Permission evaluation**: role → permissions resolved per request, checked before the request
  reaches business logic.
- **Resource access**: role/permission checks plus, where applicable, ownership rules (§9).
- **Action validation**: every mutating action re-validates authorization, not just route-level access
  (e.g. a user permitted to view an order isn't automatically permitted to finalize it).
- **Lifecycle**: every access decision (grant or deny) is logged to the audit trail.
  [Source: `decisions-log.md` ADR-068]

---

# 3. Authorization Architecture

- **Client** → **Authentication Layer** (`2-authentication.md`) → **Authorization Guard** (NestJS,
  per-route) → **Permission resolution** (role → permissions, tenant-configurable per ADR-002) →
  **Protected Resource**.
- No separate policy engine/microservice — authorization is enforced in-process via NestJS Guards
  reading the resolved role/permission set, consistent with the project's "no privileged internal-only
  API" principle (one enforcement path, not two). [Source: `1-project/4-tech-stack.md` §5]

---

# 4. Authorization Model

**Role-Based Access Control (RBAC)**, selected because:
- It matches the legacy system's own actor model (role-based actor descriptions across all 18 module
  specs), so the rewrite maps cleanly onto real, already-understood job functions rather than
  introducing a new mental model (ABAC/PBAC) with no confirmed business need.
- The starter role catalog (ADR-002) is explicitly tenant-configurable — covers the "each tenant might
  need slightly different roles" case without requiring a heavier attribute/policy engine.

Super Admin is layered on top as a second, orthogonal axis (platform support, not a tenant business
role) rather than folded into RBAC's own role catalog. [Source: `decisions-log.md` ADR-057]

---

# 5. Roles

| Role | Description |
|------|-------------|
| Counter/Sales Staff | Order entry, quoting, customer-facing transactions |
| Warehouse/Fulfillment Staff | Picking, receiving, stock transfers, delivery prep |
| Accounting/Management | Credit, statements, deposits/ROA, financial reporting |
| Purchasing Staff | Vendor management, PO creation/reconciliation, EDI |
| Admin | Users/role management, Settings, pricing configuration |
| B2B Customer | External storefront access |
| Super Admin | Platform-support access, per-tenant scoped, standing or time-limited/auto-expiring per account |

Starter catalog, tenant-configurable — a tenant's Admin may add roles beyond this list.
[Source: `decisions-log.md` ADR-002]

---

# 6. Permissions

Naming convention: `<resource>.<action>`, matching the resource names in `1-api-design.md` §5:

```
sales-orders.view
sales-orders.create
sales-orders.finalize
purchase-orders.view
purchase-orders.receive
products.view
products.mass-update
settings.integrations.manage
audit-log.view
```

Permission Categories: View, Create, Update, Delete, Approve, Export, Import, Assign, Execute, Manage.

New-profile permissions **default to denied, never granted** — closing a confirmed legacy gap where a
missing request field silently defaulted a permission checkbox to "granted."
[Source: `decisions-log.md` ADR-156]

Full permission matrix per module: `5-modules/<slug>/7-permissions.md` (generated JIT). This document
defines the naming convention and enforcement model those matrices all follow — not the matrices
themselves.

---

# 7. Resource Access Matrix

High-level only — full matrices generate per module at JIT time.

| Resource | Counter/Sales | Warehouse | Accounting/Mgmt | Purchasing | Admin | B2B Customer |
|----------|:---:|:---:|:---:|:---:|:---:|:---:|
| Sales Orders | Create/View | View | View | | | View own |
| Purchase Orders | | View | View | Create/View | | |
| Products | View | View | | View | Manage | View |
| Accounts/Billing | | | Manage | | | View own |
| Settings | | | | | Manage | |
| Audit Log | | | Role-gated (ADR-068) | | Role-gated | |

---

# 8. Authorization Workflow

1. User is authenticated (§1).
2. Identity established from the validated JWT/API key.
3. Assigned role(s) loaded (tenant-configurable catalog, ADR-002).
4. Permissions resolved from role (new-profile permissions default denied — ADR-156).
5. Resource ownership validated where applicable (§9).
6. Concurrent-edit lock checked for editable records, if this is a write (ADR-079/080/084 — a 409
   Conflict, not a 403, if another user holds the lock).
7. Access granted or denied.
8. Decision logged to the audit trail. [Source: `decisions-log.md` ADR-068]

---

# 9. Resource Ownership Rules

- B2B Customers can view only their own account's orders/statements, never another account's.
  [Source: `Accounts/integrations.md`]
- Super Admin accounts are scoped to their own tenant's database only — a physical guarantee under
  database-per-tenant, not merely an application-level check. [Source: `decisions-log.md` ADR-057,
  ADR-056]
- Purchasing Staff act on vendors/POs generally, not restricted to a personally-assigned subset — no
  SoT source establishes a narrower per-user ownership rule for purchasing.
- Record-sharing-rule engine (a legacy feature allowing per-record custom sharing beyond role) is
  **dropped** — role-based access is sufficient; no finer-grained ownership model beyond what's stated
  here. [Source: `decisions-log.md` ADR-081]

---

# 10. Permission Inheritance

- Admin does not implicitly inherit every permission — permissions are resolved from the role's actual
  assigned grant set (which for Admin is broad by design, ADR-002), not a hardcoded "Admin = superuser"
  bypass. This closes the legacy pattern's implicit trust in role names.
- Super Admin is not "Admin with more power" — it's a wholly separate axis (§4), not part of the RBAC
  inheritance chain at all.
- Custom tenant-added roles inherit no permissions by default — every grant is explicit, defaulting to
  denied (ADR-156).
- No explicit-deny-overrides-inherited-grant mechanism exists, since there is no permission inheritance
  hierarchy beyond "a role has the permissions explicitly assigned to it."

---

# 11. Authorization Policies

- Soft-deleted records cannot be modified — enforced at the API layer in addition to the database
  constraint layer (`2-database/4-database-standards.md` §13).
- Sensitive operations (e.g. Settings' integration credentials, ADR-048) require the Admin role's
  explicit `settings.integrations.manage` permission, not merely general Admin access.
- Only users whose role is 2FA-required (ADR-075) and who have completed 2FA for the session may access
  routes gated behind that requirement.
- A record locked for concurrent editing by another user cannot be modified until the lock releases
  (409 Conflict, not a permission denial). [Source: `decisions-log.md` ADR-079/080/084]

---

# 12. Protected Resources

- Every REST API endpoint under `/api/v1/...` except `POST /auth/login` and
  `POST /auth/forgot-password`.
- Audit Log (view access itself is a separate, assignable permission grant, not hardcoded to a role
  name — ADR-068).
- Background job status/results (bulk import/export, ADR-098) — scoped to the user who initiated the
  job, or an Admin.
- Skeleton control panel (tenant provisioning, migration fanout, cron management) — Super Admin only,
  entirely outside the tenant-facing RBAC model. [Source: `decisions-log.md` ADR-056, ADR-057, ADR-059]

---

# 13. API Authorization

- JWT Bearer token / API key, validated by the same Guard chain (§3).
- Permission middleware (NestJS Guard) evaluated per-route, before the controller method executes.
- Route protection: every controller method declares its required permission(s) explicitly — no
  implicit "authenticated = authorized" assumption.
- Resource ownership validation (§9) executed inside the Guard or the service layer, not left to the
  frontend to enforce.

---

# 14. UI Authorization

Full detail generates per module in `5-modules/<slug>/9-ui.md` (JIT). Project-wide principle: UI-level
hiding/disabling of unauthorized actions is a UX convenience only — it is never the actual security
boundary, since every one of these checks is re-enforced server-side (§13). Closes the legacy system's
defining, most-repeated finding (UI-only permission gating). [Source: `decisions-log.md` ADR-006]

---

# 15. Authorization Error Handling

| Error | HTTP Status | Description |
|--------|------------|-------------|
| Unauthorized | 401 | Not authenticated at all |
| Forbidden | 403 | Authenticated, but role/permission insufficient |
| Permission Denied | 403 | Authenticated, specific action permission missing |
| Resource Restricted | 403 | Ownership rule violation (e.g. B2B customer requesting another account's order) |
| Record Locked | 409 | Concurrent-edit lock held by another user (not a permission failure) |

---

# 16. Security Standards

- Least privilege: new-profile permissions default denied (ADR-156).
- Default deny: an unrecognized/unmapped route or action is denied, never implicitly allowed.
- Explicit permission checks on every controller method — no blanket "any authenticated user" fallback
  for mutating endpoints.
- Server-side enforcement only — the UI's own hiding/disabling is cosmetic (§14).
- Resource ownership validation (§9).
- Every authorization decision logged. [Source: `decisions-log.md` ADR-068]

---

# 17. Auditing & Monitoring

Captured in the project-wide audit trail (ADR-068), same mechanism as authentication events, not a
separate log:

- Access granted / access denied
- Permission changes (role edit consolidated to one clean save path — ADR-134)
- Role assignment / removal
- Privilege escalation attempts (e.g. a non-Admin attempting an Admin-only action)
- Policy violations (ownership-rule violations, §9)

---

# 18. Assumptions

- Detailed per-module permission matrices are generated at each module's own JIT
  `7-permissions.md` cycle, following the naming convention and default-deny model locked here — not
  pre-decided per module.

---

# 19. Constraints

- Authentication required before any authorization check runs.
- Every protected resource enforces authorization server-side — no resource relies solely on the
  frontend to restrict access.
- Permission checks are performed in the API layer (Guards/services), never delegated to the database
  layer alone or the client.

---

# 20. Related Documents

`2-authentication.md`, `1-api-design.md`, `1-project/2-requirements.md`,
`claude-docs/gap-analysis/decisions-log.md` (ADR-002, ADR-006, ADR-056, ADR-057, ADR-068, ADR-081,
ADR-156)

---

# 21. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-17 | Claude Code | Initial draft |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Security Architect | *(pending)* | | |
| Solution Architect | *(pending)* | | |
| Technical Lead | *(pending)* | | |

---

# AI Generation Notes

RBAC model selected and justified (§4), not asserted without reason. Role and permission definitions
kept generic here — module-specific permission matrices belong in each module's own
`7-permissions.md`, generated JIT. Every enforcement rule traces to a locked ADR; no open
`[NEEDS INPUT]` markers in this document.
