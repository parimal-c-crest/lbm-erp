# Pricebooklevel300 — Outputs

> Keep this file even if this module produces no documents/reports/exports — state that explicitly
> below rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

## Applicability

**Applies, narrowly.** Pricebooklevel300 has **no PDF generation, no email-delivered document, and no
document-rendering pipeline of any kind anywhere in its files** — confirmed by a case-insensitive grep across
every file under the module for PDF/print/forced-download signatures, which returned zero matches
(`docs_from_blueprint/module/Pricebooklevel300/06-outputs.md` §6.1). This is the same "internal utility module,
no customer-facing document" shape found in several sibling modules across this blueprinting series. All
outputs described below are **interactive UI screens and one export action**, not documents in the sense the
`SalesOrder` pilot module's own ten print/PDF outputs are — this module produces no customer-facing paper or
file deliverable of any kind. It is kept as a real table (rather than "not applicable") because the one CSV
export is a genuine, real-SQL output surface with a confirmed structural defect worth documenting.

| Output | Purpose | Trigger | Required Data | Audience | Total-Source (if applicable) |
|---|---|---|---|---|---|
| ListView grid | The standard grid of all Sales & Promotions Books (name, description, plan type, etc.) — the module's main navigation surface. | Default module entry point. | Standard grid query against the plan-header table. | Internal (merchandising/pricing administration) | N/A |
| Detail View | A genuine read-only detail page for a single plan — unlike the `MPLPricePlan` sibling module's own equivalent (a pure redirect-to-edit-screen stub), this module's detail view renders an actual read-only page. | Opening a plan's read-only detail view. | Standard detail-view field/block assembly. | Internal | N/A |
| Rule-list grid (two near-duplicate render surfaces) | The module's actual working surface for a merchandiser: the plan's own scoped rule list, joined against any live, non-expired coupon attached to each rule. | Opening a plan's rule-list view — or, confusingly, the "Account Settings" modal, which renders the **same** content under a misleading label. | Plan header, rule rows joined to coupons, rule types, the shared linecode/subline/division catalogs. | Internal | N/A |
| Coupon-list fragment | The inline coupon list shown inside a rule's "Add Coupon"/"Add Mix-Match Coupon" modal — lets a merchandiser see, edit, or delete a rule's existing coupon codes. | Opening either coupon modal, or any add/update/delete action against a rule's coupon set (all re-render this fragment afterward). | Coupon rows filtered to the current rule; the *rendering* of coupon code/comments/rule id is unescaped (see PBL300-RULE-026). | Internal | N/A |
| Mass-apply-to-accounts picker | Assign/remove a plan to/from a selected set of Accounts. | A dedicated launcher function in the module's own client-side JS. | Selected account ids, the plan's own name, three raw-concatenated, injectable queries (see PBL300-RULE-027 to 030). | Internal | N/A |
| Mass-duplicate-rule picker | Duplicate selected rules to one or more other Sales & Promotions Books with an optional times-based adjustment. | A dedicated launcher function in the module's own client-side JS. | Two structurally broken SQL statements, one injectable query, one reflected-XSS response (PBL300-RULE-017 to 020) — the underlying primary read is confirmed broken, meaning this picker's own "duplicate to other books" action likely never successfully completes as coded. | Internal | N/A |
| Rule-types-priority reorder modal | Lets an administrator re-sequence the (currently single-row) rule-type catalog's display priority. | A dedicated launcher function in the module's own client-side JS. | The rule-type catalog for the render path; a raw, injectable per-id update for the save path (PBL300-RULE-021). | Internal | N/A |
| CSV Export — real SQL, but cross-module-mistargeted | As designed: the standard "Export" action, letting a user download the current set of plans as CSV. **As built**: the export query targets the rule sub-entity's own table, joined to attachment/user tables, using a field-permission check scoped to a *different* module's own tab, with the `WHERE` clause additionally embedding a session-stored value raw-concatenated into a `LIKE` string. Clicking "Export" would very likely produce a CSV of **rule** rows scoped by whatever session state happens to be in effect — not a CSV of the **plan headers** the ListView itself displays. | ListView "Export" action. | A real but cross-module-mistargeted SQL statement (see PBL300-RULE-003). | Internal (nominally) | N/A |

(`06-outputs.md` §6.2, output catalog items 1-8)

**Total-Source note**: because this module has no genuine "totals are always computed" risk analogous to
`SalesOrder`'s own client-trusted-total finding, no equivalent Total-Source requirement is needed for this
module's own outputs beyond the general expectation that any rendered price value reflect the current,
correctly computed state of the plan/rule data at render time — not a stale or client-supplied value
(`06-outputs.md` §6.3).

**Open items**: whether the CSV export's field-permission-scope mismatch causes a hard error, a
silently-wrong-but-non-erroring export, or something else entirely — not traced by the source blueprint;
whether the "Account Settings"-labeled rule-list duplicate confuses real users in production, or is
well-understood tribal knowledge; whether the mass-duplicate-rule picker's broken primary read has ever been
noticed/reported as a non-functional feature — none resolvable from static code alone (`06-outputs.md` §6.4).
