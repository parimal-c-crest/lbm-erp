# PurchaseLineItem — Business Rules & Validation

> Every rule gets a stable ID (e.g. <MOD>-RULE-001) so Stage 4's test docs can trace back to it.
>
> Source: `docs_from_blueprint/module/PurchaseLineItem/03-business-rules-and-validation.md`, itself
> traced to `blueprint/module/PurchaseLineItem/02-validation-rules.md`. The blueprint's own rule numbers
> (PLI-VAL-001 through PLI-VAL-014) are preserved as a cross-reference in the Statement column; original
> file:line legacy citations are dropped from this document but remain fully available in
> `blueprint/module/PurchaseLineItem/02-validation-rules.md` if a rule ever needs re-verification.
>
> **Headline finding**: this module's own data-entry validation is thin — its `Save.php`/`EditView.php`
> scaffolding is confirmed not to be the module's real write path — so this catalog concentrates on the
> paths that genuinely are live: the audit-timestamp re-stamp inside the entity's own save hook, and the
> inline-edit endpoint, alongside the standard scaffolding-absence findings.

| ID | Statement | Trigger | Scope | Severity | Confidence |
|---|---|---|---|---|---|
| PLI-RULE-001 | (blueprint PLI-VAL-001) No presence/emptiness check exists anywhere in `Save.php` for any field before the save call runs — every submitted value is loaded and saved as-is; the entity declares no required-fields list at all. | Any direct submission to this endpoint — no confirmed UI path submits to it in practice. | N/A — absence-of-guard finding | Not a hard block | Confirmed (code); vestigial in practice |
| PLI-RULE-002 | (PLI-VAL-002) The save call's own success/failure is never checked before the subsequent redirect fires — the redirect happens unconditionally regardless of whether the save actually succeeded. | Same as above | N/A | Not a block | Confirmed |
| PLI-RULE-003 | (PLI-VAL-003) The entity declares no required-fields list — there is no field-presence enforcement point at this layer at all. | Any save through this entity | N/A — absence-of-declaration finding | Not a hard block | Confirmed |
| PLI-RULE-004 | (PLI-VAL-004) The vendor-number backfill only runs if a vendor reference is set on the row — if a row is ever written with that reference empty (none of the six confirmed writers do this today, but nothing in this file itself prevents it), the vendor-number field is silently left at its default rather than explicitly nulled or rejected. | Every save where the vendor reference is falsy | Vendor Number field | Not a block — silent no-op | Confirmed |
| **PLI-RULE-005** | **(PLI-VAL-005) The audit-timestamp re-stamp inside the entity's own save hook is a confirmed, unmitigated SQL injection.** Both the create and edit branches build an update statement by directly concatenating values — including, on the edit branch, the record's own id — into the update's `WHERE` clause, with **no parameterization of any kind**. On the edit branch (every save against an existing record), that id was set moments earlier in the same request from a raw, uncast, unvalidated copy of user input. Any value submitted as the record identifier in a save request against an existing record reaches this update's `WHERE` clause verbatim. | Every save that edits an existing record | Any row/table reachable from the database connection, subject to its privilege level | **Critical — confirmed SQL injection, no mitigation** | Confirmed |
| PLI-RULE-006 | (PLI-VAL-006) The CSV-export query builder substitutes joined display columns into whatever filter/list strings it is passed, with no validation of their contents — but both parameters are system-built (from shared search infrastructure), not raw user input reaching this function directly. | CSV export from the ListView | N/A — structurally safe today, not directly user-reachable | N/A | Confirmed (code shape); Inferred (no direct raw-request path found) |
| PLI-RULE-007 | (PLI-VAL-007) Delete aborts with an explicit error if the record identifier is not present in the request. | Every delete | Record identifier | Hard block | Confirmed |
| PLI-RULE-008 | (PLI-VAL-008) Once the presence check passes, the delete is delegated to the **generic, shared, parameterized delete helper** used across this codebase — unlike some other modules, this module does not bypass that helper with a direct, unparameterized delete update. No module-specific injection risk is introduced by this file. | Every delete with a present record identifier | Purchase Line Item row | N/A — confirms a safer pattern than some sibling modules use | Confirmed (call shape); Inferred (shared helper's own internals not independently re-verified) |
| PLI-RULE-009 | (PLI-VAL-009) The field-save logic in `DetailViewAjax.php` runs only if a record identifier is present in the request; otherwise the endpoint fails silently and nothing is written or queried. | Every inline field edit attempt | Record identifier | Hard block (silent-failure response) | Confirmed |
| **PLI-RULE-010** | **(PLI-VAL-010) The inline-edit endpoint instantiates the wrong entity class entirely — a different module's class (used elsewhere for backorder-log tracking), not PurchaseLineItem's own — despite passing the correct module name as a string to the retrieval and save calls.** Because both of those calls resolve their target tables from the *instantiated object's own* declared tables, not from the string argument, this means the endpoint reads/writes an unrelated module's tables using a PurchaseLineItem record id as the lookup key — there is **no PurchaseLineItem write happening through this endpoint at all**. | Every inline field edit on a Purchase Line Item detail view | An unrelated module's own tables, keyed by a PurchaseLineItem record id — potential data corruption on an unrelated module's records, not PurchaseLineItem's own | **High — confirmed wrong-entity-class bug, not a validation gap** | Confirmed |
| PLI-RULE-011 | (PLI-VAL-011) The submitted field name/value pair is assigned directly to the resolved (wrong) entity's fields with no allow-list of editable field names, no type/format check, and no bounds check. | Every inline field edit (subject to PLI-RULE-010's finding that this never actually reaches a Purchase Line Item row) | Any field name/value pair on whichever entity the endpoint actually resolves to | Not a hard block | Confirmed |
| PLI-RULE-012 | (PLI-VAL-012) This module has no module-specific search-utility file of its own — its ListView relies entirely on the generic, shared search/list infrastructure used across this codebase. This module's own pass did not independently re-audit that shared infrastructure's injection-safety; it inherits whatever safe/unsafe shape a sibling module's own investigation already documented for that same shared code. | Every ListView search/filter/dashboard-drill request | Search/filter query construction | N/A — inherited, cross-referenced, not independently re-verified | Inferred (inherited finding, not independently re-derived) |
| PLI-RULE-013 | (PLI-VAL-013) The edit view's own validation-metadata assignment is display-only — it feeds client-side validation hints, not a server-side enforcement layer; no server-side field validation exists in this file beyond the generic save machinery's own. | Every edit-view render | N/A | N/A | Confirmed |
| PLI-RULE-014 | (PLI-VAL-014) The "load list into related entity" handler's (`LoadList.php`) PurchaseLineItem-scoped branch hardcodes the primary-key column name for a **different** module's table — a copy-paste leftover from that other module's own equivalent file, never adapted. The resulting query would fail outright with an unknown-column error the moment this branch is actually exercised — this is not an injection (the value is still bound safely), it is a functional-correctness bug. `CallRelatedList.php` and `updateRelations.php` are, like the module they were copied from, verbatim leftovers with no PurchaseLineItem-specific logic at all — not separately rule-numbered since they carry no PurchaseLineItem business logic to validate. | Any code path that calls this handler with the PurchaseLineItem-scoped parameter (none confirmed found anywhere in the source investigation) | Purchase Line Item rows (if ever reached) | Not a security finding — a correctness/dead-code finding | Confirmed (code shape); Inferred (no live caller found) |

**Severity legend**: *Hard block* = the operation is refused/rejected entirely; *Guard/scope-gate* = a
sub-step is conditionally skipped, not the whole operation; *Not a block* = documents an absence of
enforcement or a side-effect gate, not a validation per se; Critical/High findings are called out in
bold.

**Confidence legend**: *Confirmed* = directly sourced from code read in the blueprint pass; *Inferred* =
deduced or extrapolated, needs verification.

## Open Questions

- Whether the shared search/list infrastructure PLI-RULE-012 defers to (inherited, not independently
  re-audited here) is actually safe — cross-referenced against whatever finding a sibling module's own
  investigation already produced for that same shared code, not independently re-derived in this module's
  pass.
- Whether `DeleteEntity()`'s own internal mechanics (permission checks, referencing-data integrity checks)
  apply any PurchaseLineItem-specific logic, or are purely generic (relevant to PLI-RULE-008) — not
  independently re-derived in the source blueprint.
- This is the eleventh consecutive module processed under this method to carry at least one confirmed
  live SQL injection (PLI-RULE-005) — noted as a pattern observation about the codebase as a whole, not a
  claim specific to PurchaseLineItem's own design.
