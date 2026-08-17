# Accounts — Module Overview

> Copy this whole `2-module-spec-template/` folder per module, rename, fill in. Stay tech-agnostic
> throughout — no framework/database/language references anywhere in Stage 2.

## Purpose

Accounts is the core customer/company entity of the ERP and its central hub — every Account
represents a customer/company record: its identity and contact information, its ownership/rating
classification, its position in a parent/child account hierarchy, its billing and credit
configuration (terms, credit limit, tax status, finance-charge settings), its statement generation
and delivery preferences, its stored payment methods, its B2B storefront access, and its
marketing/ad associations. Several distinct concerns converge on the same entity: customer identity
and hierarchy; billing and credit (payment terms, credit limit and over-credit-limit enforcement,
tax exemption, finance-charge configuration — read cross-module by SalesOrder when deciding whether
an order may proceed); statement generation and delivery (balance-forward and open-item statements,
single-account/batch/archived, delivered by print/email/fax/PDF); stored payment methods (credit
cards on file, via two coexisting mechanisms — a legacy per-card table and a PCI-vault-tokenized
gateway profile); B2B storefront access (account-level login credentials and catalog/location
access, synchronized via an outbound REST call); marketing/ad association, service addresses, and
vehicles/autos on file; Masterbrand SPA codes and MPL (Master Price List) exceptions consumed by
pricing logic elsewhere in the ERP; and QuickBooks synchronization of account and AR/invoice/
credit-memo data (confirmed dead/disabled in the current system).

## Actors

- **Customer** — the party the account record represents; receives statement documents (print/
  email/fax/PDF) and, where enabled, logs into the B2B storefront directly.
- **Counter/sales staff** — create and edit account records, manage stored payment methods,
  addresses, ad associations, and SPA codes/MPL exceptions.
- **Accounting/management staff** — own billing-cycle, finance-charge, credit-limit, and statement
  configuration; run batch statement generation; consume the Tax Report and export outputs; review
  account-merge operations.
- **Warehouse/counter/service staff (indirectly)** — via SalesOrder reading Accounts' credit-limit
  and deposit-policy data when evaluating whether an order may proceed, and Jobs cascade-writing
  billing-cycle past-due data back onto Account records.
- **System/integration processes** — the QuickBooks sync routines (confirmed dead/disabled), the
  B2B portal synchronization endpoint, the Fanbuilder customer-signup integration, and the various
  cron/batch entry points driving statement generation, finance-charge application, and
  billing-cycle past-due recomputation.

## Scope within this module

**In scope**: the account header and its billing/credit/statement/B2B-configuration extension
fields, billing/shipping addresses, ad/marketing associations, autos/vehicles on file, the
statement-generation engine (single, batch, and archived statements; PDF/email/fax delivery), the
finance-charge and billing-cycle-past-due calculation logic, credit cards on file (both legacy and
gateway-tokenized), Masterbrand SPA codes, MPL exceptions, account-merge/dedupe, product/line-code
cross-reference mapping, Year-to-Year sales summaries, account documents, and this module's
interfaces to related business capabilities (SalesOrder, Contacts, Jobs, RoaAdj) and external
systems (QuickBooks, the B2B portal, Fanbuilder).

**Out of scope**:
- Generic record-sharing/group-assignment plumbing inherited from the underlying CRM framework and
  the generic "related products" cross-entity link mechanism — not business-specific to Accounts.
- The other modules of the wider ERP not already covered by the SalesOrder pilot or this Accounts
  blueprint.
- Deployment/rollout sequencing across the wider system — outline-depth only, not expanded further
  in this tech-agnostic spec.
- Selecting an implementation technology stack — explicitly deferred.

## Origin

Extracted-from-legacy, blueprint-sourced, see blueprint/module/Accounts/

## Dependencies

- **SalesOrder** — reads Accounts' credit-limit and deposit-policy data when evaluating whether an
  order may proceed.
- **Contacts** — account address changes cascade to related contacts' mailing/other address fields.
- **Jobs** — cascade-writes billing-cycle past-due data back onto Account records; consumes
  Accounts' Credit Limit and Master Price Level via cascade.
- **RoaAdj** — the ROA/ADJ ledger feeds statement aging, balance-forward waterfall, and finance-charge
  computation.
- **QuickBooks** — outbound sync of account records and AR/invoice/credit-memo data (confirmed
  dead/disabled in the current system).
- **B2B portal** — account-level login credentials and catalog/location access, synchronized via an
  outbound REST call.
- **Fanbuilder** — customer-signup integration.
