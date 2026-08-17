# AccountStatement — Cross-Module & Integration Touchpoints

Source: `docs_from_blueprint/module/AccountStatement/07-cross-module-integrations.md`, itself filtered
from `docs_from_blueprint/module/Accounts/07-cross-module-integrations.md` to the relationships that
involve statement generation specifically. Original citation:
`blueprint/module/Accounts/06-cross-module-integrations.md` (Pass 6).

## Related Modules

| Module | What This Module Reads | What This Module Writes/Triggers | Direction | Sync/Async |
|---|---|---|---|---|
| SalesOrder | Line-item, finalize-data, and payment tables extensively for per-SO line-item detail, SO number/date/term display, and job-scoped past-due aggregation. | Delegation only, not a direct write: after a batch run, issues a request to SalesOrder's own document-creation action to regenerate/reprint invoice HTML (Output 8, Reprint Invoices). AccountStatement never touches invoice line-item or total data itself. | AccountStatement → SalesOrder, read-only for data; one write-adjacent delegation for invoice reprint. | Sync (request/response to SalesOrder's document-creation action). |
| RoaAdj (deposit/credit-adjustment ledger) | ROA/adjustment ledger and applied-detail tables extensively, for statement rendering and the deferred/applied-amount detail popup. | Creates/voids RoaAdj entity records: finance-charge/credit-memo posting instantiates and saves a RoaAdj record through the entity's own save path, from both the manual/batch entry point and the cron entry point — confirmed **not** a raw-SQL bypass. A void/delete path directly removes applied-ROA-detail rows and calls shared utilities to reverse the unapplied-amount bookkeeping when voiding a deferred/applied amount from the statement screen. | Bidirectional. | Sync. |
| Accounts | Account billing info, balance/credit-limit/past-due/aging data, statement-configuration fields (currently stored on Account's own extension table). | None confirmed beyond the statement-configuration fields' own storage location. | AccountStatement is a consumer/renderer of Accounts' data, not the owner (see `module-overview.md` scope boundary). | Sync (in-process, same request). |

**Open item** (carried from Accounts' own spec): the account-merge flow's actual use of RoaAdj records
during merge was not traced beyond confirming the merge file includes the RoaAdj module.

## External Systems

| System | What Crosses the Boundary | Direction | Trigger | Sync/Async |
|---|---|---|---|---|
| B2B storefront | Statement-generation requests flagged `requestfrom=b2bfrontend`. **Permission-gate boundary specific to statement requests**: the `isPermitted('AccountStatement','ListView')` permission check is skipped entirely for these requests — that path relies entirely on its own upstream authentication with no defense-in-depth at this layer. Full severity detail in `risks-and-open-questions.md` STMT-RISK-002 and centerpiece finding in `permissions.md`. The B2B boundary's other security findings (disabled TLS verification, plaintext-password welcome email) belong to Accounts' own spec, not repeated here since they aren't statement-specific. | Inbound, B2B → AccountStatement. | A statement request originating from the B2B front-end. | Sync. |
| External fax gateway | Statement HTML and the account's fax number, for Output 7 (Statement Fax). Delegates transmission entirely to an external, top-level, non-Accounts fax-transmission script — the gateway's internals were not read in the source pass; its contract was inferred from the caller only. | Outbound, AccountStatement → fax gateway. | "Fax Statement" action, or the delivery-preference flag being set to fax during automated delivery. | Not confirmed (fire-and-forget per `business-rules-and-validation.md` STMT-RULE observation on `createStatementForFax`, no independent success/failure verification confirmed in that function itself). |

## Tax Report's exception path

The Tax Report (Output 9, `outputs.md`) is the one output in this module's catalog that is **not** part
of the shared statement engine — a genuinely separate live-aggregate query joining account tax code
with cross-module line-item tax figures. Noted here because it lives in the same source file inventory
as the rest of this module, not because it shares any cross-module dependency pattern with the
statement pipeline itself.
