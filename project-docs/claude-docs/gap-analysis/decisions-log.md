# Decisions Log

Cross-cutting decisions — locked. Every document generated from `3-document-generate/` onward
references these entries; none may be independently restated or re-decided per-module.

---

## ADR-001: Legacy remediation is out of scope

**Context**: Every one of the 18 blueprinted modules' `risks-and-open-questions.md` recommends fixing
its confirmed SQL injections in the legacy system now, independent of the rewrite timeline (e.g.
Settings ~47 sites, SalesHistory's everyday save-form path, PurchaseOrder's `CalcTotal.php`).

**Options considered**: (a) rewrite-only — this project's docs/plan/implementation cover only the new
system; (b) track legacy fixes as a parallel, in-scope effort with its own milestone; (c) leave
undecided per-module.

**Decision**: (a) Rewrite only. Legacy SQLi/security findings are documented as-found (they justify
and inform the rewrite's architecture — e.g. mandatory server-side recomputation, Guards on every
write endpoint) but are **not** tracked as fix-it tasks in this project's `claude-docs/plan/`.

**Consequences**: `6-implementation-plan/` must never create a task/epic for patching the legacy
codebase. If a legacy security incident occurs before cutover, it's handled outside this project
(no `10-release/2-incident-response.md` applies to legacy code). Every module's risk register stays
as historical/architectural justification only.

---

## ADR-002: Starter role catalog

**Context**: The legacy system has no formal role catalog — access is generic vtiger CRM
action-level permissions (`isPermitted()`), not named business roles. Every module's future
`7-permissions.md` and the cross-cutting `3-api/2-authentication.md` / `3-authorization.md` need a
role list to reference.

**Options considered**: (a) use a role list inferred from actor descriptions scattered across all 18
module specs; (b) developer supplies a fresh list; (c) defer until `3-api/3-authorization.md`
generates.

**Decision**: (a) Use the inferred starter list, confirmed by developer:
- **Counter/Sales Staff** — order entry, quoting, customer-facing transactions (SalesOrder, Accounts,
  Products read).
- **Warehouse/Fulfillment Staff** — picking, receiving, stock transfers, delivery prep (Location,
  PurchaseOrder receiving, SalesOrder fulfillment).
- **Accounting/Management** — credit, statements, deposits/ROA, cost/margin visibility, financial
  reporting (Accounts, AccountStatement, cost reports across modules).
- **Purchasing Staff** — vendor management, PO creation/reconciliation, EDI (Vendors, PurchaseOrder,
  PurchaseLineItem/History).
- **Admin** — Users/role management, Settings, pricing-tier configuration (MPLPricePlan,
  Pricebooklevel200/300/800), system configuration.
- **B2B Customer** — external storefront access (Accounts B2B auth, AccountStatement B2B delivery).

**Consequences**: This is a *starter* list, not exhaustive — module-specific sub-permissions (e.g.
"Return"-transaction gating on SalesOrder Quick SO, tax-field-edit locking) layer on top as scoped
grants, not new roles. Every module's `7-permissions.md` maps its actions against this list rather
than inventing role names. Revisit only via a recorded amendment to this ADR, not silently per-module.

---

## ADR-003: Legacy module-count figures are provisional, not authoritative

**Context**: SoT documents disagree on total modules in scope long-term — most (`scope.md`,
`project-overview.md`, `business-case.md`, `project-charter.md`) state 135 total → 42 dead → 93 in
scope; `1-business-requirements/tech-stack.md` instead states 111. Developer's own assessment:
module-count figures in the legacy-extraction material are sometimes simply wrong.

**Options considered**: (a) lock 93 as authoritative (majority-source); (b) lock 111; (c) treat all
stated long-term module-count figures as provisional/unreliable, not a resolved fact.

**Decision**: (c). No specific long-term module-count figure (93, 111, or otherwise) is treated as
authoritative. The only firm figure is the confirmed MVP-18 (16 core + UOM + AccountStatement, all
fully blueprinted) — see `module-list.md`. Anything beyond MVP-18 is described as "the remaining
modules, count TBD, to be blueprinted incrementally" rather than a specific number.

**Consequences**: No generated document (module-list, roadmap, dashboard) may state a specific
post-MVP module count as fact. `6-implementation-plan/`'s milestone structure should not presuppose a
fixed total module count when sizing later milestones — size incrementally, module by module, as each
gets blueprinted.

---

## ADR-004: Multi-tenancy — row-level security, single shared schema

> **⚠️ SUPERSEDED by ADR-056.** Developer reopened this decision — new system now uses
> database-per-tenant, matching legacy's actual existing hosting model, not RLS-on-shared-schema.
> Kept below, unedited, for historical traceability only — do not build against this entry.

**Context**: Legacy system's UOM module confirmed a real gap — no tenant column at all on its tables.
Already resolved at the tech-stack-decision stage (`3-tech-stack-decision/tech-stack.md`), restated
here because it's referenced by every module's schema.

**Options considered** (per source): RLS on single shared schema / schema-per-tenant /
database-per-tenant.

**Decision**: Row-level security (RLS) on a single shared schema, chosen specifically to close UOM's
confirmed tenant-scoping gap.

**Consequences**: Every entity in every module's `4-schema.md` carries a `tenant_id` column (see
ADR-005 for exact naming); every uniqueness constraint is scoped `(tenant_id, ...)`, never global —
this generalizes SalesOrder's own R5 and SalesHistory's own R6 requirements to every module, not just
those two. **Superseded — see ADR-056.**

---

## ADR-005: Standard audit/system columns and naming convention

> **⚠️ PARTIALLY SUPERSEDED by ADR-073.** The `tenant_id` column below is dropped project-wide — see
> ADR-073. Every other column in this entry (`id`, `created_at`/`updated_at`, `created_by`/
> `updated_by`, `is_deleted`/`deleted_at`) still stands unchanged.

**Context**: No SoT document specifies a naming convention for standard columns (id, tenant scoping,
audit trail, soft-delete) — every module would otherwise invent its own, repeating the exact
"legacy system re-invents this per module, inconsistently" pattern the rewrite exists to close (e.g.
Users' `is_login` exhaust field, SalesOrder's dead Status History table, inconsistent soft-delete
enforcement across modules).

**Options considered**: (a) leave to each module's schema doc to decide independently; (b) lock one
standard set now, referenced everywhere.

**Decision**: (b). Every entity table gets, in addition to its business fields:
- `id` — UUID (v4) primary key, not an auto-increment integer. Chosen specifically to close the class
  of IDOR/enumeration risk found repeatedly in the legacy system (e.g. Vendors' physical-address IDOR,
  Pricebooklevel200's `DetailViewAjax.php` arbitrary-write-by-guessable-id).
- `tenant_id` — UUID, FK, required, part of every uniqueness constraint (ADR-004).
- `created_at`, `updated_at` — timestamptz, system-set.
- `created_by`, `updated_by` — FK to Users, system-set.
- `is_deleted` (boolean, default false) + `deleted_at` (nullable timestamptz) — soft-delete, uniform
  across every module (closing the legacy pattern where soft-delete existence/enforcement varied
  module to module — e.g. SalesHistory's is genuinely exercised, Vendors has none).
- Where a module's own blueprint documents a derived/accumulated total with multiple historical
  writers (SalesHistory's `total_activity`, PurchaseHistory's equivalent), an additional append-only
  `<entity>_event` table plus a `version` optimistic-lock column, per the "single authoritative
  aggregator" pattern documented in those modules' own `calculations.md` — not a new pattern invented
  here, generalized as the standard approach anywhere else the same shape recurs.

**Consequences**: `2-database/4-database-standards.md` states this once; no module's own `4-schema.md`
restates or re-decides it. Table/column naming itself (snake_case, singular vs. plural table names)
follows whatever `2-database/4-database-standards.md` states when generated — not pre-decided here
since it has no cross-module security/data-integrity consequence the way the above does.

---

## ADR-006: Permission enforcement — server-side Guards on every write endpoint, no exceptions

**Context**: The single most repeated finding across all 18 module `permissions.md` files, without
exception: `isPermitted()`-equivalent checks exist only at the UI-rendering layer (button visibility),
never on the actual write endpoint itself. This is the systemic root cause class behind IDOR-shaped
findings in Vendors, Pricebooklevel200/300, and the IDOR-adjacent IsPermitted gaps everywhere else.

**Options considered**: (a) preserve the legacy pattern (UI-gate only) for speed; (b) mandate
server-side enforcement (NestJS Guards) on every write operation, no exceptions, as a structural
(not per-developer-remembered) property.

**Decision**: (b). Every mutating endpoint (create/update/delete/mass-action) is gated by a NestJS
Guard checking the caller's role (ADR-002) and, where applicable, resource ownership/tenant scope
(ADR-004) — enforced by the framework's structure, not by each developer remembering to add a check.
This is the direct architectural reason NestJS was chosen over plain Express in the tech-stack
decision.

**Consequences**: No module's `7-permissions.md` may describe a write endpoint as "UI-gated only" —
that description is retired along with the legacy system. Every module's permission matrix states the
Guard(s) applied, not just which buttons are hidden.

---

## ADR-007: PCI-DSS scope via tokenized vault, not full in-scope

**Context**: The new system handles card-payment data via a payment gateway integration. Legacy
system partially did this already (CardConnect vault) for stored cards, but also had confirmed
gaps (plaintext "External API Credentials"/"F5 API Keys" fields).

**Options considered**: (a) PCI-DSS via tokenized vault — app never touches raw card numbers, gateway/
vault handles card data, app stores tokens only; (b) full PCI-DSS scope — app itself in scope; (c) no
formal compliance regime.

**Decision**: (a). The application never receives, processes, or stores raw card numbers server-side.
All card-data handling is delegated to the payment gateway/vault (see ADR-008); the application only
ever stores/references tokens.

**Consequences**: `3-api/2-authentication.md` and `7-cross-cutting/2-threat-model.md` must document
card-data flow as token-only, never raw-PAN. No endpoint may accept or log a raw card number. Closes
the class of finding behind the legacy Settings module's plaintext-credential storage as it applies to
payment data specifically.

---

## ADR-008: Payment gateway — CardConnect retained

**Context**: Legacy system uses CardConnect for tokenized card storage/processing (Accounts module).

**Options considered**: (a) keep CardConnect — matches existing tokenized-vault mechanism, least
migration risk for stored payment methods; (b) switch to a different vendor (Stripe, Authorize.net,
etc.).

**Decision**: (a) Keep CardConnect.

**Consequences**: `3-api/`'s payment-related endpoints integrate against CardConnect's API rather than
a new vendor. Existing stored/tokenized card data has a direct migration path (same vendor, same
tokens) rather than needing re-tokenization through a new gateway.

---

## ADR-009: QuickBooks — rebuild sync, working properly

**Context**: Legacy has confirmed dead/broken QuickBooks sync paths in multiple modules (Users' dead
employee sync — 3rd of 3 dead QB integrations found; PurchaseOrder sync).

**Options considered**: (a) rebuild a genuinely working sync; (b) drop QuickBooks entirely.

**Decision**: (a) Rebuild sync, working properly.

**Consequences**: `3-api/` and the relevant modules' integration docs design a real, tested QuickBooks
sync — not a port of the legacy dead code paths. Scope of exactly which entities sync (employees,
transactions, etc.) resolves per-module at JIT time, not decided globally here.

---

## ADR-010: Delivery-dispatch — EliteExtra retained

**Context**: Legacy pushes delivery/dispatch data to EliteExtra from SalesOrder (post-save, two
parallel mechanisms — an older file-transfer push and a newer inline API push).

**Options considered**: (a) keep EliteExtra; (b) switch vendor or drop the integration.

**Decision**: (a) Keep EliteExtra.

**Consequences**: `SalesOrder`'s JIT integration docs design against EliteExtra's real API (single,
modern mechanism — not both legacy paths) rather than a new vendor.

---

## ADR-011: File storage — AWS S3

**Context**: Legacy touches AWS S3 in some integrations (per Settings module findings, credentials
handling was a confirmed weak point). No SoT document names a file-storage decision for the new
system.

**Options considered**: (a) AWS S3; (b) a different provider (Azure Blob, GCS); (c) local disk.

**Decision**: (a) AWS S3.

**Consequences**: Document/PDF/image storage across every module (statements, invoices, product
images, etc.) targets S3. Credentials for S3 access follow ADR-006/007-class handling — hashed/scoped
API keys or IAM roles, never plaintext, closing the specific legacy Settings-module finding this
touches.

---

## ADR-012: Notifications — push/in-app added, beyond legacy's email-only

**Context**: Legacy only has email-shaped notifications (payment-link notifications, statement
delivery). No push/in-app mechanism exists in the legacy system.

**Options considered**: (a) email only, matching legacy; (b) add push/in-app notifications, a new
capability.

**Decision**: (b) Add push/in-app notifications.

**Consequences**: This is a **new capability**, not a legacy port — `1-project/2-requirements.md` §12
and any module needing notifications (SalesOrder payment links, AccountStatement delivery, etc.)
should design a real push/in-app channel, not just carry forward email. Needs its own delivery
mechanism decision (web push / native app push / in-app inbox) — not resolved further here, revisit
when a module's UI design actually needs it.

---

## ADR-013: Package manager — pnpm

**Decision**: pnpm, for the frontend+backend monorepo. Chosen for disk efficiency and workspace
support across the Next.js/NestJS split.

**Consequences**: `6-development/1-development-environment.md` and `2-folder-structure.md` document
pnpm workspace conventions (`pnpm-workspace.yaml`), not npm/yarn equivalents.

---

## ADR-014: Password hashing — bcrypt

**Decision**: bcrypt for user credential hashing (native NestJS/Node ecosystem support).

**Consequences**: `3-api/2-authentication.md` §10 Password Policy specifies bcrypt with a stated cost
factor (to be set at implementation time, not pinned here). Replaces the legacy system's own
password-hashing gaps (Users module: client-side-only password complexity, no confirmed server-side
enforcement).

---

## ADR-015: Test framework — Jest (backend and frontend)

**Decision**: Jest across both NestJS (native default) and Next.js/React — one framework, less
tooling surface.

**Consequences**: `6-development/6-testing-strategy.md` (late wave, deferred until all modules are
documented) specifies Jest-based patterns for the rule-ID-traceable/golden-output/security-regression
test strategies each module's own `build-guidance.md` already calls for.

---

## ADR-016: Browser support — latest 2 versions, evergreen browsers

**Decision**: Chrome, Edge, Firefox, Safari — latest 2 versions each. No legacy/IE support.

**Consequences**: `4-ui/6-responsive-design.md` and frontend build tooling (polyfills, transpile
targets) target this matrix, not a broader legacy-browser range.

---

## ADR-017: Accessibility target — WCAG 2.1 AA

**Decision**: WCAG 2.1 AA. Industry-standard target for business applications.

**Consequences**: `4-ui/7-accessibility.md` states AA-level success criteria as the acceptance bar;
per `9-sync-docs/1-sync-docs.md`'s existing accessibility-check step, this is the level every module's
UI gets checked against before developer review.

---

## ADR-018: API testing tool — Postman

**Decision**: Postman, alongside the already-decided OpenAPI/Swagger documentation.

**Consequences**: `3-api/` generates/maintains a Postman collection
(`docs-templates/3-api/templates/10-postman-collection.json`) kept in sync with the OpenAPI spec.

---

## ADR-019: Lint/format — ESLint + Prettier

**Decision**: ESLint + Prettier across both NestJS and Next.js.

**Consequences**: `6-development/3-coding-standards.md` specifies ESLint/Prettier config as the
enforced standard; `9-ci-cd.md` runs them as a CI gate once that document exists.

---

## ADR-020: Version pinning — latest LTS at implementation start, not pinned now

**Context**: No SoT document names exact version numbers for Node.js/NestJS/Next.js/Prisma/
PostgreSQL.

**Decision**: Pin to latest Active LTS (Node.js) / latest stable (NestJS, Next.js, Prisma,
PostgreSQL) **at the moment implementation actually starts**, not guessed now while still in the
documentation phase — avoids locking a version that's already stale by the time code is written.

**Consequences**: `4-tech-stack.md` and `6-development/1-development-environment.md` state this
policy explicitly rather than a specific number; the first real version pin happens in
`8-implementation/1-implement-task.md`'s environment-setup task, recorded there.

---

## ADR-021: Named Business Owner / PM / Technical Lead — left unassigned

**Decision**: No names assigned. Consistent with `stakeholders.md`'s own confirmed absence of a named
executive sponsor. Revisit if/when the developer supplies names.

**Consequences**: `1-project-overview.md` §7/Approval and every other document's Approval table stay
`*(pending)*` until supplied — not a blocker for generation or review, just an outstanding sign-off
field.

---

## ADR-022: Success criteria — standard delivery criteria

**Decision**: Each milestone ships on its own plan schedule; zero Critical/High-severity defects at
release; user-acceptance (real-browser click-through, per this docs-kit's own existing
`9-sync-docs/2-module-completion-review.md` requirement) confirmed per module before that module's
epic is marked Complete. No project-specific numeric targets (revenue, cost, adoption rate) were
supplied.

**Consequences**: `1-project-overview.md` §14 states these criteria explicitly. `6-implementation-plan/`
and `9-sync-docs/` already structurally enforce the user-acceptance and defect-severity parts of this
— this ADR just makes them the project's own stated Success Criteria too, not an unstated assumption.

---

## ADR-023: QuickBooks — expanded sync scope

**Context**: ADR-009 already locked "rebuild sync, working properly." Developer additionally wants
scope expanded beyond what legacy attempted, not just fixed.

**Decision**: Expand QuickBooks sync scope beyond legacy's original entity set (which entities exactly
is **not** decided here).

**Consequences**: `Accounts`, `Users`, and `PurchaseOrder`'s JIT cycles (the modules with QuickBooks
touchpoints) must each ask which additional entities/data to sync for their own scope — flagged as a
carried-forward open item, not resolved by this ADR alone.

---

## ADR-024: UI/UX design direction

**Context**: `sot-docs/design/design-source.md` was left unchecked (developer deferred picking a
visual source). Developer has since supplied a written UI/UX design brief directly — see
`sot-docs/raw/1-business-requirements/ui-ux-design-requirements.md` — covering direction,
responsiveness, design-system consistency, accessibility, and UX patterns, but no concrete visual
tokens (palette, type scale, component library).

**Options considered**: not applicable — this is a direct developer requirement, not a choice among
alternatives.

**Decision**: Locked as stated:
- Modern, clean, professional, minimal — industry-standard, not a custom/branded visual identity.
- Responsive by default, desktop-first: single codebase (responsive layouts/grids/flexbox/
  breakpoints), not separate desktop/mobile apps.
- Forms: multi-column (desktop) → single-column (mobile).
- Tables: responsive — horizontal scroll, column prioritization, or card/list view on small screens.
- Navigation: sidebar/top nav (desktop) → collapsible sidebar (tablet) → drawer/compact nav (mobile).
- Touch targets sized for mobile/tablet.
- One consistent design system across colors, typography, spacing, buttons, forms, tables, dialogs,
  notifications; uniform loading/empty/error/success/validation/confirmation states.
- Modern UX patterns required: search, filtering, sorting, pagination, contextual actions,
  breadcrumbs, confirmation dialogs, feedback.
- Explicitly avoid: excessive gradients, unnecessary borders, tiny controls, overcrowded forms,
  fixed-width layouts.
- Builds on ADR-017 (WCAG 2.1 AA) and ADR-016 (browser support) already locked.

**Consequences**: `4-ui/1-navigation.md` through `8-frontend-development-standards.md` (this upfront
batch) design against this brief directly. `1-discovery/4-design-creation.md` still needs to run to
produce concrete `tokens.json` (palette, type scale) — this ADR is the direction that stage works
within, not a substitute for it. Every module's future `9-ui.md` inherits these rules — none may
introduce a fixed-width layout or a separate mobile app.

---

## ADR-025: CSS framework — Tailwind CSS + shadcn/ui

**Context**: ADR-024 locked the UI/UX direction (clean/minimal/responsive/consistent design system,
avoid excessive gradients/borders/tiny controls). `4-tech-stack.md` §3 had this as `[NEEDS INPUT]`,
blocked on a design-source decision that's now resolved.

**Options considered**: (a) Tailwind CSS + shadcn/ui — utility-first breakpoints matching the
responsive brief directly, accessible unstyled-by-default components; (b) Tailwind CSS alone, build
components from scratch; (c) a different component library (MUI/Ant Design/Chakra).

**Decision**: (a) Tailwind CSS + shadcn/ui.

**Consequences**: `4-ui/3-design-system.md` and `4-component-standards.md` build on shadcn/ui's
component set (forms, tables, dialogs, notifications, states) customized via Tailwind config to
whatever `tokens.json` `4-design-creation.md` eventually produces. `8-frontend-development-standards.md`
documents Tailwind conventions (no inline styles, utility-class ordering, etc.).

---

## ADR-026: Frontend state management — Zustand + TanStack Query

**Context**: `4-tech-stack.md` §3 had this as `[NEEDS INPUT]`. An ERP frontend is dominated by
server-fetched/cached data (orders, pricing, inventory) with a small slice of pure client UI state.

**Options considered**: (a) Zustand (client state) + TanStack Query (server state/caching); (b) Redux
Toolkit; (c) React Context only.

**Decision**: (a) Zustand + TanStack Query.

