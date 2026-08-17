# Settings — Build Guidance

> Guidance for Stage 4, stated stack-neutrally.

Source: `docs_from_blueprint/module/Settings/10-build-guidance.md`, itself sourced from
`blueprint/module/Settings/09-implementation-plan.md` ("Doc 2 — New-Stack Design") and
`blueprint/module/Settings/10-deployment-cutover-outline.md` ("Doc 3 — Deployment/Cutover Plan
Outline"). This section is guidance for however a downstream process structures its own
implementation-plan and testing documentation — it is not itself an implementation plan, a schema
migration script, or an API specification. Unlike a single-aggregate module's build guidance,
Settings' own blueprint-source implementation plan starts from a foundational structural decision —
**decomposing Settings into seven bounded contexts** — because the source is explicit and consistent
across all its passes that "Settings has no single 'Relationship summary' the way a normal
business-entity module does."

## Governing decisions (the "why" behind the enforcement mapping)

The source implementation plan documents thirteen numbered decisions (D1–D13); the ones that most
directly shape how a new implementation should be built are summarized here:

- **D1 — Seven bounded contexts, not one aggregate; two are thin layers over other modules' domains.**
  Identity & Access (a thin admin-command layer that validates input and dispatches into the Users
  module's own already-designed role/profile/group/sharing-rule commands — never a parallel write
  path) and the Location-admin slice of Organization Configuration (the same pattern over the Location
  module's own `location`/`location_accounting` design) are **not** re-designed as new domains; the
  remaining five contexts (Integration Credentials, the non-Location slice of Organization
  Configuration, Tax & Pricing Configuration, Templates & Documents, Audit & Notifications) are
  genuinely Settings-owned. This directly targets the root cause of SET-RISK-002 (`SaveRole.php`'s
  orphan-profile bug): the legacy defect exists precisely because Settings currently maintains a
  second, independently-coded profile-write mechanism instead of calling into the one path Users
  already owns.
- **D2 — Security-by-construction, not a patched dispatcher.** The legacy `SaveSupportedField.php`
  (2,356 lines, ~35 sections) is confirmed *structurally* unsafe by design; `SettingsAjax.php` is worse
  still — an arbitrary-file-include primitive. **Decision: the new design has no equivalent to either
  file.** Every one of the ~35 settings sections becomes its own typed command with an explicit input
  schema and a compile-time target-field allow-list; every action is a named, registered route, never a
  resolved file path. The remaining ~45 injection sites are closed the same way: raw string-interpolated
  SQL and dynamic column-name construction from request input are made structurally unavailable to
  business-logic code, not merely disallowed by convention.
- **D3 — Every integration credential moves to a dedicated secrets-vault reference, never a plaintext
  column.** Given `awsS3Key.php`'s confirmed status as the single worst-defended credential-handling
  finding in the corpus, and given the same unencrypted pattern recurring across QuickBooks
  (`fuse5_qbsettings.value`), six payment-gateway config tables, and EDI/FanBuilder credentials, every
  Integration Credentials table stores secret-shaped fields as opaque references into a secrets-vault
  service (envelope encryption or an external KMS-backed manager), never as a plaintext database column
  — a `*_secret_ref` column, never a `*_secret`/`*_password`/`*_key` plaintext column. Credential access
  is logged through a channel independent of the general audit-trail toggle (closing SET-RISK-006 for
  this specific, highest-value class of data, jointly with D11).
- **D4 — Module Manager Delete/Restore becomes a real trash/recycle-bin pattern**, not a patch on the
  legacy's two independently-designed halves. The new design gives every deletable entity exactly three
  real states — **Active → Trashed (a full-row-set snapshot exists, restorable) → Purged
  (irreversible)** — with Restore only ever offered against, and only ever succeeding against, the
  Trashed state, and failing loudly rather than silently when the snapshot is missing. This closes
  SET-RISK-007 by construction.
- **D5 — `SaveRole.php`'s successor has no independent profile-construction logic at all.** It validates
  the submitted permission grid and calls Users' own `Role.updatePermissions()`/`Role.create()`
  aggregate commands exactly once — there is exactly one place a role's permissions can be written.
- **D6 — VDP tiers get one shared domain invariant (`VdpTierSetInvariant`) enforced on both create and
  delete**, closing SET-RISK-003 (create-side rebate-zeroing bug) and SET-RISK-011 (delete-side
  sequence-gap bug) with a single mechanism rather than two point fixes: after any create, update, or
  delete, the full ordered tier-band set for a plan must be non-overlapping, contiguous, monotonically
  increasing, and every band must carry an explicit non-null discount percent (defaulting to the value
  of the band it split from, never to an implicit zero) — violating this rejects the write with a typed
  error rather than silently committing a corrupted structure. The design explicitly documents that
  this invariant protects a monthly rebate report's correctness, not live Sales Order line pricing.
- **D7 — the currency-rate cascade becomes an explicit domain event, not a direct cross-module function
  call.** `UpdateCurrencyRateCommand` persists the new rate, compares it to the prior value, and
  publishes `CurrencyRateChanged` **only on an actual change** (closing the "fires on every save
  regardless of which field changed" half of SET-RISK-004) — it contains no vendor-cost recompute
  logic and no reference to the vendor equivalent-parts table at all. The consuming logic becomes the
  Vendors bounded context's own responsibility as an event consumer, with at-least-once delivery and an
  idempotent consumer required so a duplicate delivery cannot double-apply the division.
- **D8 — a per-feature rebuild-or-drop judgment test for every dead/broken legacy feature**, rather than
  a blanket rule. Several of SET-RISK-009's dead-table findings (Alternate Costs, the BigCommerce
  single-active-credential rule, the re-brandable theme system, Fuse5Connect cross-tenant sharing) each
  get their own named disposition question — rebuild if the source shows real, intended business value
  and no live contrary evidence; otherwise exclude pending SME confirmation. None is silently ported
  broken, and none is silently dropped.
- **D9 — Custom Field/Schema Management (`vtiger_supportedfield`'s ~35 sections, Module Manager's DDL
  mechanism) is treated as a platform capability**, not hand-rolled Settings-domain entities — the new
  stack's chosen ORM/migration tooling and a first-class config-schema/feature-flag service should
  provide this natively.
- **D10 — every multi-statement, non-transactional mutation gets a real transaction wrapper.**
  `saveZinecode.php`'s truncate-then-reload (SET-RISK-010), `CurrencyDelete.php`'s reassignment gap
  (part of SET-RISK-005), and `DeletePickList.php`'s replace-mode statements (SET-RISK-013) all get the
  same fix: load into a staging area and swap (for the zip-code import specifically) or wrap in one
  transaction with a pre-commit integrity check — never an observably-empty live table during an
  import, never a partial multi-table replace left uncommitted.
- **D11 — Audit Trail becomes a dual-channel design.** The toggle keeps its real two-state shape (no
  evidence supporting a richer state machine was found) but the toggle-flip itself is now an
  always-logged `security_event_log` entry, written through a channel the flag being toggled cannot
  itself gate — closing SET-RISK-006's tamper-resistance gap without inventing lifecycle complexity the
  evidence doesn't support.

## Rule-to-Enforcement-Layer Mapping Approach

The 209 numbered rules (`SET-RULE-001`–`SET-RULE-209`, see `business-rules-and-validation.md`) are
mapped at the theme/bounded-context level — the same latitude the source's own extraction passes used
for this module, given its scale (more than triple a typical single-entity module's rule count).
Enforcement-layer vocabulary: **domain model invariant** (enforced inside an aggregate, cannot be
bypassed), **application service** (orchestration/side-effect gating), **DB constraint** (integrity
backstop), **closed by construction** (the legacy failure mode is structurally unavailable in the new
design), **thin-layer delegation** (Settings validates admin input; the actual invariant lives in
Users'/Location's own aggregate).

| Rule group | Bounded context | Rule ID range (approx.) | Primary enforcement layer |
|---|---|---|---|
| Company/Org Profile & Branding | Organization Configuration | SET-RULE-001–029 | Application service; the arbitrary-column-write pattern (`updateOrganizationDetails.php`) is closed by construction — no generic `ColumnName`/`Value` endpoint exists in the new design at all |
| Roles/Profiles/Permissions/Sharing | Identity & Access | SET-RULE-030–065 (approx.) | Thin-layer delegation for create/edit/delete (closing SET-RISK-002 by construction); application service for the TAC/module-owner/protected-field satellite entities |
| Custom Fields/Module Manager | Custom Field/Schema Management | SET-RULE-066–071 (approx.) | Not applicable in the legacy shape — replaced by platform tooling (D9); domain invariant for Delete/Restore (D4) |
| Integration Config: QB/Traverse/EDI/Payment Gateways | Integration Credentials | SET-RULE-089–111 (approx.) | Domain invariant (credential-save gating preserved where already confirmed working — Orgill/EliteExtra's live-connectivity check before save); closed by construction for plaintext storage (D3) |
| Tax Configuration / Catalog Import-Export | Tax & Pricing Configuration | SET-RULE-112–130 (approx.) | Domain invariant — `managedivision.php`'s duplicate check is fixed, not ported: the real column name, a strict comparison, no loose-comparison coercion path exists at all |
| Location/Division/Region/Printer | Organization Configuration | SET-RULE-131–148 (approx.) | Thin-layer delegation for Location itself; domain invariant for the genuinely Settings-owned Division/Region/Printer satellites. `savestlocation.php`'s arbitrary-column-write is closed by construction |
| Document/Template Management | Templates & Documents | SET-RULE-157–166 (approx.) | Application service. `SaveCustomLabels.php`'s missing `tabid` scope (SET-RISK-012) is fixed: every field-label write is always scoped by `(tabid, fieldid)`, never `fieldid` alone |
| Audit Trail/Notifications/Currency | Audit & Notifications / Tax & Pricing Configuration | SET-RULE-149–172 (approx.) | Domain invariant (D7's currency event-gating; D11's audit dual-channel); application service (notifications) |
| Backup/Server Config, VDP Tier/Color, Time-Clock/Payroll | Organization Configuration / Tax & Pricing Configuration / Identity & Access | SET-RULE-173–199 (approx.) | Domain invariant (D6's `VdpTierSetInvariant`, closing SET-RULE-193's undefined-variable bug alongside SET-RISK-003/SET-RISK-011); application service (backup/proxy's genuine live-connectivity gate — the one confirmed functional-validation strength in this whole area, preserved unchanged); thin-layer delegation (time-clock/payroll) |
| Misc Admin Utilities / Core Settings Ajax Dispatcher | Custom Field/Schema Management, Operational Reference Data | SET-RULE-179–187 and ~200–209 | Closed by construction (D2) — the 35-branch dispatcher and the arbitrary-file-include primitive are both eliminated, not patched; there is no equivalent file in the new design for these rules to describe defects in |

**Total: 209 of 209 rules mapped**, at the theme level, matching the source's own explicit latitude for
this module's scale.

## Suggested Build Sequencing

Unlike a module with a core entity, Settings has no "schema first" progression that applies uniformly.
The source's own implementation plan reasons through three simultaneous sequencing forces:

1. **The security architecture (D2/D9) is foundational, not a per-entity concern.** Settings' typed-
   command architecture *is* the schema-access mechanism for every one of the seven bounded contexts —
   building any context's commands before this exists would mean building them twice. Given the
   remediation urgency of SET-RISK-001 through SET-RISK-008, the command/routing/data-access
   foundation, the generic trash/recycle-bin mechanism (D4), and the dual-channel audit/security-event-
   log (D11) all belong in the first build phase, before any bounded context's own business entities.
2. **Integration Credentials (Context 2) comes early relative to the other five business contexts** —
   not because of an internal dependency, but because other modules' own confirmed-live integrations
   (SalesOrder's QuickBooks sync, Products' Fuse5Connect inbound API, Vendors' SlipStream relationship)
   are all blocked on this context's config existing in the new schema.
3. **Identity & Access and the Location-admin slice are gated on Users' and Location's own build
   phases**, not on anything internal to Settings — they have no logic of their own to build ahead of
   the aggregate commands they call existing.

A recommended ten-phase build order:

1. **Resolve blocking open decisions** — product-owner/SME sign-off on the per-feature rebuild-or-drop
   questions (D8): is Alternate Costs a live business need; is the BigCommerce single-active-credential
   rule still wanted; is Fuse5Connect cross-tenant sharing still live; plus the VDP-formula
   business-scoping cross-reference addendum. Verify: a decision log, one paragraph per resolved item.
2. **Foundational security & platform infrastructure** — the typed-command-per-action routing/
   data-access architecture (D2, D13); the generic trash/recycle-bin mechanism (D4); the dual-channel
   audit/security-event-log design (D11); the config-schema service's registration mechanism (D9).
   Verify: a zero-raw-SQL/zero-dynamic-column-name static-analysis audit passing; a test proving the
   restore path fails loudly against a purged/nonexistent snapshot; a test proving the audit-toggle
   action is always logged regardless of the resulting flag value.
3. **Integration Credentials core** — QuickBooks/Traverse, EDI trading partners, payment gateways,
   shipping carriers, e-commerce, platform API keys, Fuse5Connect sharing; every secret field as a vault
   reference (D3). Sequenced immediately after the foundation, ahead of every other business context.
   Verify: a static schema-introspection test proving no Integration Credentials table has a
   plaintext-capable secret column; an integration test confirming a credential round-trips through the
   vault, never touching the application database for the secret value itself.
4. **Organization Configuration (non-Location slice) and Operational Reference Data** — organization
   profile (singleton), mail/backup/proxy server config, custom numbering, division/region/printer
   registry, status-manager and reason/discrepancy/delivery-method lookups. No external gating. Verify:
   the backup/proxy live-connectivity pre-write gate reproduced as a passing test against a stub target.
5. **Location-admin thin layer** — gated on Location's own build phases having its aggregate commands
   available to call. Verify: a test confirming no direct table write from Settings' own code to
   Location's tables — every mutation flows through Location's own command.
6. **Identity & Access thin layer** — gated on Users' own build phases. Verify: the single
   highest-priority regression test in this phase — a role edit through the new command produces
   **zero** new Profile rows beyond the one being edited (the direct, named closure of SET-RISK-002).
7. **Tax & Pricing Configuration** — TAC, tax-table config, VDP plan/tier/account-assignment (D6's
   invariant), commission-tier bands, currency (D7's event publisher). Verify: a golden-output test
   reproducing the exact VDP tier-squash scenario, asserting rejection under the new invariant; a
   contract test confirming the currency-change event fires only on an actual rate-value change.
8. **Custom Field/Schema Management: typed config-schema population** — the ~35 typed schemas replacing
   `vtiger_supportedfield`'s sections. Verify: a static check that no code path can write an arbitrary
   settings-row equivalent without going through a registered schema.
9. **Templates & Documents** — document templates/folders/watermark config, the unified export/
   download/PDF services. Verify: snapshot tests for each catalogued output; a test confirming the PDF
   pipeline checks the subprocess's actual exit status, not merely file existence.
10. **Audit & Notifications (remaining) and cross-module integrations** — notification scheduler,
    announcements, login/clock-history read-models, SlipStream admin actions, and the cross-module
    interface contracts named in `integrations.md`. Verify: one contract test per named boundary,
    including an idempotent-double-delivery test for the currency-change event.

## Test/Verification Strategy Pointer

- **Rule-to-test mapping**: one test per rule ID at minimum, per this project's stage-4 discipline —
  given the theme-level enforcement mapping above, this means at minimum one test per bounded context's
  enforcement mechanism covering its rule-ID range, plus dedicated regression tests for every
  Critical/High risk (SET-RISK-001 through SET-RISK-010).
- **Bounded-context boundary tests**: for each thin-layer context (Identity & Access, Location-admin), a
  static-analysis-style test proving zero direct writes to Users'/Location's own aggregate tables from
  Settings' own code — the architectural guarantee the thin-layer decision depends on, checked
  mechanically.
- **Domain invariant unit tests**: one test per invariant (the VDP tier-set invariant, Base-currency-
  delete rejection, the organization-profile/audit-config singleton constraints), including explicit
  boundary tests — a contiguous-but-non-monotonic tier set rejected, a tier set missing a discount value
  on the top band rejected, a second Base-currency row rejected, a second organization-profile row for
  the same tenant rejected.
- **Security regression tests**: one negative test per confirmed injection site (SET-RISK-001),
  reproducing the exact cited payload shape for each of the deep-verified headline candidates
  (`savestlocation.php`, `updateOrganizationDetails.php`, `awsS3Key.php`, `SaveAccountVDPPopUp.php`, the
  `sosubstatus.php` "LBM#912" cluster) and asserting rejection, not merely "no crash." Given the raw
  count (~47 sites), this suite should be mechanically generated/enumerated from the source's own
  citation list, not hand-written ad hoc, to avoid silently missing a site.
- **Secrets-handling tests**: a static schema-introspection test per Integration Credentials table
  proving no column is capable of holding a plaintext secret value; an integration test confirming a
  credential value never appears in application logs or error messages.
- **Financial-pipeline golden-output tests**: known tier-band-set + net-sales input → exact expected
  rebate output; known vendor/currency-rate input → exact expected vendor-cost output (the latter owned
  by the Vendors bounded context's own test suite, contract-tested from Settings' side only at the
  event-publication boundary).
- **Lifecycle/trash-recycle-bin tests**: a test proving Restore only ever succeeds against a
  Trashed-state record; a test proving Purge is irreversible and requires its own explicit confirmation
  step, distinct from ordinary Delete.
- **Audit/logging tests**: a test proving security-event-log entries are written even when the general
  audit-trail flag is disabled; a test proving credential access is logged independently of both flags.
- **Cross-module contract tests**: one per named boundary — Users' and Location's own commands, Vendors'
  currency-change event consumer (including the idempotent-double-delivery variant), Products' generic
  trash/recycle-bin restore path, SalesOrder's tax/VDP/config-toggle read contracts.
- **Migration/data-integrity audit scripts** (not unit tests against new code): run against the legacy
  system's live data to quantify how many rows fall into each of SET-RISK-009's seven dead/mismatched-
  table buckets, and to confirm whether Alternate Costs, VDP, Traverse, and the other D8-gated features
  have any real production usage, before any migration decision is made about them.

## Deployment/cutover notes (outline-depth, per the source's own stated scope)

The source's deployment/cutover document is explicitly **outline-only**, deferred to full depth until a
tech stack is chosen and a pilot module has been cut over at least once. Its central finding, worth
carrying forward: **there is no single "Settings cutover date."** The seven bounded contexts have
different cutover shapes — Identity & Access's cutover is entirely bound to Users' own; Integration
Credentials is a credential-rotation project, not a data copy (every migrated credential should be
treated as compromised by definition, having sat in a queryable plaintext column exposed to
SET-RISK-001's injection cluster for an unknown period, and re-provisioned/rotated with the owning
third party rather than merely relocated); Organization Configuration is close to a one-time singleton
copy; Custom Field/Schema Management is platform infrastructure that must exist before any other
context's cutover can happen at all; Tax & Pricing, Templates & Documents, and Audit & Notifications can
follow a more conventional migration pattern once the platform infrastructure is live. Pilot-tenant
selection should weight toward the simplest integration footprint (fewest active payment gateways/EDI
partners) and low VDP/tax-rule complexity, to minimize external-coordination risk during the first
cutover attempt.

The source document's strongest, most explicit statement — reproduced here because it bears directly on
build sequencing, not only on deployment timing — is that **the AWS S3/payment-gateway-adjacent
injection sites (SET-RISK-001) and the unaudited mass-mutation trigger (SET-RISK-004) should be
evaluated for immediate legacy-system remediation independent of the rewrite timeline**; this module's
Critical-tier findings are live in production today and should not be treated as something that only
gets fixed at cutover.
