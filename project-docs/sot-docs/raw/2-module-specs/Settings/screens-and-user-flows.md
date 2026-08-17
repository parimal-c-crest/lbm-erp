# Settings — Screens & User Flows

> Views, fields, interactions, states. No component library or framework assumption.

Source: `docs_from_blueprint/module/Settings/08-screens-and-user-flows.md`. The underlying blueprint
does not document UI screens directly (that level of detail was explicitly out of scope for the source
blueprint passes — Pass 0 catalogs entry points/functions, not screen layouts). This file infers the
implied screen/interaction structure from the entities, rules, status findings, and outputs the
blueprint does document, expressed as views/fields/interactions/states rather than any specific UI
framework or component library — the same inference method the SalesOrder pilot's equivalent document
used as its model. Because this is inference rather than direct extraction, every claim below should be
read as "implied by the documented backend surface," not "confirmed from a screenshot or template
file."

## Screen Inventory

Because Settings has no single owned entity, it does not have one list/detail/edit screen triad the
way every other module in this series does. Instead, the implied UI structure is an **administrative
area with roughly 15 largely independent sub-screens**, each scoped to one concern area, reached from a
shared Settings landing/navigation surface rather than from a single entity's own list view.

| Screen | Purpose |
|---|---|
| Settings landing/navigation | Index of the ~15 admin sub-areas, gating access per sub-area by admin/superadmin role where the source blueprint confirms admin-only gating (F5 API keys, AWS S3 credentials, add-on toggles) and leaving access control unconfirmed elsewhere |
| Organization Details edit form | Singleton edit form for the tenant's org profile (name, address, tax/accounting, branding, mobile-app license, live/practice mode) — also carries the Base-currency reassignment side effect |
| Company Profile list + edit | Create/edit/delete for the multi-profile mechanism, with the delete action surfacing a blocking list of referencing Accounts when deletion is refused |
| Theme / Branding editor | Color-palette/font/layout theme editing |
| Terms & Conditions editor | Single free-text T&C body |
| Custom Field Labels editor | Renames three hardcoded Products custom-field labels |
| Outbound Email / SMTP config form | Org's outbound mail-server credentials |
| Role list/detail/create/edit | Role CRUD, backed by the orphan-profile bug on every edit (see `workflows.md`) |
| Profile permission-grid editor | Per-profile field/tab/action permission editing |
| Default org-wide field-access editor | Org-wide default field visibility/read-only baseline |
| Protected-field editor | Which fields are flagged protected/sensitive (Accounts-only in practice) |
| Sharing-rule create/edit | Role/group-scoped sharing rule administration |
| Group list/detail/create | Group CRUD with parent-chain exclusion in the member picker |
| Role-permitted-reports picker | Which reports a role can access |
| Tax Assignment Code (TAC) list | TAC CRUD plus a mass-apply-to-accounts action |
| Custom Field list/create/delete (per module) | Custom-field administration |
| Picklist/combo-value management | Picklist value administration with per-role value scoping |
| Lead-to-Accounts/Contacts/Potentials field-mapping grid | Lead-conversion custom-field mapping |
| Module Manager search-and-delete tool | Criteria-builder over a fixed set of eligible modules, feeding into a hard-delete confirmation |
| Module Manager restore screen | Separately-reached restore action (see `workflows.md` for its false-success behavior) |
| QuickBooks/Traverse settings | Per-profile QB/Traverse field-mapping/GL-account config |
| EDI trading-partner config (DIB/EJD/Orgill) | With an FTP/SFTP credential-test step for two of the three partners |
| Payment-gateway credential forms (×6, near-identical) | CardConnect, MX Merchant, Passport/Priority Payments, Dejavoo, ChargeItPro |
| Shipping-carrier config | FedEx/UPS/USPS/EliteExtra |
| E-commerce/BigCommerce/B2B-B2C/B2C/FanBuilder config | E-commerce integration credentials |
| Platform API-key management | F5 platform API keys |
| Generic external-API-credential form | Credentials for external systems calling in |
| AWS S3 bucket-credential form | **The single highest-stakes screen in the module** given its confirmed complete absence of any input escaping |
| Tax-table editor | General tax-rate configuration |
| Max-tax-cap manager | State-level tax cap administration |
| VDP plan/tier/account-assignment administration | Tier create/edit/delete, each carrying confirmed data-integrity bugs |
| Commission color-tier settings | Singleton 5-band commission-percent color config |
| Currency administration | Add/edit/delete (Base-currency reassignment side effect actually lives on the Organization Details form, not here) |
| Location create/edit admin UI | Over the Location module's own schema |
| Division management | Division's own duplicate-name check is confirmed non-functional |
| Region management | Duplicate-name check functions correctly |
| Physical-location sort ordering | Drag-sort admin list |
| Printer registry | Printer device administration |
| Per-module printer assignment | Printer-to-module/zone/delivery-method assignment |
| Word-template upload/list/download | Authoring/storage only |
| Email-template create/edit/list | Authoring/storage only |
| Pick-ticket zone-printer template screen | Printer-to-zone assignment with day/time scheduling |
| Document-folder/attachment management | Two parallel folder-tree mechanisms |
| Audit-trail log viewer | Plus its own on/off toggle (the toggle-flip itself is never logged) |
| Login/clock-history viewers | Read-only history |
| Inventory-notification rule editor | Notification templates scoped to inventory events |
| Email-notification-scheduler editor | Scheduled notifications referencing an Email Template |
| Announcements editor | Single per-creator announcement |
| Outbound mail/proxy/backup server config | With a genuine live-connectivity test step — the one confirmed functional-validation strength in this whole area |
| Company-holiday administration | Holiday date list |
| Clock-in lookup-list administration | Clock-in reason/detail codes |
| Default-value and lookup-code editors | Default SO account, shipping box sizes, delivery methods, lost-sale reason codes, etc. |
| Add-on subscription toggles | Per-feature on/off with subscription tracking |
| Data-warehouse export-log viewer | With a re-trigger action |
| Slipstream vendor bill-pay admin screen | Per-location Slipstream config |
| SO sub-status / web-order status managers | Status-master administration |
| Zone-printing configuration | Delivery-method print exceptions |
| Core Settings / Feature-Toggle admin UI | The module-wide generic settings-save mechanism's own rendered admin UI, spanning ~35 functional sections of the whole ERP from one shared, hand-built page assembly — simultaneously the single largest admin surface in the module and, per `build-guidance.md` D2, the one whose underlying dispatch mechanism a new implementation should not port forward at all |

