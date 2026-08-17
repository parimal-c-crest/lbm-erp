# SalesHistory — Cross-Module & Integration Touchpoints

Source: `docs_from_blueprint/module/SalesHistory/07-cross-module-integrations.md`, tracing to
`blueprint/module/SalesHistory/06-cross-module-integrations.md`.

Unlike a module with one dominant upstream writer and several read-only consumers, SalesHistory's
cross-module footprint is a genuine **multi-writer coordination problem**: at least four independent
code paths write to this module's core table, only one of which lives inside the module's own
directory, and three of those four disagree on the exact formula for the module's one derived field
(full formula detail in `calculations.md`).

## Related Modules

| Module | What This Module Reads | What This Module Writes/Triggers | Direction | Sync/Async |
|---|---|---|---|---|
| SalesOrder | N/A — SalesOrder reads a location's inventory/tax classification context internally, not this module's own concern. | N/A — SalesHistory never writes back to SalesOrder's own data. | SalesOrder → SalesHistory (SalesOrder writes sell/return activity directly into this module's core table at SO-finalize time for a qualifying order line, via its own independently-restated existing-row lookup and formula; also calls the same shared side-effect function this module's own save paths call) | Sync (synchronous, part of the finalize request) |
| Location | N/A | N/A | Location → SalesHistory (Location writes lost-sale activity into this module's core table via a per-tenant weekly scheduled job, using its own independently-restated formula and its own distinct overwrite — not accumulate-delta — semantic for the lost-sale counter specifically; also writes into the shared side-effect table) | **Async** (per-tenant weekly cron — 17 scheduled invocations found across tenant slots, per a scheduling-configuration reference not opened in full) |
| `db_utilities/` one-off migration/balancing scripts | N/A | Bulk loads and balancing updates against this module's core table, including at least one script confirmed to use the same unescaped string-concatenation SQL pattern found elsewhere in this module. | One-off scripts → SalesHistory | One-off, historical — not an ongoing runtime writer |
| `Customreport/` (purchasing/inventory-planning reports) | Reads this module's data for order-point, suggested-buy, and stock-buy calculations. | N/A — no write path from this family into this module's data was found. | Customreport → SalesHistory, read-only | N/A (only one of ~12 candidate filenames confirmed by direct citation; the rest found by filename only) |
| "Sales Rank" feature family | Unconfirmed — a session-key naming convention this module's own ListView writes suggests some historical relationship, **not confirmed to actually read this module's data anywhere in the source blueprint**. | N/A | Unconfirmed | Unconfirmed |
| A similarly-named but confirmed-different daily lost-sale log (SalesOrder-owned) | N/A | N/A — writes "record lost sale"-shaped data to an entirely different table (a daily lost-sale log), **not** this module's core table, despite a near-identical filename to Location's own weekly job. | No relationship to this module's data at all | N/A — flagged explicitly to prevent conflating the two distinct legacy mechanisms |
| Core framework (autoid import special-case) | N/A | N/A | N/A — framework recognizes this module's own primary-key column as a special-case autoid column for imports; shared base-class plumbing, not module-specific business logic | N/A |

### The shared side-effect table

Both of this module's own save paths, and SalesOrder's finalize routine, unconditionally call the same
shared utility function as part of their own write — this function inserts a row into a table outside
this module's own schema ownership (the "product-to-sales-history" work-queue-shaped table documented
in `entities-and-fields.md`). This is a genuine, confirmed cross-table side effect triggered by three of
the four writers, and it is also the location of this module's second confirmed Critical SQL injection
(see `business-rules-and-validation.md`, unnumbered finding), reachable via the identical line-code
value the first injection uses. The side-effect table's own downstream consumer — whatever process
ultimately reads and drains it — was never confirmed in the source blueprint.

### The `total_activity` divergence, restated as a cross-module fact

SalesOrder and Location are not read-only observers of this module's data — they are two of the
module's four confirmed writers, and both independently restate the `total_activity` formula in a way
that agrees with each other but disagrees with this module's own formula on one term, with SalesOrder's
own new-row branch carrying a further, larger divergence (omitting four of six input terms). Neither
writer coordinates with the other, with this module's own save paths, or with the fourth
(migration-script) writer class via any locking mechanism. This is the single most consequential fact
governing this module's cross-module boundary — see `calculations.md` for the full formula comparison
and the recommended redesign.

## External Systems

| System | What Crosses the Boundary | Direction | Trigger | Sync/Async |
|---|---|---|---|---|
| *(none confirmed)* | **No external-system touchpoint of any kind was confirmed for this module.** A search across the module's own files and a repo-wide search for accounting-sync/EDI/trading-partner integration signatures both return zero matches in either direction. | N/A | N/A | N/A |

SalesHistory is, per this confirmed absence, a purely internal operational rollup consumed by internal
purchasing/inventory-planning reports, not a module with any outbound or inbound external-system
boundary.

## Open Items

- Whether the ~12 unopened `Customreport/*.php` filenames genuinely read this module's core table, and
  in what shape — found by filename only, not independently opened.
- Whether the "Sales Rank" feature family's files actually query this module's data — named/session-key
  suggestive only, not confirmed by direct SQL citation.
- Whether a standalone historical-backfill script is genuinely the write site for the four unlabeled
  week-boundary columns (`entities-and-fields.md`) — found and generally characterized, but not
  confirmed by a full line-by-line read to write all four columns specifically, nor whether it is
  one-time or has been re-run since.
- Whether any of the `db_utilities/` migration scripts carry their own further-divergent
  `total_activity` formula restatement beyond the three writers directly compared — found by search,
  not opened for a formula-level read.
- Whether any of the confirmed writers have ever raced against each other in production (e.g. a
  cron-triggered Location write landing between a live user's save read and its own subsequent write
  for the same key) — no locking/transaction-isolation mechanism was found in any writer's own code,
  but whether this has produced a live lost-update was not tested or queried in the source blueprint.
- The shared side-effect table's own downstream consumer — never confirmed by the source blueprint,
  only inferred from the writer function's own name.

(Source: `docs_from_blueprint/module/SalesHistory/07-cross-module-integrations.md`, full file.)
