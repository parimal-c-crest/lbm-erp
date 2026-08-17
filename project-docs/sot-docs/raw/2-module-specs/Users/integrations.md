# Users — Cross-Module & Integration Touchpoints

Source: `docs_from_blueprint/module/Users/07-cross-module-integrations.md`, itself from
`blueprint/module/Users/06-cross-module-integrations.md` ("Doc1 Pass 6"), design treatment from
`blueprint/module/Users/09-implementation-plan.md` §7 ("Doc2 §7").

## The blanket architectural fact (stated once, not per-relationship)

**Every other module in the codebase reads the Users context for record ownership and role/
profile-based permission checks.** Ownership references and every permission/visibility check
resolve against a user's role → profile → module/field/action permission chain. This is the single
largest cross-module fact about this module and is true for effectively all ~126 modules, which is
why it is recorded once here rather than as 130+ near-identical rows below. It also means this
module's permission read model is a dependency of effectively every other module's authorization
logic — the reason this module's own build sequencing front-loads auth/RBAC ahead of every other
concern (see `build-guidance.md`). The tables below document only relationships beyond this
baseline: places where this module's code concretely reads/writes another module's data, or another
module concretely writes into a Users-owned table/column.

## Related Modules

| Module | What This Module Reads | What This Module Writes/Triggers | Direction | Sync/Async |
|---|---|---|---|---|
| Leads (legacy misplacement — two files) | Two files physically located inside this module's directory operate entirely on Leads data, not Users data — genuine legacy misplacement, not a naming coincidence. One renders a Leads-only "Change Status"/"Change Owner" form, reading `vtiger_users` only incidentally to populate an owner-picker dropdown. | The "Change Status" path writes Leads status directly. The other file, despite its name suggesting a Leads-specific handler, is **not actually Leads-specific** — it is a generic mass owner/group-change engine shared across ~30 modules, dispatched by a request parameter naming the target module; hosted here but not Users' own business logic. | This module (UI render) → Leads (status/owner write) for the status-change path; the owner/group-change path is hosted here but multi-module generic. | Synchronous |
| Hrm | No coupling found from this module's side — a dedicated grep across every file in this module for any reference to Hrm returned zero matches. `modules/Hrm/` exists as its own directory, so the absence is a genuine architectural fact, not a missing-module artifact. | Nothing. | None confirmed. | N/A |
| PendingDeliveries | This module's own files were grepped for the written field and found no read, write, or reference to it at all. | N/A — this is a one-directional write **into** this module (see below), not something this module writes elsewhere. | PendingDeliveries → Users, one-directional write into a Users-owned column (`pdmstatus` on the User Header — see `entities-and-fields.md`). No reverse read confirmed from this module's code. | Synchronous — inline SQL within the same delivery-assignment request. Fired at two structurally parallel call sites (one per delivery-assignment flow), always writing both the outgoing and incoming driver id in the same statement, unconditional on any status check. |
| Calendar/Activities (`Delete.php` misnomer) | A file named as if it deletes a User record actually deletes one join-table row linking a salesman/owner to a Calendar/Activity record — no User row is read, written, or deleted anywhere in this file. | Deletes the Calendar/Activities relation row. This is the **same table** the Leads-hosted mass owner/group-change engine (above) also maintains as a side effect of its Calendar-branch logic — two structurally unrelated files in this module's directory both maintain this one relation table, from opposite ends. | This module (hosting the delete entry point) → Calendar/Activities. | Synchronous |
| Notification Schedulers (self-contained) | Its own module-owned table only, keyed by a small fixed numeric id range. | Active/inactive toggle on its own table. | None (self-contained) — no other module's table, entity class, or ownership field is read or written. | Synchronous, inline SQL |
| Mail Accounts (self-contained) | Its own module-owned mail-account table, scoped by user id. | Read/write of that same table. A single commented-out (dead) redirect line is the only evidence a broader Emails/Webmails-module integration was ever wired to this flow. | Self-contained — no confirmed FK relationship to any Emails/Webmails-module entity. | Synchronous, inline SQL/render |

## External Systems

| System | What Crosses the Boundary | Direction | Trigger | Sync/Async |
|---|---|---|---|---|
| QuickBooks (employee sync) | User/employee header data (name, DOB, SSN, phone, address, active status) as create/update/query events, keyed by QuickBooks list-id/edit-sequence pointers stored on the User record (see `entities-and-fields.md`). | This module → QuickBooks, structurally (the payload is always correctly built). | Per-user-save inline calls, plus a batch/cron dispatcher. | **Structurally async** (a durable queue + external polling consumer architecture), but **functionally dead** — every one of the three enqueue call sites in the integration file is commented out. This is the **third of three** QuickBooks integrations examined across this blueprint effort (one other module: live; another: dead; this module: dead) to show the identical disabled pattern. |

A repo-wide sweep for other outbound HTTP/curl/SOAP touchpoints across the files read in the source
pass found no additional external calls beyond the 2FA email-delivery path and the Word-template
merge mechanism (both out of that pass's targeted scope, not re-derived here).

## Cross-module/integration open items

- **The Hrm relationship remains unconfirmed from the Hrm side** — the source pass swept only this
  module's own files; a genuine relationship (if any) would have to be initiated from Hrm's own
  code, out of that pass's scope.
- **QuickBooks: three-for-three now examined across this blueprint effort, two confirmed dead.**
  Recommend SME confirmation before treating this integration as "live" in any rewrite
  requirements — this affects whether the QuickBooks list-id/edit-sequence fields on the User
  record ever actually get refreshed in production.
- **The delivery-assignment flag's apparent one-way, consumer-less lifecycle** — the write side is
  confirmed, but no reset-to-blank write site or consumer read site was found within this module's
  scope; a dedicated read of the PendingDeliveries module itself would be needed to close this out.
- **The Leads-hosted mass owner/group-change engine's ~28 other module-dispatch-table entries**
  (beyond the two branches actually reached from the files this module hosts) were never
  independently verified against each target module's own logic — out of scope, since those calls
  are hosted plumbing rather than this module's own business logic.

## New-implementation design treatment

Per the source blueprint's Doc2 §7: the PendingDeliveries write is modeled as an **event** this
module's own read model subscribes to (if the field's successor is confirmed to have a real
consumer — currently unconfirmed; if not, the field is dropped entirely rather than ported as
write-only dead weight), not a direct cross-module write into a table owned by this module. No
interface is designed for Hrm, consistent with the confirmed absence of coupling — revisited only
if Hrm's own future spec surfaces a relationship from its side. QuickBooks is **excluded from the
new design** pending SME confirmation of whether it should be revived or formally retired. The four
legacy-misplaced files (Leads/Calendar-Activities-related) are **not modeled as part of this
module's bounded context at all** — they belong to whichever module actually owns the data they
operate on.