**Consequences**: `8-frontend-development-standards.md` documents TanStack Query as the standard
pattern for all API data fetching/caching/mutation (replacing the legacy AJAX patterns found
throughout every module's `screens-and-user-flows.md`), Zustand for anything that's genuinely
client-only UI state (modal open/closed, wizard step, etc.) — not for server data, which never
belongs in Zustand.

---

## ADR-027: E2E test tool — Playwright

**Decision**: Playwright, alongside Jest (ADR-015) for unit/integration tests.

**Consequences**: `6-development/6-testing-strategy.md` (late wave, deferred) specifies Playwright for
the state-transition and user-acceptance-flow tests every module's `build-guidance.md` calls for
(e.g. SalesOrder's finalize-flow tests, the module-completion-review browser click-through).

---

## ADR-028: NFR numeric targets — standard ERP defaults

**Context**: `non-functional-requirements.md` explicitly states performance/availability/scale as
unassessed. No real usage data exists yet (new system, not yet built).

**Decision**: Reasonable internal-business-tool defaults, revisit once real usage data exists:
- **Performance**: API responses < 500ms at p95 (excludes bulk operations — imports, mass-update,
  batch statement generation — which get their own async/background-job budget, not this figure).
- **Availability**: 99.5% uptime during business hours. No stated 24/7 requirement (B2B storefront is
  the one external-facing surface — its own availability need may differ, revisit per-module).
- **Scale**: sized for LBM's actual internal staff count plus B2B customer traffic — exact concurrent-
  user figure not known; design for low-hundreds of concurrent sessions as a starting assumption, not
  internet-scale.

**Consequences**: `7-cross-cutting/1-non-functional-requirements.md` §2-3 state these numbers directly
instead of `[NEEDS INPUT]`. Explicitly a starting default, not a measured requirement — flagged as
`[Assumption: ADR-028]` in that document, revisit once the system has real traffic/usage data.

---

## ADR-029: Unified Pricing module replaces MPLPricePlan/Pricebooklevel200/300/800

**Context**: The legacy system has four separate pricing mechanisms, blueprinted as four separate
modules: MPLPricePlan (named plans, confirmed 99.9% unused in practice — nearly every
product/location assignment uses the "no plan" sentinel), Pricebooklevel200 (specificity-scored price
sheets — confirmed the real, live primary pricing path), Pricebooklevel300 (adds a coupon/promotion
layer on top, whose discount value is confirmed never consumed downstream — a "dead-end"), and
Pricebooklevel800 (confirmed header table has **0 live rows** — every non-"LP" lookup against it
fails silently). Their cross-tier precedence when multiple could match the same account/product was
never resolved anywhere in the SoT (gap Q-11), and the account-assignment column powering it is even
inconsistently named between two of the four specs (`cf_984` vs `cf_986`, gap Q-10).

**Options considered**: (a) port all four as separate modules, resolve precedence between them; (b)
build one unified Pricing module — one engine, one precedence model, one schema — informed by all
four legacy specs but not structured as four separate ports; (c) developer-specified alternative
structure.

**Decision**: (b) One unified Pricing module (slug: `pricing`), replacing the four separate MVP-module
entries. Design intent, grounded in what each legacy mechanism actually proved out in production:
- **Core engine** = generalized from Pricebooklevel200's specificity-scored rule-matching pipeline —
  confirmed the real, live, primary pricing path in the legacy system, not a dormant mechanism.
- **Named-plan layer** = MPLPricePlan's concept generalized as one *input* to the same engine (a
  price source a rule can reference), not a separate parallel mechanism with its own precedence
  question — closes the legacy pattern where "which of several separately-coded mechanisms wins"
  was never answered.
- **Promotion/coupon layer** = Pricebooklevel300's concept carried forward as a genuine, wired-in
  discount source (closing its legacy "dead-end" finding — a coupon must actually affect the computed
  price in the new design, not just gate eligibility).
- **Pricebooklevel800** = **not ported as live functionality** — its confirmed 0-row live header table
  means it has no real production usage to preserve. Its *rule shape* (name, if any actually
  differentiates it) is documented for historical traceability only. **Flagged for confirmation, not
  silently assumed**: verify against real production data (not just the dev snapshot) at the new
  Pricing module's JIT field-extraction stage before finalizing this as a hard drop.
- Single, explicit precedence model designed fresh for the unified engine — not an attempt to
  reconcile four independently-evolved legacy precedence behaviors, since no such reconciled behavior
  demonstrably exists in production today.

**The fresh precedence model, finalized this session**:
- **Specificity-scored matching** — carried forward from Pricebooklevel200's proven live mechanism
  (see this ADR's own Context above): a rule can target any combination of dimensions — Category
  (ADR-089's flexible tree, replacing legacy's fixed line-code/subline/division), Product/Variant,
  Brand, Color, Manufacturer, Account, and **Location**. Score = count of dimensions the rule actually
  specifies (all must match); highest score wins. A location-specific rule naturally outranks a
  location-agnostic one when both match — Location is just one more scoreable dimension, no separate
  mechanism needed.
- **Per-unit pricing, not a full unit×product matrix**: a winning rule requires a price at the UOM
  Group's **Base unit** (always must exist, per ADR-096). Additional **fixed-price overrides** for
  specific other units (e.g. Box, Case) are optional, set only where a genuinely different/negotiated
  price applies — not required for every unit a product has.
- **Resolution order for a specific field's UOM** (e.g. SalesOrder's Pricing-role unit): check if the
  winning rule has a fixed price set for that exact unit → use it directly if present; otherwise derive
  it from the Base unit's price via UOM's own conversion service (ADR-096) — never silently guessing or
  defaulting to a different unit's fixed price.
- **Prices are resolved live, never pre-materialized per product — the specific legacy defect this
  fixes.** Confirmed by developer: legacy's design causes adding/removing a unit from a UOM Group
  shared by e.g. 100,000 products to require touching all 100,000 product records. The new design never
  stores a computed price on a product record at all — pricing rules and their per-unit fixed prices
  live at the rule level (shared across however many products a rule's dimensions match), and the
  actual price is computed fresh every time a module needs one (e.g. at SalesOrder line entry). Adding
  or deleting a unit from a UOM Group only touches the UOM Group itself and whatever (typically small)
  number of pricing rules had a fixed price set for that specific unit — never a bulk pass across every
  product using that group.
- **UOM unit deletion cascades into Pricing** — if a unit is removed from a UOM Group, any fixed-price
  override tied to that specific unit is deleted along with it (not orphaned, not blocked). Pricing for
  that unit automatically reverts to Base-derived — a safe, well-defined state, since the Base-derived
  fallback always exists and is resolved live per the point above.
- **Promotion/coupon applies last**, as a discount on top of whatever price the rule-matching +
  per-unit resolution already produced (per this ADR's own existing Q-12 resolution below) — never
  competing with the specificity-scoring step for "which price wins."

**Consequences**:
- `claude-docs/analysis/module-list.md` and `documentation-plan.md`'s deferred `5-modules/` list
  replace their four `mpl-price-plan`/`pricebook-200`/`pricebook-300`/`pricebook-800` entries with one
  `pricing` entry.
- Gap-analysis items Q-10 (account-assignment column naming) and Q-11 (cross-tier precedence) are
  **superseded, not answered** — the unified design doesn't inherit the legacy ambiguity, it replaces
  it with a fresh precedence model designed at the new module's own JIT cycle. Q-12 (Pricebooklevel300
  coupon build-or-retire decision) is **resolved**: build it in, wired to actually affect price.
- The `pricing` module's JIT field-extraction pass (`0-field-extraction.md`) reads all four legacy
  module specs as its raw input material (they remain valid, unchanged, as historical/blueprint
  source), but produces one consolidated field/rule catalog and one schema — not four.
- Every other module's `entities-and-fields.md`/`integrations.md` that references "MPLPricePlan" or
  "Pricebooklevel*" by name (e.g. SalesOrder's pricing pipeline) should be understood as referencing
  the unified `pricing` module going forward — not re-pointed individually now, since none of those
  references have been promoted to `approved-docs/` yet.

---

## ADR-030: Standing principle — no duplicate formula/logic implementations

**Context**: Found repeatedly across the legacy corpus (SalesOrder's docket vs. contract-amount
rounding formulas; Accounts' finance-charge divisor; SalesHistory's/PurchaseHistory's total-formula
restated per writer) — the same calculation independently reimplemented in 2+ places, which the
source blueprints themselves flag as a "silent future drift" risk (the two copies agree today, any
edit to only one silently reintroduces a mismatch).

**Decision**: Standing project-wide principle, not decided per-module: wherever a legacy module has
the same formula/logic implemented more than once, the new system implements it exactly once, called
from every site that needs it. Applies automatically at every module's JIT cycle — not re-litigated
per module.

**Consequences**: Every module's `build-guidance.md`/`3-business-rules.md` that documents a
found-duplicated legacy calculation states "consolidated to one implementation" rather than asking
the developer to re-decide it each time.

---

## ADR-031: Standing principle — non-blocking external integrations move to async

**Context**: SalesOrder's finalize request currently blocks on delivery-dispatch/document-management/
loyalty-platform pushes with no confirmed business requirement they must complete before finalize
succeeds (only the accounting-sync integration has a confirmed genuine synchronous/business-critical
need in some cases). The same shape (a legacy request blocking on a non-essential outbound call)
recurs across modules.

**Decision**: Standing principle: any outbound integration call with no confirmed hard requirement to
block the triggering operation moves to a BullMQ background job. Applied per-module at JIT time based
on that module's own confirmed requirements — not a blanket "everything is async," a genuine
case-by-case check against what's actually confirmed to need synchronous completion.

**Consequences**: Faster, more resilient finalize/save operations; a slow or down third-party
integration no longer blocks the core business transaction. Each module's `integrations.md` states
sync-vs-async per integration with its rationale, not by default-copying legacy's synchronous shape.

---

## ADR-032: SalesOrder — required fields enforced at save (always, not just finalize)

**Context**: Legacy never enforces account/order-number/location/deposit-amount as required at save
time in any traced code path, despite all four being documented as required fields — flagged as the
single highest-priority open question in the entire SalesOrder blueprint (SO-OQ-054).

**Options considered**: (a) enforce always, block save entirely if missing; (b) keep optional,
matching legacy behavior exactly; (c) allow incomplete while a working draft, block only at finalize.

**Decision**: (a) Enforce always — a Sales Order cannot be saved at all (draft or otherwise) without
account, order number, location, and deposit amount populated.

**Consequences**: Closes SO-OQ-054 by design rather than leaving it open. Staff who currently rely on
saving a half-filled order as a placeholder will need a different mechanism for that if it turns out
to be real usage (not confirmed either way in the SoT) — flag this specifically for the user-
acceptance/browser click-through review when SalesOrder's UI is built, since it's the one place this
decision could turn out to be wrong in practice. `5-modules/sales-order/3-business-rules.md` states
this as a hard, non-optional server-side rule, not a UI-only validation.

---

## ADR-033: SalesOrder — one capability layer for Standard and Quick SO

**Decision**: Standard order entry and Quick SO are two UI experiences over one shared order-capture
service/API, not two independently-coded business-logic paths (closing the legacy maintenance-burden
finding the blueprint itself flags).

**Consequences**: `5-modules/sales-order/8-api.md` designs one set of endpoints; `9-ui.md` designs two
front-end flows (a fuller multi-section form, and a fast AJAX-driven entry screen) that both call it.

---

## ADR-034: Accounts — finance-charge formula, ÷365 daily rate

**Context**: Legacy has two independently-maintained finance-charge engines (manual/batch vs. cron)
that disagree by ~30x on "Net 1" terms — one divides the rate by 12 (monthly), the other by 365
(daily). Per ADR-030, only one implementation survives in the new system regardless — this decision
picks which formula that is.

**Options considered**: (a) ÷365 daily rate; (b) ÷12 monthly rate; (c) defer to accounting sign-off.

**Decision**: (a) ÷365 daily rate. A monthly-rate formula applied to a 1-day term structurally
overcharges — the daily-rate formula is the more defensible default for short terms.

**Consequences**: `5-modules/accounts/3-business-rules.md` and `4-schema.md` implement one finance-
charge calculation (per ADR-030), using ÷365. Flagged for a final accounting-team sanity check before
go-live, since this changes what customers are actually billed — not purely an internal-consistency
fix.

---

## ADR-035: Accounts — missing credit-card table rebuilt properly

**Context**: Legacy code references `vtiger_accountcreditcards` for stored-card lookups, but the
table doesn't exist in the live database — a confirmed Critical schema-drift finding, not a design
choice made deliberately.

**Decision**: The new `pricing`-adjacent Accounts schema includes a real, properly-normalized stored-
payment-method table from the start (tokenized via CardConnect per ADR-008), closing this gap by
construction rather than carrying forward the drift.

**Consequences**: `5-modules/accounts/4-schema.md` defines this table explicitly; no code path may
reference a table that isn't part of the schema.

---

## ADR-036: Users — overtime formula, standard US 1.5x over 40hrs/week

**Context**: Legacy payroll pipeline has two divergent overtime formulas, restated 8× across two
files (per ADR-030, consolidates to one implementation regardless).

**Decision**: Standard US overtime rule — 1.5x pay for hours worked beyond 40 in a work week.

**Consequences**: `5-modules/users/3-business-rules.md` implements this as the one canonical
overtime calculation. Flagged for HR/payroll sign-off before go-live if LBM operates under a
different state's daily-overtime or other jurisdiction-specific rule not captured here — not
independently confirmed against LBM's actual employment jurisdiction.

---

## ADR-037: Users — time-clock punches must always close, no silent exclusion

**Context**: 96% of legacy time-clock punches are open (no clock-out recorded) and get silently
excluded from payroll totals — plausibly a systemic clock-out defect (not confirmed whether this is
a UI issue, a missed step in staff workflow, or a genuine write-path bug) rather than genuine
business behavior.

**Decision**: The new system must not silently exclude open punches from payroll — either the
clock-out flow is fixed so punches genuinely close in normal operation, or an open punch surfaces as
an explicit, visible exception requiring manager action before that pay period closes. Silent
exclusion (today's behavior) is not acceptable in the new design.

**Consequences**: `5-modules/users/6-validation.md`/`workflows.md` design an explicit "unclosed
punch" state with a required resolution step, not an invisible drop from the payroll total. Root
cause of the 96% figure should be investigated against real production data (not just the dev
snapshot) before assuming it's purely a UX gap.

---

*(Users' zero-server-side-validation and unguarded-delete findings are already closed by the standing
principles in ADR-006 (server-side Guards, no exceptions) and the project-wide required-field
enforcement pattern set by ADR-032 — no new module-specific ADR needed for those two.)*

---

## ADR-038: Location — hard floor at zero for quantity-on-hand

**Context**: Legacy has no negative-QoH check across any of its four write paths — stock can go
negative with nothing stopping it, the module's headline data-integrity finding.

**Options considered**: (a) hard floor at zero, always; (b) allow negative as intentional legacy
behavior; (c) allow negative only via an explicit, logged override action.

**Decision**: (a) Hard floor at zero. Any operation that would take QoH below zero is rejected or
routed through the existing backorder/buyout resolution flow (already part of SalesOrder's design)
instead of silently going negative.

**Consequences**: `5-modules/location/3-business-rules.md` implements this as a domain invariant
(closed by construction, per the enforcement-layer pattern every module's `build-guidance.md` already
uses) — not a soft warning. SalesOrder's backorder/buyout resolution becomes the sanctioned path for
what legacy handled by letting QoH go negative.

---

## ADR-039: Location — fix reorder-point calculation bias, kit propagation, notification bug

**Context**: Three confirmed defects, none requiring a business judgment call — straightforward
engineering fixes, locked here so they don't need separate discussion:
- Reorder-point/lost-sale calculations have a confirmed sparse-history divisor bias and a
  multiplicative (should-be-additive) lost-sale factor.
- A "kit" endpoint performs zero kit-component propagation despite its name.
- The Lost Sale Log Report fires an admin-notification email unconditionally on every page load.

**Decision**: All three are fixed, not ported as-is — the new system's reorder-point formula corrects
the divisor bias and applies the lost-sale factor once per event; the kit endpoint actually propagates
to kit components; the notification fires only on a genuine lost-sale event, not on page load.

**Consequences**: `5-modules/location/calculations.md`/`workflows.md` document the corrected formulas
directly, not the legacy-as-found versions with a "known bug" caveat.

---

## ADR-040: Quantity fields — decimal-capable everywhere; UOM group optional on Product

**Context**: Legacy accepts integer quantities only, everywhere (order quantity, ship quantity,
quantity-on-hand, etc. across SalesOrder, PurchaseOrder, Location, Products). Every product is also
implicitly expected to belong to a UOM group. Developer requirement: quantities must support both
whole numbers and decimals, and must work correctly whether a product has a UOM group or not — UOM
group is an optional attribute on a product record, not mandatory.

**Decision**:
- **Every quantity-typed field project-wide** (Order Quantity, Ship Quantity, Quantity-on-Hand,
  Quantity Backordered/Cancelled/Received, and equivalents in every module) is a decimal type, not
  integer — capable of holding whole numbers or fractional quantities. Default precision: up to 4
  decimal places (covers weight/length/volume-style fractional units cleanly) — adjust if a specific
  product line needs finer precision, not decided as a hard ceiling here.
- **UOM group on a Product is optional.** A product with no UOM group assigned is priced/ordered/
  tracked as a plain quantity (no unit-conversion step) — decimal-capable the same as a UOM-grouped
  product. A product with a UOM group assigned goes through the existing UOM conversion service
  (base unit ↔ display/sale unit), also decimal-capable throughout that conversion path, not just at
  the edges.
- Both cases (with UOM group, without) must produce correct, decimal-accurate quantities — this is
  not a "UOM handles decimals, plain quantity doesn't" split.

**Consequences**:
- `2-database/4-database-standards.md` states decimal as the standard logical type for any quantity
  field (superseding this project's earlier informal "number" typing in the module specs — those
  specs used "number" generically before this decision existed).
- `5-modules/products/4-schema.md`: `uom_group_id` FK is nullable, not required.
- `5-modules/uom/*`: the conversion service must explicitly handle "no group assigned" as a valid,
  first-class case (pass-through, no conversion), not an error state or an assumed-always-present
  input.
- Every module whose legacy blueprint documented quantity fields as integer-typed
  (SalesOrder line items, PurchaseOrder/PurchaseLineItem, Location QoH, SearchLineItem,
  SalesHistory/PurchaseHistory counters) is corrected to decimal at JIT schema-drafting time, not
  ported as integer.
- Calculations consuming quantity (pricing extension, WAC, tax) must be decimal-safe throughout —
  relevant directly to ADR-041, next.

---

## ADR-041: Products — Global WAC formula, fixed blended-average

**Context**: Legacy Global weighted-average-cost calculation hardcodes the "existing quantity" term
to zero, so instead of blending existing stock value with an incoming shipment's cost, it just resets
cost to the new shipment's cost — silently discarding the prior batch's value. Example: 10 units @ $5
existing + 5 units @ $8 incoming should produce (10×5 + 5×8)/15 = $6.00; legacy instead produces $8.00.

**Decision**: Fixed, standard weighted-average-cost formula:
`new_avg_cost = (existing_qty × existing_avg_cost + incoming_qty × incoming_cost) / (existing_qty +
incoming_qty)` — decimal-safe throughout per ADR-040, not the legacy hardcoded-zero shortcut.

**Consequences**: `5-modules/products/calculations.md` documents this corrected formula directly as
the module's WAC calculation, not the legacy-as-found version with a "known bug" caveat. Since this
changes what margin/cost-basis figures the system reports, flag for a final accounting-team sanity
check before go-live — same caveat as ADR-034's finance-charge formula.

---

## ADR-042: Products — variant concept kept as a real feature

**Context**: Legacy's product-variant mechanism (e.g. color/size) is fully built in code but confirmed
100% dormant on live data — zero real usage.

**Decision**: Keep it, build as a real working feature — developer confirms an upcoming need,
overriding the "confirmed-dormant, drop it" default this kind of finding usually gets.

**Consequences**: `5-modules/products/2-functional-specification.md`/`4-schema.md` design variants as
a genuine first-class capability (parent product + variant dimensions/values), not a legacy-carryover
placeholder. Since there's no live legacy usage to extract real behavior from, this needs fresh
requirements (what dimensions, how variants relate to pricing/inventory) — flagged as needing
developer input at this module's JIT field-extraction stage, not invented here.

---

## ADR-043: Products — supersession link gets a real write path

**Context**: 6 live products carry a "superseded by" link, but no code path in the legacy system
currently writes it — looks like a one-time manual fix, not a maintained feature.

**Decision**: Build a real, working write path — when a product is discontinued/replaced, staff (or a
future automated flow) can set which product supersedes it, and that link is properly maintained
going forward, not left as a one-time manual artifact.

**Consequences**: `5-modules/products/2-functional-specification.md`/`9-ui.md` include an explicit
"mark as superseded / link replacement product" action, not just a passive schema field. The 6
existing legacy links carry forward as real, meaningful data under the new mechanism.

---

## ADR-044: Vendors — Line Code owned exclusively by Vendors module

> **⚠️ SUPERSEDED by ADR-089.** The Line Code concept itself is replaced by a flexible Category tree,
> and ownership moves from Vendors to Products. This entry's underlying goal (one clear owner, no
> multi-module dual-write) is preserved — only the specific owner and the concept's shape changed. Kept
> below, unedited, for historical traceability.

**Context**: Legacy has 4 modules (Vendors, VendorLinecode, Products, SalesOrder) independently
writing the shared Vendor Line Code concept, with no vendor-scoping check on at least one write path —
confirmed root cause of a cross-vendor data-overwrite bug.

**Decision**: Vendors module owns Line Code exclusively. Every other module reads it through Vendors'
own API — no other module writes it directly.

**Consequences**: `5-modules/vendors/8-api.md` exposes Line Code read/write endpoints; Products,
SalesOrder, and PurchaseOrder's own specs reference these endpoints rather than defining their own
write path to vendor line-code data. Closes the missing-vendor-scoping bug class at the architecture
level, not by patching the one query that happened to lack the check.

---

## ADR-045: Products — Product Number is the unique business-key identifier

> **⚠️ EXTENDED by ADR-092/090.** The identifier itself is renamed/consolidated to a single **SKU**
> field (format-validated, replacing Product Number/Part Number/Product Stripped as one field, not
> three), scoped at the **variant** level rather than the parent product. This entry's underlying
> principle — one canonical, enforced-unique business-key identifier — is preserved and generalizes to
> SKU; only the field name and its scope (variant, not product) changed.

**Context**: Legacy's Product Number field is used loosely across modules — PurchaseHistory's own
blueprint confirmed a **zero-match rate** joining on Product Number against the live Products table,
flagged as an unresolved gap (dev-fixture artifact vs. genuine issue, never conclusively resolved).

**Decision**: Product Number is the canonical, enforced-unique business-key identifier for a product
— every module that references a product by number (not by internal id) joins against this field, and
the new schema enforces its uniqueness at the database level (not just convention).

**Consequences**: `5-modules/products/4-schema.md` adds a unique constraint on Product Number (scoped
per-tenant, per ADR-004). Every other module's line-item/history tables that store a product-number
reference (SearchLineItem, SalesHistory, PurchaseHistory, PurchaseLineItem) join against this
enforced-unique key — resolving PurchaseHistory's previously-open zero-match-rate question by
construction: if a new-system row's product number doesn't match a real product, that's now a
genuine data-integrity violation to catch, not an ambiguous legacy artifact.

---

## ADR-046: Vendors — PurchaseOrder updates Freight cost through Vendors' own validated path

**Context**: Legacy has 3 inconsistent Freight (PPD) write paths; one is PurchaseOrder writing
directly into Vendors' own fields, unsanitized, bypassing Vendors' save logic entirely.

**Decision**: PurchaseOrder keeps the ability to update a vendor's freight cost (capability
preserved) — but does so by calling Vendors' own validated update path, same pattern as ADR-044's
Line Code decision, not a separate raw/unsanitized write.

**Consequences**: `5-modules/vendors/8-api.md` exposes a freight-cost update endpoint with real
validation; `5-modules/purchase-order/8-api.md`/`integrations.md` calls it rather than defining its
own direct write to Vendors' data. Consolidates all 3 legacy Freight write paths into this one.

---

## ADR-047: SearchLineItem — no module-specific decisions needed

**Context**: Legacy findings (2 confirmed SQL injections, a formula-divergence bug between the live
finalize routine and a batch backfill script) are pure engineering defects, not business judgment
calls.

**Decision**: No new ADR content — already closed by standing principles ADR-006 (no raw SQL,
server-side Guards) and ADR-030 (no duplicate formula implementations). Logged here only so this
module isn't mistaken for "not yet discussed."

---

## ADR-048: Settings — split by category, not one catch-all module

**Context**: Legacy Settings is a 236-file, no-single-owned-entity catch-all: system config,
integration credentials, currency settings, VDP tier/rebate configuration, organization profile,
security config — all mixed together, which is directly why only 3 of ~236 endpoints have any
access-control check (a genuine owner boundary makes "who's allowed to touch this" answerable; a
catch-all doesn't).

**Decision**: Split into distinct, separately-owned categories, each with its own clear page/area and
its own access-control scope — not one flat Settings page mixing everything:
1. **Integrations & Credentials** — QuickBooks, EDI, payment gateway (CardConnect), AWS S3 config.
   The highest-sensitivity category (legacy's worst credential-handling findings live here) —
   isolated so its access control can be the strictest, not inherited from a general "Settings" grant.
2. **Organization/Company Profile** — company-level info. Also the chance to resolve legacy's
   confirmed duplicate/unsynced Company Profile vs. Organization Details tables into one.
3. **System Configuration** — feature toggles and operational settings (e.g. delivery-push
   configuration) not specific to one integration or the org profile.
4. **Currency Settings** — currency config (site of legacy's confirmed cascade mass-recompute bug).
5. **VDP Tier / Rebate Configuration** — monthly rebate-reporting tiers. Confirmed distinct from the
   unified Pricing module (ADR-029) — VDP feeds rebate reporting, not live SalesOrder pricing, so it
   stays a Settings category, not folded into `pricing`.

**Consequences**: No single `5-modules/settings/` document set treats these as one undifferentiated
domain — `4-schema.md` gives each category its own entity boundary, `7-permissions.md` scopes access
per category (an Integrations-credential grant is not the same as a Currency-settings grant), and
`9-ui.md` gives each its own page, not one long mixed page. Closes the legacy access-control gap
(ADR-006 already mandates server-side Guards everywhere; this ADR is what makes those Guards
meaningful here — a Guard needs a real boundary to check against).

---

## ADR-049: SalesHistory/PurchaseHistory — canonical formula uses `|transfer_out_qty|` (always positive)

**Context**: Legacy's `total_activity` formula disagrees across writers on whether `transfer_out_qty`
is added raw (SalesHistory's own writer) or wrapped in absolute value (SalesOrder's and Location's
writers, independently). The source blueprint recommended the 2-of-3 majority variant but flagged it
as needing sign-off, not settled fact. Developer asked for a decision grounded in how transfers
actually behave elsewhere in the system, not a guess.

**Reasoning**: `transfer_out_qty` is documented as a cumulative *count of units moved out of a
location* — a magnitude, not a signed adjustment (SalesHistory already has a dedicated `False Loss`
field for reversal-style corrections, so sign-carrying semantics aren't this field's job). SalesOrder's
and Location's writers each independently added defensive absolute-value wrapping without
coordinating with each other — the strongest available signal that negative values do occasionally
reach this field in practice (most likely a reversed/cancelled stock-transfer correction recorded as a
negative delta) and that both writers treated it as a data problem to guard against, not a legitimate
signed case to preserve.

**Decision**: Canonical formula always treats `transfer_out_qty` as non-negative (absolute value) —
matches SalesOrder's and Location's writers, per ADR-030's "one authoritative aggregator" design
(SalesHistory's own `calculations.md`, already recommending an event-table + single-writer +
optimistic-lock architecture).

**Consequences**: `5-modules/sales-history/calculations.md` states this as the one canonical formula
inside the aggregator service, not an open SME question. Applies identically to PurchaseHistory's
equivalent counter if the same ambiguity exists there (PurchaseHistory's writers were confirmed to
already agree with each other, so this is precautionary consistency, not a fix to an existing bug in
that module).

---

## ADR-050: PurchaseOrder — one combined status model, not 3 loosely-related fields

**Context**: Legacy tracks a PO's state across 3 independently-updated fields (`postatus`,
`po_rgn_status`, `reconciled`) that don't always agree with each other, and the "which statuses count
as committed" list is hardcoded independently in 5 different files — the exact same class of drift
risk ADR-030 (no duplicate logic) exists to close.

**Decision**: Combine into one clean status model that cannot self-contradict — a single source of
truth for a PO's state (Approved → Finalized → Partially/Completely Received → Partially/Completely
Reconciled → Fully Processed RGN), not 3 separately-updated fields that can drift out of sync.

**Consequences**: `5-modules/purchase-order/4-schema.md` replaces the 3-field legacy shape with one
state machine (already sketched in the module's own `workflows.md`/`build-guidance.md` as an 8-value
enum plus a status-transition table); `3-business-rules.md` defines the "which statuses count as
committed" list exactly once, referenced everywhere, per ADR-030 — not restated per file.

---

## ADR-051: PurchaseLineItem — no module-specific decisions needed

**Context**: Legacy's confirmed defects (a Critical SQL injection in an audit-timestamp hook; a
wrong-entity-class bug where inline-edit instantiates an unrelated module's class, firing on every
normal use) are pure engineering fixes, not business judgment calls.

**Decision**: No new ADR content — already closed by ADR-006 (no raw SQL, server-side Guards).
Logged here only so this module isn't mistaken for "not yet discussed."

---

## ADR-052: PurchaseHistory — no module-specific decisions needed

**Context**: Cleanest accumulator module in the series — all 3 legacy writers already agree on the
`total_activity` formula byte-for-byte, no confirmed locking issue. One Critical SQL injection in an
edit-branch UPDATE is the only real finding.

**Decision**: No new ADR content — already closed by ADR-006. `total_activity` formula ported as-is
(no divergence to resolve, unlike SalesHistory). Logged here only so this module isn't mistaken for
"not yet discussed."

---

## ADR-053: UOM — every module goes through UOM's own conversion service, no direct table access

**Context**: 46+ files across a dozen-plus legacy modules bypass the shared UOM conversion function
and read/compute conversions directly against UOM's own tables, including one independent SQL
reimplementation of the conversion formula — the exact "no clear owner" shape already fixed for
Vendors' Line Code (ADR-044) and Freight (ADR-046).

**Decision**: Same pattern — UOM owns its conversion logic and data exclusively; every other module
(Products, SalesOrder, PurchaseOrder, Location, etc.) calls UOM's own conversion service rather than
reading/computing conversions itself. Combined with ADR-040 (decimal-capable, optional group).

**Consequences**: `5-modules/uom/8-api.md` exposes the conversion service as the single call site;
every other module's `integrations.md` references it instead of defining its own UOM-adjacent query
or formula. Closes the drift risk directly — no second, independently-maintained copy of the
conversion formula can exist once every caller goes through one service.

---

## ADR-054: AccountStatement — no module-specific decisions needed

**Context**: Headline finding — the B2B storefront's own permission check is actively skipped for
B2B-flagged requests, relying solely on weak upstream authentication with no backup check. The
module's finance-charge divisor issue is identical to Accounts', already resolved (ADR-034, ÷365).

**Decision**: No new ADR content. The permission-skip is directly forbidden by the standing rule in
ADR-006 (every endpoint requires a real server-side Guard, no exceptions — including B2B-flagged
requests, which get no special carve-out). Logged here only so this module isn't mistaken for "not
yet discussed."

---

**All 15 target modules discussed.** Module-by-module design review complete — 26 module-specific/
architectural ADRs recorded (ADR-029 through ADR-054), on top of the 28 project-level decisions from
`1-project/` generation (ADR-001 through ADR-028).

---

## ADR-055: Location — new-location onboarding, lazy product/pricing setup

**Context**: Legacy has no blueprinted "add a new branch" workflow — the 7 live Location header rows
were created ad hoc through scattered Settings-area admin screens (`editLocation.php`,
`locationqbsetting.php`, `locationTraverseSettings.php`), with no CRM-managed create flow and no
confirmed process for making existing products/pricing available at a newly opened branch. Raised
directly by the developer (tenant expanding into a new physical location needs a real onboarding
path) — not sourced from any SoT document, pure fresh design per this project's extract-then-design
pattern (same shape as ADR-029/044/053). Two concrete resource risks drove the design: (1) legacy's
72,104 Product-at-Location rows across 7 branches show what a naive "create a row per product per new
branch" step would cost at scale; (2) the unified Pricing module (ADR-029) needs a location-scoping
answer or the same bulk-rebuild problem recurs for pricing.

**Options considered**: (a) bulk-create a Product-at-Location row and pricing rule for every existing
product at location-open time; (b) lazy/on-demand creation — no row required for a product to be
available, data materializes only when a product is actually touched at that location, closing
gap by design rather than by upfront bulk work.

**Decision**: (b), plus a scoped onboarding wizard:
- **Who**: Super Admin only creates a new location.
- **Product availability**: every product is available at every location automatically — there is no
  per-location enable/allow-list concept anywhere in the design. A Product-at-Location row is purely a
  *data* record (QoH, cost, reorder, bin/shelf); its absence for a given product/location pair means
  "not yet touched there," never "not available." The row is created lazily, on the first real
  transaction (order, receipt, adjustment) touching that product at that location — the same organic
  pattern legacy's 72K rows exhibit, made an explicit design choice instead of an accident. No
  bulk-creation step runs at location-open time.
- **Pricing**: the new-location wizard lets the Super Admin pick a reference location and performs a
  **one-time snapshot copy** of its pricing rules (not a live link) — the new location then manages
  its own pricing independently; a later price change at the reference location does not propagate.
- **Creation-form field split**: required at creation — name, address, tax rate, order-number prefix
  (the minimum to start selling, same "required at save" shape as ADR-032). Deferrable to any time
  after — GL account mapping (Traverse/QuickBooks), payment-gateway setup, and other integration
  config; none of these block go-live.
- **Clone-from-existing-location**: the wizard additionally supports copying tax setup and print
  settings from the same chosen reference location, with the same one-time-copy semantics as pricing
  (admin edits deltas after; no live link back to the source).

**Consequences**: `5-modules/location/2-functional-specification.md`/`9-ui.md` design a real
"Add Location" wizard (Super Admin-gated per ADR-006) instead of porting the legacy scattered-screens
pattern. `4-schema.md` treats Product-at-Location as a sparse table by design, not a table expected to
be fully populated per location. `5-modules/pricing/*` documents the reference-location snapshot-copy
as the standard mechanism for seeding a new location's pricing, consistent with ADR-029's unified
engine. Open items not yet resolved: whether the wizard should clone additional config categories
beyond pricing/tax/print — revisit at this module's own JIT field-extraction stage if needed.

---

## ADR-056: Multi-tenancy — database-per-tenant (supersedes ADR-004)

**Context**: ADR-004 locked row-level security on a single shared schema, chosen to close a confirmed
tenant-scoping gap in legacy's UOM module. Developer states the legacy system already runs full
database-per-tenant (separate physical MySQL database per tenant) and wants the new system built the
same way. Raised while discussing per-tenant Super Admin support accounts (ADR-057) — a
database-per-tenant boundary gives that support model a natural, physical scope instead of relying on
an RLS/application-level check alone.

**Options considered**: (a) keep ADR-004's RLS-on-shared-schema; (b) schema-per-tenant (one Postgres
database, one schema per tenant); (c) full database-per-tenant (separate PostgreSQL database/catalog
per tenant), matching legacy's actual existing model.

**Decision**: (c) Full database-per-tenant — each tenant gets its own separate PostgreSQL database.
Supersedes ADR-004 in full; ADR-004's entry is kept, marked superseded, for historical traceability
only.

**Confirmed operating model** (developer follow-up, same session):
- **One shared codebase, many tenant databases.** All tenants run on a single deployed application —
  not one deployment per tenant — each connecting to its own separate database.
- **Subdomain-based tenant resolution.** Each tenant is reached at its own subdomain of
  `omnna-lbm.live` (confirmed live examples: `wbc.omnna-lbm.live`, `npl.omnna-lbm.live`,
  `pmi.omnna-lbm.live`). The subdomain is how an inbound request resolves to which tenant database to
  connect to — this is the mechanism behind the "dynamic per-tenant datasource" consequence below, not
  a separate undecided question.
- **Migration fanout is a hard requirement, not a future risk.** When any developer ships a new
  migration, it must be applied to every tenant's database — schema drift between tenant databases is
  not acceptable. This upgrades the migration-orchestration item below from "flagged, unsolved" to
  "confirmed requirement, mechanism still to be designed."
- **`skeleton.omnna-lbm.live` — canonical schema-template database, carried forward from legacy.**
  Confirmed dual role: (1) **new-tenant provisioning source** — a new tenant's database is created as
  a copy of skeleton, so it starts already on the current schema rather than migration-zero; (2)
  **migration-registry member** — every migration fans out to skeleton exactly like every real tenant,
  so skeleton always reflects current expected schema and stays valid as the next clone source. New
  system keeps this same skeleton-database pattern (mechanism: Prisma Migrate, see below), not a
  legacy artifact being retired.
  - **Skeleton also carries default/seed data, not just schema.** Default module and Settings data
    (e.g. ADR-002's starter role catalog, ADR-064's protected System theme, default picklists/config
    values) lives in skeleton itself. Since new-tenant provisioning clones skeleton wholesale (data
    included, not a schema-only copy), every new tenant automatically starts with this default data
    already in place — no separate seed step required at tenant-creation time.

**Recommended migration mechanism** (developer confirmed, session default — not yet written into
`6-development/`): **Prisma Migrate**, run in a fanout loop, same shape as legacy's Phinx-per-database
pattern:
- A tenant registry (subdomain → database connection, includes skeleton) drives both the fanout script
  and the request-time subdomain routing above — one list, not two kept in sync separately.
- On deploy, script runs `prisma migrate deploy` against skeleton first, then every real tenant
  database in turn, sequentially — one failure halts before touching the rest, preventing tenants from
  ending up on divergent schema versions.
- New-tenant provisioning clones skeleton's current database state rather than replaying full
  migration history from zero.
- Periodic `prisma migrate status` per tenant (BullMQ job) as a drift-detection check.

**Control panel — hosted on `skeleton.omnna-lbm.live`, no new role required.** Skeleton's own Super
Admin account (ADR-057's standard per-database Super Admin pattern — no separate "platform operator"
role invented) is the control-panel operator, since skeleton is itself just the database that happens
to own the tenant registry and serve as the new-tenant clone source. From this panel:
- **Tenant registry visibility** — full list of every tenant subdomain/database, so it's always known
  how many tenants exist.
- **Tenant type classification** — each tenant is tagged **live**, **demo**, or **testing** in the
  registry (not yet decided: whether more types are needed — extend later if so).
- **Migration fanout scoped by type** — migrations can be run against a chosen type only (e.g. testing
  tenants first, then demo, then live), not always all-at-once. Staged rollout by type is the standard
  path, not an edge case — de-risks a bad migration by surfacing it against testing/demo tenants before
  it ever touches a live one.

**Consequences — several explicitly NOT resolved by this decision alone, flagged as blocking
follow-ups before implementation-level docs generate**:
- Whether `tenant_id` (ADR-005) is still required on every table is now an open question — isolation
  becomes physical (separate database) rather than row-level; `tenant_id` may be kept only for
  defense-in-depth/migration convenience, not decided here.
- Prisma + NestJS needs a genuine per-tenant dynamic datasource/connection-routing strategy, resolved
  at request time from the subdomain (see confirmed operating model above) — not a single fixed
  `DATABASE_URL`. A real change to how `3-tech-stack-decision/tech-stack.md`'s Prisma usage is
  documented, not a copy-paste detail.
- New-tenant provisioning now means provisioning a new physical database, running every existing
  migration against it, and registering its subdomain — not inserting tenant rows into a shared
  schema. Needs its own onboarding workflow, parallel to ADR-055's new-location workflow but one level
  up (tenant, not location).
- **Schema-migration changes must be fanned out to every tenant database on every deploy — confirmed
  requirement.** Exact orchestration mechanism (sequential per-database migration runner, parallel
  fanout with failure handling, drift-detection check) is not yet designed — needs its own follow-up
  before `6-development/` generates, since it's a core part of the development/deploy workflow, not
  an edge case.
- Cross-tenant reporting/analytics (if ever needed platform-side) becomes materially harder — no
  single query spans tenants once databases are physically separate.
- The still-undecided hosting choice (`tech-stack.md`'s "Not yet decided" row) is directly affected by
  running N separate databases — revisit hosting with this constraint in view, not independently.

---

## ADR-057: Users — Super Admin platform-support accounts

**Context**: Separate from the tenant/location topics above — developer describes a support-access
model with no legacy precedent to extract: at tenant setup, one Super Admin account is created for
that tenant. This account (and any further Super Admin accounts it creates) is used exclusively by
internal staff (developer, project CEO, support) to assist a tenant during support situations, since
tenants do not share their own users' passwords. Super Admin is a new axis entirely separate from
ADR-002's existing tenant-business role catalog (Counter/Warehouse/Accounting/Purchasing/Admin/B2B
Customer) — it is never assigned to a tenant's own business users.

**Options considered**: (a) fold Super Admin into the existing "Admin" role from ADR-002; (b) a
distinct platform-support role, scoped and audited separately from tenant business roles.

**Decision**: (b). Confirmed shape:
- **Scope**: one Super Admin account per tenant, seeing only that tenant's data — made a physical
  guarantee by ADR-056's database-per-tenant model (a Super Admin account's connection is to that
  tenant's own database), not just an application-level permission check.
- **Bootstrap**: the original Super Admin account, created at tenant setup, is always-active/standing
  and never expires.
- **Delegation**: the original Super Admin can create additional Super Admin accounts. Each additional
  account's access mode is chosen individually at creation time — either always-active (standing) or
  on-demand/time-limited with auto-expiry. This is a per-account setting, not a single project-wide
  rule.
- **Per-account activate/deactivate, from skeleton's control panel.** Distinct from ADR-061/062's
  tenant-level lock — this toggles one specific Super Admin account only (e.g. a developer leaves the
  company), leaving the tenant itself and every other Super Admin account untouched.
- **Original Super Admin can reset/update a child Super Admin account's password**, from skeleton's
  control panel — on top of the normal ability for any account to change its own password.
- **Bulk password update for the main Super Admin, across all tenants at once.** The main/original
  Super Admin account exists in every tenant (created automatically at tenant setup). Its password may
  be the same or different per tenant, but skeleton's control panel provides a bulk action to push a
  new main-Super-Admin password across every (or selected) tenant database in one operation — not a
  manual per-tenant process. Distinct from the per-account password reset above, which targets one
  child account in one tenant.
- **Cross-tenant child-account management from one screen.** The main Super Admin manages child
  accounts (create, activate/deactivate, password reset) across every tenant from a single central
  view — same thin-router model as ADR-069's dashboard (the screen forwards the actual action to each
  tenant's own skeleton API) — rather than switching into each tenant's individual panel one at a
  time.
- **Audit**: every user's activity is logged (who/what/when) — Super Admin accounts included, with no
  carve-out. Applies the same standing principle ADR-006 already establishes for write-endpoint
  enforcement (no exceptions, structural not developer-remembered) to the audit-logging layer.

**Consequences**: `5-modules/users/7-permissions.md` adds Super Admin as a distinct role entry, not a
variant of Admin — its permission matrix and audit requirements are documented separately.
`3-api/2-authentication.md`/`3-authorization.md` document both the standing and time-limited/
auto-expiring access modes as first-class, selectable-per-account options, and specify that every
Super Admin action is captured in the same audit trail as every other user, per ADR-006's no-exceptions
posture. This directly closes the legacy Settings module's standing-credential/god-mode class of
finding by construction, rather than reintroducing it under a new name.

---

## ADR-058: Tenant runtime mode — live vs sandbox (distinct from ADR-056's tenant type)

**Context**: Developer requires each tenant to have a runtime mode, separate from ADR-056's tenant
*type* (live/demo/testing — a control-panel classification governing staged migration rollout only).
Mode governs actual behavior: **sandbox** tenants must be safe to freely test workflows in, with zero
risk of a real-world side effect — no real payment charges, no real emails reaching a real customer.
**live** tenants behave normally, every integration call is real.

**Decision**: Every tenant carries a `mode`: `live` | `sandbox`, orthogonal to its `type`. In sandbox
mode, every outbound integration with a real-world side effect is neutralized at that integration's own
call site, decided per-integration (same case-by-case standing principle as ADR-031, not one blanket
kill-switch):
- **CardConnect payments (ADR-008)**: sandbox tenants call CardConnect's own test credentials/endpoint
  — no real charge is ever possible, not merely suppressed after the fact.
- **Email/notifications (ADR-012)**: suppressed, or redirected to a safe test destination — never
  delivered to a real customer address.
- **QuickBooks sync (ADR-009/ADR-023)**: disabled, or pointed at a sandbox QuickBooks company/profile.
- **EliteExtra delivery dispatch (ADR-010)**: disabled or mocked — no real dispatch is created.
- Any future outbound integration follows the same rule at its own JIT integrations.md stage: state
  its sandbox-mode behavior explicitly, never silently inherit live behavior by default.

**Consequences**: Every module's `integrations.md` must state sandbox-mode behavior per outbound call,
not just its live behavior. Settings' Integrations & Credentials category (ADR-048) stores separate
live vs. sandbox credential sets per tenant where the integration has its own sandbox/test credentials
(CardConnect, QuickBooks) — never one shared credential reused for both. `7-cross-cutting/
1-non-functional-requirements.md` and `2-threat-model.md` document mode as a first-class tenant
attribute alongside type.

---

## ADR-059: Cron/job management control panel — skeleton, staggered per-tenant scheduling

**Context**: Tech-stack decision already replaces legacy's standalone PHP cron scripts with Redis +
BullMQ. Developer wants this managed from the same skeleton-hosted control panel as migrations
(ADR-056) — one place to add/manage recurring jobs across every tenant, operated by skeleton's own
Super Admin (no new role, same pattern as ADR-056's migration panel and ADR-057's Super Admin). Core
concern: a job that's slow for one tenant (e.g. a heavy reorder/demand-forecast recalculation, per
Location's own cron findings — ADR-039) firing at the same instant for every tenant risks overloading
shared infrastructure.

**Decision**:
- **One job definition, applies to every tenant** — a cron job's logic is defined once (e.g. lost-sale
  detection, reorder-point recalculation, statement generation) and runs the same way for every tenant;
  tenants don't get independently-coded job variants.
- **Per-tenant schedule time is independently configurable** — from the skeleton control panel, the
  same job's trigger time can be staggered per tenant (e.g. tenant A's nightly job runs at 1:00am,
  tenant B's at 1:15am), so heavy jobs don't collide across every tenant database simultaneously.
  This is the standard mechanism for managing job-duration/resource-contention risk, not a manual
  workaround.
- **Access**: skeleton's own Super Admin only (same actor as the migration control panel, ADR-056) —
  no tenant-level Super Admin can define or reschedule cron jobs; this stays a platform-operator
  capability, not exposed to tenants.

**Confirmed panel functionality**:
- **Job registry** — every defined recurring job (name, owning module, description — e.g. Location's
  reorder-point recalc, Accounts' finance-charge batch, AccountStatement generation, lost-sale
  detection) listed in one place.
- **Add/define a new job** — register a new recurring job with a default schedule.
- **Per-tenant schedule grid** — job × tenant, independently editable trigger time/offset per cell; a
  newly-created tenant (ADR-055/056 provisioning) is auto-assigned a default offset so staggering
  doesn't require manual setup every time.
- **Per-tenant enable/disable** — pause one job for one tenant without affecting others.
- **Master enable/disable (all tenants at once)** — a single toggle deactivates or reactivates a given
  job across every tenant in one action (e.g. inventory-adjustment cron off everywhere at once),
  distinct from the per-tenant override above — both levels of control coexist.
- **Run now** — manually trigger a job for a specific tenant on demand, independent of its schedule.
- **Run status log** — full execution history per job per tenant (not just the most recent run):
  timestamp, success/failure/timeout, duration, filterable by job/tenant/date/status. The mechanism
  that actually surfaces "this job is taking too long," which is what per-tenant staggering exists to
  manage, and the evidence trail behind any failure alert.
- **Failure alerting** — notify (per ADR-012's notification channels) on job failure/timeout, same
  no-carve-out posture as ADR-057's audit-everything principle.
- **Timezone reference per tenant** — cron jobs run tenant-wide (touch the whole tenant database, not
  one location in isolation), so schedule times are interpreted against **one** reference timezone per
  tenant, not per-location. Reference is the tenant's primary/default location's Timezone field
  (already exists on the Location entity, `entities-and-fields.md`) — shown on the tenant's details
  page in the skeleton control panel. A job is never split to run at each location's own local time
  within a single tenant.
- **Two pivoted views over the same job × tenant data**:
  - **By-job view** — pick one job, see every tenant that has it with each tenant's status
    (active/inactive), scheduled time, and last-run result, side by side.
  - **By-tenant view** — pick one tenant, see its total job count and an active-vs-inactive breakdown
    at a glance, before drilling into individual jobs.

**Consequences**: `6-development/` and `7-cross-cutting/` document the BullMQ job-scheduling layer as
tenant-aware-by-schedule (per-tenant delay/offset config, driven by the same tenant registry ADR-056
already establishes) rather than one fixed global schedule, with both a per-tenant and an all-tenant
enable/disable control. Skeleton's control panel scope (ADR-056) is extended to include job
definitions, per-tenant schedule offsets, master/per-tenant enable-disable, and run history/status —
not just migrations.

---

## ADR-060: Update Manager — customer-facing release notes, Jira-sourced

**Context**: Developer wants tenants to be able to see what functionality has actually been pushed to
production and why, sourced from Jira tickets that were shipped. No legacy precedent — fresh design.
Raised alongside the skeleton control-panel work (ADR-056/059) as another platform-operator capability.

**Decision**:
- **Authoring workflow**: content is drafted by combining the Jira ticket's own content with developer
  notes into a final, tenant-readable description — not auto-published straight from Jira, and not a
  raw ticket dump. Draft goes through **Super Admin review and approval** before it becomes visible to
  any tenant (a draft → review → publish flow, not direct-publish).
- **Editor**: Super Admin authors/edits the final description through a rich content editor, not a
  plain-text field.
- **Published date**: every entry carries its own published date, shown alongside the content.
- **Visibility**: visible to **every user** at a tenant, no role-based filtering. Explicitly simplified
  because role structures are dynamic/tenant-configurable (ADR-002's catalog is a starter list, not a
  fixed enum every tenant shares identically) — targeting by role name doesn't hold up across tenants.
  If per-audience targeting is ever needed later, it would have to key off a permission/capability
  check rather than a role name — flagged as a future enhancement, not designed now.
- **Placement**: its own dedicated page in every tenant (a "What's New"/Updates page), not folded into
  Settings — consistent with ADR-048's own reasoning for splitting Settings apart (a genuine owner
  boundary, not a catch-all).
- **Operator**: authored/approved by Super Admin from the skeleton control panel (ADR-056/057/059
  pattern) — same actor, same platform-operator scope as migration and cron management.

**Consequences**: A new cross-cutting capability, not owned by any of the 15 target MVP modules —
needs its own `5-modules/`-equivalent spec (or a `7-cross-cutting/` entry) at generation time, covering
the Jira-content-ingestion step, the draft/review/approve state machine, and the per-tenant "What's
New" page. Skeleton's control panel scope (ADR-056/059) is extended again, to include update-content
authoring and publishing alongside migrations and cron jobs.

---

## ADR-061: Maintenance mode — per-tenant, Super Admin bypass, custom message

**Context**: Developer wants Super Admin to be able to shut down an individual tenant for maintenance
from the skeleton control panel, without affecting other tenants — a per-tenant operation, consistent
with every other skeleton-panel capability decided this session (ADR-056/059/060) being scoped to
individual tenants rather than platform-wide by default.

**Decision**:
- **Scope**: toggled per tenant (one tenant at a time), from skeleton's control panel — same
  operator/actor as migrations, cron, and update-manager (Super Admin, ADR-056/057).
- **Super Admin bypass**: that tenant's own Super Admin support account can still log in and work while
  maintenance mode is active — only regular tenant users are blocked. Consistent with the support-access
  purpose of Super Admin accounts established in ADR-057 (need access precisely during the situations
  that trigger maintenance, e.g. fixing an issue).
- **Custom message**: blocked users see an editable, per-tenant maintenance message (not a fixed
  generic block screen) — Super Admin sets the message text when enabling maintenance mode, same
  editor-driven authoring pattern as ADR-060's update content.

**Consequences**: `3-api/`'s auth/request layer needs a maintenance-mode gate checked per tenant
(request resolved to tenant via ADR-056's subdomain routing, then gate applied before normal
auth/business logic) that allows Super Admin's own login/session through while blocking every other
role. Skeleton's control panel scope (ADR-056/059/060) is extended again to include a per-tenant
maintenance toggle and message editor.

---

## ADR-062: Tenant lock — extends ADR-061 with non-payment reason, bulk action

**Context**: Developer wants Super Admin to be able to lock a tenant out of the system for
non-payment, alongside the maintenance-mode lock already decided in ADR-061 — same underlying need
(block regular users, keep Super Admin access, show a message), different trigger and different UX
requirement (locking multiple tenants at once for non-payment, not one at a time).

**Decision**: Extends ADR-061 rather than introducing a separate mechanism:
- **Same lock mechanism, tagged with a reason** — a tenant's lock carries a reason (`maintenance` |
  `suspended-nonpayment`, extensible to further reasons later), reusing the same block gate, same
  editable per-tenant message, same request-layer enforcement already designed in ADR-061 — not a
  second, independently-built lock system.
