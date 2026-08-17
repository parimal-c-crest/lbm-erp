# Settings — Module Overview

> Copy this whole `2-module-spec-template/` folder per module, rename, fill in. Stay tech-agnostic
> throughout — no framework/database/language references anywhere in Stage 2.

## Origin

Extracted-from-legacy. Source: `docs_from_blueprint/module/Settings/01-module-overview.md`, itself
sourced from `blueprint/module/Settings/00-README.md` and `blueprint/module/Settings/00-pass0-inventory.md`
(the original 11-file Settings Business Blueprint), ultimately derived from the legacy `Settings/`
codebase (236 top-level `.php` files). Settings is the eighth module blueprinted in this series and is
documented as **the largest and worst-risk module blueprinted so far**: 236 top-level files (vs.
Products' previous high of 209), no single owned business entity, 8 Critical risk findings across 5
structurally distinct defect classes, ~47 confirmed SQL-injection sites across ~22 files, and plaintext,
zero-escaping storage of credentials for QuickBooks/Traverse, every EDI trading partner, six payment
gateways, and AWS S3 (`01-module-overview.md` §1.1–§1.2; `00-README.md`). Nothing in this file is
derived-from-BRD — no BRD exists for this module; everything traces to the legacy codebase via the
blueprint.

## Purpose

Settings is the system-configuration backbone of the vtiger-5.0.4-derived multi-tenant ERP system
(internally called "lbm-integer"). Unlike every other module blueprinted before it, Settings is **not
built around a single business entity** — a direct check of the underlying CRM framework's own module
registry (`SELECT tabid,name FROM vtiger_tab WHERE name='Settings'`) returns zero rows, confirming
Settings has no `vtiger_tab` entry at all. It is instead an **administrative area**: a collection of
roughly 15 largely unrelated system-configuration sub-domains, most with their own distinct backing
table(s), most of which carry no field-level customization metadata of their own because they are plain
admin-config tables rather than CRM entities (`01-module-overview.md` §1.1, citing
`blueprint/module/Settings/01-entities-fields.md` §Header).

The ~15 sub-domains, assembled into 7 concern-area sections in the source blueprint's Pass 1
(`01-module-overview.md` §1.2, citing `01-entities-fields.md` §1):

1. **Company / Organization Profile & Branding Configuration** — tenant identity (org profile, name,
   address, tax/accounting settings), a separate multi-profile mechanism, store profile, inventory
   terms & conditions, B2C site branding, custom field relabeling, theme/branding options, a Google
   Maps API key, outbound email/SMTP config, custom invoice/order numbering, and incoming mail
   accounts.
2. **Roles / Profiles / Field-Level Permissions / Sharing Rules** — role/profile/group/sharing-rule
   administration, the org-wide default field-level access baseline, protected-field flags, the Tax
   Assignment Code (TAC) lookup, and per-module owner assignment.
3. **Custom Fields / Module Manager / Picklists / Combo Fields** — the mechanism for adding custom
   fields to any module, picklist/combo-value administration (including per-role value scoping),
   Lead-to-Accounts/Contacts/Potentials custom-field-mapping on conversion, and a "Module Manager"
   physical-delete/restore admin tool.
4. **Integration Config: QuickBooks/Traverse, EDI, Payment Gateways, Shipping, E-commerce, API
   Keys/Credentials** — the widest-fan-out sub-domain: QuickBooks/Traverse accounting settings, EDI
   trading-partner configuration (DIB/EJD/Orgill), six payment gateways (CardConnect, MX Merchant,
   Passport/Priority Payments, Dejavoo, ChargeItPro, ExpiNet), shipping carriers
   (FedEx/UPS/USPS/EliteExtra), e-commerce connectors (BigCommerce, B2B/B2C wholesale-site-manager,
   B2C storefronts, FanBuilder), and API-key/credential management including AWS S3.
5. **Tax Configuration / Catalog Import-Export** — tax-rate table, state-level tax cap table,
   kit-category administration, and a separately-connected custom aftermarket-parts catalog
   import/export subsystem.
6. **Location / Division / Region / Printer Administration** — create/edit admin-UI surface for
   Location's own branch/store schema, plus division, region, physical-location sort ordering,
   printer registry, and per-module printer assignment.
7. **Document / Email / Word Template Management** — uploaded-document/attachment management (two
   parallel folder-tree mechanisms), Word mail-merge templates, email templates, and pick-ticket
   zone-printer templates.
8. **Audit Trail / Notifications / Currency Administration** — audit-trail log, clock-in/login
   history, inventory notifications, an email-notification scheduler, announcements, a
   weighted-average-cost change log, and multi-currency administration.
9. **Backup & Server Configuration / VDP Tier & Color Settings / Time-Clock & Payroll** — outbound
   mail/proxy/backup server configuration, Vendor Direct Pricing (VDP) plan/tier/account
   administration, commission color-tier settings, a dynamic alternate-cost-field mechanism, company
   holidays, and clock-in lookup lists.
10. **Misc Admin Utilities** — default values and lookup codes (default SO account, shipping box
    sizes, delivery methods, lost-sale reason codes, and more), add-on subscription toggles, a
    data-warehouse export log, the Slipstream vendor bill-pay integration, SO sub-status/web-order
    status managers, and zone-printing configuration.
11. **Core Settings Ajax Dispatcher / Module Entry Points** — the generic `vtiger_supportedfield`
    key-value settings table (the module's central feature-flag/configuration-value store, backing
    hundreds of individually-named admin toggles across ~35 functional sections of the whole ERP) and
    the request-routing files (`SettingsAjax.php`, `Save.php`, `index.php`, `Forms.php`) that most of
    the rest of the module is reached through.

**Risk framing** (detail in `risks-and-open-questions.md`): documented as the worst-risk module in the
entire blueprint series — 8 Critical findings spanning 5 structurally distinct defect classes, ~47
confirmed SQL-injection sites across ~22 files, 9 data-integrity bugs, and 7 broken table references,
one of which breaks an entire feature end-to-end. Because this module holds the credential store for
QuickBooks, every EDI trading partner, six payment gateways, and AWS S3 — several in plaintext,
zero-escaping storage — its blast radius crosses the application's own boundary into third-party
financial/infrastructure systems, not just across internal modules (`01-module-overview.md` §1.2, citing
`00-README.md`).

## Actors

Derived from the sub-domain list above (`01-module-overview.md` §1.4, citing `01-entities-fields.md`
per-section attributions):

- **System/superadmin administrators** — primary actors across nearly every sub-domain: organization
  profile and branding, roles/profiles/permissions/sharing rules, custom fields and the Module Manager
  physical-delete tool, integration credentials, tax configuration, add-on subscription toggles, and
  server/backup configuration. Several sub-areas are explicitly admin-only or superadmin-only gated
  (e.g. F5 API keys, AWS S3 credentials, add-on toggles).
- **Organization/company profile managers** — maintain org identity, branding, theme, terms &
  conditions, and outbound-email configuration.
- **Integration/IT administrators** — configure and hold credentials for QuickBooks/Traverse accounting
  sync, EDI trading partners (DIB/EJD/Orgill), payment gateways, shipping carriers, e-commerce
  connectors, AWS S3, and Slipstream vendor bill-pay.
- **Location/branch managers** — create and edit branch/store records, divisions, regions, and
  per-location printer assignments through Settings' write surface over Location's own schema.
- **Template/document designers** — manage Word mail-merge templates, email templates, document
  folders, and pick-ticket zone-printer templates.
- **Auditors / compliance reviewers** — consume the audit trail, login/clock history, and the
  weighted-average-cost change log.
- **Pricing/finance administrators** — configure VDP plans/tiers/account assignments, commission color
  tiers, currency administration, and tax rate/cap tables.
- **Counter/warehouse/service staff (indirect consumers)** — do not administer Settings directly, but
  the sub-status managers, delivery-method lookups, return-reason codes, and printer assignments
  configured here drive behavior those staff experience in other modules.
- **System/integration processes** — the QuickBooks/EDI/payment-gateway/shipping/e-commerce/AWS S3
  external systems themselves, consuming the credentials and settings this module stores.

## Scope within this module

**In scope** (`01-module-overview.md` §1.3, citing `00-README.md` and `01-entities-fields.md` §Header):
the ~15 admin/configuration sub-domains listed above, and this module's role as the **CRUD/UI surface**
over schema that other modules' own blueprints already catalogue end-to-end. Two explicit structural
relationships are called out by the source rather than assumed here:

- The Roles/Profiles/Permissions/Sharing sub-domain is, in large part, the admin-UI write surface for
  role/profile/group/sharing-rule schema the **Users** module's own field catalog already owns
  end-to-end (`01-entities-fields.md` §Roles/Profiles/Permissions/Sharing, "Cross-reference with Users
  module Pass 1").
- The Location/Division/Region/Printer sub-domain is the create/edit admin-UI write surface for
  `vtiger_location`/`vtiger_location_accounting`, which the **Location** module's own field catalog
  already owns end-to-end (`01-entities-fields.md` §Location/Division/Region/Printer Administration,
  "Location-module cross-reference finding").

Settings' own field catalog therefore does not re-derive those modules' schemas — it documents
Settings' write-surface role and catalogues only what is genuinely new/Settings-owned. The module's
Custom Fields/Module Manager sub-domain is similarly framed as an admin UI over vtiger-core metadata
infrastructure (`vtiger_field`, `vtiger_profile2field`, `vtiger_picklist`, etc.) shared by every module
in the system, not business data Settings itself owns.

**Out of scope**:
- Full column-by-column re-cataloguing of vtiger-core metadata tables (`vtiger_field`,
  `vtiger_profile2field`, `vtiger_def_org_field`, `vtiger_role2picklist`, `vtiger_picklist`,
  `vtiger_crmentity`) shared by every module — the source treats these at table-purpose depth,
  judging full depth out of scope for a Settings-specific pass.
- Full column-by-column re-cataloguing of the Users, Location, and Products modules' own schemas —
  cited by cross-reference where Settings is their write surface, not re-derived here.
- Deployment/cutover sequencing beyond outline depth (covered at outline depth in
  `build-guidance.md`).
- Selecting an implementation technology stack (explicitly deferred, consistent with every other
  tech-agnostic module spec).

## Dependencies

Per `07-cross-module-integrations.md` (see `integrations.md` in this spec for the full breakdown):
Accounts, Location, Products, SalesOrder, SearchLineItem, Users, Vendors — all already-blueprinted
modules whose schema or behavior Settings reads, writes, or administers on top of. In addition,
Settings is the credential/configuration store consumed by roughly 20 external integration surfaces
(QuickBooks/Traverse, EDI trading partners, six payment gateways, shipping carriers, e-commerce
connectors, AWS S3) — see `integrations.md`.
