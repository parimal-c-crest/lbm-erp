# SearchLineItem — Cross-Module & Integration Touchpoints

Source: `docs_from_blueprint/module/SearchLineItem/07-cross-module-integrations.md`
(`blueprint/module/SearchLineItem/06-cross-module-integrations.md`, Doc1 Pass 6).

SearchLineItem is structurally inverted relative to a typical business-entity module: it is not an
independent entity with its own edit/save lifecycle that other modules reference — it is a
**denormalized write-target**. One module (SalesOrder) does virtually all the writing, at one moment
(finalize); this module's own generic CRUD surface exists but is vestigial. The module's real
cross-module story is: who writes into its table, and who reads its rows back out for reporting.

## Related Modules

| Module | What This Module Reads | What This Module Writes/Triggers | Direction | Sync/Async |
|---|---|---|---|---|
| SalesOrder | N/A (SearchLineItem does not read from SalesOrder) | SalesOrder's finalize routine is the sole writer of the initial row set, at finalize time: it copies most SO-line fields onto a new row and computes the margin/extension fields fresh from finalize-time SO parameters, and sets both alert flags. In the same transaction, a reconciliation step matches each new row's line number against SalesOrder's own line-item table. A second, narrower path: editing Customer PO Number on an already-finalized SO re-syncs that one field on every SearchLineItem row belonging to that SO — the only field confirmed to track its SO parent after finalize via a SalesOrder-side edit screen. | SalesOrder → SearchLineItem, one-way (write-only from SalesOrder's side; SearchLineItem never writes back into SalesOrder's own tables) | Synchronous — both the initial finalize-time write and the post-finalize Customer PO re-sync are inline, same-request writes; no queued/deferred component. |
| Products / Location | No direct code path exists in either direction for the general Products/Location relationship — no SQL join, entity reference, or ajax call against SearchLineItem's table or class from either module. The Products→Location→SalesOrder→SearchLineItem supersession chain is transitive: SearchLineItem only ever learns about a superseded product through the flag SalesOrder's finalize routine sets, never by querying Products/Location data itself. One narrow qualifier: a shared top-level utility script queries SearchLineItem directly for a customer's last sell price, and is included directly by Products' own pricing-display screen for that lookup. | The worklist's own outward join to Products/Location data is for display purposes only, after the flag has already been set — a read-for-rendering join, not a decision input; SearchLineItem does not write to Products or Location. | Products → SearchLineItem, read-only, indirect (via a shared top-level utility script, for last-sale-price lookup). Location → SearchLineItem: no relationship found in either direction. | Synchronous, inline ajax, at Products' pricing-display time. |
| Home (dashboard) | N/A | Home-dashboard widgets read summary counts of both alert flags for the homepage alert widget — one query pattern for `supersedereturn`, a second for `oversalealert` (filtered additionally to sale-type transaction lines). | Home → SearchLineItem, read-only, one-way. Home never writes to this module's table. | Synchronous, inline, at homepage render time. |
| SalesOrder's own oversale-list report | N/A | A detail-list read consumer, living under SalesOrder's own files despite reading SearchLineItem data — renders the full oversale-flagged line list that Home's widget only summarizes as a count. | SalesOrder (this specific report) → SearchLineItem, read-only. | Synchronous, inline report render. |
| A scheduled buyout-cost-backfill process | N/A | For same-day buyout-line rows whose cost was still unknown at finalize: backfills the cost, then independently recomputes the same margin/extension field set finalize itself computed — using its own, confirmed-divergent formula restatement (see `calculations.md`). | This process → SearchLineItem, write-only. | **Asynchronous** — the only asynchronous write path found for this table. |
| A standalone ad hoc tax-recalculation script | N/A | Recalculates the tax-dollar field where a stored mismatch is detected — a disjoint field from the margin/extension set above, so it does not conflict with the backfill process. | This process → SearchLineItem, write-only. | Manual/on-demand — no scheduling/logging scaffolding found, reading as an ad hoc data-fix tool rather than a routine job. |
| A bulk oversale-flag-reset script | N/A | A small, standalone script that resets `oversalealert` in bulk, scoped by product+location+line-code combination rather than by individual row — the candidate (but unconfirmed-reachable) dismiss mechanism for `oversalealert`. | This process → SearchLineItem, write-only. | Synchronous, ajax/GET, if reached at all — no caller was found anywhere in the repository across two independent searches. |

## External Systems

| System | What Crosses the Boundary | Direction | Trigger | Sync/Async |
|---|---|---|---|---|
| Mobile-scanner webservice | Reads SearchLineItem data (joined against SalesOrder's own finalize-record table) for a customer+product's last sell price and finalize timestamp. | SearchLineItem → external mobile-scanner app, read-only | Webservice call | Whether this data surfaces to the scanner app's own UI, or is used purely as an internal pricing-calculation input on the scanner side, was not confirmed. |
| Ford EDI export | A standalone export script builds a multi-section CSV/zip export (header/customer/inventory sections) reading directly from SearchLineItem data, filtered to a specific set of Ford-related line codes and the current date, excluding return-type transaction codes — i.e. today's finalized Ford-linecode sales lines, structured for a Ford (automotive parts trading-partner network) EDI-style feed. | SearchLineItem → Ford (external trading partner), read-only, outbound | No caller of this export script was found anywhere in the repository — its invocation mechanism (scheduled vs. manually triggered) was not confirmed. | Its use of a zip-archiving library and CSV-per-section structure is consistent with a scheduled or manually-triggered batch export rather than a live/inline integration. |
| QuickBooks / other named accounting or EDI systems | **Absent from this module entirely** — a direct search of this module's own files for any reference to QuickBooks, generic EDI hooks, or other named external-system integrations found zero matches. | N/A | N/A | Consistent with the module's overall shape: a narrow, mostly-read-only snapshot table with a vestigial CRUD surface, not an entity that itself participates in external sync. |

**Direct summary of the external-integration question**: SearchLineItem itself contains no
external-system code, but is a genuine **data source** for two external-facing read consumers located
outside the module (the mobile-scanner webservice, the Ford EDI export) — the same "narrow read-only
source for someone else's integration" pattern found for its internal consumers (Products, Home,
SalesOrder's own report).

## Cross-module/integration open items

- **The bulk oversale-flag-reset script's live reachability** — the script would reset `oversalealert`
  if reached, but no caller was found in the repository; whether it is dead code, reached via a
  mechanism the blueprint's search patterns missed, or genuinely unreachable in the live application
  needs a targeted follow-up before a new implementation decides whether to preserve, drop, or fix this
  dismiss mechanism.
- **Whether the scheduled buyout-cost-backfill process's and the ad hoc tax-recalculation script's
  independent recomputations can ever diverge from SalesOrder's finalize-time values for the same row**
  — resolved for the margin/extension field set (a confirmed, formula-level divergence — see
  `calculations.md`); the tax-dollar recompute was confirmed disjoint (no overlap, no conflict) but its
  own correctness against the finalize-time tax formula was not independently verified.
- **The Ford EDI export's invocation mechanism** (scheduled vs. manually triggered) was not confirmed —
  no caller reference was found.
- **Whether the mobile-scanner webservice's read of SearchLineItem data surfaces to the external app's
  own UI, or is purely an internal pricing-calculation input using SearchLineItem as a historical-price
  cache** — not traced beyond the two matched queries; flagged for a dedicated mobile-integration-focused
  review if one is scoped.
