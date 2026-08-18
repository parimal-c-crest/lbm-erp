# UOM — Workflows

## Applicability

**No status or lifecycle model exists.** None of the five UOM entities (`lbm_uom_category`,
`lbm_uom_type`, `lbm_uom_group`, `lbm_uom_type_qty`, `lbm_uom_picking_hierarchy`) carries a status or
lifecycle field. Each carries only a `deleted` soft-delete flag (per the field catalog in
`entities-and-fields.md`), with delete/restore handled through `delete_uom()`/`add_uom()`/`update_uom()`
in `include/utils/commonfunctions.php`. This is stated explicitly, per this series' convention, rather
than inventing a status model that doesn't exist in the source. (Source:
`docs_from_blueprint/module/UOM/04-status-workflow.md` §4.1.) No multi-state workflow, approval step, or
other lifecycle transition was found for any UOM entity in this session's research — the remaining
sections of this file are kept per this docs-kit's convention of never deleting a file to mean "not
applicable," but there is no state/transition content to report beyond the soft-delete guard below.

## States

| State | Meaning |
|---|---|
| Active (`deleted = 0`) | Row is live and usable by any consumer. |
| Soft-deleted (`deleted = 1`) | Row is hidden from normal use; not physically removed. No "restore" UI path was confirmed in this session's research beyond what `add_uom()`/`update_uom()` implement. |

## Transitions

| From | To | Trigger | Guard Condition | Side Effects |
|---|---|---|---|---|
| Active | Soft-deleted (UOM Type) | `delete_uom($id, 'uomtype')` | In-use check: no `vtiger_productcf` row (via `lbm_uom_group`, across all eleven role FK slots) references this type; check uses an unescaped `$id` (see `risks-and-open-questions.md`, UOM-RISK-002) | `lbm_uom_type.deleted` set to 1, `userid` stamped |
| Active | Soft-deleted (UOM Category) | `delete_uom($id, 'uomcategory')` | In-use check: no `lbm_uom_group` row references this category | `lbm_uom_category.deleted` set to 1, `userid` stamped |
| Active | Soft-deleted (Picking Hierarchy row) | `delete_uom($id, 'delete_picking_hierarchy')` | None confirmed | `lbm_uom_picking_hierarchy.deleted` set to 1, `userid` stamped |

Whether `delete_uom()`'s in-use check for a UOM Type covers all reference points — a type can be
referenced via any of eleven role-specific FK slots on `lbm_uom_group`, or via
`lbm_uom_type_qty`/`lbm_uom_picking_hierarchy` rows — was not independently traced in this session
(`docs_from_blueprint/module/UOM/04-status-workflow.md` §4.2; open question also in
`risks-and-open-questions.md`).

## State Diagram

```
[Active] --delete_uom()--> [Soft-deleted]
   ^ (guarded by in-use check on UOM Type / UOM Category; unconditional on Picking Hierarchy row)
```

No reverse (restore) transition was confirmed in this session's research.
