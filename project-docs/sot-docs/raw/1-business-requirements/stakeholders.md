# Stakeholders — LBM ERP Rewrite

We don't have a formally maintained RACI or org chart in the surviving project record, so this document
works from what the module specifications themselves tell us about who actually touches the system —
every module's own overview names its real-world actors, and those roles are the most reliable
stakeholder list we currently have.

## Internal end users

These are the people who'd notice immediately if a rewritten module behaved differently than the
legacy one:

- **Order entry / counter sales staff** — the primary users of SalesOrder, the largest and most
  complex module in the MVP set, covering plain sales orders, quotes, service contracts, and the
  faster "Quick SO" flow.
- **Purchasing staff** — PurchaseOrder, PurchaseLineItem, and PurchaseHistory exist for them; the
  purchase-order status workflow and vendor-cost reconciliation directly shape their daily work.
- **Warehouse / inventory staff** — Location owns quantity-on-hand and multi-location inventory;
  they're also the ones who'd be affected by the confirmed absence of a negative-quantity guard across
  four separate write paths in that module today.
- **Accounts receivable / billing staff** — Accounts and the Account Statement capability exist for
  them specifically: generating, archiving, and delivering customer statements, applying finance
  charges, managing credit limits.
- **Vendor/purchasing administrators** — Vendors owns the vendor master data, line-code pricing
  agreements, and vendor contact management.
- **Pricing/catalog administrators** — Products, MPLPricePlan, and the three Pricebooklevel tiers
  exist for whoever sets and maintains pricing rules; UOM's conversion logic feeds into all of them.
- **System administrators** — Settings and Users cover org-wide configuration, roles, permissions, and
  integrations; they're also the modules with the worst confirmed security exposure, so whoever
  currently manages this area has the most immediate stake in the rewrite actually happening.

## External stakeholders

- **Customers using the B2B storefront.** Several modules — Accounts, Account Statement, Products —
  have direct B2B-facing surfaces (portal login, catalog access, statement delivery), and at least one
  of those (the B2B statement-permission bypass) is a confirmed gap a customer-facing path could be
  affected by.
- **Customers receiving statements and invoices**, regardless of whether they use the B2B portal —
  the Account Statement capability's email/fax/print delivery paths exist for them directly.

## Documentation / blueprint team

The people doing the module-by-module extraction and specification work — not named individuals in
this document, but a distinct stakeholder group in the sense that the entire rewrite's credibility
depends on the accuracy of what they've documented. Every finding in the business case and feasibility
study traces back to this work.

## Eventual build team

Not yet assembled or named. Whoever eventually implements the rewrite inherits the tech-agnostic
specifications as their starting point — their stake in the project is real but the group itself
doesn't exist yet as a named entity.

## Product owners / subject-matter experts (per module)

Each module's own build guidance names specific open decisions that need a product-owner or SME
sign-off before implementation — for example, whether the Door Configuration subsystem inside Products
is even in scope for the rewrite, or what the correct Global Weighted-Average-Cost formula should be
going forward. These aren't generic placeholders; they're specific people (roles, if not yet named
individuals) this project depends on responding to specific, already-identified questions.

## Gaps in this list

No executive sponsor is named anywhere in the current project record. No IT/infrastructure stakeholder
group has been identified for deployment/cutover planning, even though the blueprint work already
produces deployment-facing security-remediation notes per module. Both should be filled in once known,
rather than guessed at here.