- **Super Admin always logs in, no exceptions, for any lock reason** — explicitly confirmed for
  non-payment too, not just maintenance. Consistent with ADR-057's support-access purpose and ADR-061's
  bypass.
- **Bulk action** — the skeleton control panel supports multi-select (tick several tenants) and locking
  them all in a single action, specifically for the non-payment case, beyond ADR-061's
  single-tenant-at-a-time toggle.

**Consequences**: `3-api/`'s maintenance-mode gate (ADR-061) is generalized to a reason-tagged lock
gate rather than a boolean maintenance flag, still allowing Super Admin through unconditionally.
Skeleton's control panel (ADR-056/059/060/061) gains a bulk multi-select lock/unlock action alongside
the existing single-tenant maintenance toggle.

---

## ADR-063: Document print generation — per-tenant isolated logic, common baseline, no shared branching file

**Context**: Legacy generates print documents (invoice, pick ticket, etc.) from **one shared code
file per document type**, but each tenant's actual print style/business logic diverges — the file has
accumulated per-tenant conditional branching over time to serve every tenant's different needs from a
single entangled source, the same "one file grows unmanageable branching to serve many divergent
needs" shape this project's broader rewrite already exists to close (parallel to ADR-048's Settings
catch-all finding, though the failure mode here is divergent branching rather than an undifferentiated
catch-all). Confirmed: business logic for invoice generation is genuinely expected to differ per
tenant — this isn't a case for one universal implementation (unlike ADR-030's duplicate-formula
principle, which applies when the *same* logic is accidentally reimplemented; here the logic is
legitimately different per tenant and needs to be, cleanly).

**Decision**: Document generation is architected with a common baseline plus per-tenant isolated
logic, never a single shared file with per-tenant conditional branches:
- **Common baseline**: a shared document-generation engine/base layout exists for each document type
  (invoice, pick ticket, packing slip, etc.), giving every tenant a working starting point.
- **Per-tenant logic is its own independently-editable unit** — each tenant's actual business
  logic/style for a document type lives as its own separate piece (e.g. its own module/config/override,
  not a branch inside a shared file), so one tenant's customization can be added, changed, or debugged
  without touching or risking any other tenant's document generation.

**Consequences**: `5-modules/sales-order/8-api.md`/`outputs.md` (and any other module owning a printed
document — PurchaseOrder's receipts, AccountStatement, etc.) design the print/document-generation
layer around this common-base-plus-per-tenant-isolated-unit shape at their own JIT stage, rather than
porting legacy's single-file-with-branching pattern. Exact mechanism (e.g. a base renderer plus
per-tenant template/override resolved via ADR-056's tenant registry) is not fully pinned down here —
revisit at the owning module's own build-guidance stage.

---

## ADR-064: Tenant color theming — Admin-controlled, colors only, layout stays fixed

**Context**: Developer wants each tenant's own Admin (ADR-002's tenant-business Admin role, not
Super Admin — this is a tenant self-service capability, not a platform-operator one) to be able to
customize their site's colors (buttons, tables, etc.). Layout, component structure, and the design
system itself stay fixed per ADR-024/025 — this is a bounded color-token customization, not a reversal
of ADR-024's "not a custom/branded visual identity, one consistent design system" direction.

**Decision**: Tenant Admin can edit color values only (e.g. button color, table accent color) within
the existing fixed layout and component set — no layout, typography, or structural changes exposed to
tenants. Implemented as named, saved theme records (a color-token set), not raw inline overrides:
- **System theme** — a built-in default theme, shipped read-only, and **applied automatically to every
  new tenant** at creation (ADR-055/056 provisioning). Tenant Admin can select/re-apply it but cannot
  edit or delete it — always available as a safe fallback.
- **Custom theme(s)** — tenant Admin can create and edit their own theme(s) (color-token sets) separate
  from the System theme, using the same tenant-overridable token scope defined in `tokens.json`.

Color-token override mechanism itself still follows ADR-025's Tailwind + shadcn/ui token layer — the
named-theme model sits on top of it (a theme = one saved set of token values), not a separate styling
system.

