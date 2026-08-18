# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**LBM ERP Rewrite.** Replacing LBM's legacy vtiger-CRM-5.0.4-based ERP (135 modules, ~20 years of
custom business logic layered on top) — end-of-life platform, confirmed live SQL injection in every
audited module so far (Settings alone: ~47), plaintext integration credentials, at least one real
data-loss incident traced to a Users-module defect. Not a modernization nice-to-have — a security-driven
rewrite.

Approach: extract legacy behavior module-by-module from real code + live DB first (nine-pass "blueprint"
process), then rewrite tech-agnostic — but not a straight port. Every module went through a design
discussion before generation; where legacy had a bug, an ambiguity, or a clearly-better structure was
possible, we decided fresh rather than porting the defect. All decisions are locked in
`project-docs/claude-docs/gap-analysis/decisions-log.md` (194 ADRs as of this writing) — every
generated document must reference that log, never re-decide something already locked there.

**Target build: 15 MVP modules** (down from 18 blueprinted legacy modules — the legacy system's 4
separate pricing mechanisms were unified into one `pricing` module, ADR-029): SalesOrder, Accounts,
Users, Location, Products, Vendors, SearchLineItem, Settings, SalesHistory, PurchaseOrder,
PurchaseLineItem, PurchaseHistory, Pricing (unified), UOM, AccountStatement — **every one of these 15
has now been through a full per-module design review** (ADR-029 through ADR-170), not just the
upfront cross-cutting batch. Module count beyond this MVP is intentionally not treated as a fixed
figure (legacy source material's own module-count claims conflict and are self-flagged as sometimes
wrong — ADR-003), but two confirmed future additions are already tracked:
- **ProductTracking** — a real, actively-written legacy module (15,013 live rows) with no prior
  blueprint; blueprinted and fully design-reviewed this session (ADR-166 through ADR-170). Not yet
  added to the formal MVP module count/build sequence — pending developer decision on where it slots
  in.
- **StoreTransfer** — a full legacy module referenced from PurchaseOrder/SalesOrder's own
  store-transfer-creation entry points; confirmed deferred past MVP 1 (ADR-144), not missed scope.

Full legacy-system detail: `project-docs/sot-docs/raw/1-business-requirements/project-overview.md`.
Full list of what changed vs. the legacy design: `project-docs/claude-docs/gap-analysis/decisions-log.md`.

## Tech stack (decided — see `project-docs/sot-docs/raw/3-tech-stack-decision/tech-stack.md`)

