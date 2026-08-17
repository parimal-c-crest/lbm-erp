# Tech Stack Decision

> Fill this in only after Stage 2 module specs exist (at least for the highest-complexity/most
> representative modules) — the decision should react to real functional complexity, not be made
> in a vacuum right after Stage 1.

## Inputs Considered

Eighteen modules (the sixteen-module MVP plus two extracted capabilities, UOM and Account Statement)
already have complete functional specifications under `docs_from_blueprint/module/` — pre-dating this
docs-kit's own Stage 2 template, but covering the same ground (entities, business rules, workflows,
calculations, outputs, cross-module integrations, risks) module by module. Treated as the Stage 2 input
for this decision until those specs are re-copied into `2-module-spec-template/`-shaped folders.

What that input surfaced, aggregated across modules:
- **Calculation intensity is high and inconsistency-prone**: pricing/financial pipelines in
  SalesOrder, Products, MPLPricePlan, the three Pricebooklevel tiers, UOM, and Account Statement all
  have confirmed cases of the same figure computed differently by independent code paths (e.g. Account
  Statement's two finance-charge formulas disagreeing by ~30x, SalesHistory's four-writer
  `total_activity` divergence).
- **Workflow/state complexity is real but not exotic**: PurchaseOrder's three-field status machine is
  the most complex found; most modules have simple or no lifecycle.
- **Integration/async load is significant**: UOM alone is read directly by a dozen-plus other modules;
  Account Statement's batch/cron paths and delivery channels (email/fax/print) imply real background-
  job needs.
- **No confirmed real-time/streaming requirement** anywhere in the eighteen specs.
- **Security is the dominant non-functional driver** (`non-functional-requirements.md`, Stage 1): every
  module has at least one confirmed live SQL injection; Settings alone has ~47, plus plaintext
  credential storage. This shaped the backend/database choice more than any functional-complexity
  input did.
- **Multi-tenancy is a confirmed open gap**, not a settled assumption — UOM's tables carry no tenant
  column at all.

## Decision

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Next.js (React, TypeScript), standard server mode | No SEO/anonymous-page need (everything is behind login), so SSR isn't solving the problem it's usually chosen for — picked for routing/DX conventions over a plain SPA. Static export was considered and rejected: it would give up server-side data fetching and auth middleware for no benefit. Module folder structure mirrors the Stage 2 module boundaries 1:1, so growth to the remaining ~78 in-scope modules is additive. |
| Backend | Node.js + NestJS (TypeScript) | Chosen over plain Express specifically because the legacy system's core failure mode was inconsistent, convention-only security practice — NestJS's enforced structure (Modules, Guards, ValidationPipes) prevents that class of drift structurally instead of relying on every developer remembering. Same language as the frontend — shared types/validation schemas, no team split across ecosystems. |
| Database | PostgreSQL | Every module's proposed normalized schema (Stage 2 input, above) assumes `CHECK` constraints, composite/partial unique constraints, and row-level security that the legacy MySQL-based system never had — Postgres is what makes that schema work enforceable at the database level instead of application-code convention. |
| API Style | REST, designed API-first — the API is a standalone product, not a backend-for-frontend | **The Next.js frontend is one consumer among several, not a privileged special case.** Third parties (and internal system-to-system integrations) must be able to create/read/update the same resources the frontend does — a Sales Order, a Purchase Order, etc — through the identical public API surface, the same way the legacy system's Fuse5Connect integration already creates/updates Products through the standard save path rather than a side channel. Every endpoint is designed, documented (OpenAPI/Swagger, native to NestJS via decorators), and versioned (`/api/v1/...`) as if an external consumer is reading it, because one will be. No confirmed need for GraphQL's query flexibility for this use case — REST's per-resource shape (`POST /sales-orders`, `POST /purchase-orders`) maps directly onto the Stage 2 module boundaries and is the more standard integration contract for third-party partners to build against. |
| Auth | Two supported methods on the same API, not two APIs: JWT (access + refresh) for logged-in users (staff, B2B portal), API keys (hashed at rest, scoped, rate-limited) for third-party/system-to-system access | Both authenticate against the same endpoints — creating a Sales Order via a user's JWT or via a partner's API key hits the same controller, the same Guards, the same validation, the same RLS-scoped tenant context. This is what "the frontend doesn't get special treatment" actually requires structurally: if the frontend had its own private internal API and third parties got a different, separate one, the two would drift the way the legacy system's own duplicated logic keeps drifting. API keys replace the legacy's plaintext "External API Credentials"/"F5 API Keys" fields (Settings module, confirmed stored with zero escaping) with hashed storage, per-key scope (which resources/actions a given partner can touch), and rate limiting — none of which the legacy mechanism has today. |
| Cache/Queue | Redis + BullMQ | Replaces the legacy system's pile of standalone cron PHP scripts (`BillingCycleCron.php`, `accountPastDueCron.php`, and similar) with one structured, in-application job-scheduling mechanism. Doubles as the cache layer if/when one's needed — no separate technology introduced for that. |
| Hosting | *(deferred — see below)* | |