**Consequences**: `1-discovery/4-design-creation.md`'s `tokens.json` output (still pending per ADR-024)
must define which specific color tokens are tenant-overridable (buttons, table accents, etc.) versus
fixed system-wide, so this is a scoped token set, not every token in the system. `4-ui/3-design-system.md`
documents the tenant color-override mechanism explicitly as an exception to the otherwise-fixed design
system, and the owning module (likely Settings, per ADR-048's per-category ownership model) exposes a
tenant Admin-facing color-editing screen.

---

## ADR-065: Pre-deploy backup — git branch snapshot + physical code archive, manual trigger from skeleton

**Context**: Developer wants a safety step before syncing changes to production: back up the
production git branch, and separately keep a physical archive of the actual deployed codebase (not
just git history) — an extra safety net beyond git itself, controlled from the same skeleton control
panel as every other platform-operator capability this session (ADR-056/059/060/061/062).

**Decision**:
- **Git branch backup** — a snapshot/tag of the production branch taken before deploying.
- **Physical code backup** — a separate full archive of the actual running codebase (e.g. to AWS S3,
  per ADR-011), independent of git — kept as a rolling retention of the **last 2** backups, older ones
  purged automatically.
- **Trigger**: manual — Super Admin explicitly triggers this from skeleton's control panel before a
  production deploy, not run automatically on every deploy.

**Consequences**: Skeleton's control panel scope (ADR-056/059/060/061/062) is extended again to include
a pre-deploy backup action (git branch snapshot + physical code archive with 2-deployment retention).
`6-development/`'s deploy workflow documentation references this as a manual pre-deploy step, not a
CI/CD-automated one.

---

## ADR-066: Live-to-testing database clone for repro debugging

**Context**: A production-only bug sometimes doesn't reproduce locally — developer needs a realistic
copy of the actual live tenant database to debug against. No legacy precedent to extract; fresh
capability, exercising the database-per-tenant model (ADR-056) directly.

**Decision**: This is a full new-tenant provisioning flow (ADR-056's standard pipeline: new database,
new registry entry, new subdomain), except the clone source is a chosen **existing live tenant's**
database instead of skeleton. Not a bare database copy with no tenant attached — it comes out the other
end as a genuine, independently-addressable new tenant/sub.
- **Exact copy, no scrubbing** — the clone is an unmodified copy of the live tenant's real data,
  deliberately not anonymized (developer needs a faithful repro environment).
- **Automatically set to `sandbox` mode the moment the copy completes** — reuses ADR-058's tenant
  runtime mode mechanism directly rather than inventing a new safety layer. Any transaction the
  developer creates while debugging never sends a real email, never triggers a real payment charge, and
  never touches the source tenant's real QuickBooks/integration credentials, because ADR-058's
  per-integration neutralization already covers all of that.
- **Tagged `testing`** under ADR-056's tenant type classification, naturally fitting the staged
  migration-rollout/control-panel visibility already designed for that type.

**Consequences**: No new mechanism required — this is ADR-056's standard new-tenant provisioning
pipeline, given an alternate clone source (a chosen live tenant's database instead of skeleton), plus
ADR-058's sandbox neutralization applied automatically at creation. Skeleton's control panel
(ADR-056/059/060/061/062/065) gains a "create testing sub from existing tenant" action alongside normal
new-tenant creation. Retention/cleanup policy for these ad hoc debugging subs is not decided here —
revisit if it becomes a recurring operational concern.

---

## ADR-067: S3 document retention — runtime-generated PDFs auto-expire, module uploads never do

**Context**: AWS S3 already decided for document storage (ADR-011). Two genuinely different kinds of
document live there: (1) documents generated at runtime from existing data (invoice PDFs, pick
tickets, etc.) — regenerable on demand, safe to expire; (2) documents uploaded by users into specific
modules (SalesOrder, Accounts, and others' own upload features — signed documents, photos, contracts)
— **not** regenerable from any other source, must never be deleted automatically.

**Decision**:
- **Runtime-generated documents** stored under their own S3 prefix, with a native **S3 lifecycle
  expiration rule** set to auto-delete anything older than **30 days**. No custom cleanup job — AWS
  handles it natively. Deleting the rendered file never deletes the underlying data (order/invoice
  record stays in the database indefinitely); a request for the document after expiry just
  re-renders it on demand.
- **Module-uploaded documents** stored under a separate S3 prefix with **no expiration rule at all** —
  kept indefinitely, removed only by an explicit user/admin delete action if one exists, never by an
  automated policy.

**Consequences**: `2-database/`/`3-api/` document storage design uses a prefix structure that cleanly
separates "generated" from "uploaded" per tenant (e.g. `/{tenant}/generated/...` vs
`/{tenant}/uploads/...`), so the lifecycle rule can be scoped to exactly the generated prefix. Every
module that renders a runtime document (SalesOrder invoices, PurchaseOrder receipts, AccountStatement,
etc.) documents this in its own `outputs.md`/`integrations.md` as "regenerate on demand, not
permanently retained." Every module with its own file-upload feature (SalesOrder, Accounts, others)
documents its uploads as permanently retained, distinct from the generated-document category.

---

## ADR-068: Audit trail — full-coverage logging, role-gated viewing, 2-year retention with approval-gated deletion

**Context**: ADR-057 already established "every user's activity is logged, no carve-out" in the
narrow context of Super Admin support accounts. Developer wants this generalized into a full,
project-wide audit trail capability, with its own retention and access rules.

**Decision**:
- **Coverage — everything logged.** Every create/update/delete action, every login, and every
  read/view access to a record — not just writes.
- **Viewing access** — Super Admin always has full access to audit data (every tenant it's scoped to,
  per ADR-057). Other users' access is role/permission-gated — since roles are tenant-configurable
  (ADR-002's catalog is a starter list, not a fixed enum every tenant shares — see ADR-060's same
  reasoning), audit-log visibility must be its own assignable permission, not hardcoded to a specific
  role name.
- **Retention — 2 years, then approval-gated deletion, not automatic.** When audit data reaches the
  2-year mark, the system flags it for deletion and sends a notification. Deletion only proceeds once
  **either** Super Admin **or** Admin approves (one approval, not both required) — never a silent
  automatic purge.
- **Deletion is itself logged, permanently, written after the delete completes, in a separate table.**
  Once the 2-year-old audit data is actually purged (not before, not as a pre-delete intent record), a
  confirmation entry is written to a distinct **audit-deletion log table** — never the same table as
  the regular audit trail, since that data is exactly what's being purged. Being a separate table
  means it's exempt from the 2-year retention rule by construction, not by a special-case exception —
  otherwise the audit trail's own deletion would go untraceable, defeating its purpose. Records who
  approved the deletion, when, and what was removed.

**Consequences**: `7-cross-cutting/` gets a dedicated audit-trail specification (logging coverage,
storage, retention/approval workflow) referenced by every module rather than each module inventing its
own audit approach. `5-modules/users/7-permissions.md` defines the audit-log-viewing permission as an
assignable grant, not a role-name check. The approval-gated deletion flow reuses the notification
mechanism already established for other approval-style workflows in this project (e.g. ADR-012's
push/in-app notifications).

---

## ADR-069: Multi-environment isolation + central management dashboard (extends ADR-056)

**Context**: Five environments exist: Local (developer's own Windows machine), DS (Dev Server), SS
(Staging Server), Pre-SS (Pre-Staging), Production. Developer wants to manage tenant subs across all
of them without repeatedly switching between five separate skeleton control panels, but this must not
create a single system with direct reach into every environment's real data — Production isolation
from lower environments is a real security concern this project exists to take seriously.

**Decision**:
- **Each environment stays fully isolated, source of truth intact.** Local, DS, SS, Pre-SS, and
  Production each keep their own separate skeleton database (ADR-056) and their own tenant registry —
  no environment's skeleton connects to another's. A sub with the same name in two different
  environments (e.g. "wbc" in DS and "wbc" in SS) is two unrelated databases.
- **Central dashboard is a thin router, not a second authority.** A management dashboard lets Super
  Admin pick an environment and act on it from one place, but it forwards the action to that
  environment's own skeleton API to actually execute — it holds no direct database credentials for any
  environment itself. If it's ever compromised, an attacker gets "can call skeleton APIs" (still gated
  by each environment's own Super Admin auth and full audit trail, ADR-057/068), not a direct database
  connection to Production.
- **Dashboard's own data is a mirror, not authoritative.** It keeps a cached copy of every
  environment's tenant list for the combined view; if it ever disagrees with an environment's own
  skeleton, the environment's own skeleton wins.
- **Every sub carries an explicit `environment` attribute** (Local/DS/SS/Pre-SS/Production) in its
  registry entry — makes same-named subs in different environments distinguishable everywhere,
  especially in the central dashboard's combined cross-environment view.
- **Local is included via the same app run locally**, not a hosted dashboard reaching into a
  developer's machine. The same dashboard application can be run on the developer's own Windows
  machine, pointed at their own local skeleton instance — it manages Local exactly the same way it
  manages any other environment, just running in that context instead of hosted centrally.
- **Local instance is hard-restricted to Local only — no reachability to DS/SS/Pre-SS/Production at
  all.** Even though it's the same application, a locally-run instance is configured (at deploy/build
  time, not user-selectable at runtime) to talk to Local's own skeleton exclusively. Only the properly
  hosted dashboard instance (on managed infrastructure, used by internal staff) is permitted to reach
  DS/SS/Pre-SS/Production. A developer's own machine must never be capable of touching those
  environments, whether by misconfiguration or compromise — the multi-environment reach described
  above applies to the hosted instance only, not the local one.
- **Production is reachable through the same dashboard, with no auth/audit shortcut** — same Super
  Admin login, same full audit logging as accessing Production directly; being routed through the
  central dashboard changes nothing about what's enforced.

**Consequences**: `6-development/`'s environment/deployment documentation describes this dashboard as
an additional thin client over each environment's existing skeleton control panel (ADR-056/059/060/
061/062/065/066), not a new system of record. `3-api/` documents the skeleton-API surface each
environment exposes for the dashboard to call, since it now has a caller other than direct human use of
that environment's own skeleton subdomain.

---

## ADR-070: Tenant database backup/disaster-recovery — delegated to hosting provider, not custom-built

**Context**: ADR-065 covers a manual pre-deploy code backup only; nothing was decided about routine
backup/recovery of the actual tenant databases themselves. With full database-per-tenant now locked
(ADR-056), this is a real gap — a single tenant's data could be corrupted or accidentally deleted with
no recovery path, the same class of risk this rewrite exists to close (the project's own originating
incident was a real data-loss event, per `project-overview.md`).

**Decision**: Backup/point-in-time recovery is **delegated to the hosting provider's native
capability** (e.g. AWS RDS automated backups/PITR), not built as a custom application-level backup
system. Hosting is mostly AWS today but not fixed — this becomes an explicit **requirement** on
whichever hosting is ultimately chosen (see ADR-056's still-open hosting question): native automated
per-database backup and point-in-time recovery must be available.

**Consequences**: `3-tech-stack-decision/tech-stack.md`'s hosting decision (still "Not yet decided")
must be evaluated against this requirement alongside ADR-056's same-instance template-cloning need.
`7-cross-cutting/1-non-functional-requirements.md` states backup/recovery as a hosting-provider
capability requirement rather than an application feature to design.

---

## ADR-071: Hosting — AWS default, kept portable

**Context**: `3-tech-stack-decision/tech-stack.md` has left hosting as "Not yet decided," deliberately
deferred until infra/ops ownership was assigned. ADR-056 (database-per-tenant, same-instance template
cloning) and ADR-070 (native backup/PITR requirement) both now depend on this choice. Legacy already
runs mostly on AWS, but developer doesn't want to hard-lock to it long-term.

**Decision**: **AWS is the default hosting provider.** Architecture is kept portable enough that a
future move to another AWS-comparable cloud provider is realistic if ever needed — not a hard
vendor-lock, but AWS is what's actually used going forward unless a deliberate future decision changes
it. File storage (ADR-011, S3), payment gateway integration (ADR-008), and the database-per-tenant
model (ADR-056) are all evaluated against AWS-native equivalents (RDS for Postgres, S3 for storage)
first.

**Consequences**: `3-tech-stack-decision/tech-stack.md`'s hosting row is updated from "Not yet decided"
to "AWS (default, portable)." ADR-056's same-instance template-cloning requirement and ADR-070's
native-backup requirement are evaluated specifically against AWS RDS's actual capabilities (e.g.
`CREATE DATABASE ... TEMPLATE` support, automated backup/PITR) at implementation time — not re-decided
here, just now has a concrete provider to design against.

---

## ADR-072: Tenant offboarding — manual process, no automated retention/deletion rule

**Context**: When a tenant cancels/leaves, no decision existed yet for what happens to their database.

**Decision**: No automated rule. A cancelled tenant's database is kept for some period, but the whole
process — how long to keep it, whether/when to export data back to the tenant, when to actually delete
it — is handled **manually by management**, not by a system-enforced policy or scheduled job. Reuses
ADR-062's lock mechanism to suspend the tenant's access immediately on cancellation (tagged with its
own reason, e.g. `offboarded`), while the underlying database itself is left in place until a human
decides to remove it.

**Consequences**: No `6-development/`/`7-cross-cutting/` automated-deletion job is designed for tenant
offboarding — this stays a manual operational action from skeleton's control panel (lock the tenant,
leave the database, delete later by explicit human action), not a policy engine.

---

## ADR-073: `tenant_id` column dropped project-wide (resolves ADR-056's open item)

**Context**: ADR-005 originally required every table to carry a `tenant_id` column, under the
now-superseded shared-schema RLS model (ADR-004). ADR-056 replaced that with full database-per-tenant
and flagged `tenant_id`'s continued necessity as an open question — isolation is now physical
(separate database), not row-level.

**Decision**: Drop `tenant_id` entirely, project-wide. No defense-in-depth carve-out — isolation is
achieved solely by physical database separation (ADR-056); a redundant column adds schema complexity
without closing any gap that separate databases don't already close.

**Consequences**: ADR-005's standard audit/system column set no longer includes `tenant_id` — every
entity table keeps `id` (UUID), `created_at`/`updated_at`, `created_by`/`updated_by`, and
`is_deleted`/`deleted_at`, but not a tenant-scoping column. `2-database/4-database-standards.md`
states this explicitly, and no module's `4-schema.md` includes `tenant_id` in its uniqueness
constraints going forward — uniqueness is naturally per-database now, not `(tenant_id, ...)`-scoped.

---

## ADR-074: Users — QuickBooks employee sync revived (resolves USR-OQ-014/R11)

**Context**: Legacy's QuickBooks employee sync (list-id/edit-sequence pointer pair on the User record,
per `entities-and-fields.md`) is fully coded but confirmed dead — every enqueue call site is commented
out, one of three QuickBooks integrations examined across this project showing the identical disabled
pattern. Flagged as an open question (USR-OQ-014) pending developer confirmation on whether it should
be revived or formally retired for the new system.

**Decision**: Revived — the new system actively syncs employee records to QuickBooks, keeping
QuickBooks' own employee list current with the ERP's Users data. Not excluded/retired.

**Consequences**: `5-modules/users/8-api.md`/`integrations.md` design a real, working QuickBooks
employee-sync integration (per ADR-009's "rebuild sync, working properly" and ADR-023's expanded-scope
principle) rather than porting the legacy dead enqueue-call pattern. Follows ADR-031's standing
principle (non-blocking external integrations move to async/BullMQ) unless a specific synchronous need
is confirmed at this module's own JIT integration design stage.

---

## ADR-075: Users — 2FA policy (resolves USR-RISK-014)

**Context**: Legacy has three compounding 2FA gaps: coverage is a hardcoded role-allowlist (some
users never see 2FA at all), code regeneration has no rate limit (the validity window can be
indefinitely refreshed), and 2FA is silently unusable with no admin alert or fallback for any user
with no personal email configured.

**Decision**:
- **Role-based, but configurable** — 2FA stays tied to role rather than universal for every user, but
  which roles require it is an **Admin-configurable setting**, not a hardcoded allowlist in code.
- **Super Admin (ADR-057) is included in the same configurable system, not force-mandatory.** 2FA can
  be applied to Super Admin accounts too, but through the same admin-configurable role setting as any
  other role — no special hardcoded-always-on exception, despite its high privilege level.
- **Rate-limited regeneration** — code requests are capped (e.g. one new code per 60 seconds, plus a
  max-attempts window) to prevent abuse.
- **Email becomes a required field for 2FA-required roles** — rather than a silent no-fallback dead
  end at login time, a valid email is enforced as a required field (same "required at save" pattern as
  ADR-032) for any account whose role requires 2FA. Gaps get caught and fixed by an Admin ahead of
  time, not discovered as a login failure.

**Consequences**: `3-api/2-authentication.md` documents 2FA as role-gated via an admin-configurable
setting (not hardcoded), with regeneration rate-limiting and the email-required-field rule for
2FA-required roles. `5-modules/users/6-validation.md` adds the conditional-required-field rule (email
required when role requires 2FA).

---

## ADR-076: Users — 2FA developer-email CC dropped, superseded by ADR-057 (resolves USR-RISK-010)

**Context**: Legacy CCs the admin account's 2FA codes to a hardcoded developer-email list on every
send, with no dev/prod environment check. Root cause confirmed by developer: legacy has only **one**
shared Super Admin account, so when multiple developers needed access, the CC was a workaround so all
of them could see the login code from the one shared inbox.

**Decision**: Dropped entirely, not ported in any form. ADR-057 already solves the underlying problem
properly — each developer/staff member gets their own individual Super Admin account (standing or
time-limited), so each receives their own 2FA code at their own email. No shared-account bottleneck
exists in the new design, so no workaround is needed.

**Consequences**: `3-api/2-authentication.md` documents 2FA delivery as going only to the account
holder's own email, with no CC/broadcast path of any kind — closing this exact standing-visibility-
channel class of finding by construction, consistent with ADR-057's audited multi-account model.

---

## ADR-077: Users — Time Clock "Labor Status" enum defined (resolves USR-OQ-006)

**Context**: The Clock-In Task Detail's "Labor Status" field has no enum/allow-list validation
anywhere in legacy, and no confirmed write/read site established its valid values.

**Decision**: Standard three-value enum — **Working**, **Break** (paid), **Lunch** (unpaid). Matches
common US payroll convention; the paid/unpaid distinction feeds directly into ADR-036's standard US
overtime calculation. Extensible later if a genuine additional category is needed, not treated as a
fixed ceiling.

**Consequences**: `5-modules/users/4-schema.md` defines Labor Status as an enum with these three
values (not a free-text/unvalidated field as in legacy); `6-validation.md` enforces it server-side.

---

## ADR-078: Users — payroll CSV export deferred past MVP (resolves USR-OQ-017)

**Context**: Legacy has a live, working payroll-report CSV export code path, but no confirmed UI entry
point (button/link) was located reaching it in any blueprint pass — unclear if it's actually usable
today.

**Decision**: Wanted for the new system, but **deferred — not part of the MVP-15 module build**.

**Consequences**: `5-modules/users/2-functional-specification.md` notes payroll CSV export as a
confirmed post-MVP feature, not designed/built in the initial build target. Revisit scope/design once
MVP modules are complete.

---

## ADR-079: SalesOrder — concurrent-edit lock, real lock not a session-mismatch ping

**Context**: Legacy has no genuine concurrent-edit protection anywhere confirmed across this project's
blueprinted modules — Location's own confirmed finding (`business-rules-and-validation.md`
LOC-RULE-011) is explicit that its "concurrent-update protection is a session-mismatch ping, not a
lock. It catches a stale browser tab, not two genuinely simultaneous submits from the same valid
session." Developer wants a real lock specifically for SalesOrder, to prevent two users editing the
same order simultaneously and conflicting on line items at save time.

**Decision**: Genuine pessimistic edit-lock on SalesOrder records:
- When User A opens a Sales Order in edit mode, the record locks for editing. User B attempting to
  open the same record in edit mode is blocked, shown a **detailed message** ("Currently being edited
  by John, locked for you"), not a generic "locked" notice.
- **Lock releases instantly** the moment User A leaves edit mode (closes/cancels/navigates away) — no
  fixed timeout delay. Tied to the active editing session, not a stale long-lived flag.

**Consequences**: `5-modules/sales-order/3-business-rules.md`/`workflows.md` design a real editing-
session lock (e.g. a short-lived, actively-held lock record tied to the user's live session/connection,
released on disconnect/cancel/save) rather than porting Location's confirmed weak session-mismatch-ping
pattern. `9-ui.md` designs the blocking message shown to the second user, including the current
editor's identity. **Generalized to a project-wide standing principle by ADR-084** — every module with
a real editable record gets this same lock pattern, not just SalesOrder.

---

## ADR-080: SalesOrder edit-lock — Redis TTL implementation, Memurai for Local (extends ADR-079)

**Context**: ADR-079 locked a genuine pessimistic edit-lock for SalesOrder, releasing instantly on
clean close and needing a safety-net for ungraceful disconnects (browser crash, PC shutdown). Also
needed: an implementation approach, its server-load impact, and how it works on Local (Windows dev,
Docker explicitly not wanted).

**Decision**:
- **Implementation**: Redis, TTL-based lock key per record. Each heartbeat ping (while a record is
  actively open in edit mode) refreshes the key's expiry; if pings stop (crash/disconnect), Redis
  expires the key automatically and the lock releases — no custom missed-heartbeat-counting logic
  needed in application code.
- **Server load**: negligible — heartbeats only run while a record is actively being edited, and the
  project's own NFR scale target (ADR-028: low-hundreds of concurrent sessions) keeps this well within
  Redis's normal capacity; cheaper than hitting the main database for the same purpose.
- **Local environment**: **Memurai Developer** (free, Windows-native, Redis-protocol-compatible,
  non-production only) — no Docker/WSL required. Same Redis protocol as DS/SS/Pre-SS/Production, so
  application code is identical across every environment; only Local substitutes Memurai for real
  Redis. Note: Memurai Developer auto-restarts after 10 days of continuous uptime (a minor local-dev
  annoyance, not a data-loss risk, and not applicable to hosted environments which run real Redis).

**Consequences**: `6-development/1-development-environment.md` documents Memurai Developer as the
Local-environment Redis substitute, alongside the existing pnpm/Node setup instructions. `5-modules/
sales-order/3-business-rules.md` specifies the Redis TTL-lock mechanism concretely (not just "a lock"
as stated in ADR-079) as the implementation detail.

---

## ADR-081: Users — record-sharing-rule engine dropped, role-based access is sufficient

**Context**: Legacy's CRM-style sharing-rule/precedence engine (record-level "share this specific
record with this person/group," layered on top of role permissions) was confirmed "validation-free by
a full-file keyword grep" (USR-OQ-019) — never actually enforced correctly. No other module's
blueprint flagged a genuine business need for it either.

**Decision**: Dropped entirely — not rebuilt. Role-based access (ADR-002) plus server-side Guards
(ADR-006) is sufficient. Confirmed via the concrete scenario: two Counter staff sharing the same role
both get SalesOrder access automatically through their role, no per-record sharing needed for that; the
one real risk — both trying to edit the *same* order simultaneously — is already closed by ADR-079's
edit-lock, not by a sharing-rule engine.

**Consequences**: No module's `4-schema.md`/`7-permissions.md` models a sharing-rule/precedence table
or engine. Access control throughout the system is role-based (ADR-002, tenant-configurable per
ADR-060/068's established reasoning) plus the concurrency-lock pattern (ADR-079/080) where genuinely
needed — no third mechanism.

---

## ADR-082: Products — mass-update requires preview + confirmation (resolves PROD-RISK-008)

**Context**: Legacy's mass-update apply path has no count-confirmation, dry-run, or batch-size cap — a
broad classification match combined with a wide field selection can mass-update every non-deleted
product/location row in the system in one honest, non-adversarial operator mistake, independent of the
module's separate SQL-injection findings on the same path.

**Decision**: A mass-update requires a server-computed affected-row-count preview before execution,
with an explicit confirmation step tying that preview to the actual apply action — a mistaken broad
scope is caught before it runs, not discovered after.

**Consequences**: `5-modules/products/8-api.md`/`9-ui.md` design the mass-update flow as
preview-then-confirm-then-apply, not the legacy immediate-apply pattern. The mass-updatable field list
is also server-side allow-listed as a domain invariant (per PROD-RISK-001's own mitigation, already
implied by ADR-006), never merely a UI restriction.

---

## ADR-083: Products — Door Configuration split into its own future module, deferred past MVP (resolves PROD-OQ-015)

**Context**: Legacy's Door Configuration subsystem (12 tables, ~2,600-line dispatcher) was
deliberately catalogued at table-purpose depth only, pending a scope decision on whether the rewrite
needs it at all.

**Decision**: Confirmed in scope long-term, but as its **own separate module**, not folded into
Products — and **deferred past the MVP-15 build**, consistent with ADR-003's "remaining modules, count
TBD, blueprinted incrementally" posture.

**Consequences**: `claude-docs/analysis/module-list.md` notes Door Configuration as a confirmed
post-MVP module candidate, not part of Products' own scope. When its turn comes, it needs a full
JIT field-extraction pass (deeper than the current table-purpose-only depth) before design work starts
— not treated as already-blueprinted.

---

## ADR-084: Standing principle — concurrent-edit lock applies to every module, not just SalesOrder

**Context**: ADR-079/080 built a genuine pessimistic edit-lock (Redis TTL-based, heartbeat-renewed,
instant release on clean close) for SalesOrder specifically, prompted by Products' own confirmed
concurrent-edit risk (PROD-RISK-016: base-price and UOM-specific-price writes with no shared lock or
version check, the same class of gap Location's own `business-rules-and-validation.md` flags as a
"session-mismatch ping, not a lock"). Developer wants this generalized rather than re-decided
per module.

**Decision**: Standing project-wide principle, same shape as ADR-030 (no duplicate formula
implementations) and ADR-031 (non-blocking integrations move to async): **every module with a real
editable record applies the same concurrent-edit lock pattern** — Redis TTL-based lock, heartbeat
keep-alive, instant release on clean close, detailed "currently being edited by X" message on the
second user's attempt. Applied automatically at each module's own JIT build stage, not re-litigated
per module.

**Consequences**: Every module's `3-business-rules.md`/`build-guidance.md` documents this as "uses the
standard concurrent-edit lock (ADR-079/080/084)" rather than inventing its own concurrency answer or
silently omitting one. Closes Location's own confirmed weak session-mismatch-ping pattern and Products'
uncoordinated dual pricing-write paths (PROD-RISK-016) by the same construction, project-wide.

---

## ADR-085: Products/PurchaseOrder — "RGN" = Return Good Number (resolves PROD-OQ-001)

**Context**: `vtiger_rgnproductdetail`'s "RGN" abbreviation was never expanded anywhere in the traced
legacy code or schema comments — flagged as a true orphan requiring developer confirmation. Same
abbreviation also appears in PurchaseOrder's status model (ADR-050's "Fully Processed RGN" stage).

**Decision**: RGN = **Return Good Number**, confirmed by developer.

**Consequences**: `5-modules/products/entities-and-fields.md` and `5-modules/purchase-order/
3-business-rules.md` (ADR-050's status model) both document RGN with its real meaning rather than as
an unexpanded abbreviation.

---

## ADR-086: Products — "Freeze O2X" field behavior confirmed (resolves PROD-OQ-009)

**Context**: `vtiger_productcf.freezeo2xupdate`'s "O2X" abbreviation was never expanded anywhere in the
traced legacy code — flagged as a true orphan.

**Decision**: Exact abbreviation expansion not confirmed, but functional behavior confirmed by
developer, which is what the design actually needs: setting a date on this field prevents the Order
Point fields (Part Min, Part Max, Part Order Point) from being updated through the Create Purchase
Order interface or the Order Point Calculations Reports until that date passes — after which they
update normally again. Users can always manually edit order points regardless of this freeze.

**Consequences**: `5-modules/products/3-business-rules.md`/`workflows.md` documents this field's real
behavior (a temporary auto-update freeze with a manual-override carve-out) rather than leaving it as an
unconfirmed orphan field.

---

## ADR-087: Products — "Big C" = BigCommerce, not a co-op program (resolves PROD-OQ-010)

**Context**: `vtiger_productcf.cf_visible_to_big_cust`'s "Big C" abbreviation was never expanded in
legacy code; the source blueprint's best guess was a co-op member program name — flagged as
unconfirmed.

**Decision**: Corrected by developer — "Big C" refers to **BigCommerce** (the e-commerce platform),
not a co-op member program. This field controls product visibility to the BigCommerce-integrated
storefront/catalog, connecting directly to the still-open e-commerce catalog-push questions
(PROD-OQ-034/035) — confirms a real BigCommerce integration exists behind those.

**Consequences**: `5-modules/products/entities-and-fields.md` corrects the field's documented meaning
from the legacy blueprint's co-op-program guess to BigCommerce catalog visibility.
`integrations.md`/PROD-OQ-034's cron-vs-inline question should be resolved against BigCommerce's own
integration pattern specifically, not treated as a generic unnamed e-commerce push.

---

## ADR-088: Products — "NAP" = Not A Product (resolves PROD-OQ-036)

**Context**: `lbm_cost_change_nap_product`'s "NAP" abbreviation was never confirmed in legacy — the
source blueprint's best guess was "Not Applicable Pricing" (inferred from the table's confirmed
behavior as a manual gross-profit-override whitelist).

**Decision**: Corrected by developer — NAP = **Not A Product**. This clarifies the table's actual
purpose: cost-change entries for line items that aren't real stocked products (e.g. freight, labor,
misc fees), which don't follow normal product-margin rules and need a manual GP-override path as a
result — a more precise explanation than the legacy blueprint's guess.

**Consequences**: `5-modules/products/entities-and-fields.md` and any calculations/business-rules
documentation referencing this table describe it as the non-product-line-item cost/GP-override
mechanism, not a generic "not applicable pricing" catch-all.

---

## ADR-089: Products/Vendors — Line Code/Subline/Division replaced by a shared, flexible Category tree (supersedes ADR-044's Line Code ownership)

**Context**: Legacy's classification hierarchy (Line Code → Subline → Product Division) is a fixed,
exactly-3-level structure, already displayed to this tenant under renamed labels (Department/Class/
FinLine). It's shared across Vendors (`vtiger_vendorlinecode`, confirmed four-way dual-write, the exact
bug ADR-044 exists to fix) and Products. Separately, Products has an `is_non_stock`
flag/`non_stock_id` reference ("NS Code") marking non-inventory/special-order items — confirmed by
developer to be a product-type flag that still gets classified through the same hierarchy, not a
fourth classification tier. Developer wants a modern replacement rather than porting the rigid 3-level
legacy structure.

**Decision**:
- **Replace with a generic, flexible Category tree** — parent-child structure, any depth, not locked
  to exactly 3 levels. Each category node has a name; a product links to one category node, and its
  full classification path is whatever chain of ancestor categories leads to it. Same model modern
  e-commerce platforms use (including BigCommerce, per ADR-087's confirmed integration).
- **One shared tree, not two separate ones** — Products and Vendors both reference the exact same
  Category tree, not independently-maintained parallel hierarchies (confirmed explicitly by developer
  after considering the alternative). Avoids reintroducing a mapping/reconciliation layer between two
  divergent classification systems.
- **Ownership moves to Products** (supersedes ADR-044's "Vendors owns Line Code" for this specific
  concept) — the Category tree itself is Products-owned, since it's fundamentally a product
  classification concept. Vendors keeps its own vendor-specific data (which categories a vendor
  supplies, vendor-specific pricing/door-code/DCS settings currently living on the Vendor Line Code
  table) as a **Vendor-Category assignment/join**, reading the category tree from Products' API rather
  than owning classification data itself.
- **`is_non_stock` stays a simple flag on the product**, not folded into the category tree — a
  non-stock product still gets a normal category assignment, plus this one boolean.

**Consequences**: `5-modules/products/4-schema.md` defines a self-referencing Category entity
(parent_id, name, tenant-scoped) replacing the three flat Line Code/Subline/Division columns.
`5-modules/vendors/4-schema.md`/`8-api.md` redefine the Vendor Line Code table as a Vendor-Category
join carrying only vendor-specific attributes (description, sq-ft pricing, door-code flags, DCS
pricing, GL accounts, adder-per) with a reference to Products' Category tree, not its own classification
codes. ADR-044's underlying goal (close the four-way dual-write bug by giving the concept one clear
owner) is preserved — the owner changes from Vendors to Products, but "one owner, everyone else reads
via API" stays the mechanism. Every other module referencing Line Code by name (SalesOrder,
SearchLineItem, PurchaseOrder/PurchaseLineItem, SalesHistory/PurchaseHistory) is understood as
referencing the new Category tree going forward, resolved at each module's own JIT stage.

---

## ADR-090: Products — variant-level stock tracking, parent/variant/location model (extends ADR-042)

