# ProductTracking Module Specification — Index

This folder is the tech-agnostic input specification for the ProductTracking business capability. It
is meant to be read by Claude Code (or a similar process) to generate a full, stack-specific
ProductTracking module documentation set (requirements, schema, API, UI, testing) later, once an
implementation technology stack has been chosen. Nothing in this folder invents new facts — it
reorganizes and lightly re-edits content originally consolidated from the 11-file ProductTracking
Business Blueprint (`blueprint/module/ProductTracking/`) into one file per topic, mirroring the
structure established by the SalesOrder pilot (`docs_from_blueprint/module/SalesOrder/`).

ProductTracking is the 19th module carried through this consolidation method. It follows the normal
pipeline pattern (a full, directly-sourced blueprint of its own, the same as SalesOrder, Products,
Location, etc.) — it is not a UOM-style extraction or an AccountStatement-style re-partitioning. Per
its own blueprint's headline finding, it is a small (20-file), single-real-entity **quantity-on-hand
(QoH) audit log**: one row per QoH-affecting event on a product/location combination (sale, return,
receiving, store transfer, manual adjustment, product-cut, physical count, import, etc.), recording the
previous/new quantity, a reason, a fixed classification, and a cost snapshot computed server-side at
save time. It carries its own generic vtiger CRUD scaffolding, but the real, load-bearing writes come
from at least 11 other modules plus 2 external-facing mobile-scanner webservice endpoints — the widest
confirmed writer fan-in of any module blueprinted in this series so far — and it carries the widest
count of confirmed Critical SQL injections (4) relative to its own file count of any module in this
series to date.

## Files in this folder

| # | File | Contents |
|---|---|---|
| 1 | `01-module-overview.md` | Module purpose, business context (the QoH-audit-log role, the write-target relationship to ≥11 writer modules), scope (in/out), and actors. |
| 2 | `02-entities-and-fields.md` | Full field-by-field catalog of the module's one real entity (35 physical columns, 31 CRM-labeled, no companion `*cf`/`*grouprelation` tables at all) and the governing architectural requirements a new implementation should carry forward. |
| 3 | `03-business-rules-and-validation.md` | All 21 numbered business/validation rules (PT-VAL-001 through PT-VAL-021), grouped by source file — the vestigial Save.php path, the entity save hook's cost-computation branches, Delete.php, the inline-edit ajax path, and the ListView/variant-detail search surface — including three of the module's four confirmed SQL injections. |
| 4 | `04-status-workflow.md` | The explicit finding that no real state machine exists for this module — `change_type` is a fixed classification tag set once at creation, not a lifecycle, and `push_to_qb` is a one-shot trigger flag, not a status. |
| 5 | `05-financial-pricing-logic.md` | The module's real, self-contained **costing** pipeline (four cost figures, three override layers) and the explicit finding that it has no pricing pipeline at all — `.sellprice` is confirmed dead on every one of 15,013 live rows. |
| 6 | `06-outputs.md` | The module's one output surface (a generic CSV export) and the explicit finding that it has no PDF, no email-delivered document, and no report/worklist screen of any kind. |
| 7 | `07-cross-module-integrations.md` | The module's boundary with ≥11 writer modules, an external mobile-scanner webservice (the module's one confirmed externally-reachable write path), QuickBooks, and a 12-report custom-report family that reads its data — this module's standout area. |
| 8 | `08-screens-and-user-flows.md` | The implied view/interaction structure — a read/search/export surface plus one inline-edit interaction and one product-variant detail popup — inferred from the entities, rules, status model, and outputs documented elsewhere, since the blueprint does not document UI screens directly. |
| 9 | `09-risks-and-open-questions.md` | The 13-item risk register (4 Critical, 4 Medium, 5 Low/Informational) and the 13-item consolidated open-questions list, grouped by theme. |
| 10 | `10-build-guidance.md` | The recommended rule-to-enforcement-layer mapping for all 21 business rules, the governing design decisions (one shared write-service contract, security-by-construction, one authoritative cost-basis resolver), and a phased build sequence. |

## Purpose of this folder

This specification exists to carry the SalesOrder pilot's documentation-extraction and build-guidance
method forward to a module whose shape is dominated by two distinct findings: the widest cross-module
writer fan-in documented in this series so far, and the highest concentration of confirmed Critical
security findings relative to file count. Every claim in these files traces back to the original
blueprint (file and section citations are preserved throughout, using the same "Doc1 §NN" convention
SalesOrder's own files use), and ambiguity found in the blueprint (unclear field meanings, unconfirmed
reachability, orphaned columns) is preserved as ambiguity here rather than resolved into an invented,
false-confident answer. The files are self-contained enough to read independently, but cross-link to
each other where a topic spans more than one file (e.g. the security findings touch validation, outputs,
cross-module, and risk alike).
