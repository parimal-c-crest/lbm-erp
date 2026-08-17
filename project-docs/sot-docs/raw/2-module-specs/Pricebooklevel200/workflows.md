# Pricebooklevel200 — Workflows

> Keep this file even if this module has no lifecycle/state behavior — state that explicitly below
> rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/Pricebooklevel200/04-status-workflow.md`, itself transcribed from
`blueprint/module/Pricebooklevel200/03-status-lifecycle.md` ("Pass 3").

## Applicability

Applicable. Unlike a module with a single, thin lifecycle, the Price Sheet header entity carries **two
independent status dimensions**, plus a rule-line-level soft-delete dimension, plus two date/succession-shaped
fields that were specifically checked for lifecycle-gate behavior and confirmed not to function as one. All are
documented below; none is omitted or range-summarized.

## States

### `mps_status` — a real, working, live-consumed business-status gate

| State | Meaning |
|---|---|
| Active | The sheet participates in live pricing resolution. Live-data share on the source blueprint's dev snapshot: 13 of 14 (92.9%) non-deleted rows. |
| Inactive | The sheet is excluded from pricing resolution entirely. Live-data share: 1 of 14 (7.1%). |

**Confirmed as a live pricing gate**: the pricing-computation function's own header-row lookup requires this
field to equal `Active` — a sheet flipped to Inactive is excluded from pricing resolution the instant the flip
occurs, even though its rule rows remain fully intact and non-deleted underneath it.

### `deleted` (soft-delete, Price Sheet header) — guarded by the wrong entity class

| State | Meaning |
|---|---|
| 0 (active/present) | Row present. Live-data share: 14 of 15 (93.3%). |
| 1 (soft-deleted) | Row soft-deleted. Live-data share: 1 of 15 (6.7%). |

### Rule-line `deleted` — bulk, sheet-wide delete, no per-rule guard

| State | Meaning |
|---|---|
| 0 (active) | Row present. 187 of 187 (100%) on the source blueprint's dev snapshot — no soft-deleted rule rows exist there. |

## Transitions

| From | To | Trigger | Guard Condition | Side Effects |
|---|---|---|---|---|
| *(row created)* | Inactive (system default) or Active (system-set explicitly by the job-scoped save variant) | Sheet created via any of the module's save actions | None — no validation on the value written | None beyond the field write itself |
| Active (`mps_status`) | Inactive (or vice versa) | Standard entity edit, if the edit form includes the status field | **None found** — any user with edit access can flip a sheet's status regardless of whether it is currently assigned to any account or referenced by a job | None found — no cascading effect on account assignments or rule rows when a sheet is deactivated |
| *(row created, header `deleted`)* | 0 | Standard create flow | Sheet-name presence (whatever the generic save machinery enforces off the entity's own thin declared field list — see PBL200-RULE-002/006) | None beyond the row itself |
| 0 (header `deleted`) | 1 | The module's standard delete action | **Confirmed absent for this entity**: the module's own delete action instantiates an unrelated module's entity class, not this module's own Price Sheet entity (PBL200-RULE-014) — no guard specific to this module's own usage (e.g. "is this sheet still assigned to any account") exists anywhere, because the delete path is not, in practice, executing against this entity at all | Unknown — depends entirely on the generic delete helper's own internal resolution logic when handed a mismatched entity/module pair, not traced to completion in the source blueprint |
| 1 (header `deleted`) | 0 | *(no code path found)* | N/A | N/A — confirmed absence of any restore/undelete path anywhere in the module's own files |
| *(row created, rule-line `deleted`)* | 0 | Two confirmed bulk-insert paths (the sheet-copy feature; the sales-order-line-item auto-seed) | None found | None — **Open Question**: no dedicated "insert one new blank rule row" interactive action was located in the source blueprint's own file set; either such an action exists in code not isolated as distinct by this pass, or new rows are only ever created via the two bulk paths found |
| 0 (rule-line `deleted`) | 1 | The job-scoped save variant's "delete rule" request branch | **None** — deletes **every** rule row for the given sheet name unconditionally, with no per-rule targeting and no check of any individual rule's own state, despite the request parameter being named in the singular | Every rule for the named sheet is soft-deleted in one statement — a bulk, sheet-wide operation, not the per-rule operation its own naming implies |
| 1 (rule-line `deleted`) | 0 | *(no code path found)* | N/A | N/A — confirmed absence of any rule-level restore path |

**Contrast**: the business-meaningful "don't price against this sheet" gate (`mps_status`) is correctly wired
into the live pricing engine with no delete-time guard of its own; the structural soft-delete gate has no
confirmed-working guard at all, because the file that should implement one targets the wrong entity. Whether
the pricing engine's own soft-delete filter still correctly excludes a sheet soft-deleted via whatever the
mismatched-entity delete action actually ends up doing is not resolvable without completing that trace —
carried forward in `risks-and-open-questions.md`.

### `mps_end_date` and "Future Master Price Sheet" — named like effective-date/succession gates, confirmed **not** enforced

`mps_end_date` (End Date): confirmed **not** read anywhere in the live pricing-computation function's own
traced query logic — the function's only header-row filter is soft-delete + sheet-id + `mps_status = Active`,
with no date comparison against "today" anywhere in that statement or the surrounding function body. The field
**is** read and displayed by one UI callback (pushing the value into a parent-window field during job-scoped
sheet creation) — a display/informational use, not a pricing-computation gate. **9 of 14 live sheets carry a
non-NULL End Date, several of them already in the past relative to the source blueprint's own snapshot date,
yet those sheets remain `Active` and would still be selected by the pricing engine's own query if referenced by
an account's assignment** — a confirmed, live "expired but still pricing-active" gap, not merely a theoretical
one.

"Future Master Price Sheet" (`.future_mps`): no read of this field found anywhere in the source blueprint's
search scope. Structurally present, captured at save time if the edit form includes it, with no confirmed
consumer — the same "captured, not confirmed consumed" shape as `mps_end_date`, but with no even-partial
display use found.

### `.override100level` — no confirmed reader found

Re-confirmed by a status-focused re-read: no code path in the module's own files or the live
pricing-computation function reads this column. Not independently a lifecycle finding beyond what is already
flagged in `entities-and-fields.md` — cited here only to confirm the status-focused pass did not surface a
reader either.

## State Diagram

```
  Price Sheet header — TWO independent status dimensions:

    mps_status (Active/Inactive) — a REAL, working pricing gate:

      (sheet created, default Inactive unless explicitly set Active)
             |
             v
        Active <--[no guard of any kind -- any edit-save can flip
                    this value regardless of live account assignments]--> Inactive
                    (excluded from the live pricing-resolution query the
                     instant this flips)
                    (no reverse-transition guard either, but the reverse
                     IS possible -- same unguarded save path both ways)


    deleted (soft-delete) -- guarded by the WRONG entity class:

        0 --[the module's own delete action instantiates an unrelated
             module's entity, not this module's own -- no
             module-specific guard exists at all]--> 1 (?)
             (actual resulting behavior depends on the generic delete
              helper's own internals when handed a mismatched entity --
              not confirmed in the source blueprint)
             (no reverse transition found)


  Rule-line deleted -- bulk, sheet-wide delete, no per-rule guard:

        0 --[the job-scoped save variant's "delete rule" branch --
             deletes EVERY rule for the named sheet in one statement,
             despite the singular request-parameter name]--> 1
             (no reverse transition found)


  mps_end_date -- captured, displayed in one UI callback, NOT read as a
  pricing gate anywhere in the traced pricing-computation path. 9 of 14
  live sheets carry a non-NULL value; several are already in the past
  on the dev snapshot yet remain Active and pricing-eligible.

  future_mps -- captured, no confirmed consumer found anywhere.

  override100level -- captured, no confirmed consumer found anywhere.
```

## Required consideration for a new implementation

The source blueprint's implementation plan preserves `mps_status` unchanged as the live pricing gate, and treats
the delete-guard gap as something that should get a real, working guard for the first time (verifying no live
account assignment still references the sheet before allowing deletion) rather than being carried forward as-is.
Whether `mps_end_date` should become an enforced pricing gate is explicitly left open pending
subject-matter-expert confirmation — the source blueprint's own recommendation is to implement it as an
optional, off-by-default gate so no tenant's live pricing silently changes the moment it is introduced, not to
silently wire it in or silently drop the field. This tech-agnostic spec does not itself resolve the open
question of whether `mps_end_date` enforcement is the intended business behavior — see
`risks-and-open-questions.md`.