**Context**: ADR-042 already confirmed product variants as a real feature going forward (100% dormant
in legacy, no live usage to derive real behavior from, flagged as needing fresh requirements at this
module's own JIT stage). Developer confirmed legacy never tracked stock per variant at all. Needed:
whether the new system tracks stock at the whole-product level or per variant.

**Decision**: Stock is tracked **per variant**, not at the parent-product level. Each variant is its
own distinct stockable unit — its own Product Number (per ADR-045's canonical unique business key),
its own cost/QoH/reorder/bin data per location (Product-at-Location, per Location's own R1 requirement)
— exactly like a normal product, not a shared bucket under the parent. The parent product exists purely
as a catalog/grouping record (shared name, description, category). A product with no variants is
modeled as having exactly one implicit variant (itself), so there is one consistent data model, not a
separate code path for "has variants" vs. "doesn't."

**Consequences**: `5-modules/products/4-schema.md` models Product (parent/catalog) → Product Variant
(the real stockable unit, FK to parent) → Product-at-Location (keyed by variant, not by parent product)
— not a QoH field living directly on the parent when variants exist. `5-modules/location/4-schema.md`'s
Product-at-Location entity keys off variant id consistently, whether or not the underlying product has
real variants. Matches the standard e-commerce/inventory pattern (parent/variant/location), consistent
with ADR-089's Category tree and ADR-087's confirmed BigCommerce integration. **Barcode also scopes at
the variant level, same as SKU** (confirmed by developer) — each variant carries its own unique
barcode, enforced by the save-time uniqueness invariant already resolving PROD-RISK-017.

---

## ADR-091: Products/Location — no-cost-set state is null, never zero; SO line blocked until real cost exists

**Context**: Per ADR-055's lazy Product-at-Location row creation, a product/variant can be looked up at
a location where it's never been received or priced. Needed: what the system shows/does for cost in
that state. Developer confirmed `$0` is sometimes a legitimate, deliberately-set price (free/giveaway
items) — so it cannot double as the "not yet priced" sentinel.

**Decision**: "Not yet priced at this location" is represented as **null/blank**, distinct from an
explicit `$0` (a real, deliberately-entered free price) — the two states are never conflated.
Displayed to staff as "not yet stocked here," not `$0.00`. A Sales Order line item cannot be saved
against a null cost at that location — it must be resolved first, either by a real receipt at that
location or an explicit manual cost entry, before the line can save. Never silently defaults to
another location's cost (different locations can have genuinely different vendor pricing/freight) and
never silently defaults to zero.

**Consequences**: `5-modules/location/4-schema.md`'s cost fields on Product-at-Location are nullable,
with null carrying distinct meaning from `0.0000`. `5-modules/sales-order/6-validation.md` adds this as
a required-field-style save gate (same enforcement pattern as ADR-032), and `9-ui.md` displays the
"not yet stocked here" state distinctly from a free-priced item.

---

## ADR-092: Products — single SKU field replaces Product Number + Product Stripped (extends ADR-045, ADR-090)

**Context**: Legacy carries "Product Number" (the canonical identifier, ADR-045) and a separately
maintained "Product Stripped"/normalized copy (whitespace/punctuation-stripped, used for search/
QuickBooks-push/cross-module joins) as two fields kept in sync. Also confirmed by developer: "Part
Number" and "Product Number" are the same concept, just inconsistently named in legacy — a single
identifier, not two.

**Decision**: Replace with a single **SKU** field, format-validated at entry so a derived "clean copy"
is never needed:
- **Characters**: uppercase letters (A–Z) and digits (0–9); hyphens allowed as separators. No spaces,
  no other special characters — enforced at entry, not cleaned up after the fact.
- **Length**: no restriction.
- **Scope**: applies at the **variant** level (ADR-090 — each variant is its own stockable unit, so
  each variant gets its own SKU), superseding "Product Number"/"Part Number"/"Product Stripped" as
  three separate legacy concepts collapsed into one.
- **Uniqueness**: enforced per-tenant, same principle as ADR-045.

**Consequences**: `5-modules/products/4-schema.md` defines SKU as the single canonical identifier
field on Product Variant, with a database-level format constraint plus per-tenant uniqueness — no
separate "stripped" column, no post-hoc normalization step anywhere downstream (QuickBooks push,
cross-module joins, search). Every other module's line-item/history tables that previously referenced
"Product Number"/"Product Stripped" (SearchLineItem, SalesHistory, PurchaseHistory, PurchaseLineItem,
per ADR-045's own consequence list) reference SKU instead, resolved at each module's own JIT stage.

---

## ADR-093: Products — shared search architecture, barcode fast path, recent-items, background import/export (at 2M-product/15-location scale)

**Context**: Legacy runs at real scale — ~2,000,000 products × up to 15 locations. Confirmed pain
points: slow product autocomplete/search across SalesOrder, PurchaseOrder, Catalog, and Store Transfer
line-item entry, and a slow Products list page. Search results also need module-specific data attached
(SalesOrder needs sell price, PurchaseOrder needs cost, etc.) — a single identical response shape
doesn't fit every consumer.

**Decision**:
- **Shared search core, module-specific response layer.** One shared search engine/index (fast
  text-matching over SKU + name, Postgres full-text/trigram-indexed, capped result count) is built
  once, per ADR-030's no-duplicate-logic principle. Each consuming module (SalesOrder, PurchaseOrder,
  Catalog, Store Transfer, Products list) wraps the shared core with its own thin layer attaching the
  fields it actually needs (sell price via Pricing, cost via Product-at-Location/vendor data,
  availability, etc.) — not one monolithic identical-response endpoint, and not four fully independent
  search implementations either.
- **Debounced search-as-you-type** on the frontend; **Redis caching** for frequent/repeated searches.
- **List page**: server-side, cursor-based pagination and filtering (never client-side, never
  old-style page-number offset pagination which slows down at this scale).
- **Barcode exact-match fast path** — scanning a barcode resolves instantly to the exact product via a
  direct lookup, bypassing fuzzy-search ranking entirely; a separate, simpler code path from text
  search.
- **"Recently used" quick-list, per user, per module** — shown in the search box before any typing
  starts, showing that user's own last several items used *in that specific module* (SalesOrder shows
  recent sales items, PurchaseOrder shows recent purchase items — not one mixed cross-module list).
- **Bulk import/export runs as background jobs (BullMQ)**, not synchronous requests — user gets an
  immediate acknowledgment, can navigate away, and receives a notification (per ADR-012) on
  completion/failure with a results report, rather than a request that risks timing out on a
  500K+-row file.
- **Concurrent import/export jobs never interfere with each other** — multiple simultaneous jobs (same
  user across browser tabs, or different users) run fully independently, each with its own tracked
  progress/status, no shared state, no blocking between jobs. Native to BullMQ's per-job isolation,
  confirmed as an explicit requirement here.

**Consequences**: `5-modules/products/8-api.md` designs the shared search core plus per-module
response wrappers, the barcode-lookup endpoint, and the recent-items store (per-user, per-module, likely
Redis-backed given its access pattern). `9-ui.md` designs debounced search input, the recent-items
quick-list, and import/export as an async job-status UI (progress + completion notification), not a
blocking upload form. Every module consuming product search (SalesOrder, PurchaseOrder, Catalog, Store
Transfer) references this shared architecture at its own JIT stage rather than building its own search.

---

## ADR-094: UOM — Category is a freely admin-manageable list, not a fixed set

**Context**: Legacy's UOM Category (`lbm_uom_category`) already exists as a data table rather than a
hardcoded enum, with real examples like Length, Volume, Each. Developer wants this confirmed/
formalized as freely manageable, same "add/rename freely" pattern already used this session for roles
(ADR-002/060/068) and themes (ADR-064).

**Decision**: The entire UOM hierarchy — **Category, Group, Functional Role, and Type** — is freely
admin-manageable, not fixed/hardcoded at any level. Admin can add, rename, or remove any of these as
needed, not limited to a pre-seeded fixed set. Same as skeleton's seeded default data (ADR-056), a
sensible starter set can still ship in skeleton, but nothing prevents a tenant from customizing further.

Given roles themselves are now admin-definable data (not a fixed set of exactly 12 named roles),
legacy's column-per-role schema (`lbm_uom_group`'s 11 separate FK columns — base/selling/pricing/
stocking/pi/picking/purchase/purchasecost/receiving/reporting/inner/outer) is **normalized into a
single `uom_role_assignment` table**: one row per (UOM Group, Functional Role, UOM Type), instead of a
fixed set of columns — the only way to support admin-defined roles at all, and the same normalization
pattern already used for Location's GL-account mapping (R7).

**Consequences**: `5-modules/uom/4-schema.md` models Category, Group, Functional Role, and Type all as
ordinary admin-editable reference data (per-tenant scoped), with `uom_role_assignment` as the
normalized join table replacing the legacy wide-column shape. `9-ui.md` provides create/rename/delete
screens for each of the four concepts, consistent with the same pattern already used for tenant roles
and themes.

---

## ADR-095: SalesOrder/PurchaseOrder/Store Transfer — admin-configurable UOM role mapping per module

**Context**: A product/variant is optionally assigned a UOM Group with Functional Roles (ADR-094).
Needed: when that product loads onto a SalesOrder, PurchaseOrder, or Store Transfer line, which
Functional Role governs the Qty field and which governs the Price/Cost field.

**Decision**: Not hardcoded (e.g. "Qty always = Selling role") — instead an **admin-configurable
Settings screen**, per module, mapping which Functional Role feeds which field:
- **SalesOrder**: admin picks which role governs line Qty, and which role governs Sell Price.
- **PurchaseOrder**: admin picks which role governs line Qty, and which role governs Cost.
- **Store Transfer**: admin picks which role governs line Qty (and any other relevant transfer field).

A tenant could map Qty→Selling and Price→Pricing (the obvious default), but nothing forces that
specific pairing — the mapping itself is data, not logic.

**Consequences**: Settings' System Configuration category (ADR-048) owns this role-mapping
configuration per module. `5-modules/sales-order/8-api.md`, `purchase-order/8-api.md`, and the Store
Transfer capability's own spec resolve line-item Qty/Price/Cost units by reading this admin-configured
mapping, then querying the product's actual UOM Group role assignments (via UOM's own service, ADR-053
— no direct table read) to find which UOM Type currently fulfills that role. A product with no UOM
Group assigned uses plain quantity/price with no unit resolution step at all (ADR-040).

---

## ADR-096: UOM — base-unit-pivot conversion, Base is always the smallest unit, decimal throughout, snapshot on transaction

**Context**: Needed: the concrete UOM conversion mechanism and how it feeds SalesOrder/PurchaseOrder/
Store Transfer's role-mapped Qty/Price/Cost fields (ADR-095).

