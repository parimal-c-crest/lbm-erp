# AccountStatement — Module Overview

> Copy this whole `2-module-spec-template/` folder per module, rename, fill in. Stay tech-agnostic
> throughout — no framework/database/language references anywhere in Stage 2.

## Purpose

AccountStatement generates, archives, and delivers the customer-facing billing statement for an
account — balances, open invoices/transactions, and aging, for a chosen date range and
transaction-type view (Balance Forward / Open Items / Hybrid OI) — plus the supporting batch,
retrieval, and delivery mechanisms around that core document. A statement is the periodic answer to
"what does this customer currently owe, and why." (`docs_from_blueprint/module/AccountStatement/
01-module-overview.md` §1.1-1.2)

## Actors

- **Customer** — the recipient of the statement document, across every delivery channel.
- **Internal staff (customer service / billing)** — triggers single-account and quick statement
  generation, browses the archive, manually emails/faxes/prints a statement.
- **Billing-cycle cron** — unattended trigger for batch statement generation and billing-cycle
  past-due recomputation across all accounts.
- **B2B front-end** — a request path with its own upstream authentication, flagged in
  `risks-and-open-questions.md` as bypassing the standard permission gate for statement requests.

(`docs_from_blueprint/module/AccountStatement/01-module-overview.md` §1.4)

## Scope within this module

**In scope:**
- The four dedicated statement tables: Open-Item Statement Line, Statement Deferred/Applied-Adjustment
  Detail, Statement Archive, Batch Statement Snapshot.
- The ~30 statement-configuration fields (frequency, type, delivery channel, cycle comments, display
  toggles) — currently on the Account entity's own extension table.
- The generation pipeline (content build → HTML persist → delivery), the archive/retrieval surface,
  and the batch orchestration engine.
- Finance-charge calculation as performed inside the statement engine specifically (see
  `calculations.md` for the confirmed divergence from Accounts' separate cron-path calculation).

**Out of scope (owned by consumers or by Accounts itself, not by AccountStatement):**
- The Account entity itself and the underlying balance/credit-limit/past-due data the statement
  reports on — that remains Accounts' own domain; AccountStatement is a consumer and renderer of that
  data, not its owner.
- The open transaction/invoice/payment data read from SalesOrder and RoaAdj — read-only dependencies,
  see `integrations.md`.
- The invoice document itself (Reprint Invoices, Output 8) — Accounts delegates to SalesOrder's own
  document-rendering action and never touches invoice line-item or total data directly; that remains
  SalesOrder's own output.
- The Tax Report (Output 9) — a genuinely separate live-aggregate query, not part of the shared
  statement engine; noted in `outputs.md` but not treated as core AccountStatement scope.

(`docs_from_blueprint/module/AccountStatement/01-module-overview.md` §1.3)

## Origin

**Re-partitioned from Accounts' own completed blueprint (`blueprint/module/Accounts/`) — same rigor
as a blueprint-sourced module, but no independent blueprint pipeline of its own.** This is a third
sourcing pattern in this project, distinct from both the standard blueprint-pipeline modules and from
UOM's lower-rigor sourcing:

- UOM was extracted from within Products via **fresh session-only code research**, because no
  blueprint of any kind existed for it.
- AccountStatement has no separate `blueprint/module/AccountStatement/` folder either, **but every
  fact in its source folder is already blueprint-grade**: Accounts' own completed nine-pass Doc1
  investigation tags `statement` and `billing` as explicit concern areas throughout Pass 0, and
  dedicates real sections of its entities, outputs, cross-module-integrations, risk-register, and
  validation-rules documents to this exact capability — all already reviewed. This module's spec is a
  **re-partitioning of already-rigorous material**, not a fresh investigation.

Every claim in this spec traces to `docs_from_blueprint/module/Accounts/...` or
`blueprint/module/Accounts/...`, not to a fresh code read performed for this folder. See
`docs_from_blueprint/module/AccountStatement/00-README.md` for the full sourcing disclosure, including
why the carve-out exists at all: unlike UOM (split off to close an active, evidence-backed coupling
defect), no equivalent coupling defect was found here — the case for AccountStatement is **cohesion,
not coupling** (~22 files, ~10,900 lines, four dedicated tables, ~30 dedicated configuration fields,
all serving one clear responsibility), and the legacy code itself already treats this as a distinct
area: the permission check `isPermitted('AccountStatement', 'ListView')` names it exactly that.

## Dependencies

- **Accounts** — owns the Account entity and the balance/credit-limit/past-due/aging data the
  statement renders; AccountStatement is a consumer, not the owner, of that data.
- **SalesOrder** — read-only dependency for line-item, finalize-data, and payment detail; one write
  delegation (not a direct write) into SalesOrder's own document-creation action for invoice
  reprint/email (Output 8). See `integrations.md`.
- **RoaAdj** — bidirectional: statement rendering and the deferred/applied-amount detail popup read
  ROA/adjustment ledger data; AccountStatement also creates/voids RoaAdj records (finance-charge/
  credit-memo posting, deferred-amount void). See `integrations.md`.
- **B2B storefront** — external request path into statement generation, with its own upstream
  authentication; see `permissions.md` for the confirmed permission-gate bypass on this path.