## Flows

- **Export/download flows**: one per catalogued output in `outputs.md` — CSV exports for tax-table
  data, the zip-code master, the WAC change log, paint-care-fee configuration, and the custom-catalog
  subsystem; a PDF-generation flow for payroll reports; blob-download flows for Word templates and the
  organization logo.
- **Import flows**: CSV upload for the zip-code master (a destructive truncate-then-reload pattern with
  no safety net — see `risks-and-open-questions.md` R10) and for paint-care-fee configuration (a safer
  row-by-row upsert pattern, worth preserving as-is in any reimplementation).
- **Credential-test flows**: a subset of integration screens (Orgill EDI, EliteExtra, and the
  payment-gateway family's separate "test connection" action) expose an explicit connectivity-test step
  before or independent of saving credentials — this test result is never persisted, so the UI cannot
  currently distinguish "saved and verified" from "saved, verification unknown" at display time for any
  integration.
- **Mass-assignment flows**: the TAC-to-Accounts mass-apply action, and the currency-conversion-rate
  save's cross-module vendor-cost recompute (fired as a side effect of an otherwise ordinary
  currency-edit save, with no confirmation/preview step surfaced to the operator).
- **Delete/restore flows**: Module Manager's search-and-delete flow and its separately-reached restore
  flow are presented as a paired capability but are not functionally paired (see `workflows.md`) — a
  new implementation's equivalent UI should not imply reversibility that the underlying mechanism does
  not actually provide, and should make Delete's irreversibility explicit at the confirmation step
  rather than implying Restore can always undo it.
- **Role-gated flows**: several sub-areas are documented as admin/superadmin-only (F5 API keys, AWS S3
  credentials, add-on toggles); for most other endpoints in the module, whether any access-control
  layer exists above the individual save/delete action was not confirmed one way or the other by the
  source blueprint — a new implementation should treat server-side role enforcement as a requirement to
  build, not an assumption already satisfied by the legacy system.

## States

- **Module-level state**: given the module's own no-single-entity framing, there is no module-wide
  record status the way SalesOrder has an order status — each sub-area's own state (if any) is scoped
  to that sub-area alone.
- **Integration state**: an integration's enable/disable flag and its credential-configuration state
  are two entirely separate, never-reconciled pieces of state today (see `workflows.md`) — a new
  implementation's UI should surface both explicitly (configured vs. verified vs. enabled) rather than
  collapsing them into one indicator the way the legacy UI implicitly does.
- **Deletion state**: Module Manager's Active/Soft-Deleted/Hard-Deleted states should be surfaced
  distinctly in any list/detail view a new implementation builds for this capability — specifically, a
  record that is genuinely gone (Hard-Deleted) should never be presented as restorable in the UI,
  closing the false-success experience the legacy Restore action currently produces.
- **Validation/error states**: given the module's confirmed near-total absence of server-side
  required-field/type validation across most sub-areas (see `business-rules-and-validation.md`), a new
  implementation's UI cannot assume the legacy screens' apparent permissiveness reflects an intentional
  design choice — server-side validation should be added at the command/service layer independent of
  whatever client-side validation a new UI presents.
- **Currency Base-status**: whichever screen exposes the ability to change the organization's
  base-currency selection carries a real, guarded side effect today (reassigning which currency is
  Base) that is not confined to a dedicated "change base currency" action — a new implementation should
  make this an explicit, intentional action with its own confirmation step, not an incidental
  consequence of an unrelated form save.
- **Loading/empty/no-permission states per screen**: not independently confirmed by the source blueprint
  for any individual screen — the blueprint's own scope is entry-point/function cataloguing, not UI
  state inventory. Flagged as an open question rather than invented per-screen.

## Open Questions

- Whether the legacy templates render loading/empty/error/no-permission states consistently across the
  ~15 sub-areas, or per-screen ad hoc, was not traced by the source blueprint — this file infers screen
  existence from backend entry points, not from reading the template layer itself.
- Which template renders the base-currency selection field on the Organization Details edit form, and
  under what conditions it is exposed to an ordinary admin (always-visible vs. conditionally shown), was
  not traced (see `workflows.md`).
