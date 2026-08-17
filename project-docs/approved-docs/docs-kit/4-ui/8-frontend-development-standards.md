# Frontend Development Standards

> **Purpose**
>
> This document defines the coding standards, architecture, development practices, and
> implementation guidelines for the LBM ERP Rewrite's frontend application. It ensures that all
> frontend code is consistent, maintainable, scalable, performant, secure, and aligned with the
> project's architecture and UI standards.

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| Frontend Framework | Next.js (App Router) |
| Language | TypeScript |
| Build Tool | Next.js built-in (Turbopack/webpack per Next.js version default) |
| Version | 1.0 |
| Status | Draft |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |

---

# 1. Executive Summary

Frontend code follows the locked stack: Next.js (React, TypeScript) + Tailwind CSS + shadcn/ui
(ADR-025), Zustand + TanStack Query for state (ADR-026), `react-hook-form` + `zod` for forms
(ADR-174). These choices already dictate most of this document's structure — this is a
framework-specific implementation reference, not a generic template, since the frontend framework
is already locked (unlike `4-ui/3-design-system.md`'s more abstract token layer).

- **Development philosophy**: Server Components by default (Next.js App Router), Client Components
  only where interactivity genuinely requires it — minimizes shipped JavaScript.
- **Code quality goals**: full TypeScript type coverage, shared `zod` schema between frontend
  validation and backend DTOs (ADR-174), no `any` without an explicit justification comment.
- **Maintainability**: one component library (`4-ui/4-component-standards.md`), one token source
  (`4-ui/3-design-system.md`), enforced via linting (§ additions below).
- **Scalability**: route-based code splitting per module (Next.js App Router default), Zustand
  stores scoped per-domain rather than one global store.
- **Performance**: Server Components, `next/image`, `next/font`, code splitting (§15).
- **Accessibility**: shadcn/ui (Radix UI) primitives by default (`4-ui/7-accessibility.md`).

---

# 2. Objectives

Frontend development:

- Maintains consistent code quality via TypeScript strict mode + linting (§ additions).
- Encourages reusable components — `4-ui/4-component-standards.md` catalog first, always.
- Improves maintainability — one state-management pattern (§7), one API-integration pattern (§9).
- Reduces technical debt — no ad hoc styling/state solutions outside the locked stack.
- Supports responsive design per `4-ui/6-responsive-design.md`.
- Improves performance via Next.js's built-in optimizations (§15).
- Follows `4-ui/7-accessibility.md` as a non-negotiable requirement, not a checklist item.

---

# 3. Development Principles

- **SOLID Principles** — applied pragmatically to component/hook design, not dogmatically to a UI
  codebase where React's own composition model already covers much of this.
- **DRY** — shared logic lives in `hooks/`/`lib/`, never copy-pasted across module pages.
- **KISS** — no premature abstraction; three similar lines beats a speculative shared helper used
  once.
- **Separation of Concerns** — presentation (components) vs. data-fetching (TanStack Query hooks)
  vs. client state (Zustand stores) vs. validation (`zod` schemas) each stay in their own layer.
- **Composition over Inheritance** — React components compose; no class-based inheritance
  hierarchies.
- **Single Responsibility** — a component renders; a hook fetches/derives; a store holds client
  state. Never blended.
- **Progressive Enhancement**: not a primary concern given the JWT session-authenticated, JS-required
  nature of an internal ERP (`4-ui/6-responsive-design.md` §18) — the app is not expected to
  function meaningfully with JavaScript disabled `[Assumption: this document]`.

---

# 4. Project Structure

Next.js App Router convention, adapted for this project's module set:

```text
src/
│
├── app/                    # App Router routes (file-based routing, §8)
│   ├── (auth)/             # Login, password reset — public route group
│   ├── (dashboard)/        # Authenticated shell — sidebar/topbar layout wraps everything below
│   │   ├── dashboard/
│   │   ├── sales-orders/
│   │   ├── accounts/
│   │   ├── products/
│   │   ├── purchase-orders/
│   │   ├── vendors/
│   │   ├── locations/
│   │   ├── pricing/
│   │   ├── users/
│   │   └── settings/
│   └── layout.tsx          # Root layout (fonts via next/font, providers)
│
├── components/
│   ├── ui/                 # shadcn/ui primitives (generated via shadcn CLI, per-component files)
│   └── shared/              # Composed, project-specific reusable components (KpiCard, DataTable, etc. — `4-ui/4-component-standards.md`)
│
├── hooks/                  # TanStack Query hooks (useSalesOrders, useAccount, etc.) + other reusable hooks
├── stores/                 # Zustand stores (client-only state — e.g. sidebar collapse state, active branch selection)
├── lib/                    # API client setup, utility functions, `zod` schemas shared with hooks/forms
├── types/                  # Shared TypeScript types (mirrors backend DTO shapes where applicable)
├── config/                  # App-wide constants (route table, role-to-menu map from `4-ui/1-navigation.md` §10)
├── styles/                  # Tailwind config, global CSS (design tokens from `4-ui/3-design-system.md` §4)
└── tests/                   # Test files (or co-located `*.test.tsx`, per §18 convention decision)
```

Directory responsibilities:

- `app/` — routes only; a route file (`page.tsx`) composes components, it doesn't contain business
  logic.
- `components/ui/` — unmodified-behavior shadcn/ui primitives; visual customization happens via
  Tailwind config/CSS variables (§11), not by editing primitive logic.
- `components/shared/` — this project's own composed components, cataloged in
  `4-ui/4-component-standards.md`.
- `hooks/` — all server-state access goes through a TanStack Query hook here; components never call
  `fetch`/the API client directly (§9).
- `stores/` — Zustand, client-only state per ADR-026 — never used for data that TanStack Query
  already owns (§7).
- `lib/` — includes the `zod` schemas shared between `react-hook-form` (client) and mirrored
  against backend DTO shape (ADR-174).

---

# 5. File Naming Standards

```
KpiCard.tsx
SalesOrderTable.tsx
useSalesOrders.ts
salesOrder.schema.ts
salesOrderStore.ts
```

Rules

- PascalCase for components (`4-ui/4-component-standards.md` §5).
- camelCase for variables/functions/hooks (`useSalesOrders`, not `UseSalesOrders`).
- kebab-case for route folders (`sales-orders/`, matching `4-ui/1-navigation.md` §9 URL convention).
- Meaningful, domain-specific file names — no `utils2.ts`/`helper.ts` catch-alls.
- One component per file, file name matches the exported component/hook name exactly.

---

# 6. Component Development Standards

Components:

- Are reusable — sourced from `4-ui/4-component-standards.md`'s catalog before a new one is built.
- Are stateless/presentational where possible — a `components/shared/` component receives data via
  props; the page/route composes it with a `hooks/` TanStack Query hook.
- Accept configurable, typed props (TypeScript interfaces, not `any`).
- Emit events via callback props (`onSubmit`, `onSelect`) rather than tightly coupling to a specific
  parent's state shape.
- Follow `4-ui/4-component-standards.md` exactly for states, accessibility, and theming.
- Avoid business logic — validation rules and business calculations live in `lib/`/`zod` schemas,
  not inline in JSX.

---

# 7. State Management

Per ADR-026 (Zustand + TanStack Query):

- **Server state** (anything that originates from the API — Sales Orders, Products, Accounts, etc.)
  — always TanStack Query. Never duplicated into a Zustand store or `useState`; TanStack Query's
  cache is the single source of truth, with its own stale-time/refetch policy per data type (e.g.
  Location list cached longer than live stock counts, matching `4-ui/5-form-standards.md` §19's
  distinction).
- **Client state** (state that has no server counterpart) — Zustand. Examples: sidebar collapsed
  state (`4-ui/1-navigation.md` §14), active branch/location selection (persisted, per
  `4-ui/1-navigation.md` §14), multi-step wizard's current-step index and unsaved draft fields
  before the "Save Draft" API call actually fires (`4-ui/2-user-flows.md` §13).
- **Local state** (`useState`/`useReducer`) — component-scoped UI state with no cross-component
  reach (e.g. a dropdown's open/closed state) — doesn't need a Zustand store.
- **Shared state** — anything more than one component needs; promoted to Zustand only once genuinely
  shared, never speculatively.
- **Persistent state** — Zustand's `persist` middleware (local storage) for sidebar collapse state
  and last-used branch (`4-ui/1-navigation.md` §14) — nothing sensitive is persisted client-side.
- **Session state** — the JWT access/refresh token pair, handled by the API client layer (§9), not a
  Zustand store — token storage follows `3-api/2-authentication.md`'s own security guidance, not a
  general-purpose state pattern.

Guidelines

- Keep state minimal — derive, don't duplicate (e.g. a filtered list is computed from the TanStack
  Query cache + a local filter value, not stored as its own separate state).
- Avoid duplicated state — server data never gets copied into a Zustand store "for convenience."
- Use Zustand stores only when state is genuinely global/cross-route — most state stays local or in
  TanStack Query.

---

# 8. Routing Standards

Next.js App Router, file-based, matching `4-ui/1-navigation.md` §9's URL convention exactly:

```
/dashboard                    → app/(dashboard)/dashboard/page.tsx
/sales-orders                 → app/(dashboard)/sales-orders/page.tsx
/sales-orders/create          → app/(dashboard)/sales-orders/create/page.tsx
/sales-orders/[id]            → app/(dashboard)/sales-orders/[id]/page.tsx
/sales-orders/[id]/edit       → app/(dashboard)/sales-orders/[id]/edit/page.tsx
```

Guidelines

- Lazy-loaded routes — Next.js App Router code-splits per route automatically; no manual
  `React.lazy` needed for top-level routes.
- Route guards — a `middleware.ts`-level auth check redirects unauthenticated requests to `/login`;
  role-based route guards additionally check the requesting user's role against
  `4-ui/1-navigation.md` §10's menu-permission matrix before rendering a route's content (UI
  convenience layer — the real boundary is still the API's server-side Guard, per
  `4-ui/1-navigation.md` §19).
- Role-based routing — a route a user's role can't access renders the 403 pattern from
  `4-ui/2-user-flows.md` §11, not a silent redirect that hides why.
- Breadcrumb support — breadcrumb segments derive from the route segment tree
  (`4-ui/1-navigation.md` §8), not hand-maintained per page.

---

# 9. API Integration Standards

Frontend:

- Uses centralized API service functions in `lib/api/` — one function per backend endpoint/resource,
  never an inline `fetch` call inside a component or hook body.
- Handles errors consistently — a shared API-error-normalization layer maps backend error responses
  (`3-api/6-error-handling.md`) to the toast/inline-error patterns in `4-ui/2-user-flows.md` §11/§12.
- Supports request cancellation — TanStack Query's built-in `AbortSignal` propagation (query
  cancellation on unmount/param change), no manual cancellation-token plumbing needed.
