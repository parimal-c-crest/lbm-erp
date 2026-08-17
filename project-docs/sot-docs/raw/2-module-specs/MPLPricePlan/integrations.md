# MPLPricePlan — Cross-Module & Integration Touchpoints

Source: `docs_from_blueprint/module/MPLPricePlan/07-cross-module-integrations.md`.

**The shape of this module's cross-module footprint**: unlike a module that is a denormalized
write-target for other modules, MPLPricePlan is the authoring side of a shared pricing-configuration
resource — the Products capability (via its own save flow and two bulk-update tools) writes the
*assignment* of a plan to a product+location; MPLPricePlan itself owns the *definition* of the plan; and a
shared pricing-computation function living in neither module reads both at sale-pricing time. Three
distinct relationships, cleanly separable.

## Related Modules

| Module | What This Module Reads | What This Module Writes/Triggers | Direction | Sync/Async |
|---|---|---|---|---|
| Products | Nothing directly — Products' own save flow reads this module's plan-name list to populate its plan-selection UI (inferred from the assignment flow; not separately re-derived). | Nothing — this module never writes to any Products-owned table. Every product save writes the product+location→plan assignment (either to every tenant location or just the product's default location, depending on the same location-uniformity toggle documented in `workflows.md`). Two bulk-update tools perform the same assignment write in bulk. When a product's plan is set back to "no plan assigned," this write path additionally seeds a per-product-location row in the legacy fallback mechanism from a system-computed default grid — un-assigning a named plan does not leave the product unpriced, it falls back to the legacy per-product mechanism with a default grid. | Products → the assignment relationship, one-way. This module never writes back to Products' own data, and never reassigns a product's plan from its own files. | Synchronous, inline, at product-save time. |
| Location | The physical column carrying the plan-assignment relationship lives on the Location capability's own extension data, not on any MPLPricePlan- or Products-owned table — a cross-module ownership boundary. This module's own queries never join through that extension data directly; every MPLPricePlan-side query reads its own plan/grid tables keyed by plan id and location id alone. | Nothing — Location, as physical column owner, has no query-level relationship of its own with this module; it is purely the storage location for a column Products writes and the shared pricing engine reads. | N/A (storage-only relationship; the actual join happens only inside the shared pricing engine, below) | N/A |
| Shared sales-pricing engine (called from SalesOrder/Quotes, not itself a module directory under this scope) | N/A — this module is read *by* the engine, not the reverse. | This module's plan header and per-location grid data is read directly by the engine, joined through the product+location→plan assignment relationship, at every priced sale line. This module never calls into the pricing engine or any SalesOrder/Quotes file itself. | The pricing engine → reads this module's plan/grid tables, read-only. | Synchronous, inline at line-item pricing time — every priced sale line re-evaluates the full precedence chain fresh, not cached or precomputed. |
| Import | Reads this module's own plan table for a name-to-id lookup (correctly parameterized). | An imported assignment-column value of the literal string "custom" is coerced to the "no plan assigned" sentinel; any other imported value is treated as a plan name (not an id) and looked up against this module's own plan table before the assignment write is built. A separate import step explicitly assigns the "no plan assigned" sentinel for every newly-imported product, confirming new imports start unassigned by default. | Import → the assignment relationship, write, plus a read-only name-to-id lookup against this module's own plan table. | Synchronous, inline during the import-save transaction. |
| Users | Nothing. | A generic mass-delete return-navigation branch references this module's name for return-routing purposes — not a data relationship of any kind. | N/A | N/A |
| Pricebooklevel800 (unrelated module — accidental, not a designed integration) | Nothing designed. | **This module's standalone rule-delete script (`DeleteRule.php`) deletes from a table genuinely owned by Pricebooklevel800** (a legacy pricebook-level feature, 8 live rows on the source blueprint's dev snapshot), keyed by an unescaped, unbound caller-supplied id. This is not a designed integration — it is a confirmed copy-paste leftover that, if ever reached, would corrupt Pricebooklevel800's own data, not this module's. See `permissions.md` for the authorization-gap treatment of this finding and `risks-and-open-questions.md` (MPL-RISK-001) for its severity ranking. | MPLPricePlan → Pricebooklevel800's live table, write (delete), unauthorized/unintended. | Synchronous, on direct URL request only — no UI affordance in this module triggers it. |

## External Systems

**None found.** A direct, targeted search of every file in this module for accounting-system, EDI, or
other named external-integration signatures found zero matches — MPLPricePlan has no direct
external-system integration code of its own, consistent with its role as an internal
pricing-configuration authoring tool with no customer/vendor/trading-partner-facing surface (the confirmed
absence of any document/PDF output, see `outputs.md`, extends the same conclusion to external
integrations). No external-facing read consumer was found either — every consumer identified above is an
internal module or a shared internal utility, itself called only from internal sales/quote pricing flows.

| System | What Crosses the Boundary | Direction | Trigger | Sync/Async |
|---|---|---|---|---|
| *(none confirmed)* | N/A | N/A | N/A | N/A |

## Open Items

- **The exact caller(s) of the shared pricing-computation function** — confirmed to be called from the
  sales/quote line-item pricing flow, but the specific calling file(s) were not enumerated line-by-line in
  the source blueprint's module-scoped budget; a SalesOrder/Quotes-focused pass would need to close this
  out fully. This is also flagged as a hard blocker for setting a cutover date (see `build-guidance.md`).
- **The default-grid logic invoked when a product reverts to "no plan assigned"** (Products row above) —
  not traced; determines what default grid a newly-unassigned product actually gets priced against via the
  legacy fallback mechanism.
- **Whether any capability beyond Products/Import ever writes the product+location→plan assignment
  relationship** — the source blueprint's search was comprehensive against the literal column identifying
  that relationship across the full repository, so the two writers found above are treated as exhaustive,
  but a targeted Location-capability-focused pass, if one exists, might surface a third writer this
  module-scoped search's file selection missed.
