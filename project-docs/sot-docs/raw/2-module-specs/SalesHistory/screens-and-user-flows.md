# SalesHistory — Screens & User Flows

> Views, fields, interactions, states. No component library or framework assumption.

Source: `docs_from_blueprint/module/SalesHistory/08-screens-and-user-flows.md`. This file is inferred,
not directly documented — the blueprint catalogs entry points/functions, not screen layouts (the same
scope boundary the SalesOrder pilot's own blueprint drew). The structure below is inferred from the
entities, rules, the confirmed absence of a status model, the calculation findings, and the documented
outputs, expressed as views/fields/interactions/states rather than any specific UI framework.

Because SalesHistory has no status/workflow concept, no money-valued fields, and only one output, the
inferred screen structure here is correspondingly thin — standard list/detail/edit CRUD chrome plus one
correction interaction, not the multi-surface, multi-modal structure a richer module like SalesOrder
implies. The structural inventory grounding this inference found only standard procedural
page-controller scripts (list, detail, edit, delete, export) plus one inline-edit ajax endpoint and a
handful of confirmed leftover files from a different module's template, excluded from this inference
entirely.

## Screen Inventory

| Screen | Purpose |
|---|---|
| List View | A filterable, sortable grid of Sales Activity rows (one row per product/line-code/week/year/location bucket), with an export-to-file action. Per SLH-RULE-011 (`business-rules-and-validation.md`), this view's own sort-order persistence is inferred to be a confirmed no-op in the legacy system (a session-key mismatch between what the grid writes and what the read side reads back) — a new implementation should not assume the legacy behavior ever actually worked, and should treat aligning this as a design requirement. |
| Detail View (read-only) | Displays a single row's key fields (product number, line code, week, year, location) and its six accumulator counters plus the derived total. No status/lifecycle indicator to surface, unlike a module with a real workflow. |
| Edit/Create View | The module's own everyday create/edit form, submitting to the module's primary save path. This is the **everyday reachability path for both of this module's Critical SQL injection findings** — a new implementation's equivalent form must not reproduce the raw-string-interpolation pattern those findings document. |
| Inline Field-Correction Interaction | A dedicated interaction (inferred from the DetailView inline-edit ajax endpoint) for correcting a single already-accumulated row's field, distinct from the accumulate-a-delta semantic of the main save path. Should be surfaced as an explicit **correction** action, not a generic field edit — its underlying semantic (overwrite-then-recompute) genuinely differs from every other write path's own accumulate-a-delta semantic; conflating the two in the UI would obscure a real business distinction. |
| Export Action | The one confirmed output — a CSV download of the current filtered/searched grid state (see `outputs.md`). |

**No status-change modal/interaction is inferred**, unlike a module with a genuine workflow — this
module has no domain-specific status concept for such an interaction to govern. **No
print/document-generation action beyond the CSV export is inferred**, per this module's confirmed
absence of any PDF/print/document surface in its own files.

## Flows

- **Key-field entry (create/edit)**: product number, line code, week, year, location — the five-field
  identity key every writer keys on. Per SLH-RULE-002/003, the legacy system enforces only presence of
  these five fields, not their type/format or existence against their respective reference entities —
  a new implementation's equivalent form should treat this gap as a requirement to close (typed,
  validated key fields), not a behavior to preserve.
- **Activity-counter entry**: sell/return/lost-sale/transfer-in/transfer-out/false-loss quantity
  deltas — submitted as increments to be accumulated onto an existing row, or as initial values for a
  new one, per the accumulator pattern in `workflows.md`.
- **Correction interaction**: single-field overwrite plus an automatic total recompute, inferred from
  the DetailView inline-edit endpoint.
- **Export interaction**: filter/search the grid, then export the current result set to CSV.

## States

- **Row-level state**: since this module has no domain-specific status field, the only row-level state
  to surface is the soft-delete flag — should be visible/filterable in the list view, consistent with
  the legacy system's own field catalog and the fact that this flag is genuinely exercised in this
  module (unlike a comparably-thin sibling module where it is confirmed never exercised).
- **Validation/error states**: the one confirmed hard-blocked action in this module (the five-field
  presence gate at save time, SLH-RULE-002) should surface a clear, specific error message tied to
  exactly which key field is missing, rather than a generic failure — consistent with the general
  principle applied across this documentation series, not a behavior directly documented for this
  specific module's own error messaging (which the source blueprint characterizes only as a
  client-side alert, not a structured error state).
- **No finalize-specific state is inferred**, unlike a module with a finalize/lock transition — this
  module's rows remain writable indefinitely, so there is no equivalent of a "locked, read-only" row
  state to surface in the UI.

(Source: `docs_from_blueprint/module/SalesHistory/08-screens-and-user-flows.md`, full file.)