**Decision**:
- **Base-unit-pivot conversion**: every conversion goes source unit → base unit → target unit, using
  each type's own factor relative to the group's Base type (`lbm_uom_type_qty`'s existing shape) —
  never a direct factor stored between every possible pair of units. Confirmed as the right approach,
  not replaced — matches standard ERP practice and legacy's own existing schema shape.
- **Base is always the group's smallest unit**, enforced as a validated rule at UOM Group setup —
  every other unit's factor relative to Base is a clean whole number (≥1), avoiding fractional-factor
  data-entry errors.
- **Base unit quantities stay decimal-capable**, consistent with ADR-040 — being the smallest unit
  doesn't mean whole-numbers-only (e.g. 3.5 feet of pipe when Base = Foot).
- **Conversion rate history is versioned at the UOM Type level, not duplicated per transaction line.**
  Legacy stores a copy of the conversion rate on every finalized line item — confirmed by developer as
  a real database storage burden at this project's transaction volume (millions of lines). Instead: a
  small **UOM Type factor-history table** records each rate and the date range it was effective (a new
  row only written when a factor actually changes — a rare event). Historical accuracy is preserved by
  looking up "what rate was effective on this transaction's finalize date" from that small history
  table, rather than every transaction line carrying its own copy of the number. Same historical-
  accuracy guarantee as a per-line snapshot, far less storage — a few history rows per unit type over
  the system's lifetime, versus one extra column on every one of millions of transaction lines.

**Consequences**: `5-modules/uom/8-api.md`'s conversion service implements the base-pivot algorithm,
the smallest-unit validation at Group setup, and the rate-history lookup (by effective date). `5-modules/
uom/4-schema.md` adds the factor-history table (uom_type_id, rate, effective_from, effective_to).
`5-modules/sales-order/4-schema.md` (and PurchaseOrder/Store Transfer's equivalents) store only the
finalize date and the UOM Type reference on each line — no duplicated rate value — and resolve the
historical rate via the history table's date-range lookup whenever a past transaction is displayed or
reported on.

> **Amendment (UOM field-extraction pass)**: This Decision's text above reads as versioning the
> factor-history table at the UOM Type level alone ("versioned at the UOM Type level"), and the
> Consequences paragraph's column list names only `uom_type_id`. Resolved during UOM's
> field-extraction pass (`project-docs/claude-docs/analysis/module-field-extraction/uom/`): the
> factor-history table's actual key is **(Group, Type) together**, matching `UOMConversionFactor`'s
> own key — a Type-alone key cannot disambiguate two different Groups using the same Type with two
> different conversion factors. Confirmed with the developer; this amendment records the resolution
> without rewriting the original Decision/Consequences text above, per this project's convention of
> keeping superseded/amended ADR content intact for historical traceability. See
> `uom/entities-and-fields.md` (`UOMTypeFactorHistory`) and `uom/business-rules.md` (UOM-RULE-009)
> for the corrected field/rule detail.

---

## ADR-097: SalesOrder/PurchaseOrder/Store Transfer — per-line UOM override for Qty/Price/Cost (extends ADR-095)

**Context**: ADR-095 established an admin-configured default mapping (which Functional Role feeds
Qty vs. Price/Cost per module). Developer wants staff to be able to override the unit **per line
item**, not be locked to the admin-configured default — e.g. a counter person switching a line's Qty
display from Box to Each.

**Decision**: Each relevant line-item field (Qty, Sell Price on SalesOrder, Cost on PurchaseOrder, the
transfer quantity on Store Transfer) gets its own **unit dropdown**, listing every unit available in
that product's UOM Group — independently changeable by staff, not fixed to the admin default. Two
different behaviors depending on which field changes:
- **Qty unit change** = pure **conversion**. The underlying quantity is recalculated via UOM's
  conversion service (e.g. 2 Box → 24 Each) — same real physical quantity, just re-expressed.
- **Price/Cost unit change** = a **fresh price/cost re-resolution** for the newly selected unit, not
  a mechanical conversion of the currently-displayed number. Re-runs the same fixed-price-first,
  Base-derived-fallback resolution order already locked in ADR-029 for whichever unit was just
  selected — so switching to a unit that has its own genuine fixed price picks that fixed price up
  correctly, rather than silently deriving a number from the old unit's value.

**Consequences**: `5-modules/sales-order/9-ui.md`, `purchase-order/9-ui.md`, and the Store Transfer
capability's own UI spec each add per-field unit selectors on the line-item entry screen. The
underlying API calls UOM's conversion service for Qty changes and Pricing's rule-resolution service
(ADR-029) for Price/Cost changes — two different service calls, not one shared "just convert the
number" operation, since Price/Cost genuinely needs fresh resolution, not pure math.

---

## ADR-098: Standing principle — import/export applies to every module with bulk data

**Context**: Legacy has CSV import/export scattered across several modules (Vendor Conversion Rule
import, various generic CSV exports). Developer wants this generalized as a standard capability, not
decided module-by-module (raised while discussing UOM Group bulk import specifically).

**Decision**: Standing project-wide principle, same shape as ADR-030/031/084: **every module with
bulk/tabular data gets import and export**, built on the same background-job pattern already designed
in ADR-093 — BullMQ job, progress tracking, completion notification, validation/preview before commit
(same safety gate as ADR-082's mass-update pattern). Applied automatically at each module's own JIT
build stage, not re-litigated per module.

**Export scope is user-selectable**, not one fixed behavior: **current page only**, **all records
matching the active search/filter**, or the **entire dataset** — chosen at export time, applying
whatever search/filter state the shared search architecture (ADR-093) currently has active.

**Sync-vs-background threshold: ~2 minutes.** A small export that would generate in under roughly 2
minutes downloads instantly (synchronous, no job queue). Anything expected to take longer routes
through the background-job flow (progress tracking, "your export is ready, click to download"
notification on completion) — not every export needs the background path, only genuinely large ones.

**Generated export files auto-expire after 1-2 days** — same S3 lifecycle expiration mechanism as
ADR-067's runtime-generated documents (regenerable on demand, not permanently retained), applied to
background-job export output specifically. Keeps storage from accumulating stale export files
indefinitely.

**Consequences**: Every module's `8-api.md`/`9-ui.md` documents its import/export as "uses the
standard bulk-import/export pattern (ADR-093/098)," specifying only its own field mapping/validation
rules, not reinventing the underlying job/progress/notification mechanism.

---

## ADR-099: Accounts — Merge reassigns Contacts and SPA Codes too (resolves ACC-OQ-010/017)

**Context**: Legacy's `accountMergeProcess()`/`updatePastDueAndTotalOwed()` were an undocumented
blind spot in the blueprint (never read across all 8 Accounts passes), but were located and read
directly for this decision, at `lbm-integer/include/utils/CommonUtils.php:5181` and
`lbm-integer/modules/RoaAdj/RoaAdj.php:1786`. Legacy correctly reassigns transactional/financial data
(SalesOrder, SearchLineItem, ProductTracking, RebateTracker, SOPopupValues, DeliveryLog,
LostSaleDetails, ROAOrAdj, PromotionTracker, BackorderLog, StatementData, AccountsAutos,
ActivityRel) to the surviving account, sums YTD/MTD/12-month rollups onto it, soft-deletes the merged
account, and recomputes past-due/Total-Owed synchronously post-merge — cascading to the parent
account when the surviving account is Child-type. But it silently fails to reassign Contacts or SPA
Codes, orphaning them under the soft-deleted merged account — a real bug, not a deliberate design
choice.

**Decision**: The new system's merge feature replicates legacy's sound behavior (transactional
reassignment, financial rollup summing, soft-delete of merged account, synchronous past-due/
Total-Owed recompute with parent cascade), and additionally reassigns Contacts and SPA Codes (now
under the unified Pricing module, ADR-029) to the surviving account — closing the gap by
construction rather than porting the defect, the same precedent ADR-035 set for the missing
credit-card table. The new tokenized credit-card table (ADR-035) gets its own merge-reassignment
rule, decided fresh, since no legacy behavior exists to reference (the table never existed live).

**Consequences**: `5-modules/accounts/3-business-rules.md` and `8-api.md` (merge endpoint) specify
the full reassignment set including Contacts and SPA Codes. Resolves ACC-OQ-010 and ACC-OQ-017, and
partially informs ACC-OQ-014 (Total Owed confirmed synchronously updated, at minimum, at merge
time).

---

## ADR-100: Accounts — "Parent Account" and "Member Of" are two distinct, unrelated fields (resolves ACC-OQ-001)

**Context**: Confirmed in actual legacy code, not guessed. "Parent Account" (real column
`parentaccountid`) is tied to the account's "Relationship" dropdown (Child/Parent) — this is the
**billing hierarchy**: `RoaAdj.php`'s `updatePastDueAndTotalOwed()` cascades a Child account's
past-due/Total-Owed recalculation up to whatever account sits in `parentaccountid`. "Member Of"
(real column `parentid`) is a separate, standard vtiger self-join used only to show an account's
place in an org-chart-style list/statement view (`AccountStatement.php`) — nothing financial reads
it anywhere found in the codebase.

**Decision**: Keep both fields, with their distinct real purposes intact — "Parent Account" as the
billing/credit-rollup hierarchy, "Member Of" as a display-only organizational hierarchy. Not a
duplicate-field cleanup; dropping "Member Of" would break account-list/org-chart browsing for no
financial-correctness gain.

**Consequences**: `5-modules/accounts/4-schema.md` documents both fields with their distinct
purposes and confirms neither is redundant. Resolves ACC-OQ-001.

---

## ADR-101: Standing principle — field-level help icon on every field, every module

**Context**: Developer requested a consistent, discoverable way for users to learn what each field
means/is for, raised as a cross-cutting concern (not specific to Accounts, where it came up) while
reviewing module fields. Legacy has scattered per-field help text (vtiger's own help-file
mechanism) for some fields, inconsistently — not a system-wide feature.

**Decision**: Every field in every module's UI gets a help icon (small "?" affordance next to the
field label) that surfaces a short description of the field's purpose/usage on hover/click
(shadcn/ui Tooltip or Popover component, per ADR-025's component library). Help text is authored
fresh for every field from that field's locked business-rules/schema documentation — legacy help
text is not reused/ported, even where it exists, to avoid carrying forward stale or incorrect
wording. No field is skipped as "self-explanatory" — full, uniform coverage across every module.

**Consequences**: `4-ui/4-component-standards.md` defines the shared help-icon/tooltip pattern
once. Every module's own `9-ui.md` includes a help-text entry per field as part of its normal
field documentation — authored during that module's own JIT build stage, not retrofitted later.
Applied automatically going forward; no module re-litigates whether to include it.

---

## ADR-102: Accounts — Total Owed recalculates in real time, not just via nightly batch (resolves ACC-OQ-014)

**Context**: Confirmed in actual legacy code, not guessed. `updatePastDueAndTotalOwed()` is called
synchronously from `modules/SalesOrder/saveFinalizeSOFunctions.php` (when a Sales Order is
finalized), from the deposit flow (`deposit.php`, `contractDepositList.php`,
`SOSubStatusModalDeposit.php`), and from account merge (`ADR-099`). Total Owed is not solely
dependent on the broken QuickBooks queue (ACC-RISK-005) or the nightly cron.

**Decision**: New system keeps the same real-time recompute triggers — Total Owed and past-due
buckets recalculate synchronously at Sales Order finalize, at deposit, and at account merge — not
a batch-only design.

**Consequences**: `5-modules/accounts/3-business-rules.md` documents Total Owed as a synchronously
maintained value with these three trigger points; `5-modules/sales-order/8-api.md`'s finalize and
deposit endpoints call the shared recompute service. Resolves ACC-OQ-014.

---

## ADR-103: Accounts — last-month-sales discount, eligibility check rebuilt (resolves part of ACC-RISK-017)

**Context**: Legacy's last-month-sales discount (`getNewBalance()`, `AccountStatement.php:4732`) was
designed to grant a discount only when the account carries zero past-due balance, but the
eligibility check is commented out in the live code — the function now unconditionally returns the
discount regardless of past-due status. Confirmed by reading the function directly, not inferred
from its docstring/name.

**Decision**: New system implements the discount with its real, working eligibility gate restored —
discount granted only when the account's past-due balance is zero at calculation time. Not a
straight port of legacy's current (broken) unconditional-grant behavior.

**Consequences**: `5-modules/accounts/3-business-rules.md` documents the last-month-sales discount
with its eligibility condition stated explicitly. Partially resolves ACC-RISK-017 — the sibling
balance-forward credit-application feature (`applyamountforbalanceforward()`, disabled via bug
tickets RM#8459/RM#11545) is a separate open decision, not covered by this ADR.

---

## ADR-104: Accounts — balance-forward credit auto-apply rebuilt (resolves remainder of ACC-RISK-017)

**Context**: Legacy's balance-forward credit-application feature (`applyamountforbalanceforward()`,
`AccountStatement.php:4431`) was designed to automatically apply a customer's unapplied
credits/overpayments against their outstanding balance (FIFO, oldest charge first). Both live call
sites are wrapped in comment blocks tagged with specific bug tickets (RM#8459, RM#11545) — a
deliberate disable to fix a bug, never re-enabled. Today, credits/overpayments do not automatically
reduce what a customer owes; they sit unapplied until manually handled.

**Decision**: New system rebuilds this as a real, working feature — customer credits/overpayments
automatically apply against outstanding balance, oldest charge first, same intent as legacy's
disabled implementation. Not a straight port of the disabled code (whatever bug caused RM#8459/
RM#11545 is not re-introduced), but the underlying business capability is restored.

**Consequences**: `5-modules/accounts/3-business-rules.md` documents the credit-auto-apply rule
(FIFO against oldest outstanding charge) as a real, always-on feature. Resolves the remainder of
ACC-RISK-017 (paired with ADR-103's discount-eligibility fix).

---

## ADR-105: Accounts — Status (Active/Inactive) actually enforced (resolves ACC-OQ-011)

**Context**: Legacy's account Status field (Active/Inactive, `vtiger_account.status`) is checked in
exactly one place across the entire codebase — the Accounts list view, for filtering/display.
Nothing blocks Sales Order creation, statement generation, or any other action on an Inactive
account. Confirmed by direct search, not inferred — a genuinely unenforced field, not a
documentation gap.

**Decision**: New system enforces Status for real — Inactive accounts are blocked from new Sales
Order creation and statement generation, matching what the label implies rather than carrying
forward the cosmetic-only legacy behavior.

**Consequences**: `5-modules/accounts/3-business-rules.md` documents Status as an enforced gate;
`5-modules/sales-order/3-business-rules.md` adds an Inactive-account check at Sales Order creation.
Resolves ACC-OQ-011.

---

## ADR-106: Accounts — no migration from legacy's three old saved-card field sets (resolves ACC-OQ-003)

**Context**: Legacy has three overlapping, differently-aged sets of saved-credit-card fields (a
no-gateway-suffix legacy trio, plus separate Expinet- and CardConnect-specific variants), with no
documentation of current precedence. ADR-035 already decided the new system gets one clean,
properly-normalized tokenized card table instead of carrying forward any of the three. This ADR
confirms the migration question specifically: none of the three old sets is treated as a source of
data to carry over.

**Decision**: No migration path from any of the three legacy card-field sets into the new card
table. New table starts empty; customers re-add cards as needed (or a fresh CardConnect
vault-sync mechanism supersedes this if one is designed separately).

**Consequences**: `5-modules/accounts/4-schema.md` states explicitly that the new card table has no
legacy data source. Resolves ACC-OQ-003.

---

## ADR-107: Vendors — Lines Purchased auto-update computed per-vendor, not company-wide (resolves VEN-RISK-015/019)

**Context**: Legacy's Lines Purchased auto-refresh cron gives every auto-update-flagged vendor the
identical system-wide unique line-code list instead of a vendor-specific one — a confirmed bug
(VEN-RISK-015), also flagged for its off-by-one trailing-space truncation defect on the same cron
(VEN-RISK-016/019).

**Decision**: New system's equivalent background job computes each vendor's Lines Purchased list
from that vendor's own actual supplied-code assignments only (via the Vendor-Category join per
ADR-089), not a shared company-wide list. Runs on the standard BullMQ job pattern (ADR-093/098)
rather than a raw cron script, closing the string-manipulation trailing-space bug by construction
(real array/set operations, not comma-delimited string trimming).

**Consequences**: `5-modules/vendors/3-business-rules.md` documents Lines Purchased as a derived,
per-vendor computed field; `8-api.md` specifies the background job. Resolves VEN-RISK-015,
VEN-RISK-016, VEN-RISK-019.

---

## ADR-108: Vendors — Primary Supplier display-cache field dropped (resolves VEN-RISK-023)

**Context**: Legacy's "Primary Supplier" text field (`cf_1584`) is a confirmed-dead denormalized
cache — nothing writes to it, and the vendor edit screen doesn't even read it. The real, live
primary-supplier value is built fresh on every page load via a join against the normalized Primary
Supplier Assignment table (separate entity: `vendorid`/`primarysupplierid`/`suppliertype`), which
stays exactly as-is — this decision only concerns the redundant cache field, not the real feature.

**Decision**: Drop the dead display-cache field from the new schema. Primary Supplier Assignment
(the real, live, working table) is unaffected and carries forward normally.

**Consequences**: `5-modules/vendors/4-schema.md` omits the cache field entirely; the vendor
detail view computes primary supplier via the same live-join pattern legacy already uses
correctly. Resolves VEN-RISK-023.

---

## ADR-109: Vendors — delete cascades to satellite records (resolves VEN-OQ-008)

**Context**: Legacy never confirmed whether deleting a vendor cleans up its six satellite tables
(Physical Address, Primary Supplier Assignment, Vendor-Contact Relation, Conversion Rule, Line
Code/Category assignment, Line Code Alias) — the one delete-callee function found is scoped only
to SlipStream integration fields, satellite cleanup was never traced. Standard soft-delete
(`is_deleted`/`deleted_at`, ADR-005) already applies project-wide. Vendor-Contact is confirmed
many-to-many (per `module-overview.md`) — a contact person can genuinely be linked to more than
one vendor, so a contact record is not exclusively vendor-owned data.

**Decision**: Vendor delete cascades soft-delete to records that are exclusively owned by that
one vendor — Physical Address, Conversion Rule, Line Code/Category assignment, Line Code Alias,
Primary Supplier Assignment (rows where this vendor is the assignment's own subject). For the
many-to-many Vendor-Contact relation, only the **link row** between this vendor and each contact
is removed — the Contact record itself is never soft-deleted by a vendor delete, since it may
still be validly linked to other vendors. Physical hard-delete is never used, per ADR-005.

**Consequences**: `5-modules/vendors/8-api.md`'s delete endpoint cascades `is_deleted`/`deleted_at`
to exclusively-owned satellite tables, and deletes only the join-table row for Vendor-Contact
links, in the same transaction. Resolves VEN-OQ-008.

---

## ADR-110: Vendors — SlipStream integration deferred past MVP 1 (resolves VEN-OQ-011/012/013 for now)

**Context**: SoT blueprint characterized SlipStream (vendor electronic-payment enrollment) as 100%
unconfigured/unused on the checked dev snapshot. Developer confirmed that characterization is
stale — SlipStream was added to production recently and is a real, needed integration — but also
confirmed it's not required for MVP 1. Open questions around it (duplicate "mark vendor as
Imported" write paths — bulk admin action vs. individual-link flow; full SlipStream status value
set beyond "Imported"/"Enrolled"; whether a link can be re-established after a delete-triggered
disconnect) remain genuinely open, not resolved.

**Decision**: Defer full SlipStream design (consolidating the two status-write paths, the complete
status enum, delete/reconnect behavior) past MVP 1, same pattern as ADR-078 (payroll export) and
ADR-083 (Door Configuration). Vendors' MVP 1 schema still carries the existing SlipStream-status
field so the live production integration isn't broken, but its write-path consolidation and full
behavior are designed at a future JIT cycle, not now.

**Consequences**: `5-modules/vendors/3-business-rules.md`/`8-api.md` mark SlipStream sync as
"carried forward as-is, full redesign deferred past MVP 1" rather than specifying consolidated
behavior. Revisit VEN-OQ-011/012/013 when SlipStream is scheduled for its own design pass.

---

## ADR-111: SearchLineItem — oversale-alert dismiss rebuilt, open to any authenticated staff (resolves SLI-RISK-005/009, SLI-OQ-004/010)

**Context**: Legacy's oversale-alert flag (`oversalealert`) is a real, live, currently-accumulating
condition (80 of ~7,074 rows at blueprint time) with no confirmed-reachable way to clear it in the
live application — the one candidate dismiss endpoint has no permission check (any authenticated
user could dismiss any alert, flagged or not) and no state-precondition guard (can reset a row that
was never flagged). Both gaps are confirmed by direct code read, not guessed.

**Decision**: New system builds a real, reachable dismiss action: open to any authenticated staff
member (matches legacy's effective no-restriction behavior, just adds the missing safety net of
requiring login and logging the action — no new role restriction introduced), gated by a real
state-precondition check so only rows actually flagged can be dismissed.

**Consequences**: `5-modules/search-line-item/3-business-rules.md` documents the dismiss action
with its precondition (row must be flagged) and its permission gate (any authenticated user, per
ADR-006's standard server-side Guard, not a specific role restriction). Resolves SLI-RISK-005,
SLI-RISK-009, SLI-OQ-004, SLI-OQ-010.

---

## ADR-047 (addendum): SearchLineItem does have module-specific decisions — see ADR-111 onward

ADR-047 declared this module closed with "no module-specific decisions needed," based on an initial
read that its only findings were pure engineering defects (SQL injection, formula divergence). A
closer pass of `risks-and-open-questions.md` surfaced genuine business-judgment items beyond that
(alert-dismiss permission model, dead create/edit scaffolding, an empty satellite table, a misfiled
field, two never-computed total fields, a formula-divergence root-cause question). ADR-047's
original two closures (no-raw-SQL, no-duplicate-formulas) still stand; this module is not otherwise
closed — see ADR-111 and its successors for the additional decisions.

---

## ADR-112: SearchLineItem — no manual create/edit screen, rows are always system-generated (resolves SLI-RISK-014)

**Context**: Legacy has a full standard create/edit UI scaffold for this module, but it is confirmed
not the real write path — the only row-creation site found anywhere in the codebase is SalesOrder's
own finalize routine. No user-facing manual create/edit flow is genuinely exercised.

**Decision**: New system does not build a manual create/edit screen for SearchLineItem records.
Rows are created exclusively as a side effect of Sales Order finalize; any staff-facing view of this
data is read-only (list/detail), consistent with how the data is actually produced. The module still
gets the standard bulk import/export capability per ADR-098's blanket rule (developer confirmed no
module-specific exception) — but import is constrained to updating/correcting fields on existing
rows tied to a real Sales Order line, never creating a new standalone row with no matching order.
Import validation enforces this row-must-already-exist-and-reference-a-real-SO-line constraint.

**Consequences**: `5-modules/search-line-item/9-ui.md` scopes to list/detail/read-only views only —
no add/edit form. `5-modules/sales-order/8-api.md`'s finalize endpoint remains the sole ongoing
row-creation path. `8-api.md`'s standard import endpoint (per ADR-098) is update-only against
existing SO-linked rows, with server-side validation rejecting any import row that doesn't match an
existing record. Resolves SLI-RISK-014. (Onboarding data migration is a distinct exception — see
ADR-113.)

---

## ADR-113: SearchLineItem — tenant-onboarding historical import, tagged as migrated (extends ADR-112)

**Context**: When a new tenant onboards onto the platform, they bring historical Sales Order
line-item data from whatever system they used before. This is a one-time onboarding data-load, not
the recurring day-to-day import feature (ADR-098/ADR-112) — those historical rows have no
corresponding live Sales Order finalized in this system, which ADR-112's ongoing-import constraint
would otherwise reject.

**Decision**: Tenant onboarding gets its own one-time historical-data-load path into
SearchLineItem, separate from the standard recurring import endpoint, permitted to create rows with
no matching in-system Sales Order. Every row loaded this way is tagged with a source flag
(`migrated` vs. the default `live`) so reports, support, and any future data-quality investigation
can distinguish onboarding-imported history from rows generated by this system's own Sales Order
finalize.

**Consequences**: `5-modules/search-line-item/4-schema.md` adds a `source` field
(`live`/`migrated`). `5-modules/search-line-item/8-api.md` documents the onboarding load as a
distinct, admin/onboarding-scoped path from the standard ADR-098 import endpoint. Reports referencing
this data may filter or clearly label by source where relevant.

---

## ADR-114: SearchLineItem — custom-field-extension satellite table dropped (resolves SLI-RISK-015/SLI-OQ-016)

**Context**: Legacy's custom-field-extension satellite table is structurally present but
functionally empty — one column, zero rows across the blueprint's entire eight-pass investigation,
no code reference beyond its own schema description. The source material itself recommends
exclusion.

**Decision**: Not carried forward into the new schema. No migration effort spent on a table with
zero real usage.

**Consequences**: `5-modules/search-line-item/4-schema.md` omits this table entirely. Resolves
SLI-RISK-015, SLI-OQ-016.

---

## ADR-115: SearchLineItem — "Shipping Name" field registration corrected to Sales Order (resolves SLI-RISK-016/SLI-OQ-015)

**Context**: Legacy has a field-registration anomaly — a "Shipping Name" field is registered
against SearchLineItem's tab, but its physical column actually lives on Sales Order's own
shipping-address table. Confirmed a cross-module field-registration mistake, not intentional shared
display plumbing.

**Decision**: Correct the ownership — "Shipping Name" is documented and modeled as a Sales Order
field only. SearchLineItem's schema carries no such field, no mislabeled cross-module reference
carried forward.

**Consequences**: `5-modules/sales-order/4-schema.md` owns Shipping Name outright.
`5-modules/search-line-item/4-schema.md` has no corresponding entry. Resolves SLI-RISK-016,
SLI-OQ-015.

---

## ADR-116: SearchLineItem — "Total Before"/"Total After" fields dropped (resolves SLI-RISK-017/SLI-OQ-019)

**Context**: Legacy's "Total Before" and "Total After" fields are catalogued as system-derived
totals but are hardcoded to an empty string at every finalize-time write — never actually computed,
across the blueprint's entire eight-pass investigation. No evidence anywhere of what formula was
originally intended.

**Decision**: Dropped from the new schema. No invented formula — nothing in the source justifies
guessing what these were meant to calculate, and carrying forward two permanently-blank fields adds
no value.

**Consequences**: `5-modules/search-line-item/4-schema.md` omits both fields. Resolves
SLI-RISK-017, SLI-OQ-019.

---

## ADR-117: SearchLineItem — one shared buyout-margin formula, finalize's branched version is canonical (resolves SLI-RISK-003/SLI-OQ-005)

**Context**: Legacy has two independent writers of the same buyout-line margin/extension field set
(Extended Sellprice, Extended Product Cost, Extended Coresell, Margin Dollars, Margin Percentage):
Sales Order's finalize routine, and a separate scheduled batch script that backfills once real
buyout cost is known. Three confirmed divergences: the batch script always multiplies by ship
quantity where finalize's formula doesn't clearly mirror that step; the batch script never branches
on the account's core-tracking type (finalize has a distinct, cheaper path for "Count"-type
accounts); and the batch script recomputes from current stored values rather than the original
finalize-time inputs, silently absorbing any edit made between finalize and the same-day batch run.

**Decision**: Per the standing no-duplicate-formula principle (ADR-030), one shared calculation
function computes this field set everywhere. Finalize's branched formula (with its account
core-type distinction) is the canonical version — it is the more complete of the two, not the batch
script's simpler restatement. The batch backfill process calls this same shared function against
the original finalize-time inputs (not whatever is currently stored), rather than independently
restating the formula.

**Consequences**: `5-modules/search-line-item/3-business-rules.md`/`calculations.md` document one
canonical buyout-margin formula, called identically by Sales Order finalize and the cost-backfill
job. Resolves SLI-RISK-003, SLI-OQ-005.

---

## ADR-118: SalesHistory — corrections update the historical week they belong to (resolves SH-OQ-007)

**Context**: Legacy never confirmed whether any of its four writers accumulate onto a past week's
aggregate row when a correction/late-arriving value applies to an earlier transaction, or whether
every writer is confined to writing only the current week/year.

**Decision**: New system's single authoritative aggregator (per ADR-049's "one authoritative
formula/aggregator" design) always writes to the aggregate row matching the transaction's own
original date, not the date the correction is entered — a late correction updates the historical
week it actually belongs to, keeping that week's stored totals accurate rather than polluting the
current week with an unrelated adjustment.

**Consequences**: `5-modules/sales-history/calculations.md`/`3-business-rules.md` document the
aggregator as keyed by transaction date, explicitly stating corrections target the original week's
row. Resolves SH-OQ-007.

---

## ADR-119: SalesHistory — single-writer service with locking, no direct multi-writer access (resolves SH-RISK-004/SH-OQ-008)

**Context**: Legacy has four independent writers (Sales Order finalize, Location's cron, and two
others) each performing their own read-then-write against the identical aggregate key, with no
locking or transaction-isolation mechanism anywhere — a structurally real race between a
cron-triggered write and a same-moment live write, capable of silently losing an update. Whether
this has actually caused a lost update in production was never tested from the source blueprint's
read-only pass.

**Decision**: New system funnels every write to a weekly aggregate row through one single
authoritative service (already established by ADR-049), and that service adds real
concurrency protection — per-aggregate-key locking (optimistic lock/retry) so two simultaneous
writers to the same product/week/location key can no longer silently overwrite each other. No
module writes directly to the aggregate table outside this service.

**Consequences**: `5-modules/sales-history/calculations.md` specifies the single-writer service's
locking mechanism explicitly as part of its architecture, not just an implied recommendation.
Resolves SH-RISK-004, SH-OQ-008.

---

## ADR-120: SalesHistory — list-view sort-order persistence fixed (resolves SH-RISK-006)

**Context**: Legacy's list-view sort-order persistence is silently non-functional — a copy-paste
artifact reads a record-id-shaped parameter as if it were the sort-direction value, and the grid's
own sort-state-persistence write uses session keys this read logic never reads back. Every request
falls back to the hardcoded default sort.

**Decision**: New system's list view persists the user's chosen sort order correctly across
requests — a standard, correctly-implemented UI behavior, not a business-judgment call.

**Consequences**: `5-modules/sales-history/9-ui.md` implements sort-state persistence using the
standard shared list-view pattern (ADR-024/025), closing this by normal correct implementation.
Resolves SH-RISK-006.

---

## ADR-121: PurchaseLineItem — no manual edit screen, read-only view of system-generated records (resolves PLI-RISK-001/002)

**Context**: Legacy has no reliable, correct, user-facing way to edit a Purchase Line Item's own
fields at all — the create/edit form carries a confirmed SQL injection, and the inline-edit
endpoint instantiates the wrong entity class entirely, silently touching an unrelated module's
(backorder-log) data instead on every legitimate use, for as long as this code has existed. The
module functions correctly only as a write-once snapshot populated by six external writer
processes (Receiving, PurchaseOrder, ASN/vendor-number backfills, etc.) — the same "system-generated
record, no working manual edit path" shape confirmed for SearchLineItem (ADR-112).

**Decision**: New system does not build a manual create/edit screen for PurchaseLineItem records.
Staff-facing views are read-only (list/detail); every field is written exclusively by its owning
upstream process (Receiving, PurchaseOrder, etc.), never through a standalone edit form.

**Consequences**: `5-modules/purchase-line-item/9-ui.md` scopes to list/detail/read-only views
only. `5-modules/purchase-line-item/8-api.md` documents each of the six legitimate writer paths as
the sole way fields get set, with no generic edit endpoint. Resolves PLI-RISK-001 and PLI-RISK-002
by construction — neither the injection nor the wrong-entity-class bug has a surface to exist on if
there's no manual edit endpoint at all.

---

## ADR-122: PurchaseLineItem — one shared cost-extension formula for all six writers (resolves PLI-RISK-003)

**Context**: Six independent legacy writers each restate the same cost-extension calculation
(roughly price × quantity, plus adjustments), with confirmed precision and quantity-basis
divergences between them. Not proven as a live side-by-side discrepancy on any specific row, but
the structural preconditions for disagreement are confirmed identical across all six.

**Decision**: Per the standing no-duplicate-formula principle (ADR-030), one shared calculation
function computes cost extension, called identically by all six writer processes (Receiving,
PurchaseOrder, ASN/vendor-number backfills, and the rest) — one rounding policy, one
quantity-basis rule, no independent restatements.

**Consequences**: `5-modules/purchase-line-item/calculations.md` documents the single canonical
cost-extension formula and lists all six call sites as consumers of the same shared function.
Resolves PLI-RISK-003.

---

## ADR-123: PurchaseLineItem — inert custom-field companion table dropped (resolves PLI-RISK-008)

**Context**: Legacy has a structurally-live custom-field companion table carrying 1,100 rows but
only one physical column and no actual business data — ongoing per-row storage/join cost for zero
business value.

**Decision**: Not carried forward into the new schema.

**Consequences**: `5-modules/purchase-line-item/4-schema.md` omits this table entirely. Resolves
PLI-RISK-008.

---

## ADR-124: PurchaseLineItem — Line Number field typed correctly as an integer (resolves PLI-OQ-004)

**Context**: Legacy's Line Number field is CRM-registered with a text-shaped type description, but
its physical database column is a true integer — a labeling artifact, not a real ambiguity about
what the field holds.

**Decision**: New schema types Line Number as a real integer, matching its actual data, not a
carried-forward text label.

**Consequences**: `5-modules/purchase-line-item/4-schema.md` defines Line Number as an integer
field. Resolves PLI-OQ-004.

---

## ADR-125: PurchaseHistory — no manual edit screen, read-only view of system-generated records (resolves PH-RISK-001)

**Context**: Legacy has a confirmed, unmitigated SQL injection reachable via two ordinary-path
routes — the standard edit-form submission and the inline-edit ajax endpoint. Unlike
PurchaseLineItem's sibling finding, this module's own writers are otherwise clean (all three
confirmed live accumulator writers use fully parameterized SQL with a byte-for-byte identical
formula) — the vulnerability lives specifically in the general-purpose manual-edit surface, not the
module's real accumulator writers. This module is purely an automatic accumulator (three writer
processes), the same "system-generated record, no genuine manual-edit use case" shape confirmed for
SearchLineItem (ADR-112) and PurchaseLineItem (ADR-121).

**Decision**: New system does not build a manual create/edit screen for PurchaseHistory records.
Staff-facing views are read-only (list/detail); the three legitimate writer processes remain the
only way data is set.

**Consequences**: `5-modules/purchase-history/9-ui.md` scopes to list/detail/read-only views only.
`5-modules/purchase-history/8-api.md` has no generic edit endpoint. Resolves PH-RISK-001 by
construction — no manual edit surface, no injection surface to exist on.

---

## ADR-126: PurchaseHistory — corrections update the historical week they belong to (resolves PH-OQ-006, consistent with ADR-118)

**Context**: All three of legacy's confirmed live writers follow a current-calendar-week-lookup
convention, but whether a backdated purchase-order correction is genuinely meant to bucket into a
past week's row, versus always landing in the current week's row, is a business-rule question not
resolvable from static code reading alone. SalesHistory faced the identical question (SH-OQ-007)
and was decided in ADR-118: corrections target the historical week they actually belong to.

**Decision**: Same rule applies here for consistency — PurchaseHistory's aggregator writes to the
aggregate row matching the transaction's own original date, not the date the correction is entered.

**Consequences**: `5-modules/purchase-history/calculations.md`/`3-business-rules.md` document the
aggregator as keyed by transaction date, matching SalesHistory's ADR-118 pattern. Resolves
PH-OQ-006.

---

## ADR-127: Settings — VDP tier creation carries over the bumped-down tier's existing rebate rate (resolves SET-RISK-003)

**Context**: Legacy's `CreateVdpTierLevel.php` silently zeroes the volume-discount rebate for every
account previously in the top VDP (rebate) tier whenever a new top tier is created above it — the
new tier row is inserted with no rebate percentage supplied, defaulting to 0.00%, with no warning to
the operator. A direct, unwarned dollar impact on live pricing/rebates.

**Decision**: New system carries over the bumped-down tier's existing rebate rate to whatever new
tier those accounts land in, rather than defaulting to 0% — no silent cut. An admin can still
explicitly change the rate afterward, but the system never invents a 0% default on their behalf.

**Consequences**: `5-modules/settings/3-business-rules.md`'s VDP Tier / Rebate Configuration
category documents this carry-over rule as part of new-tier creation. Resolves SET-RISK-003.

---

## ADR-128: Settings — VDP tier deletion renumbers levels and blocks deletion while accounts remain assigned (resolves SET-RISK-011)

**Context**: Legacy's VDP tier delete has two confirmed gaps: deleting a middle tier absorbs its
price range into the tier below but never renumbers the levels above it, leaving a permanent
sequence gap (e.g. 1, 2, 4, 5 after deleting level 3); deleting the lowest tier skips absorption
entirely and orphans that price range with no check against accounts still assigned to it.

**Decision**: New system fixes both — deleting a tier renumbers the remaining tiers so the sequence
stays contiguous (no gaps), and deletion is blocked outright while any account remains assigned to
that tier. An admin must reassign those accounts to a different tier before the delete is allowed.

**Consequences**: `5-modules/settings/3-business-rules.md`'s VDP Tier / Rebate Configuration
category documents both the renumbering step and the assigned-accounts delete-block as part of tier
deletion. Resolves SET-RISK-011.

---

## ADR-129: Settings — currency-rate mass cost recompute only fires on a real rate change, with confirmation (resolves SET-RISK-004)

**Context**: Legacy's `SaveCurrencyInfo.php` unconditionally invokes a cross-module mass recompute
of every matching vendor's equivalent-parts cost and core cost on every currency save — even a save
that only changed status, since the currency code/rate are read from the request regardless of
which fields the operator actually intended to change. No dry-run, no row-count confirmation, no
audit-trail entry of the recompute itself. Flagged in the source as the single most consequential
live calculation found anywhere in this module.

**Decision**: New system's recompute only fires when the exchange rate value itself actually
changes (not on unrelated edits like status). Before running, the admin sees a confirmation showing
how many vendor cost records will be affected ("this will update N vendor costs") and must confirm
before the recompute executes.

**Consequences**: `5-modules/settings/3-business-rules.md`'s Currency Settings category documents
the change-detection gate and the confirmation step. `9-ui.md` includes the confirmation dialog.
Resolves SET-RISK-004.

---

## ADR-130: Settings — currency delete protected: base currency blocked, in-use currencies require a real transfer step (resolves SET-RISK-005)

**Context**: Legacy's `CurrencyDelete.php` deletes any currency row unconditionally — no
Base-currency check, no reference/dependency check. The confirmation popup collects a
"transfer to this currency" selection from the operator, but the delete endpoint never reads or
applies it — the one UI element that looks like a safety net is fully inert (commented-out
reassignment code confirms one once existed and was removed). The only Base-currency protection
anywhere is a client-side disabled/readonly HTML attribute on the edit form, with no server-side
equivalent and no application at all to delete.

**Decision**: New system blocks deleting the Base currency outright, server-side, with no
exception. Any other currency still referenced by live records requires the admin to select a
replacement currency and complete a real transfer/reassignment before the delete is allowed — the
UI element legacy already shows is made to actually function as intended.

**Consequences**: `5-modules/settings/3-business-rules.md`'s Currency Settings category documents
both protections as server-enforced, not merely UI-suggested. `8-api.md`'s delete endpoint performs
the reassignment as part of the same transaction. Resolves SET-RISK-005.

---

## ADR-131: Settings — no audit-trail disable switch exists at all (resolves SET-RISK-006, extends ADR-068)

**Context**: Legacy's Audit Trail is a single global, unscoped boolean kill-switch — any account
able to reach `SaveAuditTrail.php` can disable audit logging system-wide, and the act of flipping
the switch is not itself written to the audit trail (that write path is gated by the very flag being
changed), leaving no trace of who disabled it or when. Separately, ADR-068 already established
full-coverage audit logging (every create/update/delete/login/view) as a mandatory, structural
project-wide capability, not a per-tenant configurable option.

**Decision**: No admin-facing switch to disable audit logging exists anywhere in the new system —
stronger than "log every use of the toggle," there is no toggle. Audit logging cannot be turned off
by any user, including Super Admin, consistent with ADR-068's full-coverage mandate.

**Consequences**: `7-cross-cutting/`'s audit-trail specification (per ADR-068) states explicitly
that logging coverage has no disable mechanism anywhere in the system. `5-modules/settings/` has no
Audit Trail on/off setting in its System Configuration category. Resolves SET-RISK-006 by
construction — there's no switch to abuse.

---

## ADR-132: Settings — three confirmed-broken legacy features triaged (resolves part of SET-RISK-009)

**Context**: Legacy's SET-RISK-009 dead/mismatched-table cluster includes several completely
broken, end-to-end non-functional features (every code path targets a database table that doesn't
exist): "Alternate Costs" (all six SQL statements target a nonexistent table), location-level
access/sharing-rule save-and-delete (both silently no-op), and theme customization (`themeSettings.php`
targets a nonexistent table, all reads silently return no rows).

**Decision**: Triaged individually, not blanket-fixed:
- **Alternate Costs** — dropped. Never functional, not rebuilt.
- **Location-level sharing/access rules** — dropped. Never functional, not rebuilt.
- **Theme customization** — not part of this ADR's drop list. Already decided separately and more
  specifically in ADR-064 (Tenant color theming, Admin-controlled, colors only) — the new system
  builds real tenant theme support per that ADR, not by fixing legacy's dead table. This entry exists
  only to confirm SET-RISK-009's theme-table finding doesn't need its own separate decision.

**Consequences**: `5-modules/settings/` schema and business-rules docs omit Alternate Costs and
location-level sharing/access entirely. Theme customization is covered by ADR-064, cross-referenced
here to avoid re-litigating it. Resolves the Alternate Costs and location-sharing portions of
SET-RISK-009; the theme-table portion is resolved by ADR-064.

---

## ADR-133: Settings — Priority Payment credential deletion fixed for real (resolves remaining part of SET-RISK-009)

**Context**: Legacy's Priority Payment credential table is missing its expected `lbm_` prefix
(`priority_payment_config` vs. the correct `lbm_priority_payment_config`), so deleting a stored
Priority Payment credential silently fails on every attempt — stale bearer tokens remain live
indefinitely with no way to revoke them through the UI. Unlike Alternate Costs and location-sharing,
Priority Payment is a live, actively-used payment integration, not a dead feature.

**Decision**: Fixed for real, not dropped — credential deletion actually removes/revokes the stored
credential, closing the correct table reference and the stale-token security gap.

**Consequences**: `5-modules/settings/8-api.md`'s Integrations & Credentials category documents
Priority Payment credential deletion as a real, working, revoking operation. Resolves the Priority
Payment portion of SET-RISK-009.

---

## ADR-134: Settings/Users — Role edit consolidated to one clean save path (resolves SET-RISK-002)

**Context**: Legacy's `SaveRole.php` unconditionally runs its full profile-construction body (a
fresh Profile row plus a full set of permission child rows) for both create and edit mode. On edit,
the branch that would wire the freshly-built profile to the actual role being edited is commented
out — the real update path is a different file entirely (`modules/Users/UpdateProfileChanges.php`).
Every role edit through the Settings-side action leaves behind a brand-new, permanently orphaned
Profile row, with unbounded accumulation over time, while the intended permission change may never
land on the role actually being edited.

**Decision**: One consolidated, correct save path for role editing — no duplicate profile
construction, no orphaned rows, matching the standing no-duplicate-logic principle (ADR-030).

**Consequences**: `5-modules/users/8-api.md`'s role-edit endpoint is the sole write path; Settings'
own UI calls into it rather than maintaining a parallel, incorrect implementation. Resolves
SET-RISK-002.

---

## ADR-135: SalesOrder — server never trusts a client-submitted total, always recomputes from line items (resolves SO-RISK-002)

**Context**: Legacy's `sofinaltotal` is written verbatim from the client-submitted
`hdnsofinaltotal` POST field at finalize, with no server-side recompute or cross-check against
summed line items — every printed output subsequently reads that same stored, unverified value
with no recomputation anywhere between finalize and print. Flagged as the single most consequential
finding in the entire blueprint series: a client-side bug, stale page, concurrent-edit race, or
maliciously modified request can write an arbitrary total onto a locked, finalized order, printing
permanently on the customer invoice. Developer confirmed the fix must close the gap by construction,
not just detect the mismatch after the fact.

**Decision**: The server never reads or trusts a client-submitted total at finalize time. It always
computes the authoritative total itself, server-side, from the actual persisted line items, using
one canonical shared formula (per ADR-030). The client-submitted total (if sent at all) has zero
authority — it's display-only during order entry, never the value written to the finalized record
or read by any printed output. There is no "mismatch" case to handle, because the client's number is
never in a position to become the source of truth.

**Consequences**: `5-modules/sales-order/calculations.md` documents the canonical total formula as
server-computed-only at finalize. `8-api.md`'s finalize endpoint ignores any client-submitted total
field entirely for the persisted value. Every printed output (`outputs.md`) reads only the
server-computed, persisted total. Resolves SO-RISK-002.

---

## ADR-136: SalesOrder — no separate Invoice entity, finalized order remains the invoice (resolves SO-OQ-048)

**Context**: No creation path for a distinct Invoice-capability record was found anywhere in
legacy — orders are printed as invoices via the shared document-rendering capability, with no
backing Invoice CRM entity separate from the Sales Order itself.

**Decision**: New system does not introduce a separate Invoice entity. A finalized Sales Order is
the invoice; printing it uses the standard document-generation pipeline (ADR-063) against the
order's own persisted, server-computed data (per ADR-135) — no new entity to build or keep in sync.

**Consequences**: `5-modules/sales-order/4-schema.md` has no Invoice entity. `outputs.md` documents
the Invoice print as a rendering of the Sales Order record itself. Resolves SO-OQ-048.

---

## ADR-137: SalesOrder — return-restriction and tax-field-lock role gates enforced server-side (resolves SO-RISK-010/SO-OQ-057)

**Context**: Legacy's role-gate flags for return-transaction restriction and tax-field locking were
confirmed only as UI-level computations — no server-side enforcement was found anywhere in the
traced code. A user could bypass either restriction by submitting a request directly, skipping the
UI check entirely.

**Decision**: No new judgment call needed — this closes automatically under the standing principle
already locked in ADR-006 (server-side Guards on every write endpoint, no exceptions). Both role
gates get real server-side enforcement, not just UI-level flags.

**Consequences**: `5-modules/sales-order/7-permissions.md` documents both gates as
Guard-enforced server-side, not UI-only. Resolves SO-RISK-010, SO-OQ-057.

---

## ADR-138: SalesOrder — printing a Quote never changes its status (resolves SO-OQ-053)

**Context**: Legacy's Quote-print action has a side-effecting status write (setting the
quote/COD sub-status classification) baked into the print path itself. Whether repeated
prints are safe (idempotent) was never confirmed — a genuinely open design question the source
material flags as needing explicit resolution, not left to accident.

**Decision**: Printing never changes a Quote's (or any order's) status, full stop — not on first
print, not on reprint. Status transitions happen only through their own explicit actions (e.g.
sending a quote, finalizing an order), never as a side effect of generating a document. Print is
purely a read/render operation.

**Consequences**: `5-modules/sales-order/workflows.md`'s status-transition table has no
print-triggered transition anywhere. `outputs.md` documents every print action as side-effect-free.
Resolves SO-OQ-053.

---

## ADR-139: SalesOrder — Status History covered by the general audit trail, no bespoke table needed (resolves SO-RISK-019/SO-OQ-032)

**Context**: Legacy has a dedicated Status History audit table with its own read function, but it's
completely empty (0 rows) with no confirmed write path found anywhere across all blueprint passes —
either genuinely dead infrastructure, or a write path existing entirely outside every file examined.

**Decision**: Not a module-specific gap to solve — already resolved by the general-purpose audit
trail (ADR-068), which logs every create/update/delete action across every module automatically,
including every Sales Order status change. No bespoke Status History table or write path needs
building; the standing audit-trail mechanism already gives status transitions a real, reliable
record.

**Consequences**: `5-modules/sales-order/4-schema.md` has no separate Status History entity — status
change history is queried from the standard audit trail (`7-cross-cutting/`, per ADR-068), scoped to
this module's records. Resolves SO-RISK-019, SO-OQ-032.

---

## ADR-140: SalesOrder — "Allocate Inventory" consolidated to one field (resolves SO-OQ-015)

**Context**: Legacy has two apparently-duplicate "Allocate Inventory" fields — a header-extension
custom field and a base header field — used inconsistently across different business rules, some
citing one, some the other. Not a simple deprecated/active pair; both are genuinely live and
inconsistently referenced.

**Decision**: Consolidated to one field in the new schema. No dual-storage ambiguity — every rule
that needs to check or set Allocate Inventory reads/writes the same single field.

**Consequences**: `5-modules/sales-order/4-schema.md` defines one Allocate Inventory field;
`3-business-rules.md` updates every rule that previously cited either legacy column to reference the
single consolidated field. Resolves SO-OQ-015.

---

## ADR-141: SalesOrder — finalize waits for real completion before reporting success (resolves SO-RISK-004/016, SO-OQ-024)

**Context**: Legacy's `quick_so_finalize` always reports success regardless of whether its
background/asynchronous finalize completion actually succeeded — masked behind dead code following
an unconditional early `return 'success'`. Callers cannot currently distinguish a genuinely
finalized order from one whose background finalize call is still pending or failed. Separately, this
same entry point's "already finalized" re-finalize guard is broken by a variable-naming defect,
letting an already-finalized order be re-finalized through this one path — risking duplicated
inventory/cost/deposit/accounting-sync side effects.