| Layer | Choice |
|---|---|
| Frontend | Next.js (React, TypeScript), standard server mode |
| Backend | Node.js + NestJS (TypeScript) — enforced structure (Modules/Guards/ValidationPipes) chosen specifically to prevent the legacy system's class of convention-only security drift |
| Database | PostgreSQL, via Prisma |
| API style | REST, API-first (`/api/v1/...`), OpenAPI/Swagger from NestJS decorators — one public surface, frontend is just one consumer, not privileged |
| Auth | JWT (access+refresh) for users, hashed/scoped/rate-limited API keys for third-party/system access — same endpoints, same Guards, no second internal-only API |
| Cache/Queue | Redis + BullMQ (replaces legacy's standalone cron PHP scripts) |
| Multi-tenancy | Database-per-tenant — one physical PostgreSQL database per tenant, subdomain-routed from one shared codebase [ADR-056, supersedes the earlier row-level-security direction] |
| Hosting | AWS (default, kept portable, not a hard vendor-lock) [ADR-071] |
| Containers | **Explicitly not used** — plain Node processes + managed/self-hosted Postgres and Redis run on any mainstream host without Docker, a deliberate portability choice, not an open item [`sot-docs/raw/3-tech-stack-decision/tech-stack.md`, `4-tech-stack.md` §14] |
| Package manager / repo | pnpm workspace monorepo [ADR-013]; Git hosted on GitHub, `https://github.com/parimal-c-crest/lbm-erp.git`, GitHub Flow [ADR-181] |

**Implementation is underway** — see Where we are, below, and
`project-docs/claude-docs/plan/task-list.md`/`epics.md`/`milestone-status.md` for exact current
status (those files are the source of truth; this section is a snapshot, refreshed each session).

## Where we are

Documentation generation for the upfront categories is done; module-by-module JIT documentation +
implementation is now the active work. Status as of 2026-08-18 (end of session):

- ✅ Discovery/gap-analysis, `sot-docs/index.md`, and the upfront doc categories
  (`1-project/`, `2-database/`, `3-api/`, `4-ui/`, `6-development/` — now **both** waves, early
  and late) are all approved — see `decisions-log.md` (194 ADRs) and `review-log.md` for the full
  record. **Read `decisions-log.md` before touching any module or generating any document.**
- ✅ `6-implementation-plan/1-implementation-plan.md` (initial run) — 9 milestones, 34 epics,
  `claude-docs/plan/*` initialized.
- ✅ **M1 (Environment Setup) — Released v1.0.0**, local-only (no real hosting yet, RAID R-002
  open). EPIC-001 (scaffolding) and EPIC-002 (Platform Administration / skeleton control panel,
  tenant provisioning + migration fanout + cron management) both Complete.
- 🚧 **M2 (UI, All Modules, Static/Mock Data) — In Progress.** EPIC-003 (App Shell/Chrome)
  Complete. **Two of 15 modules have now been through their own full JIT cycle — Users and UOM**
  (`5-modules/users/`, `5-modules/uom/`, 11 docs each, approved). Both modules' UI Design epics
  are `Complete`/`Approved` (EPIC-004, EPIC-010) — every page built, real developer live-browser
  review actually ran for both this session (R-003/R-004 closed). The other 13 modules' UI-Design
  epics remain `Not Started` — each needs its own JIT documentation cycle first
  (`7-sprint-planning/1-sprint-planning.md` step 2a).
- ✅ **M3 (Backend/API: Identity & Catalog Foundation) — Users' and UOM's slices both Complete**,
  started out of sequence (normally waits for M2 to fully complete first; started early on an
  explicit developer instruction, `raid-log.md` R-004, now resolved). Users' Backend/API epic
  (EPIC-005): 19 tasks (T-046–T-064) — RBAC foundation, Time Clock (+ concurrent-edit-lock
  utility, reused project-wide), Payroll, Personal Days/Holidays, Login History, QuickBooks sync,
  Mail Account/Notification Scheduler/Word Template, Barcode Labels, demo-data seed, OpenAPI docs.
  UOM's Backend/API epic (EPIC-011): 10 tasks (T-073–T-082) — full Category/Type/Functional
  Role/Group CRUD, atomic Group-save transaction (BR-019 completeness check), conversion-factor
  history, picking-hierarchy, base-unit-pivot conversion service, role-resolution, bulk import/
  export, real demo data, 20/20 e2e tests. Both real (skeleton/demo Postgres + Redis, no mocks).
  **Location/Products (M3's other 2 foundation modules) not started yet.**
- ✅ **Real login is wired** — `/login` calls the real `/auth/login` + `/auth/2fa/verify`
  endpoints (Users' already-built backend), Username not Email (ADR-187's own follow-up, finally
  applied), real logout clears the session and redirects. `/` now redirects to `/login`. No
  frontend route guarding yet on protected pages (RAID R-007, open) — a logged-out user hitting a
  dashboard URL directly sees a raw API error, not a redirect. 2FA is per-Role (ADR-075); a real
  `admin`/`Admin@123` Admin-role user exists in the `demo` tenant
  (`backend/scripts/create-admin-user.ts`, rerunnable), 2FA currently disabled for the Admin role
  via the real per-role toggle (not a code change).
- ✅ **UOM's full JIT gate ran end-to-end this session** — field-extraction → 11 module docs →
  review → late-wave `6-development/` (which also caught and backfilled a process gap: it had
  never actually triggered for Users either) → SoT update → task derivation → UI build → real
  backend build → real browser verification, which itself found and fixed one real bug (Group
  List's `roleAssignmentCount` — the list endpoint's summary shape didn't match what the page
  read, crashing it). Three targeted ADRs came out of live developer review of UOM specifically:
  **ADR-190** (Group becomes fully immutable/undeletable once transaction-referenced, Name stays
  editable), **ADR-191** (Group name uniqueness is case-insensitive, checked on create+rename),
  **ADR-192** (four bundled resolutions: optional Type Category, Base-Type role-resolution
  fallback, computed picking-hierarchy indicator, FunctionalRole delete guard). Two more,
  **ADR-193**/**ADR-194**, are cross-cutting UI conventions (icon-only row actions w/ tooltip;
  bordered-card form sections) applied to **both** Users and UOM, not just UOM.
- ⚠️ Known, deliberately-deferred limitation: UOM's transaction-reference lock check
  (`isGroupLocked()`) is real code but always returns `false` — no consumer module
  (SalesOrder/PurchaseOrder/etc.) exists yet to actually reference a Group. Correct given build
  order (UOM ships in M3, transactional modules in M6+); the TODO in `groups.service.ts` names
  exactly what future modules need to wire in.
- ⚠️ Several real doc/schema gaps found and resolved pragmatically during EPIC-005, all flagged
  for developer confirmation rather than silently decided — see `raid-log.md` R-005
  (`Holiday`/`HolidayAssignment` had no column-level spec) and R-006
  (`UserNotificationPreference` has a real table + frontend screen but no backend task anywhere).
- ⚠️ **Nothing has been committed to git yet** — the whole tree past the initial T-001–T-005
  scaffolding commits is uncommitted working-tree state. Raised repeatedly, still not decided.
- ✅ `6-development/` — now complete, 10 of 10 documents (both waves). `7-cross-cutting/` (NFR +
  threat model) still waits — runs once, last, after every module's own JIT cycle is done.
- ✅ Playwright set up as real project tooling this session (`@playwright/test` at root,
  `playwright.config.ts`, `tests/e2e/`) — ADR-027 was already locked, this makes it actually
  runnable (`pnpm test:e2e`), not just an ad hoc `npx` habit.
- ⏸️ **Next action when resumed**: commit decision (still open), then either Location/Products'
  JIT documentation cycle (`7-sprint-planning/1-sprint-planning.md`, M3's remaining 2 foundation
  modules) or closing R-007 (frontend route guarding) before more real-backend modules make the
  gap more visible.

Visual design: a written UI/UX brief (ADR-024, Tailwind+shadcn/ui per ADR-025) plus a reviewed Stitch
AI mockup (design-source.md's Screenshots box, tokens reused per ADR-177) together now cover both the
direction and concrete token values — see `sot-docs/raw/1-business-requirements/
ui-ux-design-requirements.md` and `4-ui/3-design-system.md`.

## The four `project-docs/` areas — don't mix these up

- **`project-docs/docs-templates/`** — fixed, project-agnostic blueprint library. Never write into this.
- **`project-docs/approved-docs/docs-kit/`** — real deliverables, written only via the draft → review →
  promote flow (`3-document-generate/` → `4-document-review/`), never directly.
- **`project-docs/claude-docs/`** — working area: `analysis/`, `gap-analysis/`, `drafts/`, `plan/`
  (milestones/epics/tasks), `tasks/`, `sprints/`, `incidents/`. Nothing here is a final deliverable.
- **`project-docs/sot-docs/`** — Source of Truth: `raw/` (original material, already populated),
  `archive/` (superseded, never deleted), `index.md` (catalog), `changelog.md` (SoT change history).

## Planning hierarchy

`Project → Milestone → Epic → Task → Todo` — see
`project-docs/prompts/6-implementation-plan/1-implementation-plan.md`'s Status Tracking section for the
canonical status-rollup rule (applies everywhere, not restated per-phase).

## Workflow entry point

This project is driven by `project-docs/prompts/` — confirm-then-execute, one prompt file at a time,
never skip ahead. Read `project-docs/prompts/README.md` first in any new session; `GLOSSARY.md` for any
unfamiliar term (SoT, Epic, RAID, batch, JIT module gate, etc.).

## Communication Conventions

- **Status prefixes:** use an icon + bold label when a response contains a warning, error,
  skipped/blocked item, or confirmation — ⚠️ **WARNING**, 🚫 **SKIPPED** / **BLOCKED**, ❌ **ERROR** /
  **FAILED**, ✅ **DONE** / **CONFIRMED**, ℹ️ **NOTE**. Only when the content actually is that kind of
  status, not decoratively on every line.
- **Plain-language questions:** state any question to the developer in plain language before naming
  jargon/internal terminology. When offering options, explain in one clause what choosing each one
  actually does, and if one is recommended, say why in the same breath — never just a label like
  "(Recommended)" with no reason.
- **Next-prompt reminder:** after running any `project-docs/prompts/` file (including this setup
  prompt itself), state the next prompt's full folder-qualified path and ask permission to run it, in
  that same response — before ending the turn. Never let a turn end without naming the next step.

These conventions exist because a developer using this kit may not know its internal vocabulary, and a
question or status update they can't parse either gets rubber-stamped or ignored. Apply from the first
response onward, not just once `project-docs/prompts/` is in active use.
