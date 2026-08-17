# Pricebooklevel800 — Business Rules & Validation

> Every rule gets a stable ID (e.g. <MOD>-RULE-001) so Stage 4's test docs can trace back to it.

Source: `docs_from_blueprint/module/Pricebooklevel800/03-business-rules-and-validation.md`,
ultimately derived from `blueprint/module/Pricebooklevel800/02-validation-rules.md`. **All 14 rules**
(PBL800-VAL-001 through PBL800-VAL-014 in the source) are itemized below, IDs reformatted to
`PBL800-RULE-###` keeping the same numbers. Confidence is inferred from the source's own hedging
language per rule (explicit "confirmed"/definite statements → Confirmed; explicit
"unconfirmed"/"not traced"/"unclear" language → Inferred) — nothing here resolves an ambiguity the
source itself left open. Highest rule id in the source is PBL800-VAL-014; 14 rules documented,
matching the max id — no gap, no duplicate.

| ID | Statement | Trigger | Scope | Severity | Confidence |
|---|---|---|---|---|---|
| PBL800-RULE-001 | Price Book Name is required at the field-metadata layer, but the underlying column is nullable and the header save flow performs no server-side non-empty check of its own — a blank submission bypassing client-side validation would insert a NULL/blank-named price book. | Header create/edit | Price Book Name | Gap — no enforcement | Confirmed |
| PBL800-RULE-002 | List Price Lower Than Sell Price is an enum column but the save flow writes the submitted value verbatim with no allow-list check — any string is accepted by the raw write path. | Header create/edit | List Price Lower Than Sell Price | Gap — no enforcement | Confirmed |
| PBL800-RULE-003 | Price Book Description has no length cap enforced server-side; field metadata declares it explicitly unbounded. | Header create/edit | Price Book Description | Not a block | Confirmed |
| PBL800-RULE-004 | **Duplicate-name check exists but is advisory only, and race-prone.** A client-called ajax check blocks the *client-side* submit if a live, non-deleted Price Book Name match is found — but this is a separate synchronous round-trip before the real save request, not a transaction-guarded uniqueness constraint; no uniqueness constraint exists at the data-storage layer, and the save flow performs no re-check at insert time — two concurrent submits of the same name both succeed, creating two price books with an identical name, which then become indistinguishable to every downstream name-string-matched query (rule scoping, Account assignment, the "set as default" mass-action's own select-by-id-then-match-by-name pattern). | Header create, concurrent submits | Price Book Name | Gap — race condition | Confirmed |
| PBL800-RULE-005 | The header-level default multiplier (Times) has no numeric-range or non-negative check anywhere server-side; the underlying column is required-not-null with no default, so an empty submission fails at the storage layer with a type error rather than being caught by application-level validation. | Header create/edit | Times (header) | Gap — no enforcement | Confirmed |
| PBL800-RULE-006 | Default Price Level Code defaults to "LP" when submitted empty (the only server-side default-value logic in the entire header save flow); no allow-list check against the known set of price-level codes is applied on write, only used for rendering the authoring dropdown. | Header create/edit | Default Price Level Code | Fallback, not a block | Confirmed |
| PBL800-RULE-007 | **Two independent delete paths exist, with different guard behavior.** The standard entity delete path performs an unconditional soft-delete — no usage check at all. A separate, ajax-driven delete path — the one actually wired to the ListView's row-delete button — **does** check whether any live Account currently has its List Price assignment matching this price book's name before allowing the delete, blocking with an explicit "already in use" message if so. Since both code paths are independently reachable, the usage guard is trivially bypassable by any client that invokes the standard delete action directly instead of using the ListView's own delete affordance. | Delete (either path) | Deleted, Price Book Name | Hard block on one path only — bypassable | Confirmed |
| PBL800-RULE-008 | The usage-guard query itself joins on a **string equality** match between the price book's name and the Account's assignment value, not a foreign key. Given PBL800-RULE-004's duplicate-name gap, two price books sharing a name would make this guard's "in use" check ambiguous — it could block deletion of either one because the *other* one's name match satisfies the join. | Delete (guarded path) | Price Book Name | Guard, ambiguous under duplicate names | Confirmed |
| PBL800-RULE-009 | The per-rule update loop builds its field list purely from request-key names matching a generic "any field ending in `_<ruleid>`" pattern — **any** such request key is treated as a column name to update on the sibling rule table, with no allow-list of permitted column names; only three field-name aliases are special-cased, every other field name is passed through as a literal column name. | Header save, rule-field portion | Any Level800rules column (unbounded) | Hard rule (unbounded scope) — see `risks-and-open-questions.md` for the security consequence | Confirmed |
| PBL800-RULE-010 | The duplicate-rule feature's copy loop copies 13 named fields from a source rule to a newly-created rule and calls the sibling module's own real entity-save method — this **is** subject to whatever field-level validation the sibling `Level800rules` module's own entity class defines (out of this module's own blueprint scope to fully characterize), unlike the header save flow's raw rule-field updates (PBL800-RULE-009), which bypass entity validation entirely. | Duplicate-rule action | Level800rules fields (copied set) | Entity-level validation (external, unconfirmed depth) | Inferred |
| PBL800-RULE-011 | The product-count lookup function's underlying query is **structurally broken** (a missing keyword makes it a SQL syntax error) — meaning the product-count tooltip feature is non-functional today, independent of any injection concern. | Product-count tooltip request | N/A (query never succeeds) | Broken — feature non-functional | Confirmed |
| PBL800-RULE-012 | A browser-layer function blocks a set of special characters from Price Book Name at entry time — **no server-side re-check of this character set exists anywhere in the header save flow.** A direct submission bypasses this entirely; combined with PBL800-RULE-009's unbounded-column-name finding, this client-only check provides no actual security value even though its apparent intent (blocking characters that could break later string-matching logic) is legitimate. | Header create/edit (client-side) | Price Book Name | Client-only, not enforced server-side | Confirmed |
| PBL800-RULE-013 | The same client-side validation function's fallback is the shared, generic required-field checker, driven by field-metadata arrays — per the entity catalog's governing entities, this only covers the 3 header fields that have field-metadata rows; the other 6 substantive header columns have no client-side validation coverage either. | Header create/edit (client-side) | Header fields lacking field-metadata | Client-only, partial coverage | Confirmed |
| PBL800-RULE-014 | The "set as default" and "mass-delete rules" mass actions both gate on exactly one row being selected, with a client-side alert if more than one is selected — a **client-side-only** single-selection constraint. The "set as default" server-side handler itself only ever reads the *first* id from a submitted list, so even a multi-id submission bypassing the client gate would silently apply the default-flag change to just the first id, not fail loudly — a silent partial-success rather than a rejected request. | Mass-action selection | Selected row set | Client-only guard; server silently truncates rather than rejects | Confirmed |

<!-- Severity: hard block / warning / auto-remediation / not a block (side-effect only)
     Confidence: Confirmed (explicit source) / Inferred (deduced, needs verification) -->

## Open Questions

- PBL800-RULE-010's exact depth of entity-level validation performed by the sibling `Level800rules`
  module's own save method is out of this module's own blueprint scope to fully characterize —
  flagged Inferred rather than Confirmed for that reason.
- The module's four Critical + two High security findings (concentrated in the header save flow, the
  product-count lookup, the "set as default" mass-action, and the Apply-to-Accounts bulk-write flow)
  were surfaced incidentally while cataloging these rules and are documented in full in
  `risks-and-open-questions.md`, not restated here.
- The full rule catalog with legacy-source file:line citations remains at
  `blueprint/module/Pricebooklevel800/02-validation-rules.md` for re-verification if any rule above is
  ever questioned.
