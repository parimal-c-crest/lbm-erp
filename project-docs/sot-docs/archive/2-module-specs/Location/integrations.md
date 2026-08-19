# Location — Cross-Module & Integration Touchpoints

Source: `blueprint/module/Location/06-cross-module-integrations.md` via
`docs_from_blueprint/module/Location/07-cross-module-integrations.md`.

## The blanket relationship

Location (both the branch header and the Product-at-Location composite entity) is the foundational
branch/inventory-scoping dimension of this ERP. **Every module that deals with sales, purchasing,
inventory, pricing, or reporting joins against Location's own identity** to scope its own data and to
read a product's QoH/cost/reorder state at a branch — SalesOrder, PurchaseOrder, StoreTransfer,
Products, the point-of-sale system, Forecasting, Customreport, the warehouse-management system (WMS),
and the B2B/customer catalog all do this routinely, as a byproduct of Location's role as the branch
dimension rather than as a distinct integration each deserves its own row. This blanket fact is stated
once; the table below is the specific, named relationships the source blueprint characterized in
depth — write paths, cross-cutting enforcement, and structurally distinct integrations, not the
general "scopes by branch" background radiation every module exhibits.

## Related Modules

| Module | What This Module Reads | What This Module Writes/Triggers | Direction | Sync/Async |
|---|---|---|---|---|
| Products | Supplies the kit/component relationship as a query-only interface for this module's kit-quantity determination (R3 in `entities-and-fields.md`). | The entire Product-at-Location composite entity's display/edit surface (Outputs 3-4 in `outputs.md`) is hosted inside Products via a direct template-include (initial page render) and an ajax re-fetch (branch-switcher). Neither mechanism is Products-module code referencing Location by name — the embedding lives in shared template layer and this module's own client-side code, not in Products' own controller code. | Bidirectional in UI terms (Products hosts the entire CRUD surface), but the actual save write path is this module's own | Synchronous (page render / ajax re-fetch) |
| SalesOrder | N/A (write-only relationship from SalesOrder's side) | A manual, counter-person-triggered ajax endpoint (not an automatic out-of-stock detector) submitting product/account/quantity/reason when staff explicitly flags a sale as lost; see `calculations.md` §8 for the accumulate-then-promote arithmetic. | SalesOrder → Location, one-directional write (the promotion into sales history is entirely this module's own cron-driven step, no SalesOrder involvement after the initial write) | Sync write, async promotion (cron) |
| Customreport | Reads this module's Reorder flag, Primary Supplier, Part Min/Max/Order Point, plus sales-history joins scoped by branch, as reorder-point calculation inputs. | On a cron-driven run with an "update order point" option set, writes the computed suggested order quantity back onto whichever field of this module's own table the requesting form selected — a **dynamically-named target, not a fixed column** — gated by a per-row "freeze" date that lets an individual product/branch row opt out of the auto-update until a given date. | Bidirectional — Customreport reads this module's demand/config fields and (only on the cron path) writes a computed suggestion back onto one of those same fields | Cron-driven |
| Forecasting | A demand-forecasting cron/report suite of 10+ files, all referencing this module's Product-at-Location table. | At least one file (a "SaveLocation"-named file) strongly suggests Forecasting maintains its own write surface against this module's own data — plausibly the demand/forecast formula fields this module already owns, or a Forecasting-specific shadow of them. **This file's own body was never read to confirm which fields it writes.** | Forecasting → Location, read-dominant, with at least one untraced write path | Cron-driven plus on-demand report views |
| Users | Role-Location Assignment (which roles are permitted at which branches, plus per-role/per-branch POS session-timeout settings) is owned/managed entirely by Settings-area admin screens — **no reference to this table exists in either this module's own code or the Users module's own code**; a genuinely third-party (Settings-owned) table that happens to join Users' role concept to Location's branch concept. User-Location Tracking (a per-user, per-day clock-in log) is confirmed entirely Users-owned, keyed by a **denormalized branch name**, not a stable reference (same schema-drift finding as `entities-and-fields.md` Known Gaps). | N/A — this module's own code never reads or writes either table | Users → Location (both tables Users/Settings-owned, referencing Location's branch identity by reference or denormalized name) | Synchronous, inline within Users login/clock-in and Settings admin-save request paths |
| WMS | Reads this module's QoH as the authoritative figure it reconciles its own pick-list quantities against, branch-by-branch, both via an inline join at page-render time and via a dedicated reconciliation cron. | **This module's own QoH-adjustment ajax endpoints (both the plain-product and the mislabeled "kit" endpoint) directly write into WMS-owned tables** whenever a QoH change originates from a WMS put-away/pick-list context — the same code path that carries the confirmed SQL-injection point into the QoH field itself (LOC-RULE-010). | **Genuinely bidirectional — the one relationship in this module's dependency graph confirmed to not be read-only.** | Synchronous inline join (read) + cron reconciliation (read) + synchronous inline write (WMS-context QoH adjustment) |
| B2B / vendor-integration | Location's Part-Superseded flag (`entities-and-fields.md` R4). | N/A — read-only filter consumption by both consumers. The B2B/customer-facing catalog substitutes/redirects a superseded product's display to its superseding product; vendor line-code/PO-suggestion processing filters candidate products for vendor-ordering suggestions to exclude superseded parts. | Location → both consumers, read-only filter consumption | Synchronous, at catalog-render/PO-suggestion time |

