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
`project-docs/claude-docs/gap-analysis/decisions-log.md` (188 ADRs as of this writing) — every
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
implementation is now the active work. Status as of 2026-08-18:

- ✅ Discovery/gap-analysis, `sot-docs/index.md`, and the upfront doc categories
  (`1-project/`, `2-database/`, `3-api/`, `4-ui/`, `6-development/` early wave) are all approved —
  see `decisions-log.md` (188 ADRs) and `review-log.md` for the full record. **Read
  `decisions-log.md` before touching any module or generating any document.**
- ✅ `6-implementation-plan/1-implementation-plan.md` (initial run) — 9 milestones, 34 epics,
  `claude-docs/plan/*` initialized.
- ✅ **M1 (Environment Setup) — Released v1.0.0**, local-only (no real hosting yet, RAID R-002
  open). EPIC-001 (scaffolding) and EPIC-002 (Platform Administration / skeleton control panel,
  tenant provisioning + migration fanout + cron management) both Complete.
- 🚧 **M2 (UI, All Modules, Static/Mock Data) — In Progress.** EPIC-003 (App Shell/Chrome) Complete.
  **Users is the first module through its own JIT cycle** (`5-modules/users/`, 11 docs approved) —
  its UI Design epic (EPIC-004) is done, all 17 tasks (Sprint 3), verified live via Playwright.
  The other 14 modules' UI-Design epics remain `Not Started` — each needs its own JIT
  documentation cycle first (`7-sprint-planning/1-sprint-planning.md` step 2a).
- 🚧 **M3 (Backend/API: Identity & Catalog Foundation) — In Progress, started out of sequence**
  (normally waits for M2 to fully complete first; started early on an explicit developer
  instruction — see `raid-log.md` R-004). Users' Backend/API epic (EPIC-005) has its RBAC
  foundation done (schema, auth/login/2FA/lockout, permission model, User/Role/Profile/Group CRUD
  — Sprint 4, real e2e-tested); Time Clock/Payroll/Personal Days/QuickBooks/etc. backend work is
  not started yet.
- ⚠️ **Outstanding, not yet done**: the Design-First Strategy's real developer live-browser
  review/approval of Users' UI pages never ran (developer was offline) — flagged in `raid-log.md`
  R-003/R-004, still owed. **Nothing has been committed to git yet** — the whole tree past the
  initial T-001–T-005 scaffolding commits is uncommitted working-tree state.
- 🚧 `6-development/` late wave, `7-cross-cutting/` (NFR + threat model) — not started, wait for
  more modules to complete their JIT cycles.
- ⏸️ **Next action when resumed**: developer review of Users' built UI pages (closes R-003/R-004),
  then either continue Users' Backend/API (T-055 onward) or run
  `7-sprint-planning/1-sprint-planning.md` again for the next module's JIT documentation cycle.

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
