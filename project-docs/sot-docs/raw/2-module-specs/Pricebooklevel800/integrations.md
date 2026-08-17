# Pricebooklevel800 — Cross-Module & Integration Touchpoints

Source: `docs_from_blueprint/module/Pricebooklevel800/07-cross-module-integrations.md`, ultimately
derived from `blueprint/module/Pricebooklevel800/06-cross-module-integrations.md` (Doc1 §06) and
`blueprint/module-blueprint-scope.md` (cross-sibling finding).

## Related Modules

| Module | What This Module Reads | What This Module Writes/Triggers | Direction | Sync/Async |
|---|---|---|---|---|
| Level800rules | Rule rows are read/written/duplicated directly by this module's own code — an arbitrary, allow-list-free set of rule columns on every header save; a full re-read/re-query of rule scoping columns for the product-count lookup; a full paginated read for the rule-details grid; a full SELECT for the (mis-targeted) CSV export. | An arbitrary, allow-list-free set of rule columns on every header save (Critical Finding #1, see `risks-and-open-questions.md`); a real entity-level create via the sibling module's own save method during rule duplication. | Bidirectional, dominated by this module reaching into the sibling's table rather than delegating to it. | Sync. **This is the module's single most consequential cross-module relationship.** Formally two separate vtiger modules (different tabids, different entity classes), but functioning in practice as one single business entity split across two modules — a price-book "header" (this module) and its "line items" (the sibling), with no attempt at encapsulation between them. This module's own save flow writes the sibling's table directly with raw, unparameterized logic rather than delegating to the sibling's own save logic, while the rule-duplication flow *does* use the sibling's proper entity save — an inconsistent integration style even within this module's own file set. |
| Accounts | The account-assignment picklist column (`cf_988`, "List Price") is read by the delete-usage-guard, the Apply-to-Accounts modal's currently-assigned filter, and — outside this module entirely — the pricing lookup itself. | Written by the Apply-to-Accounts bulk-write flow (apply/un-apply) and indirectly by the "set as default" mass-action (a new-Account's *initial* assignment value, not an existing Account's). | Bidirectional — continuous reads of the assignment value, narrow writes back via two specific flows. | Sync. The Accounts module's own detail/edit-view layer has bespoke rendering logic specifically keyed to this field, corroborating it as a first-class, intentionally-designed cross-module field rather than an incidental one. `cf_988` is the module's **sole external assignment target**. |
| Products | The pricing engine's rule-matching (outside this module, in the broader inventory/pricing utility layer) and this module's own product-count lookup both read product custom-field columns (line code/subline/division/product id/price code) to match against the sibling rule table's own scoping columns. | None — no write to Products' own tables anywhere in this module's file set. | Read-only, into this module. | Sync. |
| Core CRM field metadata | Not read by this module. | The "set as default" mass-action writes directly to the platform's own field-definition table, mutating the global default value for the Accounts assignment field's underlying field definition — not any individual Account row. | Outbound, from this module into shared CRM metadata. | Sync. The **only file in this entire module that reaches into core CRM metadata** rather than another business module's data table — a distinctive, architecturally-surprising side effect (editing a row on the price-book list mutates unrelated, global field metadata). |
| Campaigns | N/A — not a designed integration. | Four files in this module are verbatim leftover Campaigns code with no Pricebooklevel800 logic at all — reachable at direct URLs under this module's own action names, would write into Campaigns' own relationship tables if ever invoked with this module's context in the URL. | Accidental, not a designed integration. | N/A. **Not a genuine integration** — dead/misplaced code. The reverse of the pattern found in a sibling pricing module (`MPLPricePlan`), where a module had accidental dead code reaching into *this* module's own table with no live caller; here the direction is reversed. Listed for completeness per the standing cross-module-reach check; characterized as a risk finding (`risks-and-open-questions.md` High #6), not a designed integration. |
| Category | N/A — dead instantiation. | N/A — no read or write of any Category-owned table. | None. | N/A. Two files instantiate the Category module's entity class but never use the resulting object beyond instantiation. Copy-paste residue, not a real integration. |
| Sibling tiers (Pricebooklevel200 / Pricebooklevel300) | Structural only, via generic, repo-wide dispatcher/utility code that branches on the module name to handle all three tiers with shared logic — including the dead cascade-delete function documented in `calculations.md`. | A client-side autocomplete endpoint this module's own JS calls using a type-discriminator literal copy-pasted from the 200-tier without renaming. | Structural only, via shared repo-wide utilities — no direct code reach. | N/A. No file in this module directly references either sibling tier or their tables. The three tiers are integrated *structurally* at the shared-utility level even though this module's own files contain zero direct references to its siblings — see the account-price-book-redirect/tier-precedence open question below. |

## External Systems

| System | What Crosses the Boundary | Direction | Trigger | Sync/Async |
|---|---|---|---|---|

**No external-facing (accounting/EDI/e-commerce) integration was found anywhere in this module's file
set** — no accounting-system push call, no EDI reference, no e-commerce/web-facing endpoint, confirmed
by full-file read. This module's data influences pricing shown to customers indirectly (via
SalesOrder's own pricing consumption) but has no direct external-system integration of its own.

## The cross-sibling account-price-book-redirect finding (injection) and the tier-precedence open question

**Injection finding, restated here in full per this consolidation's explicit instruction** (full
technical detail also in `risks-and-open-questions.md`): the Apply-to-Accounts bulk-write flow
(above) is reachable via a live, unescaped SQL injection surface — both the price-book-id list
driving which price book's name gets applied, and the Account-id list driving which Accounts receive
the write, are spliced unescaped into query clauses with no bind parameters. **The practical
consequence is a direct path from unauthenticated-shaped request input to an unauthorized,
attacker-directed change of which price book a chosen set of customer Accounts is assigned to** — not
merely a data-disclosure risk, but a redirect of the live pricing-tier assignment that determines
what those accounts' orders compute as their sell/list price. This is confirmed the module's single
most consequential defect, because the write target is a *different* module's table (the Accounts
assignment column) and the practical effect is a pricing-tier reassignment, not merely data exposure.

**Cross-sibling finding, shared with `Pricebooklevel200`/`Pricebooklevel300`, not specific to this
module alone** (`blueprint/module-blueprint-scope.md`, "Cross-sibling finding (200/300/800)"): the
account-plan assignment columns across all three tiers are **undifferentiated** — pipe-delimited plan
lists can mix names from all three tiers with no column distinguishing which tier each name belongs
to, a name-collision risk. **The precedence ordering between the three tiers when multiple could
apply to the same Account is unresolved** — flagged in the source material as a hard cutover blocker,
not resolved there and not resolved here. This ambiguity is preserved exactly as found: this document
does not assert an ordering, propose a tiebreak rule, or otherwise invent a resolution the source
material does not itself supply.

## Cross-module/integration open items

- Whether `"M3"`/`"500"` (the two dominant live account-assignment values) correspond to live header
  rows in the sibling tiers' own header tables.
- The precedence ordering between the three sibling pricing tiers when more than one could apply to
  the same Account (above) — unresolved, flagged as a hard cutover blocker in the source material.
- Whether the generic platform dispatcher's permission check for the Campaigns-leftover files' action
  names evaluates access control against the URL's declared module, the file's actual `require_once`
  target, or neither — determines whether those files are a real access-control-bypass risk or merely
  dead weight.
- Whether the `autoupdatefrompcb`/PCB-sync process (`workflows.md`) has any external system on the
  other end of it, or is purely an internal, in-repo process not yet located — unresolved within this
  module's own scope.
