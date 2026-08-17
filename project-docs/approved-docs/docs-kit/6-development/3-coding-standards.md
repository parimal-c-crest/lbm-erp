# Coding Standards

> **Purpose**
>
> This document defines the coding standards, programming conventions, best practices, and quality
> requirements that all developers and AI coding assistants must follow throughout the LBM ERP
> Rewrite. It ensures the codebase remains consistent, readable, maintainable, secure, scalable, and
> easy to review.

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| Primary Languages | TypeScript |
| Frameworks | NestJS (backend), Next.js/React (frontend) |
| Coding Standard | ESLint + Prettier, TypeScript strict mode [ADR-019] |
| Version | 1.0 |
| Status | Draft |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |

---

# 1. Executive Summary

One language (TypeScript), two frameworks (NestJS/Next.js), one enforced formatting/linting
toolchain (ESLint + Prettier, ADR-019) across both. This project's founding motivation is explicit:
the legacy vtiger-based system's "core failure mode — inconsistent, convention-only security
practice" (`1-project/4-tech-stack.md` §2) is why NestJS's enforced structure was chosen at all.
Coding standards here exist to keep that same discipline at the code-review level, not just the
framework level.

- **Coding philosophy**: structure enforced by the framework first (NestJS Modules/Guards/
  ValidationPipes), convention enforced by tooling second (ESLint/Prettier/`tsc`), human judgment
  third — in that order of reliability.
- **Maintainability goals**: one module, one folder, one clear owner (`6-development/2-folder-
  structure.md` §5/§6/§15) — no God Classes/God Files spanning module boundaries.
- **Readability**: TypeScript strict mode, meaningful names (§5), minimal comments explaining WHY
  not WHAT (§7).
- **Consistency**: identical formatting/linting rules across both apps (§6, §18).
- **Security**: server-side validation is the real gate everywhere (§12,
  `4-ui/1-navigation.md` §19) — client-side/UI convenience checks never substitute for it.
- **Performance**: measure before optimizing (§22) — this is an internal ERP with a known, bounded
  user base, not a hyperscale consumer app; premature optimization is a real cost here.

---

# 2. Objectives

Coding standards:

- Improve code readability — consistent naming (§5) and formatting (§6) across every file.
- Reduce technical debt — no ad hoc pattern introduced outside what's documented here and in
  `6-development/2-folder-structure.md`.
- Encourage consistency — one style, enforced by tooling (§18), not developer memory.
- Simplify code reviews — the review checklist (§17) is the same checklist for every PR, backend or
  frontend.
- Support AI-generated code — this document (and §19) is written to be as followable by an AI
  coding assistant as by a human developer, since both write code in this project.
- Improve maintainability and reduce bugs — TypeScript strict mode (§ below), server-side validation
  (§12), and the layered architecture (`6-development/2-folder-structure.md` §14) catch entire
  classes of bugs structurally.

---

# 3. General Coding Principles

- **SOLID Principles** — applied pragmatically; NestJS's own DI-based architecture already enforces
  much of this (Single Responsibility per Service, Dependency Inversion via constructor injection).
- **DRY** — shared logic lives in `common/`(backend)/`lib`+`components/shared`(frontend) per
  `6-development/2-folder-structure.md` §8, never copy-pasted across modules.
