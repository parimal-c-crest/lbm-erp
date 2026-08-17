# PurchaseOrder — Business Rules & Validation

> Every rule gets a stable ID (`PO-RULE-###`) so Stage 4's test docs can trace back to it.

Source: `docs_from_blueprint/module/PurchaseOrder/03-business-rules-and-validation.md`, itself
traced to `blueprint/module/PurchaseOrder/02-validation-rules.md`. The blueprint catalogs 26
numbered business/validation rules, verified directly against source — client-side
`PurchaseOrder.js`/`PurchaseOrder.jq.js` `alert()`/`bootbox.alert()` calls, and server-side PHP
guard clauses. Original legacy file:line citations are preserved below for re-verification.
Confidence is Confirmed for every rule below (each has a direct source citation); none are Inferred.

| ID | Statement | Trigger | Scope | Severity | Confidence |
|---|---|---|---|---|---|
| PO-RULE-001 | Vendor is required to build/search line items. | Attempting to build/search line items without a vendor selected | Header | Hard block (client-side only — `PurchaseOrder.jq.js:1318` `bootbox.alert("Please select vendor")`; `PurchaseOrder.js:1893/1922` `alert('select any vendor')`) | Confirmed |
| PO-RULE-002 | Ship-To Location (`mainlocation`) is required. | PO save | Header | Hard block (DB `NOT NULL` + `vtiger_field` uitype 1005 mandatory presence flag) | Confirmed |
| PO-RULE-003 | Subject is required. | PO save | Header | Hard block (`vtiger_field` level, `typeofdata='V~M'`) | Confirmed |
| PO-RULE-004 | PO Type must be selected before proceeding on the order-generation screen. | Advancing past the order-generation screen | Header | Hard block (client-side only — `PurchaseOrder.jq.js:1313` `bootbox.alert("Please select PO Type")`) | Confirmed |
| PO-RULE-005 | At least one Order Point / Manufacturer / Line Code / Sub-line / Product Division must be selected before generating a suggested PO. | Generating a suggested PO | Header / pre-edit screen | Hard block (client-side only — `PurchaseOrder.js:1090`, `:1139`) | Confirmed |
| PO-RULE-006 | Custom PO number (`cf_1103`) must be unique across three sources simultaneously: existing `vtiger_purchaseordercf.cf_1103`, the recycled-number table `fuse5_customnumbers_recycle` (scoped `module='PurchaseOrder'`), and buyout-PO numbers in `vtiger_sopopupvalues.boponum`. | PO number entry/change | Header | Hard block, but non-atomic — three separate, unsynchronized checks (`checkPONumAvail.php`; on edit, excludes the record's own id) | Confirmed |
| PO-RULE-007 | When changing an existing PO's number, the old number must currently exist in `lbm_iframepodetails`/`vtiger_sopopupvalues` before the rename proceeds. | PO number change | Header | Guard (`updatePONumberInTempTable.php`, `updatePONumberforSOBOPO.php`, guarded by a preceding `SELECT` returning rows) | Confirmed |
| PO-RULE-008 | RGN POs are number-prefixed `RGN`; EDI submission is explicitly blocked for them regardless of status. | Manual EDI submission | Header / EDI | Hard block (server-side — `manualSubmitEDI.php:16`, "RGN PO will not submit through EDI") | Confirmed |
| PO-RULE-009 | At least one product/line item must be selected before adding to the PO. | Adding a line item | Line item | Hard block (client-side only — `PurchaseOrder.js:3065/3082`, `PurchaseOrder.jq.js:1376`) | Confirmed |
| PO-RULE-010 | Quantity entry on the "order to X" screen must be an integer between 1 and 500. | Quantity entry on order-to-X screen | Line item | Hard block (client-side only — `PurchaseOrder.jq.js:71`) | Confirmed |
| PO-RULE-011 | "Days Inventory" and "Avg. Lead Time" fields must be valid integers. | Field entry | Line item / forecast | Hard block (client-side only — `PurchaseOrder.js:1012/1019/1338`) | Confirmed |
| PO-RULE-012 | "Weeks Prior" must be a valid integer. | Field entry | Forecast | Hard block (client-side only — `PurchaseOrder.js:1371`) | Confirmed |
| PO-RULE-013 | Vendor Line Code entry cannot be blank, and must not collide with a code already assigned to a different vendor. | Vendor line code entry | Line item | Hard block (client-side only — `PurchaseOrder.js:1938`, `:1954`) | Confirmed |
| PO-RULE-014 | Freight PPD (prepaid-discount) input must be numeric only. | Freight PPD entry | Line item / pricing | Client-side only, unconfirmed server enforcement (`PurchaseOrder.js:1990/2037` — no matching server-side numeric cast/guard found in `setVendorCurrency.php`/`setPPDValues.php`, which is itself flagged separately as a SQLi risk — see risks-and-open-questions.md PO-RISK-002) | Confirmed |
| PO-RULE-015 | At least one PO must be selected before opening the receiving screen. | Opening the receiving screen | Receiving | Hard block (client-side only — `PurchaseOrder.jq.js:408`) | Confirmed |
| PO-RULE-016 | At least one line item must be selected before a receiving/cancel action proceeds. | Receiving/cancel action | Receiving | Hard block (client-side only — `PurchaseOrder.jq.js:901/907`) | Confirmed |
| PO-RULE-017 | A PO cannot be deleted once it has reached a "committed" status: `reconciled='0' AND postatus IN ('Partially Reconciled','Completely Reconciled','Order Partially Received','Order Received in Full','Finalized','Fully Processed RGN')`. | PO delete attempt | Header / status | **Hard block (server-side — `Delete.php:14`, blocks deletion, redirects to Detail View)** — the module's core status-lifecycle guard against deleting an already-received/reconciled/finalized PO | Confirmed |
| PO-RULE-018 | RGN cancel-item selected SO line qty must match the PO line qty exactly, and the same SO line cannot be selected more than once per RGN batch. | RGN cancel-item selection | RGN | Hard block (client-side only — `PurchaseOrder.jq.js:838/844`) | Confirmed |
| PO-RULE-019 | A SalesOrder currently open for edit in another tab/session cannot be used for RGN linkage. | RGN linkage attempt | RGN | Guard, application-level optimistic-lock check, no DB backstop (`PurchaseOrder.jq.js:887`) | Confirmed |
| PO-RULE-020 | Template name is required to save a PO template. | Template save | Template | Hard block (client-side only — `PurchaseOrder.js:49`) | Confirmed |
| PO-RULE-021 | A template must be selected before load/delete actions. | Template load/delete | Template | Hard block (client-side only — `PurchaseOrder.js:56/180/194/207`) | Confirmed |
| PO-RULE-022 | Template names must be unique (implicitly per user/vendor scope). | Template save | Template | Client-side only, unconfirmed uniqueness guarantee (`PurchaseOrder.js:141`, against an ajax lookup result — no unique DB constraint found on `vtiger_potemplates.templatename`; see risks-and-open-questions.md PO-OQ-004) | Confirmed |
| PO-RULE-023 | A user cannot use a saved PO Type in a template unless their role is authorized for it. | Template PO-Type usage | Template / permissions | Role-gate, client-side only (`PurchaseOrder.js:265`) | Confirmed |
| PO-RULE-024 | Start Date and End Date must both be supplied for each forecast period, and Start Date must be chronologically before/equal-appropriate to End Date. | Forecast period entry | Forecast / scheduling | Hard block (client-side only — `PurchaseOrder.js:1382/1388/1395`, `PurchaseOrder.jq.js:2442/2450`) | Confirmed |
| PO-RULE-025 | PO merge is blocked while any target PO is actively being edited by any user. | PO merge attempt | Merge / duplicate | Guard (client-side only, no DB backstop confirmed — `PurchaseOrder.jq.js:1068`) | Confirmed |
| PO-RULE-026 | At least one PO must be selected to merge. | PO merge attempt | Merge / duplicate | Hard block (client-side only — `PurchaseOrder.jq.js:1305`) | Confirmed |

## Open Questions

- **Systemic server-side enforcement gap**: of the 26 rules catalogued, only three have a confirmed
  server-side enforcement point — PO-RULE-002/003 (both field-definition-level) and PO-RULE-017 (the
  delete guard). Every other rule's confirmed enforcement is client-side JavaScript
  `alert()`/`bootbox.alert()` calls, with no matching server-side guard located in this pass. This is
  flagged as the module's single most consequential unresolved question (mirrored in
  risks-and-open-questions.md §"Highest-priority unresolved question"): whether any undiscovered
  server-side enforcement exists today, and if not, whether client-side-only enforcement is something
  real users currently depend on in ways that would make a sudden strict server-side regime
  disruptive.
- **PO-RULE-006's non-atomicity**: three separate, unsynchronized uniqueness checks across two other
  modules' tables — flagged for a structural fix (a single unique index or dedicated
  number-sequence service), not merely a bug. See build-guidance.md Design Decision D-1.
- **PO-RULE-022's uniqueness guarantee**: no unique DB constraint was found backing the client-side
  "template already exists" check — see Known Gaps in entities-and-fields.md and
  risks-and-open-questions.md PO-OQ-004.
- The module's 14 confirmed SQL-injection findings (risks-and-open-questions.md) are a distinct
  concern from this validation-rule catalog, not restated here.