- Uses interceptors — a shared fetch wrapper attaches the JWT access token to every request and
  handles the refresh-token flow transparently on a 401, per `3-api/2-authentication.md`.
- Follows `3-api/2-authentication.md` for token handling.
- Follows `3-api/5-response-standards.md` for parsing the API's standard response envelope.

---

# 10. Form Development Standards

Forms (full standards `4-ui/5-form-standards.md`):

- Reuse `components/ui/`/`components/shared/` form components — no bespoke input markup.
- Validate client-side via `react-hook-form` + `zod` (ADR-174) — the same `zod` schema (defined once
  in `lib/schemas/`) drives both the form's validation and its TypeScript types, avoiding schema/type
  drift.
- Display inline errors per `4-ui/5-form-standards.md` §11.
- Follow `4-ui/5-form-standards.md` for layout, field standards, and button-order conventions.
- Never duplicate validation logic — a business rule expressed in the `zod` schema is not
  re-implemented ad hoc inside a component's `onChange` handler.

---

# 11. Styling Standards

Use

- Design Tokens (`4-ui/3-design-system.md` §4) — wired into `tailwind.config.ts` and shadcn/ui's
  CSS-variable theme layer.
- CSS Variables — shadcn/ui's standard `--primary`/`--secondary`/etc. pattern, enabling the ADR-064
  tenant-theme swap (`4-ui/4-component-standards.md` §12) without touching component code.
