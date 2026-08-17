# SalesHistory — Business Rules & Validation

> Every rule gets a stable ID (e.g. <MOD>-RULE-001) so Stage 4's test docs can trace back to it.

Source: `docs_from_blueprint/module/SalesHistory/03-business-rules-and-validation.md`, tracing to
`blueprint/module/SalesHistory/02-validation-rules.md`. 16 numbered rules (SLH-RULE-001 through
SLH-RULE-016) plus one unnumbered shared-infrastructure finding, all Confirmed by direct code read
unless noted. Original legacy file:line citations are preserved in the blueprint source, not repeated
below.

**Headline finding**: continuing a pattern found in every prior module blueprinted in this series,
SalesHistory carries a confirmed, live SQL injection reachable through its own ordinary EditView/Save
form submission (SLH-RULE-001) plus a second, independently-reachable Critical injection using the
identical unescaped value (the unnumbered finding below) — both restated at top severity in
`risks-and-open-questions.md`.

| ID | Statement | Trigger | Scope | Severity | Confidence |
|---|---|---|---|---|---|
| SLH-RULE-001 | The existing-row lookup interpolates all five key request fields (product number, line code, week, year, location) directly into a raw SQL string after only a trim operation, with an **empty parameter-binding array** passed to the query call — no escaping, no parameterization despite the call's shape suggesting one. | Every save with all five key fields present | The entire core entity table | Hard block-equivalent risk — **Critical, confirmed SQL injection, no mitigation** | Confirmed |
| SLH-RULE-002 | The save is gated on all five of product number, line code, week, year, location being non-empty — if any is missing, the operation aborts (client-side alert and redirect) without reaching the existing-row lookup or the save call. | Every save attempt | All five key fields | Hard block (client-side alert/redirect, not a server-side rejection page) | Confirmed |
| SLH-RULE-003 | None of the five key fields is validated for type/format beyond non-emptiness — week/year are not checked to be numeric, product number/line code/location are not checked against any allow-list or existence check. | Every save | All five key fields | Not a block — malformed values are accepted and saved | Confirmed |
| SLH-RULE-004 | Once the existing-row branch is taken, the six accumulator deltas are added to the existing row's stored values with **no type/numeric validation** — a non-numeric submitted delta produces silent type coercion rather than a rejection. | Every accumulate-into-existing-row save | Sell/Return/Lost-sale/Transfer-in/Transfer-out/False-loss Qty | Not a block — silent coercion | Confirmed |
| SLH-RULE-005 | `total_activity` is recomputed from the just-updated values in both the existing-row and new-row branches, with **no sanity bound** — an arbitrarily large or negative delta propagates straight into the persisted total. | Every save | Total Activity | Not a block | Confirmed |
| SLH-RULE-006 | The save call's own success/failure result is never checked before the redirect fires — the operation redirects unconditionally regardless of whether the save actually succeeded. | Every save that passes the presence gate | N/A | Not a block | Confirmed |
| SLH-RULE-007 | A shared side-effect function is called **before** the existing-row lookup, unconditionally, once the presence gate passes — this write fires even if the subsequent save later fails; the two writes are not transactionally tied. Also the location of a second Critical SQL injection (see unnumbered finding below). | Every save that passes the presence gate | Side-effect table | Not a block — orphaned side-effect-without-parent-save risk | Confirmed |
| SLH-RULE-008 | The entity class declares **no required-fields structure at all** — field-presence enforcement lives entirely in the Save handler's own five-field gate (SLH-RULE-002), not in the entity class itself. | Any save through this entity | N/A — absence-of-declaration finding | None | Confirmed |
| SLH-RULE-009 | The entity class's own save hook directly updates created-time/modified-time/creator-id/owner-id on first save, and this write is itself unparameterized (no bind-array argument). Every interpolated value at this point is system/session-derived, not a raw request value — lower risk than SLH-RULE-001, but still an unparameterized pattern worth closing structurally. | Every save (new-row and existing-row paths) | Created Time, Modified Time, Creator ID, Owner ID | Low/second-order | Confirmed |
| SLH-RULE-010 | The CSV-export query builder string-substitutes a joined display column into whatever filter-condition string it is passed, with no validation — but that string is always system-built by shared search/filter machinery, not raw user input reaching this function directly. | CSV export from the ListView | N/A — structural, not directly user-facing | N/A | Confirmed |
| SLH-RULE-011 | A listview sort-order helper reads a request parameter shaped like a record-id parameter (not a sort-direction parameter) and treats it as sort-direction — almost certainly a copy-paste artifact. No validation either way. **Compounding this**: the ListView's own sort-state persistence writes session keys this same read logic never reads back — sort-order persistence across requests is silently non-functional; every request falls back to the hardcoded default. | Every ListView render / sort action | ListView sort-order clause and session state | Not a block — a naming/logic bug plus a confirmed functional defect | Confirmed |
| SLH-RULE-012 | Delete aborts if the record-id request parameter is not set. | Every delete | Sales Activity record id | Hard block | Confirmed |
| SLH-RULE-013 | Once the presence check passes, the shared soft-delete framework helper runs unconditionally — this file itself performs no existence check on the record id and no check for any related/referencing data before delegating. The shared helper's own internal validation was not independently re-read in the source blueprint. | Every delete with a non-empty record id | Sales Activity row (soft-delete, via shared helper) | None are hard blocks in this file itself | Confirmed (helper internals not re-read — stated boundary) |
| SLH-RULE-014 | The inline field-save logic runs only if the record-id request parameter is non-empty; otherwise the endpoint returns a failure response and nothing is written or queried. | Every inline field edit | Sales Activity record id | Hard block (silent-failure response) | Confirmed |
| SLH-RULE-015 | The submitted field value is assigned directly to the entity's field map with **no allow-list of editable field names, no type/format check, no bounds check** — any field name/value pair the caller supplies is accepted and saved, the same mass-assignment-shaped gap found in every other module's equivalent endpoint across this series. | Every inline field edit | Any field editable via this endpoint | None are hard blocks | Confirmed |
| SLH-RULE-016 | `total_activity` is recomputed **unconditionally on every field edit**, not gated to only the fields that logically feed into it. The recomputed value is only echoed back to the caller when the edited field was specifically one of the two fields the interaction is nominally designed for — meaning a recompute silently happens and gets persisted on every other field edit too, without the caller being told the figure changed. | Every inline field edit | Total Activity | Not a block — silent recompute-and-persist most edits' own response doesn't surface | Confirmed |
| *(unnumbered — shared-infrastructure, cited by SLH-RULE-007)* | The same shared side-effect function SLH-RULE-007 documents interpolates one value **raw** into an `INSERT` statement against the side-effect table — only one of several parameters is bound via a placeholder; the line-code value reaching this function is the **same** raw, trim-only request value SLH-RULE-001 already found unescaped. A single malicious line-code value submitted through the module's ordinary Save form reaches two independent unescaped SQL statements in the same request. | Every save (both of the module's own write paths call this function) | Side-effect table | **Critical — confirmed SQL injection, no mitigation, reachable via the identical line-code request parameter as SLH-RULE-001** | Confirmed |

## Open Questions

- Both Critical SQL injection findings (SLH-RULE-001 and the unnumbered finding above), plus the
  session-key sort-order bug (SLH-RULE-011), are restated at top severity in
  `risks-and-open-questions.md` — this module's Critical findings are explicitly not to be treated as
  lower-urgency than any sibling module's equivalent findings, since both sit on the module's own
  everyday save path rather than a specialized endpoint.
- A further raw-SQL-construction pattern involving the module's own five-field key exists in
  SalesOrder's finalize routine (a second, independent writer of this module's data) — documented in
  `integrations.md` and `calculations.md` rather than here, since it is not a rule of this module's own
  code.
- Whether the shared soft-delete framework helper's own internal logic performs any existence/
  reference check before soft-deleting a row was not independently re-read in the source blueprint
  (SLH-RULE-013).

(Source: `docs_from_blueprint/module/SalesHistory/03-business-rules-and-validation.md`, full file.)