- **KISS** — no premature abstraction (`CLAUDE.md`'s own project-wide instruction: "don't add
  features, refactor, or introduce abstractions beyond what the task requires").
- **YAGNI** — a module implements what its own `5-modules/<slug>/` documentation specifies, not
  speculative future requirements.
- **Separation of Concerns** — Controller/Service/Repository (backend), Component/Hook/Store (
  frontend) — per `6-development/2-folder-structure.md` §14.
- **Composition over Inheritance** — NestJS/React both favor composition (Module imports, component
  composition) over class inheritance hierarchies; this project follows that grain rather than
  fighting it.
- **Fail Fast** — invalid input rejected at the Guard/ValidationPipe boundary (backend) or
  `zod` schema (frontend) immediately, never silently coerced or ignored.
- **Principle of Least Surprise** — a function/component does what its name says and nothing more
  (§8 hidden-side-effect avoidance).

---

# 4. Code Organization

- Small, focused files — one Controller/Service/Component per file
  (`6-development/2-folder-structure.md` §5/§6/§15).
- One responsibility per file — a Service method does one business operation; a Component renders
  one concern.
- Logical folder structure — per `6-development/2-folder-structure.md`, not improvised per module.
- Avoid deep nesting — 2-3 levels beyond a module's root at most
  (`6-development/2-folder-structure.md` §3).
- Feature-based organization — module-boundary-first everywhere (§3 above,
  `6-development/2-folder-structure.md` §3).

---

# 5. Naming Conventions

## Variables

Meaningful names, no unexplained abbreviations, no single-character names except loop counters.

```ts
customerName
orderTotal
productList
```

## Constants

`SCREAMING_SNAKE_CASE`, module-scoped or in a shared `constants` file where genuinely cross-module.

```ts
MAX_LOGIN_ATTEMPTS
DEFAULT_PAGE_SIZE
```

## Functions

Verb-first, one responsibility, descriptive.

```ts
calculateTotal()
sendVerificationEmail()
generateInvoice()
```

## Classes (backend: Services, Controllers, Guards, Pipes)

PascalCase, suffixed by role.

```ts
SalesOrdersService
ProductsController
JwtAuthGuard
```

## Interfaces / Types

PascalCase, no `I`-prefix convention (modern TypeScript style — the prefix adds no information a
type checker doesn't already provide).

```ts
PaymentGateway
NotificationPayload
```

## Files

Backend: kebab-case, NestJS's own suffix convention.

```
sales-orders.service.ts
sales-orders.controller.ts
create-sales-order.dto.ts
```

Frontend: PascalCase for components (already locked,
`4-ui/8-frontend-development-standards.md` §5), camelCase for hooks/utilities.

```
KpiCard.tsx
useSalesOrders.ts
salesOrder.schema.ts
```

---

# 6. Formatting Standards

Enforced entirely via Prettier (no manual formatting debate) — configuration in
`6-development/1-development-environment.md` §14:

- **Indentation**: 2 spaces (Prettier default, standard across the TypeScript ecosystem).
- **Line length**: 100 characters (Prettier `printWidth`) — a pragmatic middle ground for
  TypeScript's often-longer type annotations, wider than the historical 80 but not unbounded.
- **Blank lines**: one blank line between logical sections within a file; no more than one
  consecutive blank line (Prettier normalizes this automatically).
- **Braces**: always used, even for single-statement `if`/`for` bodies (ESLint `curly` rule) — the
  security-relevant reason this matters (an unbraced `if` silently not covering a later line added
  under it) is exactly the kind of "convention-only" failure mode this project's whole NestJS
  choice was meant to avoid at the framework level; enforcing it at the lint level closes the same
  gap for control flow that doesn't have a framework Guard equivalent.
- **Quotes**: single quotes for strings (Prettier default for TS/JS), double quotes only where JSX
  attribute conventions require them.
- **Trailing commas**: `all` (Prettier default) — cleaner diffs on multi-line arrays/objects.
- **Import ordering**: ESLint `import/order` — external packages first, then internal absolute
  imports, then relative imports, alphabetized within each group.

Automated via `pnpm run format` / `pnpm run lint --fix`
(`6-development/1-development-environment.md` §14) — never hand-formatted.

---

# 7. Comments & Documentation

Per `CLAUDE.md`'s own already-stated project-wide instruction (this document restates it as the
formal coding standard rather than introducing a new rule): comments explain **why**, not what.

Comments should explain:

- Why — a hidden constraint, a subtle invariant, a workaround for a specific bug.
- Business logic that isn't obvious from well-named identifiers alone (e.g. a pricing precedence
  rule from the Pricing module's own business-rules documentation).
- Complex algorithms (e.g. UOM conversion chains, `module-list.md`'s UOM entry).
- Non-obvious decisions — ideally with a pointer to the ADR that made the call (`decisions-log.md`),
  not just a bare comment restating the decision.

Avoid commenting obvious code — well-named identifiers already communicate WHAT; a comment
restating that is noise, not documentation (`CLAUDE.md`'s own stated preference).

Documentation comments (JSDoc/TSDoc) required for:

- Public/exported Service methods and Controller endpoints (business intent, not parameter-by-
  parameter restatement of the type signature).
- Shared utilities in `common/`/`lib/` (§ `6-development/2-folder-structure.md` §8) — these are
  used across modules, so their contract needs to be discoverable without reading the
  implementation.
- Frontend components — per `4-ui/4-component-standards.md` §14's already-locked documentation
  requirements (purpose, usage, props, events, accessibility notes).

---

# 8. Function Standards

Functions/methods:

- Have one responsibility — a Service method performs one business operation, not several bundled
  under one name.
- Are short and readable — a function that needs internal section comments to explain its own flow
  is a candidate for extraction into named sub-functions instead.
- Avoid deep nesting — early returns preferred over nested `if`/`else` chains (§ below).
- Avoid side effects — a function that reads as a pure calculation (e.g. `calculateTotal()`) doesn't
  also mutate unrelated state or trigger a network call; side-effecting operations are named to make
  that obvious (e.g. `saveSalesOrder()`, not `getSalesOrderTotal()` that secretly persists).
- Return early when appropriate — guard clauses at the top of a function reduce nesting and make the
  "unhappy path" explicit.

Guidelines

- Minimize parameters — 3-4 positional parameters at most; beyond that, use a typed options
  object (matches the DTO pattern already used throughout the API layer, ADR-174).
- Prefer immutable inputs — parameters aren't mutated in place; a function returns a new value
  rather than modifying its argument, consistent with React/Zustand's own immutability expectations
  on the frontend.
- Avoid hidden dependencies — a function's behavior is fully determined by its parameters plus
  explicitly injected dependencies (NestJS DI, or an explicit hook/store reference on the frontend),
  never a module-level mutable global.

---

# 9. Class Standards

Classes (primarily backend Services/Controllers/Guards — the frontend is largely function-component-
based per React/Next.js convention, so this section applies there mainly to any genuinely
class-based utility):

- Follow Single Responsibility — one Service per module's core concern
  (`6-development/2-folder-structure.md` §15), not one giant `SalesOrdersService` handling pricing,
  fulfillment, and reporting all at once (those decompose into their own Services/modules where the
  business-rules documentation supports it).
- Are cohesive — a class's methods all operate on the same core concept.
- Use dependency injection — NestJS's constructor-injection pattern throughout; no manual
  `new SomeService()` inside application code (breaks testability and the DI container's lifecycle
  management).
- Avoid large "God Classes" — a Service exceeding roughly 300-400 lines is a signal to reconsider
  whether it's actually covering more than one responsibility.
- Keep public APIs small — a Service exposes only the methods its Controller (or other consuming
  Services) actually need; internal helper logic stays `private`.

---

# 10. Error Handling

Requirements

- Handle expected exceptions — business-rule violations (e.g. insufficient stock) throw a specific,
  typed exception (NestJS's built-in HTTP exception classes, or a custom domain exception mapped to
  one), never a bare `throw new Error('...')` with no type/status information.
- Fail gracefully — an unexpected error returns the friendly-message pattern already locked in
  `4-ui/3-design-system.md` §8/`4-ui/2-user-flows.md` §11, never a raw stack trace to the client.
- Never ignore exceptions — no empty `catch` blocks; a caught exception is either handled
  meaningfully or re-thrown, never silently swallowed.
- Log unexpected errors — via the global exception filter (`common/filters/`,
  `6-development/2-folder-structure.md` §5) with enough context to debug, without logging sensitive
  data (§11).
- Return meaningful error messages — per `3-api/6-error-handling.md`'s error taxonomy, not a generic
  "something went wrong" for every case.

Full error-handling conventions: `3-api/6-error-handling.md` (backend), `4-ui/2-user-flows.md` §11 /
`4-ui/5-form-standards.md` §11 (frontend) — this section restates the coding-standard-level
requirement, not the full taxonomy.

---

# 11. Logging Standards

Log:

- Errors — every caught, unexpected exception (§10).
- Warnings — degraded-but-recovered states (e.g. a retried transient failure that eventually
  succeeded).
- Important business events — order finalized, purchase order received, user role changed — the
  kind of event a real audit trail needs (consistent with this project's own security-driven
  motivation, `CLAUDE.md`'s stated rationale for the whole rewrite).
- Security events — failed login attempts, permission-denied (403) occurrences, API key
  authentication failures.

Do not log:

- Passwords (plaintext or hashed).
- JWT tokens (access or refresh) or API keys.
- Secrets/credentials of any kind (payment gateway, AWS, QuickBooks, EDI —
  `1-project/4-tech-stack.md` §15).
- Personal data beyond what's operationally necessary and already approved for that log's purpose —
  no blanket full-request-body logging that would incidentally capture PII.

This directly closes the exact failure class the legacy system is being replaced for — "plaintext
integration credentials" (`CLAUDE.md`'s own stated legacy-system finding) must never reappear in a
log file either, not just in a database column.

---

# 12. Security Guidelines

Code:

- Validates all inputs — `class-validator` DTOs at every Controller boundary (backend, ADR-174),
  `zod` schemas at every form boundary (frontend, ADR-174) — client-side validation is convenience
  only, server-side is the actual gate (`4-ui/1-navigation.md` §19, restated as a hard coding rule
  here).
- Prevents SQL Injection — Prisma's parameterized query builder used exclusively; no raw string-
  concatenated SQL anywhere in the codebase. This is the single most load-bearing rule in this
  entire document given the project's own stated motivation: "confirmed live SQL injection in every
  audited [legacy] module so far" (`CLAUDE.md`).
- Prevents XSS — React's default JSX escaping (frontend, already locked
  `4-ui/8-frontend-development-standards.md` §16); no `dangerouslySetInnerHTML` without an explicit,
  reviewed sanitization step.
- Prevents CSRF — structurally avoided via JWT bearer-token auth rather than cookie-session auth
  (already established, `4-ui/8-frontend-development-standards.md` §18) — no separate CSRF token
  mechanism needed given this auth model.
- Escapes output where required — any place user-submitted data is rendered outside React's own
  escaping (e.g. a generated PDF via `pdf-lib`, ADR-174) explicitly escapes/sanitizes before
  embedding.
- Uses parameterized queries — see Prisma point above; this is the same rule stated twice
  deliberately, once generically and once naming the actual mechanism, because it's this project's
  single highest-priority security rule.
- Protects sensitive information — API keys hashed at rest (`1-project/4-tech-stack.md` §6),
  payment data tokenized via CardConnect's vault, never raw card data server-side (§15 of that same
  document).
- **Hand-rolled HTTP routing**: not applicable — NestJS's own decorator-based routing
  (`@Controller()`/`@Get()`/`@Post()`/etc.) is used throughout; no custom route-matching logic is
  ever written, so the general-route-shadows-specific-route bug class this section's template
  guidance warns about doesn't apply to this codebase.

---

# 13. Performance Guidelines

Recommendations

- Avoid duplicate queries — Prisma's `include`/`select` used to fetch related data in one query
  rather than N+1 sequential queries; TanStack Query's cache (frontend,
  `4-ui/8-frontend-development-standards.md` §7) avoids redundant re-fetches.
- Optimize loops — avoid nested loops over large collections where a single indexed lookup/Map
  would do; this matters concretely for a module like Products
  (`module-list.md`: "largest module... widest blast radius").
- Use lazy loading where appropriate — route-based code splitting (frontend,
  `4-ui/8-frontend-development-standards.md` §15), Prisma relations loaded only where actually
  needed (backend), not eagerly by default.
- Cache expensive operations — Redis (`1-project/4-tech-stack.md` §8) for genuinely expensive,
  repeatedly-requested computations (e.g. a pricing-rule resolution that's read far more often than
  written); not used as a blanket cache-everything default.
- Avoid unnecessary object creation — particularly inside hot paths (request handlers, tight loops)
  — a new object/array allocated once per request is fine; one allocated per loop iteration over a
  large collection is a real, measurable cost worth avoiding.

---

# 14. Dependency Management

- Prefer standard/already-locked libraries — this project's package choices are already decided
  project-wide (ADR-013/025/026/174/178) specifically to avoid each module re-deciding
  independently; a new dependency requires checking `1-project/4-tech-stack.md` §16 and
  `decisions-log.md` first, not adding a competing package for something already covered.
- Minimize third-party packages — every dependency is a maintenance/security-surface cost; add one
  only when the standard library or an already-locked package genuinely can't cover the need.
- Keep dependencies updated — `pnpm audit` and `pnpm update` per
  `6-development/1-development-environment.md` §14/§20, following the upgrade policy in
  `1-project/4-tech-stack.md` §17.
- Remove unused packages — dead dependencies are removed in the same change that makes them unused,
  not left "in case."
- Evaluate licenses before adoption — standard practice; no project-specific license restriction
  beyond avoiding copyleft licenses incompatible with proprietary internal software, which is the
  default assumption for an internal ERP `[Assumption: this document]`.

---

# 15. Configuration Standards

Configuration:

- Uses environment variables exclusively for anything environment-specific
  (`6-development/1-development-environment.md` §9) — no hard-coded URLs/ports/feature flags baked
  into source.
- Never hardcodes secrets — enforced both by convention and by a pre-commit secret-scan
  consideration (exact tooling, if adopted, is a `6-development/4-git-workflow.md` decision, not
  this document's).
- Separates environment-specific settings — `.env`/`.env.local`/framework-native environment
  resolution (`6-development/1-development-environment.md` §9), no single shared config file with
  inline environment branching (`if (env === 'production')` scattered through business logic).
- Validates configuration during startup — NestJS's `ConfigModule` with a `class-validator`-backed
  config schema (consistent with ADR-174's validation stack) fails fast on a missing/malformed
  required environment variable, rather than failing deep in a request handler later.

---

# 16. Testing Standards

Every implementation includes (full strategy `6-development/6-testing-strategy.md`, late wave —
this section states the coding-standard-level baseline expected of every change, not the complete
strategy):

- Unit tests — Jest (ADR-015), for Services/utility functions/`zod` schemas.
- Integration tests — a Controller exercised against a real (test) database via Prisma, not fully
  mocked.
- Error handling tests — the failure paths in §10 are tested, not just the happy path.
- Boundary tests — min/max/empty/null cases for anything with a defined range or optionality.
- Edge case tests — module-specific edge cases sourced from that module's own business-rules
  documentation (`5-modules/<slug>/`), not invented ad hoc at implementation time.

Code is designed for testability — dependency injection (§9) and pure-function-where-possible (§8)
are what make this practical without excessive mocking.

---

# 17. Code Review Checklist

Verify:

- Naming conventions (§5) followed.
- Readability — no function/class requiring a walkthrough to understand its own structure.
- Simplicity — no abstraction beyond what the task requires (§3 KISS/YAGNI).
- Reusability — no duplicate of existing shared logic (§4, `6-development/2-folder-structure.md`
  §8).
- Security — input validation, parameterized queries, no secret exposure (§12).
- Error handling — expected exceptions handled, unexpected ones logged and surfaced gracefully
  (§10).
- Performance — no obvious N+1 query or unnecessary re-render/re-computation (§13).
- Documentation — comments explain WHY where non-obvious (§7), public APIs documented.
- Test coverage — §16's baseline categories present for the change.
- Compliance with architecture — layered dependency rules respected
  (`6-development/2-folder-structure.md` §14), module boundaries not violated.

---

# 18. Static Analysis

| Tool | Purpose | Command |
|------|---------|---------|
| ESLint | Linting (both apps, ADR-019) | `pnpm run lint` |
| Prettier | Formatting (both apps, ADR-019) | `pnpm run format` |
| TypeScript (`tsc --noEmit`) | Type checking, strict mode | `pnpm run typecheck` |
| `pnpm audit` | Dependency vulnerability analysis | `pnpm audit` |

No separate static-code-analysis tool (e.g. SonarQube) confirmed in MVP scope beyond ESLint's own
rule set — deferred as a possible addition if `6-development/9-ci-cd.md` (this same batch) or a
later security review identifies a specific gap ESLint doesn't cover
`[Assumption: this document]`.

All four run in CI (`6-development/9-ci-cd.md`) as merge-blocking checks, not advisory-only.

---

# 19. AI Coding Guidelines

AI-generated code (this project is explicitly built with heavy AI-assisted development, per
`1-project/4-tech-stack.md` §9's own listing of Claude Code as a development tool) must:

- Follow project architecture — `6-development/2-folder-structure.md`'s layered/module structure,
  never a shortcut around it (e.g. a Controller calling Prisma directly because it's faster to
  generate).
- Follow naming conventions (§5) exactly — no AI-specific naming drift.
- Reuse existing utilities — check `common/`/`lib/`/`components/shared/`
  (`6-development/2-folder-structure.md` §8) before generating a new helper that duplicates one.
- Avoid duplicate implementations — the same rule as §4/§14, stated explicitly for AI-generated code
  since it's the failure mode most likely to slip through without deliberate reuse-checking.
- Include appropriate documentation (§7) — an AI assistant is exactly as capable of writing a
  WHY-comment as a human, and should, not skip it because generation is fast.
- Follow security standards (§12) without exception — this is non-negotiable given the project's
  own founding motivation; an AI-generated shortcut around input validation or parameterized
  queries is not an acceptable trade for speed.
- Be reviewed before merging — AI-generated code goes through the same code review checklist (§17)
  as human-written code, no fast-path exemption.

---

# 20. Code Smells to Avoid

- God Classes/God Files — a Service or Component covering more than one module's concern (§9,
  `6-development/2-folder-structure.md` §5).
- Long Methods — a function needing extraction into named sub-steps (§8).
- Duplicate Code — anything copy-pasted across modules instead of centralized (§4, §14).
- Magic Numbers — unexplained numeric literals; named constants (§5) or a reference to the business
  rule/ADR that produced the value.
- Hardcoded Strings — user-facing text, especially, traces to a real source (business
  documentation, `4-ui/` design tokens) rather than being invented inline.
- Deep Nesting — more than 2-3 levels of conditional/loop nesting is a refactor signal (§8 early
  return guidance).
- Excessive Comments — restating what well-named code already says (§7).
- Circular Dependencies — a module depending back on something that depends on it
  (`6-development/2-folder-structure.md` §14/§19).
- Tight Coupling — reaching into another module's internal files instead of its exported service
  (`6-development/2-folder-structure.md` §5).
- Dead Code — unused exports/branches left "in case," rather than removed (consistent with
  `CLAUDE.md`'s own stated preference: "if you are certain that something is unused, you can delete
  it completely").

---

# 21. Refactoring Guidelines

Refactor when:

- Duplicate logic exists across two or more places (§4, §14, §20).
- Complexity increases beyond what a function/class name can honestly describe (§8, §9).
- Readability decreases — a reviewer needs an explanation beyond the code+comments to follow it
  (§7).
- Performance problems appear and are actually measured, not assumed (§13, §22).
- Architecture rules are violated — a dependency-direction breach
  (`6-development/2-folder-structure.md` §14) discovered after the fact gets corrected, not
  grandfathered in.

Refactoring is scoped to the task at hand — per `CLAUDE.md`'s own project-wide instruction, a bug
fix doesn't need surrounding cleanup unless that cleanup is itself the task.

---

# 22. Best Practices

- Write readable code first — clarity beats cleverness (§1, §7).
- Optimize only after measuring (§13, §21) — no speculative performance work.
- Prefer composition (§3, §9).
- Keep methods focused (§8).
- Keep classes cohesive (§9).
- Remove dead code (§20) rather than commenting it out "for later."
- Follow established project patterns (`6-development/2-folder-structure.md`) — don't introduce a
  competing pattern for something already solved.
- Automate formatting and linting (§6, §18) — never rely on manual discipline for something a tool
  already enforces.

---

# 23. Assumptions

- No separate static-analysis tool beyond ESLint's own rule set is adopted in MVP
  `[Assumption: this document]` — flagged in §18 for revisit if a specific gap surfaces.
- License evaluation follows the default internal-proprietary-software assumption (avoid copyleft
  licenses incompatible with that) — no project-specific license policy stated in any SoT source
  `[Assumption: this document]`.
- Exact pre-commit secret-scan tooling (if adopted) is deferred to
  `6-development/4-git-workflow.md`'s own generation, not decided here
  `[Assumption: this document]`.

---

# 24. Constraints

- Approved formatter (Prettier) required — no manual formatting.
- Linting (ESLint) must pass before merge (`6-development/9-ci-cd.md`).
- Static analysis (`tsc --noEmit`, `pnpm audit`) must pass before merge.
- No hardcoded secrets (§11, §15) — enforced by convention and code review.
- Coding standards compliance mandatory — this document is a merge-blocking review criterion (§17),
  not an aspirational guideline.

---

# 25. Related Documents

- `6-development/1-development-environment.md`
- `6-development/2-folder-structure.md`
- `4-ui/8-frontend-development-standards.md`
- `3-api/7-api-development-standards.md`
- `3-api/6-error-handling.md`
- `6-development/9-ci-cd.md`
- `6-development/4-git-workflow.md`
- `1-project/4-tech-stack.md`
- `decisions-log.md` (ADR-013, ADR-019, ADR-025, ADR-026, ADR-174, ADR-178)

---

# 26. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-17 | Claude Code (docs-kit generation) | Initial Draft |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Technical Lead | | Pending | |
| Solution Architect | | Pending | |
| Development Lead | | Pending | |

---

# AI Generation Notes

- Follows `1-project/4-tech-stack.md`, `6-development/2-folder-structure.md`, and
  `4-ui/8-frontend-development-standards.md` exactly.
- Recommends TypeScript/NestJS/Next.js-specific conventions rather than framework-agnostic
  placeholders, since the stack is already fully locked.
- Enforces consistent naming (§5), formatting (§6), documentation (§7), and organization (§4)
  across both apps.
- Promotes secure (§12), maintainable (§3, §22), testable (§16), and reusable (§4, §14) code —
  §12's SQL-injection/parameterized-query rule is called out as this project's single
  highest-priority security rule given its own stated founding motivation.
- Requires automated formatting/linting/type-checking (§6, §18) as merge-blocking CI checks.
- Ensures AI-generated code follows existing project patterns (§19) rather than introducing new
  ones — explicitly relevant here since this project is itself built with heavy AI-assisted
  development.
- Framework-specific style rules (ESLint/Prettier/TypeScript) used directly rather than kept
  generic, matching the stack's already-locked state.
- The hand-rolled-routing security note (template §12) is explicitly marked not applicable (§12) —
  NestJS's decorator-based routing is used throughout, so this bug class doesn't apply here.