- Utility classes — Tailwind CSS throughout; utility-class ordering enforced by a Prettier
  Tailwind-class-sorting plugin (§ additions below), not manual discipline.
- No scoped/CSS-Modules styles — Tailwind utilities cover this project's styling needs; a
  CSS-Modules layer would be a second, redundant styling system.

Avoid

- Inline styles (`style={{ }}`) — Tailwind utility classes only, except for genuinely dynamic values
  Tailwind can't express statically (e.g. a computed chart-bar height percentage), which use inline
  `style` narrowly and only for that one dynamic property.
- Hardcoded colors — every color traces to a `4-ui/3-design-system.md` §4 token/CSS variable.
- Duplicate CSS — shared visual patterns become a `components/shared/` component, not copy-pasted
  className strings.

---

# 12. Responsive Development

Every page supports Desktop, Tablet, and Mobile per `4-ui/6-responsive-design.md` — implemented via
Tailwind's responsive utility prefixes (`sm:`/`md:`/`lg:`/`xl:`/`2xl:`, matching
`4-ui/6-responsive-design.md` §5's breakpoint scale exactly, since that document adopted Tailwind's
own defaults specifically to avoid a translation layer here).

---

# 13. Accessibility

Frontend complies with `4-ui/7-accessibility.md` in full:

