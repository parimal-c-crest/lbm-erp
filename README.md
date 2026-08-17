# LBM ERP Rewrite

Ground-up rewrite of LBM's ERP system (sales orders, purchasing, pricing, inventory, vendors,
accounts receivable), replacing a ~20-year-old legacy build on end-of-life vtiger CRM 5.0.4 —
driven primarily by confirmed, live security defects (SQL injection in every audited module,
plaintext integration credentials) rather than a feature modernization goal.

## Status

Documentation/planning phase — tech stack decided, implementation not yet started. See
[CLAUDE.md](CLAUDE.md) for full project context and the four-area `project-docs/` map.

## Stack (decided, not yet scaffolded)

Next.js (TypeScript) frontend · NestJS (TypeScript) backend · PostgreSQL + Prisma · REST API-first
(`/api/v1/...`) · JWT + API-key auth · Redis + BullMQ. Full rationale:
`project-docs/sot-docs/raw/3-tech-stack-decision/tech-stack.md`.

## Setup

Not yet applicable — no application code scaffolded. Will be filled in once
`6-implementation-plan/` and the first sprint's scaffolding task exist.

## Docs / workflow

This project is driven by the prompt library under `project-docs/prompts/` — see
`project-docs/prompts/README.md` for the full workflow and `CLAUDE.md` for project-specific context.