**Decision**: Finalize only reports success once the entire process (inventory allocation, cost
calc, deposit application, accounting sync) genuinely completes — no fire-and-forget claiming
success early. The re-finalize guard is consolidated to one correct implementation (no
variable-naming inconsistency between entry points), consistent with ADR-030.

**Consequences**: `5-modules/sales-order/8-api.md`'s finalize endpoint is synchronous from the
caller's perspective (or uses a real job-completion wait, per the standard BullMQ pattern) — the
response only returns success after genuine completion. The re-finalize guard is a single shared
check used by every finalize entry point. Resolves SO-RISK-004, SO-RISK-016, SO-OQ-024.

---

## ADR-142: PurchaseOrder — Status is a real validated enum, not a free string (resolves PO-RISK-019)

**Context**: Legacy's status master picklist table is empty (0 rows) while 8 distinct status
strings are live and actively used across the module's status-dependent guards (delete-block list,
receiving-transition logic, EDI Finalized-only gate). A stray or mistyped status string written by
any code path — including a future EDI callback or manual DB fix — would silently bypass every one
of those guards with no FK/constraint error to catch it.

**Decision**: Status is a real, database-validated enum in the new schema — consistent with ADR-050's
already-decided combined status model. No code path, including integration callbacks, can write a
value outside the defined set.

**Consequences**: `5-modules/purchase-order/4-schema.md` defines Status as a real enum type, not a
free-text/lookup-table pair with no enforcement. Resolves PO-RISK-019.

---

## ADR-143: PurchaseOrder — template name uniqueness enforced at the database level (resolves PO-OQ-004)

**Context**: Legacy's `vtiger_potemplates.templatename` "already exists" check is client-side only —
no database-level uniqueness constraint exists. Two templates with the identical name can be saved
if the client check is bypassed or two saves race.

**Decision**: Real database-level uniqueness constraint, scoped per tenant (`(tenant_id, name)`),
matching the resolution already proposed in the module's own field catalog.

**Consequences**: `5-modules/purchase-order/4-schema.md` defines the unique constraint explicitly.
Resolves PO-OQ-004.

---

## ADR-144: StoreTransfer — full module deferred past MVP 1; empty legacy popup stub dropped (resolves PO-RISK-016)

**Context**: `StoreTransferPopup.php` (PurchaseOrder) is a genuinely empty (0-byte) file — a dead
stub, not the real store-transfer-creation implementation. The real working entry points are
`SaveStoreTranfer.php` (PurchaseOrder) and `createSTFromSO.php` (SalesOrder), which feed into a
full, separate legacy StoreTransfer module (finalize flow, pick-ticket PDFs, QuickBooks push, EDI,
scheduled templates) — not currently part of the project's 15-module MVP build list. Developer
confirmed this scope gap: intentional, not missed.

**Decision**: The dead 0-byte popup stub is dropped, not migrated — it never had real logic. The
full StoreTransfer module (and, with it, the "create a store transfer from PO/SO" capability, since
there's no StoreTransfer entity to write to without the module) is deferred past MVP 1, same pattern
as ADR-110's SlipStream deferral. PurchaseOrder's and SalesOrder's own MVP 1 scope does not include
a working store-transfer-creation flow.

**Consequences**: `5-modules/purchase-order/9-ui.md` and `5-modules/sales-order/9-ui.md` omit the
store-transfer-creation entry point for MVP 1. StoreTransfer becomes its own future module, designed
at its own JIT cycle when scheduled. Resolves PO-RISK-016; supersedes the "15 modules" list as stated
in `CLAUDE.md`/project docs to note StoreTransfer as a confirmed future addition, not an omission.

---

## ADR-145: PurchaseOrder — validation rules enforced server-side, not just client-side (resolves PO's highest-priority open question)

**Context**: Of 26 catalogued validation rules, only 3 have a confirmed server-side enforcement
point — the rest are client-side JavaScript only, with no matching server-side guard found anywhere.
Same shape as SalesOrder's equivalent finding (ADR-137).

**Decision**: No new judgment call needed — closes automatically under the standing principle
already locked in ADR-006 (server-side Guards on every write endpoint, no exceptions). All 26 rules
get real server-side enforcement.

**Consequences**: `5-modules/purchase-order/3-business-rules.md` documents every rule as
Guard-enforced server-side, not UI-only. Resolves PurchaseOrder's highest-priority open question.

---

## ADR-146: Location — part-supersession moves quantity and cost together, atomically (resolves LOC-RISK-009)

**Context**: Legacy's part-supersession quantity merge and cost transfer are two independently-gated
functions with no shared reconciliation step — no configuration state guarantees a coherent,
reconciled cost basis after supersession. On-hand-quantity-times-weighted-average-cost is not
guaranteed correct after the event.

**Decision**: Quantity and cost move together as one atomic transaction during supersession — not
two separately-gated steps. Guarantees the combined on-hand-value figure is always correct
afterward, no partial/inconsistent state possible.

**Consequences**: `5-modules/location/8-api.md`'s supersession endpoint wraps both quantity and cost
updates in a single transaction. Resolves LOC-RISK-009.

---

## ADR-147: Location — part supersession flags open orders referencing the superseded part (resolves LOC-RISK-012)

**Context**: Legacy's part-supersession merge does not re-point, cancel, or flag open Sales Order or
Purchase Order lines referencing the superseded product — a cross-module gap the module's own code
cannot independently confirm as live-defect or mitigated elsewhere.

**Decision**: Superseding a part flags any open Sales Order or Purchase Order lines still
referencing it, surfaced to staff for manual review — no automatic re-pointing (too risky to change
an order without a human confirming it's correct) and no hard block on the supersession itself
(would force unrelated open orders to close first, too disruptive).

**Consequences**: `5-modules/location/8-api.md`'s supersession endpoint queries for open
SalesOrder/PurchaseOrder lines referencing the superseded product and creates a review flag/
notification per ADR-012. `5-modules/sales-order/` and `5-modules/purchase-order/` UIs surface this
flag on affected open orders. Resolves LOC-RISK-012.

---

## ADR-148: Location — kit-labeled quantity adjustment actually propagates to kit components (resolves LOC-RISK-010)

**Context**: Legacy's kit-labeled QoH-adjustment endpoint performs zero kit-component propagation
despite its own name and the client-side function name that calls it implying it should — a genuine
filename-contradicting absence of behavior.

**Decision**: Built for real — adjusting a kit's quantity through this endpoint propagates the
change to the kit's individual component parts' quantities, matching what the name/UI already
implies to users.

**Consequences**: `5-modules/location/3-business-rules.md`/`8-api.md` documents the kit-adjustment
endpoint's real component-propagation behavior. Resolves LOC-RISK-010.

---

## ADR-149: Location — lost-sale factor applies once per event, not compounded (resolves LOC-RISK-011)

**Context**: Legacy's lost-sale factor accumulator compounds multiplicatively across repeated events
for any factor other than 1, rather than applying once per event — a confirmed demand-signal
inflation bug for products/branches with repeated lost-sale events in the same week.

**Decision**: Each lost-sale event contributes its factor exactly once. No compounding across
repeated events.

**Consequences**: `5-modules/location/calculations.md` documents the corrected, non-compounding
formula. Resolves LOC-RISK-011.

---

## ADR-150: Location — reorder-point formulas divide by actual transaction count, not the configured cap (resolves LOC-RISK-017)

**Context**: Legacy's Average Days Between Sales / Average Quantity Sold formulas divide by the
*configured* transaction-count limit, not the *actual* row count found — a confirmed, systematic
understatement of demand/lead-time signals for any product/branch with fewer than the configured
number of historical transactions, directly degrading reorder-point accuracy.

**Decision**: Formulas divide by however many real transactions actually exist, up to the configured
cap — not the cap itself when fewer transactions exist. Fixes the systematic understatement for
newer/slow-moving products.

**Consequences**: `5-modules/location/calculations.md` documents the corrected denominator logic.
Resolves LOC-RISK-017.

---

## ADR-151: Location — lost-sale admin notification stays triggered on report page view (resolves LOC-RISK-018)

**Context**: Legacy's admin lost-sale-notification email fires unconditionally on every plain page
load of the Lost Sale Log Report, not on a controlled schedule — flagged as an unbounded
send-frequency/potential performance-cost risk.

**Decision**: Developer confirmed keeping this behavior as-is — the email continues to fire on
report page view, not moved to a scheduled/throttled cadence. A deliberate choice, not a silent
port of the legacy behavior.

**Consequences**: `5-modules/location/8-api.md`/`outputs.md` documents the notification as
page-view-triggered by design. Resolves LOC-RISK-018 (accepted as intended behavior, not fixed).

---

## ADR-152: Location — real Active/Inactive branch status, enforced (resolves LOC-RISK-021)

**Context**: Legacy has no branch-level Active/Inactive lifecycle field at all — a genuine schema
gap, not merely under-investigated. No first-class mechanism exists to represent a temporarily-closed
branch.

**Decision**: Add a real Active/Inactive status field for branches/locations, enforced the same way
as Accounts' Status field (ADR-105) — an Inactive branch is blocked from new Sales Order/Purchase
Order activity at that location and excluded from location-picker lists, not merely a cosmetic flag.

**Consequences**: `5-modules/location/4-schema.md` adds the Status field. `3-business-rules.md`
documents the enforcement points, consistent with ADR-105's pattern. Resolves LOC-RISK-021.

---

## ADR-153: Location — remaining findings resolved by standing rules, no fresh decisions needed

**Context**: Three further Location findings don't need their own developer decision — each closes
automatically under a principle already locked elsewhere:
- **LOC-RISK-008** (concurrent-update protection is a stale-tab check, not a real lock) — closed by
  ADR-084's standing concurrent-edit-lock principle, which applies to every module, not just
  SalesOrder.
- **LOC-RISK-013** (User-Location Tracking keys its branch reference by denormalized name, a
  Users-module entity) — fixed as a normal foreign-key reference to the branch's stable id, not a
  name string; standard schema practice, not a business judgment call.
- **LOC-RISK-015** (Product-at-Location's 72,104 rows have no native audit-trail/soft-delete
  mechanism) — closed by ADR-005 (uniform soft-delete) and ADR-068 (full-coverage audit logging),
  both already project-wide standing rules.
- **LOC-RISK-016** (sales-history merge-and-reset during supersession is two non-atomic writes) —
  wrapped in the same transaction as ADR-146's quantity/cost reconciliation, closing the
  partial-failure double-count risk by the same mechanism.

**Decision**: No new ADR content beyond noting these are closed. Logged here only so this module's
risk register isn't mistaken for having unaddressed items.

**Consequences**: `5-modules/location/` documents inherit these standing patterns without
re-deciding them. Resolves LOC-RISK-008, LOC-RISK-013, LOC-RISK-015, LOC-RISK-016.

---

## ADR-154: Users — role delete rejects a missing/blank id outright, never wildcard-matches (resolves USR-RISK-001)

**Context**: Legacy's `deleteRole()` is the confirmed, fully-traced root cause of a real prior
data-loss incident: an empty/missing role-delete identifier flows past a parameterized lookup that
correctly reports "no such role," but the caller's own null-handling then builds a second,
differently-shaped query whose `LIKE` match against a null-coerced-to-`"%"` pattern matches
essentially every role in the system — `deleteRole()` then unconditionally deletes each matched
role's Profile, Role-Profile mapping, Group memberships, Sharing Rules, and the role row itself. No
guard has been added anywhere in this call chain since the incident occurred.

**Decision**: A missing or blank role-delete identifier is rejected outright at the entry point,
before any query is built — never coerced into a wildcard match. Deleting a role always operates on
exactly the one role whose id was explicitly and validly provided.

**Consequences**: `5-modules/users/8-api.md`'s role-delete endpoint validates the id is present and
well-formed before any downstream query executes; there is no code path where an absent id can
resolve to "every role." Resolves USR-RISK-001.

---

## ADR-155: Users — password complexity and account lockout policy set (resolves USR-RISK-005/006)

**Context**: Legacy's password complexity is entirely client-side and toggle-gated — no
server-side length/character-class/history check exists anywhere, for any password-set path. No
persistent, DB-backed account lockout exists either — the only failed-login tracking is a
session-scoped counter that only logs (never blocks) and resets on session loss, so a scripted
attack that doesn't preserve session state never accumulates a count. ADR-014 already set bcrypt for
hashing but never specified the actual complexity/lockout policy.

**Decision**:
- **Password complexity**: minimum 8 characters, at least one uppercase, one lowercase, one number.
  No special-character requirement. Enforced server-side on every password-set path (interactive
  change, CSV import, admin reset) — never client-side-only.
- **Account lockout**: 5 failed attempts locks the account for 15 minutes, then auto-unlocks. Real
  server-side, persistent tracking — not a session-scoped counter that resets on session loss.

**Consequences**: `3-api/2-authentication.md` documents both the password-complexity rule and the
lockout policy as server-enforced. `5-modules/users/6-validation.md` adds the complexity rule to
every password-set path. Resolves USR-RISK-005, USR-RISK-006.

---

## ADR-156: Users — new profile permissions default to denied, not granted (resolves USR-RISK-013)

**Context**: Legacy's new-profile creation defaults every standard-action permission checkbox to
"granted" whenever the corresponding request field is simply absent — a permission the profile-edit
UI doesn't happen to render for a given module silently defaults to granted rather than denied. A
fail-open permission default.

**Decision**: Default is denied, not granted. A permission exists only if explicitly granted;
anything absent from the request is treated as not-granted, never assumed.

**Consequences**: `5-modules/users/8-api.md`'s profile-save endpoint treats every omitted permission
field as denied. Resolves USR-RISK-013.

---

## ADR-157: Users — duplicate-username and last-admin-demotion guards wired to the real save path (resolves USR-RISK-020)

**Context**: Legacy has two same-named-but-different duplicate-username/last-admin-demotion guard
functions; the fully-implemented, already-validated server-side one is never called from the real
save path, so neither protection is actually enforced today despite the guard code already existing
and working correctly in isolation.

**Decision**: The existing, correct guard is wired into the real save path — no reimplementation
needed, just actually calling it. A duplicate username or demoting the last remaining admin is
rejected at save time.

**Consequences**: `5-modules/users/8-api.md`'s user-save endpoint calls the validated guard function
directly. Resolves USR-RISK-020.

---

## ADR-158: Products — one shared label-printing delivery path (resolves PROD-RISK-013)

**Context**: Legacy's ZPL/EPL label-printing file has two inconsistent PrintNode delivery
mechanisms — some branches call the shared delivery function in-process, others self-originate an
HTTP request into a separate top-level dispatcher script. Both reach the same account/printer but
are not the same code path — a maintainability/consistency risk, not itself a security risk.

**Decision**: Unified into one shared delivery service. Every label-print call site uses the same
mechanism, no in-process/self-HTTP split.

**Consequences**: `5-modules/products/8-api.md` documents label printing as calling one shared
delivery service. Resolves PROD-RISK-013.

---

## ADR-159: Products — duplicate-value check always matches the actual submitted value (resolves PROD-RISK-014)

**Context**: A generic duplicate-lookup helper (`checkDuplicateValue()`) has its match condition
hardcoded to one specific literal value for the vendor-linecode master-data editor, regardless of
what is actually being checked — a genuine duplicate for any other value could silently slip past
the intended uniqueness guard. Never confirmed intentional or accidental.

**Decision**: Fixed — the duplicate-check always matches the actually-submitted value, never a
hardcoded literal.

**Consequences**: `5-modules/products/8-api.md`'s duplicate-check helper takes the value to check as
a real parameter. Resolves PROD-RISK-014.

---

## ADR-160: Products — case-fullness and barcode-quantity checks are real, enforced rules (resolves PROD-RISK-019)

**Context**: Two advisory-only validation functions (`checkCaseFullForReturn()`,
`checkSNExistInCase()`) compute a real result but leave enforcement entirely to an unread/
unconfirmed caller — whether either result is actually acted upon, or silently ignored, was never
confirmed by any analysis pass.

**Decision**: Both promoted to real, enforced domain invariants. An over-return or an inconsistent
quantity edit is rejected outright at save time, not merely computed and possibly ignored.

**Consequences**: `5-modules/products/6-validation.md` documents both as save-time-enforced rules,
not advisory computations. Resolves PROD-RISK-019.

---

## ADR-161: UOM — conversions always stay fractional, no whole-number-rounding config (resolves UOM-RISK-005)

**Context**: Legacy's `uom_to_base` quantity conversion rounds to a whole unit or stays fractional
depending on a global `$global_qty_base_integer_sub` config flag, not any per-product or per-UOM-type
property — flagged as needing an explicit rewrite decision, not a silent behavior change in either
direction.

**Decision**: Conversions always stay fractional/decimal — no config flag, no per-deployment
difference. Matches ADR-096's already-decided "Base unit quantities stay decimal-capable" design;
this closes the remaining ambiguity explicitly rather than leaving it implied.

**Consequences**: `5-modules/uom/8-api.md`'s conversion service has no whole-number-rounding mode —
one consistent behavior everywhere. Resolves UOM-RISK-005.

---

## ADR-162: AccountStatement — B2B statement requests get real permission enforcement, no bypass (resolves STMT-RISK-002)

**Context**: Legacy's `isPermitted('AccountStatement', 'ListView')` check is skipped entirely for
statement requests flagged `requestfrom=b2bfrontend` — that path relies solely on its own upstream
authentication, with no defense-in-depth permission check at this layer. Deliberately excluded from
Accounts' own risk register as belonging to AccountStatement specifically.

**Decision**: No new judgment call needed — closes automatically under the standing principle
already locked in ADR-006 (server-side Guards on every write/read-access endpoint, no exceptions).
B2B statement requests get the same real permission check as every other path, no special-cased
bypass.

**Consequences**: `5-modules/account-statement/7-permissions.md` documents the B2B statement path as
Guard-enforced identically to every other access path. Resolves STMT-RISK-002.

---

## ADR-163: AccountStatement — full and quick statement share one discount-text rule (resolves STMT-RISK-003)

**Context**: Legacy's `processAccountStatement()` (full) and `processQuickAccountStatement()`
(quick) confirmedly differ on whether `checkallotheroffterms()` gates the early-payment-discount
text parser before it runs — the same account and payment term can display a different discount
outcome depending on which entry point generated the statement.

**Decision**: No new judgment call needed — closes under the standing no-duplicate-logic principle
(ADR-030). Both views call the identical discount-text logic; same account and terms always produce
the same displayed discount text regardless of which screen generated it.

**Consequences**: `5-modules/account-statement/calculations.md` documents one shared
discount-text-generation function, called by both full and quick statement paths. Resolves
STMT-RISK-003.

---

## ADR-164: AccountStatement — finance-charge fully unified with Accounts' one canonical calculator (resolves STMT-RISK-001/004)

**Context**: ADR-034 already picked ÷365 as the one canonical finance-charge divisor for Accounts.
AccountStatement's own two finance-charge calculators (`ApplyFinanceCharge.php`, always ÷12; and
`AccountStatement.php::calculateFinanceCharge`, ÷365 for Net 1 terms) still exist as two separate
implementations, and independently duplicate a finance-charge-suppression threshold gate on top of
the divisor divergence — a second point where they can silently disagree.

**Decision**: Statements use the exact same single canonical finance-charge function as the rest of
Accounts (per ADR-034/ADR-030) — no separate statement-specific calculator, no separately-drifting
suppression-threshold logic. One implementation, called from every entry point including both
statement paths.

**Consequences**: `5-modules/account-statement/calculations.md` calls the same shared finance-charge
function `5-modules/accounts/calculations.md` defines, including its suppression-threshold logic.
Resolves STMT-RISK-001, STMT-RISK-004.

---

## ADR-165: AccountStatement/Accounts — payment-term date-boundary parsing consolidated to one implementation (resolves STMT-RISK-005)

**Context**: Legacy has payment-term date-boundary parsing logic quadruplicated across
`checkTerm()`, `getLastXPeriod()`, `calculateduedate()`, and an inline variant inside
`Accounts.php::processAccountStatement()`/`processQuickAccountStatement()` — a term-meaning change
must be replicated correctly across all four or aging buckets, due dates, and discount text will
silently disagree.

**Decision**: No new judgment call needed — closes under the standing no-duplicate-logic principle
(ADR-030). One shared term-date-boundary function, called by every consumer including the statement
engine's own entry points — no inline restatement anywhere.

**Consequences**: `5-modules/accounts/calculations.md` defines the single canonical term-date
function; `5-modules/account-statement/calculations.md` calls it rather than restating the logic
inline. Resolves STMT-RISK-005.

---

## ADR-166: ProductTracking — mobile-scanner webservice requires a real per-device API key (resolves ProductTracking Open Question 13)

**Context**: ProductTracking's shared writer function is reachable from a mobile-scanner webservice
whose own authentication requirement was never traced by the blueprint — a genuinely distinct
exposure class from every other finding in the project, since it's the first confirmed endpoint
reachable from outside the application's own session-authenticated web UI entirely. A SQL injection
on this exact call chain (Finding 4) compounds the concern.

**Decision**: The scanner webservice requires a real, hashed, scoped API key per device — matching
the project's standard third-party/system-access authentication model (same Guards, same endpoints,
per the tech-stack decision). No shared session, no open/unauthenticated endpoint. Each device's key
is individually revocable.

**Consequences**: `5-modules/product-tracking/3-api/2-authentication.md` documents the scanner
endpoint as API-key-authenticated per device, not session-based. Resolves ProductTracking's Open
Question 13, and materially narrows Finding 4's exploitability bar (an attacker would also need a
valid device key, not just network reachability).

---

## ADR-167: ProductTracking — Net Cost and Accounting Net Cost derive from one consistent cost-basis source (resolves ProductTracking Finding 5)

**Context**: Legacy's Net Cost and Accounting Net Cost compute from two different cost-basis columns
on the same save, whenever a location runs a non-default GP-basis setting — a confirmed formula
divergence, not a security issue, but a real data-integrity risk.

**Decision**: No new judgment call needed — closes under the standing no-duplicate-logic principle
(ADR-030). Both cost figures derive from one shared cost-basis resolution; they cannot disagree for
the same row regardless of the location's GP-basis setting.

**Consequences**: `5-modules/product-tracking/calculations.md` documents one canonical cost-basis
resolution feeding both fields. Resolves ProductTracking Finding 5.

---

## ADR-168: ProductTracking — Push To QuickBooks is a real boolean, never blank (resolves ProductTracking Finding 6)

**Context**: Legacy's Push To QuickBooks field holds an empty string (neither `Yes` nor `No`) on
990 of 15,013 live rows — the specific writer producing these blank rows was never identified across
≥26 confirmed callers.

**Decision**: Field is a real boolean in the new schema — every writer must set it explicitly at
save time. No third "unset" state is possible going forward.

**Consequences**: `5-modules/product-tracking/4-schema.md` types Push To QuickBooks as a required
boolean, not a nullable/blank-capable string. `8-api.md`'s write contract requires every caller to
supply it. Resolves ProductTracking Finding 6.

---

## ADR-169: ProductTracking — Accounting Net Cost override precedence made explicit (resolves ProductTracking Finding 8)

**Context**: Legacy's Accounting Net Cost has three independent override layers (a GP-basis-setting
branch, a Receiving-known-PO-cost override, a Product-Cut-originated override) with no confirmed
mutual-exclusivity guard — not observed conflicting on live data, but the code shape permits it.

**Decision**: Explicit, ordered precedence, per the source documentation's own recommendation:
Product-Cut override → Receiving override → GP-basis-setting branch → plain default formula. No
silent overlap; exactly one layer applies per row, in this fixed order.

**Consequences**: `5-modules/product-tracking/calculations.md` documents this as an explicit,
ordered branch (not three independently-triggerable overrides), and — per the same source
recommendation — Net Cost and Accounting Net Cost are both computed from one resolved cost-basis
value rather than two independently-derived ones. Resolves ProductTracking Finding 8.

---

## ADR-170: ProductTracking — six Campaigns copy-paste leftover files excluded, not migrated (resolves ProductTracking Finding 9)

**Context**: Six files in ProductTracking's own directory carry confirmed, unadapted Campaigns-module
copy-paste artifacts — a dead currency-conversion block, an always-blank record-title assignment
confirmed **live** on the module's own everyday record-view page (not merely dead code), two files
whose relation-table writes target a different module's own tables entirely, and one JS file
referencing form fields that don't exist on this entity's own edit form. The widest share of one
module's own file count carrying this defect class of any module in this project (6 of 20 files).

**Decision**: None of the six carry real ProductTracking logic — excluded entirely, not migrated in
any form. The live always-blank-title bug is closed by construction, since the new record-view is
built fresh rather than inherited from a copy-pasted Campaigns template.

**Consequences**: `5-modules/product-tracking/` build-guidance notes these six legacy files as
explicitly out of migration scope. Resolves ProductTracking Finding 9.

---

## ADR-171: Project success criteria — no numeric business target, standard delivery criteria only (resolves gap-analysis Q-04)

**Context**: Gap analysis Q-04 flagged that no measurable business-value objective (revenue impact,
cost reduction, operational-efficiency target) exists anywhere in the SoT, only the security/
delivery-focused objectives already stated. Raised again while refreshing `1-project/` against the
full ADR set — genuinely still unanswered until now.

**Decision**: No numeric business target is set. Project success is measured by the standard delivery
criteria already locked in ADR-022 (on-schedule per milestone, zero Critical/High defects at release,
user-acceptance confirmed per module) plus this project's own security/stability objectives — "secure
and working" is the bar, not a revenue/cost/efficiency number.

**Consequences**: `1-project-overview.md` §2 Business Objectives and §14 Success Criteria drop the
`[NEEDS INPUT]` marker and state this explicitly rather than leaving the objective open.

---

## ADR-172: Deployment automation and user manuals — in scope for this project

**Context**: `1-project-overview.md` §15 Deliverables flagged deployment scripts/infra-as-code and
user manuals as `[NEEDS INPUT]` — not stated anywhere whether they're this project's responsibility or
deferred to another team/phase.

**Decision**: Both are in scope, built as real project deliverables — infra-as-code/deployment
automation (mechanism decided alongside hosting, ADR-071, and `6-development/`'s deploy workflow) and
end-user manuals (per module, once that module's UI is built and confirmed).

**Consequences**: `1-project-overview.md` §15 Deliverables drops the `[NEEDS INPUT]` marker. Task
breakdown at `6-implementation-plan/1-implementation-plan.md` should include deployment-automation and
user-manual tasks, not treat them as out-of-scope by omission.

---

## ADR-173: Reporting beyond legacy — deferred to a future Reporting module

**Context**: `2-requirements.md` §11 flagged full reporting requirements beyond what legacy modules
already produce as `[NEEDS INPUT]` — the SoT only documents legacy's existing reports (purchasing/
inventory-planning, cost/margin, tax).

**Decision**: MVP 1 reproduces legacy's existing report set only (per module, as each module is built).
Any new reporting capability beyond that is deferred to a dedicated future **Reporting** module, not
designed piecemeal inside MVP-1 modules.

**Consequences**: `2-requirements.md` §11 drops the `[NEEDS INPUT]` marker, stating the deferral
explicitly. `1-project-overview.md`'s Out of Scope section notes a future Reporting module alongside
the already-tracked StoreTransfer/ProductTracking future additions.

---

## ADR-174: Cross-module package choices locked (resolves tech-stack.md §16 Package Guidelines)

**Context**: `4-tech-stack.md` §16 left specific backend/frontend package choices (beyond the
framework-level NestJS/Prisma/BullMQ/Next.js decisions) as `[NEEDS INPUT]` — genuinely undecided.
Several of these are needed cross-module (every module with bulk data needs CSV import/export per
ADR-098; every module needs PDF output for its own printed documents) so deciding once here avoids
each module re-deciding independently.

**Decision**: Locked:
- **Backend validation**: `class-validator` + `class-transformer` (NestJS-native DTO/Guard integration).
- **Date/time**: `date-fns`.
- **Frontend forms**: `react-hook-form` + `zod` (schema shape shared with backend DTO validation).
- **PDF generation**: `pdf-lib` — chosen over a Puppeteer/headless-Chromium approach specifically to
  avoid running a browser process server-side just to render printed documents (statements, POs, etc.):
  smaller attack surface, lighter resource footprint, no browser-sandbox exposure.
- **CSV import/export** (ADR-098's standard bulk pattern): `papaparse` (frontend) + `csv-parse`/
  `csv-stringify` (backend).
- Password hashing stays bcrypt, already locked (ADR-014) — restated here only for completeness, not
  re-decided.

**Consequences**: `4-tech-stack.md` §16 drops the `[NEEDS INPUT]` marker and lists these directly.
Every module's own JIT `8-api.md`/`9-ui.md` that needs validation, dates, forms, PDF output, or
import/export references these rather than picking independently.

---

## ADR-175: API rate limiting — 100 req/min per user, 300 req/min per API key

**Context**: `3-api/1-api-design.md` §15 flagged specific rate-limit thresholds as `[NEEDS INPUT]` —
API keys are confirmed "rate-limited" at the mechanism level (`1-project/4-tech-stack.md` §6) and 2FA
regeneration has its own separate limit (ADR-075), but no general per-user/per-API-key request
threshold existed anywhere in the SoT.

**Decision**: 100 requests/minute per authenticated user; 300 requests/minute per API key (third-party/
system callers get a higher ceiling since a single integration often represents many end users' worth
of traffic). Exceeding the threshold returns HTTP 429. Adjustable later without a breaking API change
(an internal limit, not a documented client contract).

**Consequences**: `3-api/1-api-design.md` §15 and `3-api/7-api-development-standards.md` §13 drop the
`[NEEDS INPUT]` marker and state these thresholds directly.

---

## ADR-176: CORS policy — locked to the project's own frontend origin; API-key calls are server-to-server, not a CORS case

**Context**: `3-api/1-api-design.md` §16 and `3-api/2-authentication.md` §15 flagged CORS origin policy
as `[NEEDS INPUT]`. Developer confirmed third-party access happens via API key, not browser-based
cross-site JavaScript calls.

**Decision**: CORS is locked to the project's own Next.js frontend origin(s) only (per-tenant subdomain,
`<tenant>.omnna-lbm.live`) — no third-party origin allowlist. Third-party integrations authenticate via
API key and call the API server-to-server, which is outside CORS's scope entirely (CORS governs
browser-originated cross-site requests only, not server-to-server HTTP calls) — so no open CORS
allowlist is needed to support them.