## API design principle: independent, not frontend-coupled

Stated explicitly because it changes how the backend gets built, not just how it's described:

- **One API surface, every consumer.** The Next.js frontend calls the same public endpoints a
  third-party integration or an internal script would. There is no separate internal-only API the
  frontend gets privileged access to — that would just recreate, at the API layer, the same
  divergence-between-paths problem already found repeatedly in the legacy system (Account Statement's
  two disagreeing finance-charge calculations, SalesHistory's four disagreeing writers). One path, one
  set of validation rules, one place a bug gets fixed.
- **Every module's API is a first-class resource, not an afterthought.** SalesOrder, PurchaseOrder,
  and the rest each expose create/read/update endpoints a partner can integrate against directly —
  this was already implicitly true of the legacy system (Fuse5Connect creates Products through the
  standard save path; the B2B storefront's REST sync pushes/pulls Account data), the rewrite makes it
  explicit and consistent module by module instead of one bespoke integration at a time.
- **Versioned and documented as a product.** `/api/v1/...` from day one, with OpenAPI/Swagger docs
  generated from the same NestJS decorators that define validation — a third party shouldn't need to
  read backend source to integrate.
- **Rate limiting and per-key scope are first-class**, not bolted on — a partner's API key can be
  restricted to exactly the resources/actions they need, closing the class of gap the legacy system's
  unscoped, plaintext credentials leave wide open.

## Explicitly Deferred Decisions

- **Hosting/cloud provider.** No infrastructure-ownership decision exists yet in any project record.
  Decide once whoever owns infrastructure/ops is identified (a gap already flagged in
  `stakeholders.md`) — the rest of this stack (plain Node processes, managed or self-hosted Postgres
  and Redis, no Docker) runs on any mainstream host, so this isn't a blocking dependency for the other
  rows.
- **ORM (Prisma vs. TypeORM)** — resolved separately to **Prisma** during stack discussion (see
  `1-business-requirements/tech-stack.md` for the detailed writeup); not re-litigated in this table
  since it's an implementation detail under the "Backend"/"Database" rows above, not a peer-level stack
  layer in this template's own shape.
- **Multi-tenancy model (RLS vs. schema-per-tenant vs. database-per-tenant)** — resolved separately to
  **row-level security on a single shared schema**, same cross-reference as above. Chosen specifically
  to close UOM's confirmed tenant-scoping gap; not re-litigated here.

## Constraint: does not leak backward

Confirmed clean as of this decision: none of the eighteen existing module specifications under
`docs_from_blueprint/module/` reference Next.js, NestJS, Postgres, Prisma, JWT, or any other
stack-specific term — every one of them is written in tech-agnostic language (logical types, not SQL
types; "domain invariant" / "application service," not framework constructs). No edits to any Stage 2
document were needed as a result of this decision, which is the intended signal that Stage 2's
neutrality held.