- Keyboard navigation — inherited from shadcn/ui (Radix UI) primitives by default; custom
  interactive elements must match that same standard explicitly.
- Screen readers — semantic HTML first (§18 of `4-ui/7-accessibility.md`), ARIA only where needed.
- Focus management — Radix UI's built-in focus-trap/return behavior preserved, never overridden.
- Color contrast — enforced by construction (tokens are pre-verified against WCAG AA,
  `4-ui/3-design-system.md` §13) — a developer using the token set correctly can't introduce a
  contrast violation by accident.

---

# 14. Error Handling

Frontend handles:

- **Validation errors** — `react-hook-form`/`zod` inline errors (`4-ui/5-form-standards.md` §11).
- **API errors** — normalized via the shared error-mapping layer (§9), surfaced as toast/inline per
  `4-ui/2-user-flows.md` §11.
- **Network failures** — TanStack Query's built-in retry (with backoff) for transient failures;
  a persistent failure surfaces the "Couldn't load [resource] — retry" pattern
  (`4-ui/3-design-system.md` §8).
- **Authorization failures** — 401 triggers the session-expired flow
  (`4-ui/2-user-flows.md` §5); 403 triggers the access-denied flow (`4-ui/2-user-flows.md` §11).
- **Unexpected exceptions** — a route-level React Error Boundary (Next.js `error.tsx` convention)
  catches render-time exceptions and shows the "Show Friendly Message... Retry" pattern
  (`4-ui/2-user-flows.md` §11), never a raw stack trace to the user.

All error messages shown to users are friendly and actionable, never a raw error code/stack trace
(`4-ui/3-design-system.md` §8, `4-ui/5-form-standards.md` §11).

---

# 15. Performance Standards

Optimize via:

- **Code splitting** — automatic per-route via Next.js App Router (§8); heavy, rarely-used
  components (e.g. a chart library) additionally `dynamic()`-imported where they're not needed on
  first paint.
- **Lazy loading** — images (`next/image` default), below-the-fold dashboard widgets
  (`4-ui/2-user-flows.md` §17).
- **Tree shaking** — lucide-react's per-icon imports (`4-ui/3-design-system.md` §7) and Next.js's
  build-time tree-shaking keep bundles minimal.