**Consequences**: `3-api/1-api-design.md` §16 and `3-api/2-authentication.md` §15 drop the
`[NEEDS INPUT]` marker and state this policy directly.

---

## ADR-177: Stitch AI dashboard mockup — reused for style tokens only, layout rebuilt fresh

**Context**: `project-docs/sot-docs/design/screenshots/stitch_lbm_design/` (DESIGN.md, code.html,
screen.png) is an AI-generated (Google Stitch) dashboard mockup the developer supplied as visual
reference. Compared against `sot-docs/raw/1-business-requirements/ui-ux-design-requirements.md` and
ADR-024/ADR-025: the mockup's layout uses a fixed `w-64` sidebar and `overflow-hidden h-screen` body
with no responsive breakpoints, a plain `<table>` with no mobile card/list fallback — directly
conflicting with the requirement doc's "avoid fixed-width layouts" and mandated responsive nav/table
behavior (desktop sidebar → tablet collapsible → mobile drawer). It also ships as raw Tailwind CDN +
vanilla JS, not the locked Next.js/shadcn stack (ADR-025).

**Decision**: Reuse the mockup's design tokens (DESIGN.md color palette, Space Grotesk/Inter/JetBrains
Mono type pairing, spacing scale, component look-and-feel) as input to `1-discovery/4-design-creation.md`'s
`tokens.json` work. Do not carry over its layout structure (fixed sidebar, non-responsive table, static
states) — that gets designed fresh, responsive-by-default, against the UI/UX requirements doc, and
implemented in the locked stack (Next.js + Tailwind + shadcn/ui), not adapted from the mockup's raw HTML.

**Consequences**: `1-discovery/4-design-creation.md` treats the Stitch output as a style/token reference
only, not a layout spec, when it runs.

---

## ADR-178: Frontend icon library — lucide-react, not the mockup's Material Symbols Outlined

**Context**: `4-ui/3-design-system.md` needed an icon library decision. The reviewed Stitch mockup
uses Google Material Symbols Outlined (an external font-icon service). The locked CSS framework is
Tailwind + shadcn/ui (ADR-025), whose standard companion icon set is lucide-react (SVG-based,
tree-shakeable, no external network dependency).

**Decision**: lucide-react. Chosen over Material Symbols Outlined specifically to avoid an external
Google Fonts network dependency shadcn/ui doesn't otherwise need, and to match shadcn/ui's standard
companion set. Icon names map conceptually from the mockup's Material Symbols per concept (e.g.
`dashboard` → `LayoutDashboard`, `group` → `Users`, `receipt_long` → `Receipt`).

**Consequences**: `4-ui/3-design-system.md` §7, `4-ui/4-component-standards.md`, and every module's
own `9-ui.md` (generated JIT) use lucide-react exclusively — no module introduces Material Symbols
or a competing icon library.

---

## ADR-179: "Info" status color — reuses Primary blue, no new hue introduced

**Context**: `4-ui/3-design-system.md`'s color tokens are sourced from the reviewed Stitch mockup's
`DESIGN.md`, which defines Success (`#10B981`), Warning (`#F59E0B`), and Error (`#DC2626`) but no
"Info" status color.

**Decision**: Info reuses Primary (`#2563EB`) rather than introducing a new hue — informational
toasts/messages read as the brand's primary blue, distinct enough from Success/Warning/Danger.

**Consequences**: `4-ui/3-design-system.md` §4 and `4-ui/4-component-standards.md`'s Feedback/Badge
components use `#2563EB` for the Info variant; no module introduces a separate info color.

---

## ADR-180: B2B Customer role has no UI in this application — separate external system

**Context**: `1-project/2-requirements.md` §5 (ADR-002) lists B2B Customer as one of six roles in the
platform-wide role/permission catalog. While generating `4-ui/1-navigation.md`, it needed to be
decided whether B2B Customer logs into this same Next.js application (same shell, restricted menu)
or a separate storefront. Developer confirmed B2B customers use a different, separate system
entirely — they never authenticate against this application.

**Decision**: B2B Customer remains in the role catalog for API/authorization purposes only (the role
may still gate specific API endpoints/scopes a separate B2B-facing system calls). No screen,
sidebar item, or navigation flow in this application's `4-ui/` document set represents B2B Customer
access — `4-ui/1-navigation.md` and `4-ui/2-user-flows.md` explicitly exclude it.

**Consequences**: `4-ui/1-navigation.md` §1/§10/§19 and `4-ui/2-user-flows.md` §3/§14 document this
exclusion explicitly. Any future B2B-facing system is out of scope for this `4-ui/` document set
entirely — it would get its own separate UI documentation category if/when built.

---

## ADR-181: Git hosting — GitHub, repository confirmed

**Context**: `6-development/4-git-workflow.md` needed a Git hosting platform decision — not
addressed in any SoT source. This session's own tooling defaults already assume GitHub (`gh` CLI
available).

**Decision**: GitHub. Repository: `https://github.com/parimal-c-crest/lbm-erp.git`. Workflow model:
GitHub Flow (`main` + short-lived feature branches, PR-gated merge, no long-lived `develop` branch)
— fits a small team building one product on one continuous release train, not a multi-release-train
product needing Git Flow's heavier branching.

**Consequences**: `6-development/4-git-workflow.md` and `6-development/9-ci-cd.md` (this same batch)
use GitHub Actions for CI/CD and GitHub's own PR/branch-protection mechanisms throughout, not a
platform-agnostic placeholder.

---

## ADR-182: EPIC-002 (Platform Administration) scope — narrowed to FEAT-015's original 4 capabilities

**Context**: EPIC-002/FEAT-015 ("Skeleton Control Panel") was about to get its first real design pass
(no dedicated docs existed yet — it generates its own documentation outside the per-module JIT cycle,
`1-project/3-feature-breakdown.md` §10 note). Decisions-log research surfaced that ADR-056/057/058/
059/060/061/062/065/066/070/072 collectively describe a much larger set of skeleton-control-panel
capabilities (migrations, cron, Super Admin, plus update manager, maintenance/lock, pre-deploy
backup, live-to-testing clone) than what `task-list.md`/`3-feature-breakdown.md` actually committed
EPIC-002/FEAT-015 to build.

**Decision**: EPIC-002 scope stays narrow — exactly the 4 capabilities already named in
`task-list.md`'s EPIC-002 description and `3-feature-breakdown.md`'s FEAT-015 row: **tenant
provisioning, migration fanout, Super Admin accounts, cron/job management**. Update Manager
(ADR-060), maintenance mode/lock (ADR-061/062), pre-deploy backup (ADR-065), and live-to-testing
clone (ADR-066) are real, already-decided capabilities but not part of this epic — they get their own
future epic(s) when scheduled, the same deferred-not-missed treatment as StoreTransfer (ADR-144).

**Consequences**: EPIC-002's eventual `docs-kit/`-equivalent design doc and task list cover only the
4 named capabilities. The other ADRs remain valid, locked decisions for whenever their own epic is
scheduled — not re-litigated, just not built now.

---

## ADR-183: EPIC-002 — dynamic per-tenant datasource resolution mechanism (resolves ADR-056's open item)

**Context**: ADR-056 locked database-per-tenant but explicitly flagged "Prisma + NestJS needs a
genuine per-tenant dynamic datasource/connection-routing strategy, resolved at request time from the
subdomain" as an unresolved blocking follow-up. EPIC-002's design pass is the first point this
actually needs answering — every future module's backend work (M3 onward) depends on this existing
first.

**Decision**: A NestJS middleware reads the inbound request's `Host` header, extracts the subdomain,
and looks up the tenant's connection string from `TenantRegistry` (a table living only in the
skeleton database, always connected). The middleware resolves/creates a `PrismaClient` for that
tenant using `@prisma/adapter-pg` (already a backend dependency, added during T-005's Prisma init)
wrapping a `pg.Pool` — no new package needed, this is exactly the scenario the adapter pattern
exists for. Resolved clients are cached/reused per tenant (not reconnected every request) and
attached to request-scoped context via `AsyncLocalStorage`, replacing today's single global
`PrismaService` with a tenant-scoped equivalent.

**Consequences**: `backend/src/prisma/prisma.service.ts` (T-005) changes from a single static-URL
client to a per-tenant resolver built on this middleware. Every future module's data-access code
reads the current tenant's client from request context rather than importing one global instance.
Local dev needs its own tenant registry seeded with at least skeleton + one real local tenant
database to exercise this for real (see ADR-184).

---

## ADR-184: EPIC-002 — local dev tenant topology (skeleton database renamed/separated from `lbm_erp_dev`)

**Context**: T-005 created one local Postgres database, `lbm_erp_dev`, as the single fixed
`DATABASE_URL` target for local development — reasonable before database-per-tenant routing existed,
but incompatible with it now that ADR-183 requires a real skeleton database plus at least one real
tenant database to prove multi-tenant routing actually works locally, not mocked.

**Decision**: Skeleton becomes its own dedicated local database, `lbm_erp_skeleton` — holds
`TenantRegistry` plus the schema/seed-data clone source (ADR-056). The existing `lbm_erp_dev`
database (T-005) is repurposed as the first example/demo tenant rather than reused as skeleton
itself, keeping the "skeleton is a template, not a real tenant" distinction real even in local dev.
A second local tenant database is created through the actual provisioning flow (not manually) during
EPIC-002's own implementation/verification, to prove the end-to-end flow works, not just the skeleton
half of it.

**Consequences**: `backend/.env`/`.env.example` gain a distinct skeleton connection variable
alongside the per-tenant-resolved ones; `lbm_erp_dev`'s existing local data (currently empty — no
models exist yet) is unaffected by the rename-in-role since no schema/migrations have been applied to
it yet. `6-development/1-development-environment.md` §9/§11 get updated at EPIC-002's own
documentation-generation step to describe this topology, not re-decided here.

---

## ADR-185: EPIC-002 — minimal bootstrap `users` table now, Users module (M3) extends it

**Context**: ADR-057 requires a Super Admin user row auto-created at tenant provisioning time, but
the real Users module (full schema, roles/permissions) isn't built until M3 — three milestones after
EPIC-002 (M1). Provisioning can't skip Super Admin bootstrap (it's the only way to first log into a
newly created tenant) but also can't wait for M3.

**Decision**: EPIC-002 adds a minimal `users` table to the shared Prisma schema now — just enough
fields to support login and Super Admin bootstrap: `id` (UUID), `email`, `password_hash`, `role`,
`is_super_admin`, plus the standard audit columns from ADR-005/073 (`created_at`/`updated_at`,
`created_by`/`updated_by` — nullable, self-referential on the bootstrap row itself —,
`is_deleted`/`deleted_at`). No `tenant_id` (ADR-073 — isolation is physical, this table lives inside
each tenant's own database). Users module (M3) **extends** this same table with its full field set
(per its own JIT-generated schema) rather than replacing it, avoiding rework or a data-migration step
at M3 time.

**Consequences**: `prisma/schema.prisma` gains a `User` model at EPIC-002's implementation step, ahead
of Users module's own M3 schema work. Users module's own `5-modules/users/4-schema.md` (JIT,
generated at M3) must explicitly reference this as an extension of an existing table, not a
from-scratch design — flagged here so that document's generation doesn't contradict this decision.

---

## ADR-186: Users — Role hierarchy (parent/child + depth) kept, not flattened

**Context**: Legacy's Role entity is a self-referencing hierarchy (`H2`/President root, computed
nesting depth, drag-and-drop reparenting UI). When `5-modules/users/` was first drafted, the module's
own author proposed flattening Role to a plain list (just ADR-002's 5 confirmed roles, no
parent/child) on the reasoning that no SoT source or ADR required org-chart-shaped nesting for MVP.
Developer reviewed this proposal and rejected it.

**Decision**: The Role hierarchy is kept — `parent_role_id`/`depth` remain real columns, seeded with
ADR-002's 5 tenant-facing roles as an initial flat layer, reparentable by Admin via the same
drag-and-drop interaction the legacy system had.

**Consequences**: `5-modules/users/4-schema.md` keeps `parent_role_id`/`depth` on the `roles` table.
`5-modules/users/9-ui.md` keeps the Role hierarchy tree picker and drag-and-drop reparenting screen.
`5-modules/users/2-functional-specification.md` FR-003 includes a Reparent flow.

---

## ADR-187: Users — separate `Username` field added, distinct from Email, as the real login identifier

**Context**: `3-api/2-authentication.md` (already approved) currently documents "Email & Password" as
the login mechanism — a decision made before the Users module's own JIT documentation cycle started
and before anyone checked whether the legacy system's own `Username`/`Email` split should carry
forward. Legacy has both fields, distinct, with Username as the actual login identifier. When
`5-modules/users/` was first drafted, the module's own author defaulted to email-only (matching the
already-shipped bootstrap `users` table and the T-016 login screen, both email-only). Developer
reviewed this and asked for the separate Username field back.

**Decision**: A distinct `username` column is added to `users` — unique, required, the real login
identifier. `email` remains a separate, also-unique, also-required field (contact/notification use,
not login).

**Consequences**: **Supersedes `3-api/2-authentication.md`'s current "Email & Password" framing** —
that document needs a follow-up amendment (out of scope for this ADR/this module's own review pass)
to read "Username & Password." `5-modules/users/4-schema.md` adds `users.username` (unique). The
already-shipped bootstrap `users` table (ADR-185, email-only) and the T-016 login screen (built
mock-only, pre-Users-module) both need a follow-up migration/UI update when the real Users module is
implemented at M3 — not immediately, since T-016 is mock auth on a milestone that's already shipped,
but flagged here so it isn't lost. `5-modules/users/8-api.md`'s `LoginDto` uses `username`, not
`email`.

---

## ADR-188: Users — NotificationScheduler/WordTemplate are backend/API-only, no dedicated UI

**Context**: `6-implementation-plan/1-implementation-plan.md`'s per-module re-run for Users (task-list
traceability check, step 4a) found `NotificationScheduler` and `WordTemplate` have schema entities
(`5-modules/users/4-schema.md`) and a backend-work mention (`10-implementation-plan.md` Phase 9), but
**no endpoint in `8-api.md`'s API Summary and no screen in `9-ui.md`'s 22-screen inventory** — unlike
Mail Account, which has both. Not a stated scope-exclusion (unlike Sharing Rules, ADR-081, or payroll
export, ADR-078), so routed to the developer rather than silently built or dropped.

**Decision**: build minimal backend CRUD for both (per schema, as `10-implementation-plan.md` Phase 9
already names) with no dedicated UI screen in this MVP — API-only/admin-tool access. Matches what the
implementation plan actually scoped; no `8-api.md`/`9-ui.md` amendment needed since neither claimed
these features in the first place.

**Consequences**: `task-list.md` T-060 stays as drafted (Mail Account + NotificationScheduler +
WordTemplate backend, Mail Account only wired to a UI task, T-043). No UI task added for the other
two. If a UI is wanted later, it's a `12-maintenance/2-feature-request.md` addition, not part of this
module's MVP build.

---

## ADR-189: Sidebar — top-level nav items may expand into a submenu, generic mechanism

**Context**: `4-ui/1-navigation.md` §14 originally stated the sidebar is "flat and shallow ... no deep
nested menu trees." Developer discussed adding a submenu to the sidebar in an earlier session; that
discussion wasn't written down at the time (process miss — should have been captured immediately per
the confirm-then-write convention) and was lost. Re-raised this session: Users' sidebar entry should
expand to show its own sub-pages (starting with Create User) rather than link straight to the list.

**Decision**: `NavItem` (`frontend/src/config/nav-items.ts`) gains an optional `children: NavItem[]`.
An item with children renders as an expand/collapse control (chevron) instead of a direct link; its
children render indented below it. Parent shows active/highlighted state when the current route
matches any child. This is a generic, reusable mechanism — not special-cased to Users — but it is
only populated for modules whose UI has actually been JIT-designed and built. **Users is the only
module wired with real children today**: "All Users" (`/users`) and "Create User" (`/users/new`). The
other 9 top-level items stay single-link until their own module's UI-Design epic runs and decides
what (if anything) belongs as a child — no children are fabricated ahead of that per-module design
pass.

**Consequences**: `4-ui/1-navigation.md` §14's "no deep nested menu trees" line is superseded — replace
with a statement that shallow (one-level) expandable submenus are supported per-item, decided at that
module's own JIT UI-design step, not assumed globally. `Sidebar.tsx`/`SidebarDrawer.tsx` implement the
expand/collapse control and children rendering. Future modules' `9-ui.md` docs decide their own nav
children as part of their normal JIT cycle — this ADR only unlocks the mechanism and fixes Users.

---

## ADR-190: UOM — a Group becomes fully immutable and undeletable once referenced by any transaction

**Context**: UOM's field-extraction and 11-doc module set (`docs-kit/5-modules/uom/`) were already
drafted and reviewed/approved this session with no rule governing whether a UOM Group's definition
can change after products/orders already depend on it. Developer raised this gap directly: nothing in
the legacy blueprint, the field-extraction, or any prior ADR stops editing a Group's unit assignments
or conversion factors — or deleting it outright — after it's already in real use, which would silently
corrupt the meaning of every past transaction that referenced it.

**Decision**: Once a UOM Group is referenced by **any** transaction (a SalesOrder line, PurchaseOrder
line, receiving record, or any other transactional consumer — first reference is what triggers the
lock, not mere assignment to a Product), the Group becomes read-only and undeletable, with **one single
exception**: **Group Name** stays editable indefinitely, since every reference to a Group is by ID, not
by name, so renaming has no effect on already-recorded transactions. Locked once transaction-referenced:
Category, sort order, all eleven role-Type assignments, Base Type, conversion factors
(`UOMConversionFactor`), and picking-hierarchy rows. Delete is blocked outright, with no exception, once
referenced — this applies on top of, not instead of, UOM-RULE-014's existing in-use `RESTRICT` delete
guard (which already blocks Type/Category/Role deletion while referenced by a Group; this decision adds
the equivalent guard at the Group level itself, closing UOM-FX-OQ-006). If a business need arises for a
genuinely different conversion (e.g. a supplier repackages a unit), the intended path is creating a
**new** Group, not editing a locked one.

**Consequences**: `module-field-extraction/uom/business-rules.md` and `docs-kit/5-modules/uom/
3-business-rules.md` gain a new rule (next sequential ID after UOM-RULE-019) stating this lock
precisely, including the Name exception. `4-schema.md`/`6-validation.md` need a
transaction-reference check (e.g. an existence query against every consumer table's `uom_group_id`
foreign key) enforced at the API layer before allowing any locked-field write or a delete. `8-api.md`'s
Group update/delete endpoints must reflect the lock (a 409/422-class response when a locked field is
sent or delete is attempted against a used Group). `9-ui.md`'s Group Detail screen should visibly
disable locked fields (not just reject on submit) once a Group is in use, with an explanatory message
rather than a silent failure. `11-testing.md` needs a test case for: editing an unused Group (allowed,
all fields), editing a used Group's Name only (allowed), editing a used Group's any other field
(rejected), deleting a used Group (rejected). These already-approved UOM documents are amended in place
rather than treated as a new draft batch, since this is a targeted rule addition to a just-approved
module, not a full regeneration.

---

## ADR-191: UOM — Group Name uniqueness is case-insensitive, checked on both create and rename

**Context**: Legacy's Group-name uniqueness check (UOM-RULE-001) is a case-sensitive `SELECT COUNT`,
never confirmed as a deliberate business requirement rather than an implementation detail
(`open-questions.md` UOM-FX-OQ-008, Non-blocking). Since ADR-190 keeps Group Name editable
indefinitely — even on an otherwise-locked, transaction-referenced Group — the uniqueness check's
timing also needed pinning down explicitly, not just its case-sensitivity.

**Decision**: Group Name uniqueness is **case-insensitive** — "Test" and "test" are the same name,
the second is rejected as a duplicate. The check runs on **both** create and rename (every write to
Name, not just initial creation) — since Name stays editable per ADR-190, a rename must be checked
the same as a create to prevent a duplicate being introduced later.

**Consequences**: `module-field-extraction/uom/business-rules.md` and `docs-kit/5-modules/uom/
3-business-rules.md`'s UOM-RULE-001/BR-001 are amended to state case-insensitive comparison and
explicitly cover rename, not just create. `6-validation.md`'s corresponding validation rule is
updated the same way. `4-schema.md` should note the uniqueness constraint needs a case-insensitive
index/collation (e.g. a functional unique index on `lower(name)` per tenant), not a plain unique
constraint on the raw column. `11-testing.md` gains test cases for: create with a case-variant
duplicate (rejected), rename to a case-variant duplicate of another Group (rejected), rename a used
Group's Name to a case-variant duplicate (still rejected — the uniqueness check and the ADR-190 lock
are independent checks, both apply). `open-questions.md`'s UOM-FX-OQ-008 is resolved by this ADR.

---

## ADR-192: UOM — four remaining Non-blocking field-extraction questions resolved

**Context**: `module-field-extraction/uom/open-questions.md` carried four Non-blocking items forward
after ADR-190/191 closed the two Blocking ones. Developer resolved all four this session, one by
one. Bundled into a single ADR since all four were confirmed in the same round and are individually
small.

**Decision**:
1. **UOM-FX-OQ-001** — `UOMType` gains an **optional** `category_id` FK to `UOMCategory` (a Type may
   declare which Category it belongs to, e.g. "Feet" → "Length," but isn't required to). Not
   enforced as mandatory — closes the mismatch gap for Types that opt in, without forcing a value
   the legacy data/import path may not have.
2. **UOM-FX-OQ-004** — a Group's Functional Role with no Type assignment **falls back to the
   Group's Base Type** at resolution time, rather than blocking the operation. Applies wherever a
   consumer resolves "which Type fulfills role X for this Group" and finds no assignment.
3. **UOM-FX-OQ-005** — the "Uses Picking Hierarchy" indicator becomes a **computed/derived value**
   (true if picking-hierarchy rows exist for the Group, false otherwise) — not a stored, independently
   editable field. Removes the flag/row-presence inconsistency structurally, same reasoning pattern
   as ADR-190's approach to the conversion-factor gap.
4. **UOM-FX-OQ-007** — `UOMFunctionalRole` deletion is guarded by the same in-use `RESTRICT` pattern
   as `UOMType`/`UOMCategory` (UOM-RULE-014) — blocked while any `UOMRoleAssignment` row still
   references it.

**Consequences**: `module-field-extraction/uom/entities-and-fields.md` — `UOMType` gains
`category_id` (optional FK); `UOMGroup`'s "Picking Hierarchy (flag)" field is removed from the
persisted field list and re-documented as computed. `business-rules.md` gains/amends rules for the
Base-Type fallback (new rule), the computed picking-hierarchy indicator (amends whichever rule
currently documents that flag), and the `UOMFunctionalRole` delete guard (extends UOM-RULE-014,
formalizing what UOM-RULE-014's own scope note previously left as an unconfirmed extension). Same
propagation needed into `docs-kit/5-modules/uom/`'s `3-business-rules.md`, `4-schema.md` (drop the
flag column, add the optional `category_id` column, add the delete-guard FK), `6-validation.md`,
`8-api.md` (resolved-role responses should surface which Type actually governs a role, including
when it's a Base-Type fallback, not just the raw assignment), `9-ui.md` (Picking Hierarchy indicator
displays as read-only/derived, not an editable toggle), and `11-testing.md` (test cases for: Type
created with and without a Category; role resolution when a role's own assignment is missing;
picking-hierarchy indicator reflecting row add/remove without an explicit flag toggle; Role deletion
blocked while referenced). `open-questions.md`'s UOM-FX-OQ-001/004/005/007 are resolved by this ADR
— no Non-blocking items remain open for UOM's field-extraction pass.

---

## ADR-193: List-row actions use icon-only buttons with a tooltip, project-wide

**Context**: Users' list rows (`page.tsx`) and UOM's Group List (T-068, built this session) both
render row actions as plain text buttons ("Edit"/"Open", "Delete"), the same pattern by coincidence
rather than a documented standard. Developer asked, while reviewing UOM's Group List, whether to add
icons to its Open/Delete actions — flagged first that doing so only for UOM would diverge from
Users' already-built pattern. Developer's answer: make it consistent everywhere, icon-only with a
tooltip (not icon+label).

**Decision**: every list/table row's action buttons (edit/open, delete, and any future row action)
render as **icon-only buttons with a tooltip** naming the action — no visible text label on the
button itself. This is a project-wide UI convention, not a per-module choice: applies to Users
(retrofit) and UOM (already built, retrofit) now, and to every future module's list screens by
default going forward. A `Pencil`/`Eye` icon (whichever this project's icon set already uses for
edit-vs-view distinctions — check `4-ui/3-design-system.md`'s icon inventory) for Edit/Open, `Trash2`
for Delete, matching `lucide-react`'s icon set already in use elsewhere in the codebase (see
`Sidebar.tsx`'s `ChevronDown`/`ChevronLeft` usage, `nav-items.ts`'s icon imports). The tooltip must
carry the same text the old label did ("Edit", "Delete", "Open") so the action's meaning isn't lost
for a user who can't infer it from the icon alone — this is also a required accessibility affordance,
not just a visual nicety, so each icon button also needs an `aria-label` matching the tooltip text
(a tooltip alone doesn't satisfy screen-reader accessible-name requirements).

**Consequences**: `docs-kit/4-ui/4-component-standards.md` gains this as a documented row-action
convention (add a note under whatever section currently covers table/list row actions, or a new
subsection if none exists yet). `frontend/src/app/(dashboard)/users/page.tsx`'s `UserRow` component
and `frontend/src/app/(dashboard)/settings/uom/groups/page.tsx`'s row actions are both updated to the
icon-only + tooltip pattern. Any shared row-action component that emerges from this (rather than
each page hand-rolling its own icon buttons) should live under `frontend/src/components/shared/`, so
future modules reuse it instead of re-implementing the pattern per module — worth extracting now
that a second module needs the identical pattern, rather than waiting for a third repetition.

---

## ADR-194: Multi-section create/edit forms use a bordered card per section, project-wide

**Context**: UOM's Group Detail/Edit form (T-069, built this session) wraps each logical section
(Header, Role Assignments, Conversion Factors, Picking Hierarchy) in a bordered, card-background
`fieldset` — `border-border bg-card rounded-lg border p-6`. Developer noticed, comparing it side by
side with Users' own Create User form, that Users' equivalent sections (Header, Password, Role &
Group) use the same `<fieldset>`/`<legend>` structure but with no card/border styling — a plain flat
layout. This was never actually a documented standard either way; UOM's author simply made a good
choice Users' form (built earlier, before UOM existed) never had a reason to match.

**Decision**: every multi-section create/edit form's sections render as bordered cards —
`border-border bg-card rounded-lg border p-6` on each section's `fieldset` (or equivalent container),
matching UOM's already-built pattern exactly, project-wide going forward.

**Consequences**: `docs-kit/4-ui/4-component-standards.md` gains this as a documented form-section
convention (Form Components). `frontend/src/components/shared/users/UserForm.tsx`'s three sections
(Header, Password, Role & Group) are updated to the card style, retrofitting Users to match UOM
rather than the reverse. Every future module's multi-section form follows this by default.
