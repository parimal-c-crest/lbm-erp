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
`project-docs/claude-docs/gap-analysis/decisions-log.md` (181 ADRs as of this writing) — every
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

No code scaffolded yet — stack is decided, implementation hasn't started (see Where we are, below).

## Where we are

Still in documentation/planning phase, not implementation — **discovery/gap-analysis is done, and
document generation is well underway.** Status:

- ✅ `1-discovery/3-sot-review.md` — `sot-docs/index.md` built (13 top-level docs + 198 module-spec
  files across 18 legacy modules, catalogued).
- ✅ `1-discovery/5-project-analysis.md` — `claude-docs/analysis/` written (project-summary,
  module-list, business-rules-summary, workflow-summary).
- ✅ `1-discovery/6-gap-analysis.md` — `claude-docs/gap-analysis/` written (gap-analysis-report,
  clarification-questions, decisions-log). Decisions-log now holds 181 ADRs, including a full
  module-by-module design review for every one of the 15 MVP modules (ADR-029 through ADR-170),
  ProductTracking's own fresh blueprint+review (ADR-166 through ADR-170), StoreTransfer's confirmed
  deferral (ADR-144), and a growing set of cross-cutting calls made during document generation itself
  (ADR-171 onward — API rate limits, CORS, package guidelines, the reused Stitch design mockup and
  its token/layout split, icon library, Git hosting). **Read `decisions-log.md` before touching any
  module or generating any document** — it's the single most load-bearing document in this project.
- ✅ `2-document-plan/1-documentation-plan.md` — full generation order set.
- ✅ `3-document-generate/01-project/project.md` → **`1-project/` approved** (4 docs: overview,
  requirements, feature-breakdown, tech-stack).
- ✅ `3-document-generate/02-database/database.md` → **`2-database/` approved** (4 docs).
- ✅ `3-document-generate/03-api/api.md` → **`3-api/` approved** (10 docs, incl. OpenAPI spec +
  Postman collection).
- ✅ `3-document-generate/04-ui/ui.md` → **`4-ui/` approved** (all 8 docs). Design tokens sourced
  live from a reviewed Stitch AI mockup (`sot-docs/design/screenshots/stitch_lbm_design/`) —
  tokens only, its fixed-width layout explicitly rejected and rebuilt responsive (ADR-177).
- ✅ `3-document-generate/06-development/development.md` **early wave** →
  **`6-development/` early wave approved** (6 of 10 docs: development-environment,
  folder-structure, coding-standards, git-workflow, containerization, ci-cd).
  `8-containerization.md` is a fully-justified "Not Applicable" document — this project explicitly
  doesn't use Docker (see Tech stack table above).
- 🚧 `6-development/` **late wave** (`5-implementation-workflow.md`, `6-testing-strategy.md`,
  `7-deployment-strategy.md`, `10-debugging-guide.md`) — not yet triggered; waits for the first
  module's own JIT documentation cycle.
- 🚧 `5-modules/` — none of the 15 MVP modules has its own JIT documentation set generated yet.
- 🚧 `7-cross-cutting/` (NFR + threat model) — runs last, once every module is approved; not started.
- ⏸️ **Next action when resumed**: run `7-sprint-planning/1-sprint-planning.md` to kick off the
  first module's JIT documentation cycle — this is what triggers both `5-modules/<slug>/` and
  `6-development/`'s late wave.

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