- **Asset optimization** — Next.js Image Optimization (§13 of `4-ui/6-responsive-design.md`),
  `next/font` self-hosted fonts (no external Google Fonts round-trip, correcting the reviewed
  mockup's raw `<link>` approach per ADR-177).
- **Image optimization** — see above.
- **Virtual scrolling** — for any table/list exceeding ~200 rows (`4-ui/4-component-standards.md`
  §13), e.g. the Products list.
- **Memoization** — `React.memo`/`useMemo`/`useCallback` applied where a profiling need is actually
  shown (e.g. a large table's row components), not preemptively on every component.

---

# 16. Security Guidelines

Frontend:

- Sanitizes user input before display — React's default JSX escaping covers this for all standard
  rendering; no `dangerouslySetInnerHTML` without an explicit, reviewed sanitization step.
- Escapes HTML by default (React's JSX behavior) — never bypassed casually.
- Prevents XSS — per above, plus never constructing URLs/attributes from unsanitized user input
  (e.g. no user-controlled `href`/`src` without validation).
- Never exposes secrets — no API keys/credentials in client-side code or `NEXT_PUBLIC_*` env vars
  unless genuinely meant to be public; server-only secrets stay in server-side env vars/Route
  Handlers, never bundled to the client.
- Protects tokens — JWT access token held in memory (not `localStorage`, to reduce XSS-exfiltration
  risk); refresh token handling follows `3-api/2-authentication.md`'s own locked mechanism.
- Validates uploaded files client-side (type/size, `4-ui/5-form-standards.md` §18) as a convenience
  check — server-side validation remains authoritative.
- Uses HTTPS exclusively in every environment beyond local development.

---

# 17. Logging & Monitoring

Log:

- Client errors — captured via the Error Boundary (§14) and reported to an error-monitoring service.
- API failures — logged with enough context (endpoint, status, correlation ID if the API provides
  one) to cross-reference against backend logs, without logging sensitive request/response bodies.
- Performance metrics — Web Vitals (Next.js has built-in reporting hooks) tracked for the key pages
  identified in `4-ui/7-accessibility.md` §16 (Dashboard, a representative List, a representative
  Create form).

Monitoring tool integration: not yet confirmed by any SoT source. *Forward reference, not a gap in
this document* — deferred to `6-development/` (deployment/observability tooling decisions) rather
than decided here as a UI-layer concern.

---

# 18. Testing Standards

Frontend testing includes:

- **Unit Tests** — pure functions, `zod` schemas, utility logic.
- **Component Tests** — React Testing Library, testing behavior via rendered output/user interaction,
  not implementation detail.
- **Integration Tests** — a page composed with its real hooks against a mocked API layer (e.g. MSW).
- **End-to-End Tests** — critical flows from `4-ui/2-user-flows.md` (login, Sales Order creation,
  Purchase Order receiving) — exact E2E tool (Playwright/Cypress) not yet confirmed by any SoT
  source. *Forward reference, not a gap in this document* — deferred to `6-development/`.
- **Accessibility Tests** — `axe-core` integration per `4-ui/7-accessibility.md` §16.
- **Visual Regression Tests** — tooling not yet confirmed, consistent with the same item in
  `4-ui/4-component-standards.md` §15 and `4-ui/6-responsive-design.md` §19 — forward reference,
  deferred to `6-development/`.

Test file convention: co-located `*.test.tsx` next to the component/hook under test, rather than a
fully separate `tests/` mirror tree — keeps a component and its tests moving together during
refactors `[Assumption: this document]`.

---

# 19. Code Review Checklist

Verify

- Naming conventions (§5).
- Component reuse — no duplicate of an existing `4-ui/4-component-standards.md` component.
- Responsive design verified at all three breakpoints (§12).
- Accessibility verified (§13, `4-ui/7-accessibility.md` §17).
- API integration follows the centralized service pattern (§9).
- Error handling covers all applicable cases in §14.
- Performance — no obvious re-render/bundle-size regression (§15).
- Security — no exposed secrets, no unsanitized `dangerouslySetInnerHTML` (§16).
- Tests included per the applicable categories in §18.
- Documentation — component doc comments per `4-ui/4-component-standards.md` §14.

---

# 20. Build & Deployment

- **Build commands**: `next build` (production), `next dev` (local development) — standard Next.js
  CLI, no custom build pipeline needed beyond what Next.js provides.
- **Environment variables**: `NEXT_PUBLIC_*` prefix for anything genuinely needed client-side (e.g.
  the public API base URL); all other configuration (secrets, server-only values) stays unprefixed
  and server-only, per §16.
- **Production build**: Next.js's standard optimized production build (minification, tree-shaking,
  automatic code splitting).
- **Source maps**: enabled for error-monitoring correlation (§17) in production, uploaded to the
  monitoring service rather than served publicly.
- **Asset optimization**: handled by Next.js build pipeline (Image Optimization, font
  self-hosting via `next/font`, CSS purging via Tailwind's build-time JIT compiler).
- **CI/CD integration**: exact pipeline (GitHub Actions/other) not yet confirmed by any SoT source.
  *Forward reference, not a gap in this document* — deferred to `6-development/9-ci-cd.md`'s own
  generation, not decided here.

---

# 21. Best Practices

- Keep components small and reusable (§6).
- Prefer composition over inheritance (§3).
- Separate UI (`components/`) from business/data logic (`hooks/`, `lib/`) — a component never
  fetches its own data directly.
- Reuse existing utilities in `lib/` before writing a new one.
- Avoid unnecessary dependencies — the locked stack (ADR-025/026/174) already covers styling, state,
  forms, dates, PDF, and CSV; a new module doesn't introduce a competing library for something
  already decided project-wide.
- Optimize bundle size (§15).
- Document reusable code per `4-ui/4-component-standards.md` §14.
- Keep code readable and maintainable — TypeScript strict mode, no `any` without justification, ESLint
  + Prettier enforced (configuration deferred to `6-development/3-coding-standards.md`'s own
  generation, cross-referenced here rather than duplicated).

---

# 22. Assumptions

- Progressive enhancement (working without JavaScript) is out of scope — an internal, JWT-
  session-authenticated ERP doesn't need to function without JS
  `[Assumption: this document]`.
- Co-located `*.test.tsx` test files, not a separate mirrored `tests/` tree
  `[Assumption: this document]`.
- Exact E2E testing tool, visual-regression tooling, error-monitoring service, and CI/CD pipeline are
  all deferred to `6-development/`'s own generation rather than decided in this UI-scoped document
  (four forward references, not gaps in this document — all deferred to the same downstream category
  rather than guessed here).

---

# 23. Constraints

- Follow `4-ui/3-design-system.md` for every visual value.
- Reuse approved components from `4-ui/4-component-standards.md` — no duplicate implementations.
- Responsive design required at every breakpoint (`4-ui/6-responsive-design.md`).
- Accessibility compliance mandatory (`4-ui/7-accessibility.md`).
- Type safety required — TypeScript strict mode across the entire frontend codebase, no exceptions
  carved out per module.

---

# 24. Related Documents

- `1-project/4-tech-stack.md`
- `4-ui/3-design-system.md`
- `4-ui/4-component-standards.md`
- `4-ui/5-form-standards.md`
- `4-ui/6-responsive-design.md`
- `4-ui/7-accessibility.md`
- `3-api/1-api-design.md`
- `3-api/2-authentication.md`
- `3-api/5-response-standards.md`
- `3-api/6-error-handling.md`
- `6-development/3-coding-standards.md` (once generated — early wave)
- `6-development/9-ci-cd.md` (once generated — early wave)
- `decisions-log.md` (ADR-025, ADR-026, ADR-064, ADR-174, ADR-177)

---

# 25. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-17 | Claude Code (docs-kit generation) | Initial Draft |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Frontend Lead | | Pending | |
| Solution Architect | | Pending | |
| Technical Lead | | Pending | |

---

# AI Generation Notes

- Follows `1-project/4-tech-stack.md` and every prior `4-ui/` document in this batch exactly.
- Recommends scalable, maintainable, reusable frontend practices built specifically on the locked
  Next.js/Tailwind/shadcn/Zustand/TanStack Query/react-hook-form+zod stack (ADR-025/026/174) —
  framework-specific by design, since that framework choice is already locked project-wide.
- Keeps business logic (`hooks/`, `lib/`) separate from presentation (`components/`) throughout.
- Enforces consistent project structure (§4), naming (§5), API integration (§9), state management
  (§7), and error handling (§14).
- Optimizes for performance (§15), accessibility (§13), responsiveness (§12), and security (§16).
- Consistent with `4-ui/4-component-standards.md`, `4-ui/5-form-standards.md`,
  `4-ui/6-responsive-design.md`, `4-ui/7-accessibility.md`, and the `3-api/` category.
- Four genuinely undecided items (E2E tool, visual-regression tool, monitoring service, CI/CD
  pipeline) are explicitly deferred to `6-development/`'s own generation rather than guessed here,
  since they're that category's decisions to make, not this UI-scoped document's.