## External Systems

| System | What Crosses the Boundary | Direction | Trigger | Sync/Async |
|---|---|---|---|---|
| CIPW (ChargeItPro Wireless) | Branch-level merchant credentials (merchant name/key/configuration id) stored on the branch header, read at transaction time to build outbound payment-processing API calls. Confirmed via a status-check consuming site's own internal variable naming. | Location → external gateway (credential/config read, outbound API call at payment time) | Payment processing at a transaction for the branch | Synchronous, at the moment a payment is processed |
| CIP-EP (ChargeItPro EmergePay) | Branch-level merchant credentials (org id/auth token). Confirmed definitively via a schema-migration file's own inline column-comment documentation. One consuming site gates CIP-EP's credential fields behind **CIPW's own** enablement flag rather than an independent flag of its own — whether this means CIP-EP is architecturally a sub-feature of CIPW's toggle, or simply how that one call site happens to check it, was not exhaustively verified across every consuming file. | Location → external gateway | Payment processing at a transaction for the branch | Synchronous |
| Traverse / QuickBooks accounting | The per-branch, 1:1 mapping of ~97 transaction/account types to GL account codes (`entities-and-fields.md` §Location Accounting Configuration), managed entirely by Settings-area admin screens, not this module's own code. **This module has zero read/write sites against this table at all.** Which downstream modules (SalesOrder finalize, PO receipt, POS end-of-day reconciliation) actually read these mappings at posting time was never traced. | Location stores; downstream transaction-posting modules consume — untraced which ones specifically | Configured via Settings admin screens; consumed elsewhere (untraced) | Not applicable at this module's own boundary |
| TecOrder (vendor-ordering integration) | Credentials only (username/password/buyer id), stored on the branch header. **Neither this integration's actual consuming code was ever located or traced in any pass.** | Location stores the credential; consuming module unidentified | Unknown | Unknown — no consuming code located |
| Fuse5Connect | Credentials only (module/sharing visibility flags, subscriber id, access key), stored on the branch header. **Consuming code never located.** | Location stores the credential; consuming module unidentified | Unknown | Unknown — no consuming code located |

## Known Gaps

- **A "SaveLocation"-named Forecasting file's write surface against this module's own table was not
  traced** — the filename strongly suggests a Forecasting-owned write path parallel to or overlapping
  with this module's own formula-field writes, but its body was never read. A future follow-up read
  should read this file in full before this integration can be fully specified.
- **Customreport's upstream "suggested order quantity" arithmetic** — how the value ultimately written
  back into this module's own table is actually computed was not traced; only the read-inputs and the
  write-back mechanism were characterized.
- **The GL-account-mapping table's actual consuming modules were not enumerated** — likely
  SalesOrder/PurchaseOrder/POS-module territory, out of this module's own scope.
- **CIP-EP's relationship to CIPW's own enablement flag** — whether CIP-EP is genuinely
  architecturally a sub-feature of the CIPW toggle, or whether this is simply how one particular call
  site happens to check it (with other call sites checking differently), was not exhaustively verified.
- **TecOrder and Fuse5Connect integration code were never located or traced at all** — flagged as a
  harder blocker than this module's other "presumed dead" integrations, since no pass exhaustively
  searched for consuming code the way some other integrations' dead-code findings were confirmed — the
  absence of evidence here is genuinely different in kind, not a confirmed absence.
