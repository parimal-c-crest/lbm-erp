# Users — Outputs

> Keep this file even if this module produces no documents/reports/exports — state that explicitly
> below rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/Users/06-outputs.md`, itself from
`blueprint/module/Users/05-outputs-documents.md` ("Doc1 Pass 5"), design treatment from
`blueprint/module/Users/09-implementation-plan.md` §9 ("Doc2 §9").

## Applicability

This module produces documents/reports/exports — applicable, not N/A. Unlike a module with its own
dedicated document-rendering class, **Users has no module-specific output-generation engine of its
own** — consistent with its framing as a security/identity/timeclock module, not a
document-producing one. What output surface exists falls into three unrelated buckets, each
independently implemented: one standalone barcode-label generator; two independently-implemented,
duplicated CSV/ZIP payroll export blocks (the same "duplicated-not-shared" pattern found throughout
this module's payroll math, extended to the output layer); and a cross-module generic export
mechanism the module plugs into via one polymorphic method rather than owning any export logic
itself (repo-wide, not Users-specific — nearly a dozen other modules implement the identical
contract).

| Output | Purpose | Trigger | Required Data | Audience | Total-Source (if applicable) |
|---|---|---|---|---|---|
| User Barcode Label | Prints a scannable barcode label for a user, used for badge-based clock-in/clock-out and/or barcode-based login. | A print-label action against a specific user record, with label-layout parameters (box sizing/positioning, label type). | The target user's barcode value only — nothing else from the user record is read. If the barcode is empty, no barcode image is generated but the request still proceeds. | Internal — the user themself and/or timeclock-station staff; a physical badge/scan target, not a delivered document. | N/A — a label-image generator, not a report. |
| Time-Card Detail CSV Export | Exports the per-user, per-day clock-in/clock-out breakdown as a downloadable spreadsheet, for payroll processing/record-keeping outside the application. | Two request-driven variants on the time-card detail report page: a single-user export, or an all-active-users-at-a-location export looping the same per-user block. | The already-computed row arrays built earlier in the same request by the report-rendering code — no separate query for the export itself. | Internal (payroll/admin staff). | No independent recomputation — formats and streams values already computed by the report-rendering code earlier in the same request. |
| Payroll Listing Export | Exports the full payroll report table (all users' hours-type columns and overtime) for a selected date range, as a downloadable spreadsheet. Live in the payroll-report page itself; a separate "listing widget" ajax data-source file is confirmed dead (no export/output logic reachable in it at all). | A page-level export flag on the payroll-report page itself. | The date-range column headers and the fully-populated per-user rows, already built by the same request's report-rendering loop. | Internal (payroll/admin staff). | No recomputation — streams whatever the report-rendering pass already computed. |
| Generic User Record Export | Lets an admin export selected/filtered User records (the listview data) to a spreadsheet — the generic "Export" action available across most modules, applied to Users. | The "Export" action from the User ListView. | The module's own entry point is a 3-line include stub delegating to a shared, cross-module field-selection UI page — no Users-specific branch in that shared file. | Internal (admin performing the export). | N/A — a field-selection/CSV-generation UI, not a computed report. |
| Users ListView Export Query | Supplies the actual query determining which User fields/rows get pulled into the CSV once the field-selection UI (above) has been submitted — the query-construction half of the same export flow, not a separate output. | Not directly request-triggered — called polymorphically by the shared, repo-wide export engine once a module's export criteria have been resolved; a genuine, live, generic dispatch mechanism used by nearly a dozen other modules. | The core User table joined to role assignment and role name, plus a join resolving a default-transaction-type reference to a display name. Always scoped to non-deleted records. | Internal (admin performing the export) — same flow as the Generic User Record Export above. | N/A — a row-selection query, not a computed total. |

## Format / delivery mechanism detail (not captured by the table above)

- **User Barcode Label**: the barcode value renders as an image via a separate barcode-image
  generation script; this output's own job is building a ZPL (Zebra Printer Language) label
  template embedding that image reference, gated by a configured "environment" value — one named
  environment value populates the template body, any other value produces an **empty** template
  (an unhandled case, open item). The ZPL string is always written to a timestamped file. Delivery
  is a two-way fork: if a cloud-print-service toggle is on and a matching printer is configured, the
  label is pushed to a network/cloud print service; otherwise it falls back to a local/client-side
  render for browser-side printing. A variable referenced throughout the cloud-print delivery branch
  is never assigned anywhere in this file's own body — either it leaks in from an including page's
  session state (unconfirmed), or the branch is permanently unreachable, silently forcing every
  request down the local-render fallback regardless of the toggle's configured state.
- **Time-Card Detail CSV Export** and **Payroll Listing Export**: both assemble a quoted-CSV string
  (header + rows + totals, including a decimal-format total for the Time-Card export), wrap it in a
  ZIP archive, and stream it as a forced browser download — independently coded in each of the two
  files despite producing structurally identical output shape.

## Output open items

- Whether the cloud-print delivery branch (User Barcode Label) is actually reachable, given its
  unassigned variable, was not confirmed.
- The single-environment ZPL-template gate — what happens for any other configured environment was
  not traced to a fallback template or confirmed as intentional.
- Whether the payroll-report page's live CSV export is actually reachable from the current UI was
  not independently confirmed — the code path is confirmed live by direct read, but no "Export"
  button/link UI entry point was located.
- The shared field-picker and the shared export engine (Generic User Record Export / ListView
  Export Query) were each read only at their structural/dispatch level, not in full — sufficient to
  confirm no Users-specific branch exists, not to trace their full internal mechanics.

## New-implementation design treatment

Per the source blueprint's Doc2 §9, the new design does not force a shared engine where none exists
in the legacy system, but does eliminate the duplication found within each bucket: one
label-generation service (with the delivery-channel selection reading a correctly-populated
printer-name value, closing the confirmed gap); **one** export formatter reading from the payroll
pipeline's already-computed totals, replacing the two independently-coded CSV/ZIP blocks; the
confirmed-dead "listing widget" file is not ported. Users continues to participate in the
platform's generic export mechanism for the ListView export, supplying only its own field
list/query, not owning the export engine itself.
