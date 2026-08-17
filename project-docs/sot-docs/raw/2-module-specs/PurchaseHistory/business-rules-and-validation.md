# PurchaseHistory — Business Rules & Validation

> Every rule gets a stable ID (e.g. <MOD>-RULE-001) so Stage 4's test docs can trace back to it.

Source: `docs_from_blueprint/module/PurchaseHistory/03-business-rules-and-validation.md`, itself traced to
`blueprint/module/PurchaseHistory/02-validation-rules.md`. 13 rules total (PH-VAL-001 through PH-VAL-013 in
the source, renumbered `PH-RULE-###` below for this template's ID scheme; original IDs kept in the Statement
column for cross-reference). **Severity legend**: *Hard block* = the operation is refused/rejected entirely;
*Guard* = a sub-step is conditionally skipped; *Not a block* = documents a computation branch,
absence-of-declaration finding, or side-effect gate rather than a validation per se.

| ID | Statement | Trigger | Scope | Severity | Confidence |
|---|---|---|---|---|---|
| PH-RULE-001 | (PH-VAL-001) No field-presence gate of any kind exists in `Save.php` — every submitted field matching a known column name is copied directly onto the entity (trimmed, but not type/format-checked or presence-checked), and the save proceeds unconditionally regardless of whether the five key fields (product number, line code, week, year, location) are present or empty. | Every save through `Save.php` | All fields, especially the five key fields | Not a block — a malformed or incomplete key combination is silently accepted and saved | Confirmed |
| PH-RULE-002 | (PH-VAL-002) The entity's own record id is set directly from a raw, uncast request parameter (`record`) whenever it is present — never validated as numeric or as referring to an existing row before the save proceeds. This exact value reaches the entity class's own unparameterized edit-branch `UPDATE` (PH-RULE-007) — the confirmed SQL-injection vector. | Every save where `record` is present (i.e. every edit) | The `WHERE` clause of the edit-branch `UPDATE` | **Critical — confirmed SQL injection, no mitigation** (fully detailed under PH-RULE-008) | Confirmed |
| PH-RULE-003 | (PH-VAL-003) The save operation's own success/failure is never checked before the caller is redirected — the redirect fires unconditionally regardless of whether the save actually succeeded. | Every save through `Save.php` | N/A | Not a block | Confirmed |
| PH-RULE-004 | (PH-VAL-004) The entity declares **no** required-fields list at all. Combined with PH-RULE-001, this module has no field-presence enforcement anywhere across its own write surface. | Any save through this entity | N/A — absence-of-declaration finding | None | Confirmed |
| PH-RULE-005 | (PH-VAL-005) The entity's own list-field metadata uses a shortened table-alias-style key rather than the full table name every other field entry uses — a naming-convention inconsistency; a shared-framework helper expecting the full name could silently mis-render a column if the alias doesn't resolve identically everywhere it's read. | Every list-view render | List-view column-header rendering | Not itself a block — naming-convention inconsistency, unconfirmed live rendering effect | Confirmed (pattern); Inferred (live effect) |
| PH-RULE-006 | (PH-VAL-006) The save hook performs a real write on the first-save branch — created-time/modified-time/creator-id/owner-id columns via an unparameterized statement, no bind-array argument passed at all. On this branch, the row identifier is a system-assigned id just returned by the prior insert, not directly request-controlled at this point. | Every save, first-save branch | Created Time, Modified Time, Creator ID, Owner ID | Second-order — the injectable shape exists here too, but the value used is not directly attacker-controlled on this branch | Confirmed |
| PH-RULE-007 | (PH-VAL-007) The same save hook's edit branch runs an unparameterized `UPDATE` (modified-time only), with the row identifier fully attacker-controlled (from `record` on the ordinary save path, or a second independent request parameter on the inline-edit ajax path) — no cast, no validation, no bind array. | Every edit-save (ordinary save path and inline-edit ajax path) | The entire aggregate table (`UPDATE`'s `WHERE` clause) | **Critical — confirmed SQL injection, no mitigation** | Confirmed |
| PH-RULE-008 | (PH-VAL-008) Combining PH-RULE-002/PH-RULE-007: the edit-save path carries a confirmed, directly request-reachable SQL injection, reachable two independent ways — the ordinary edit-form submission, and the inline-edit ajax endpoint. Both funnel into the identical unparameterized edit-branch `UPDATE`. Same systemic bug class confirmed in the sibling PurchaseLineItem module's own entity class. | Every edit-save, both reachable paths | The aggregate table (`UPDATE`'s `WHERE` clause) | **Critical — confirmed SQL injection, no mitigation, two independently-reachable request paths** | Confirmed |
| PH-RULE-009 | (PH-VAL-009) The sort-order helper reads a request parameter whose name implies a record id, but treats its value as a sort-direction string — the same copy-paste-shaped naming bug found in SalesHistory's own equivalent helper. No validation exists either way. | Every list-view render where that request parameter is set | List-view sort-order clause | Not a block — a naming/logic bug | Confirmed |
| PH-RULE-010 | (PH-VAL-010) Clean/positive finding, correcting SalesHistory's own confirmed equivalent bug: the list-view page writes sort-state into session storage under the same keys the entity class's own sort-order/order-by helpers read back — sort-order persistence across requests genuinely works for this module. | Every list-view render with a prior sort selection stored in session | List-view sort-order/order-by persistence | N/A — clean/positive finding, not a defect | Confirmed |
| PH-RULE-011 | (PH-VAL-011) Delete is aborted outright if the record identifier is not present in the request. | Every delete | Record identifier | Hard block | Confirmed |
| PH-RULE-012 | (PH-VAL-012) Once the presence check passes, the shared soft-delete framework helper (`DeleteEntity()`) runs unconditionally — `Delete.php` itself performs no existence check on the record id and no check for related/referencing data before delegating to the shared helper (whose own internal validation is out of this document's scope). | Every delete with a non-empty record identifier | The aggregate row (soft-delete, via the shared helper) | None are hard blocks in `Delete.php` itself | Confirmed |
| PH-RULE-013 | (PH-VAL-013) The submitted field value on the inline-edit endpoint is assigned directly onto the entity with no allow-list of editable field names, no type/format check, and no bounds check. Because this endpoint performs no recompute of `total_activity` at all, it can be used to overwrite the derived total directly, silently desynchronizing it from `buy_qty − return_qty` until a subsequent PurchaseOrder-side accumulate event recomputes it fresh. | Every inline field edit | Any field editable via this endpoint, including the derived total itself | None are hard blocks | Confirmed |

<!-- Severity: hard block / warning / auto-remediation / not a block (side-effect only)
     Confidence: Confirmed (explicit source) / Inferred (deduced, needs verification) -->

## Open Questions

- What happens on an unrecognized transaction-code value at any of PurchaseOrder's three confirmed writer
  call sites — none of the three carries a final catch-all branch, so `buy_qty`/`return_qty` would be left
  unset on a brand-new row for an unrecognized code; not traced to its ultimate save-time effect.
- Whether `LoadList.php`'s own two-column insert into a 13-column table for this module is ever actually
  reached by a live caller — a correctness concern catalogued as a risk-register entry rather than a
  numbered rule here (matching the source blueprint's own categorization), since it is not itself an
  unvalidated-input rule.
- `DeleteEntity()`'s own internal permission/integrity checks were not re-derived in the source blueprint —
  a shared-framework boundary, out of this module's own scope.

(`docs_from_blueprint/module/PurchaseHistory/03-business-rules-and-validation.md` §3.5;
`blueprint/module/PurchaseHistory/06-cross-module-integrations.md` §3)
