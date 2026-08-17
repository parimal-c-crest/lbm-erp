# ProductTracking — Known Risks & Open Questions

Part of the ProductTracking tech-agnostic module spec. Source:
`blueprint/module/ProductTracking/07-risk-findings.md` (Doc1 Pass 7) and
`08-consolidation-review.md` (Doc1 Pass 8, the master rollup), ultimately derived from
`blueprint/module/ProductTracking/`.

## 9.1 Master risk register (13 findings: 4 Critical, 4 Medium, 5 Low/Informational)

Consolidated from Pass 7 (risk re-verification) and Pass 8 (final consolidation pass, which found no
additional undiscovered findings requiring promotion beyond Pass 7's own register — the cleanest such
outcome of any module in this series to date).

**Critical (4) — the widest count of any module blueprinted in this series relative to file count**

1. **SQL injection in the ListView's `pricingavail` search branch** — a request parameter is
   concatenated completely unescaped into the list-filter clause, reachable via an ordinary GET request
   to the module's own default entry point. No additional permission check beyond standard session
   authentication guards this branch. **Mitigation for a new implementation**: the security-by-
   construction requirement (R3, this module's entities-and-fields documentation) — parameterize with a
   bound placeholder, and make raw string-interpolated SQL structurally unavailable everywhere, not just
   this one call site.
2. **SQL injection in the product-variant detail popup** — a request parameter identifying the tracking
   row is used completely raw, with no bind-array argument at all, reachable via the module's
   product-variant detail-popup ajax endpoint. **Mitigation**: bind as a parameter, per the same R3
   requirement.
3. **SQL injection in the entity save hook's cost-field splice, directly reachable through the
   inline-edit endpoint's mass-assignment gap** — the widest-blast-radius of the four, since it is
   delivery-chained through the module's own everyday inline-edit endpoint using only a targeted field
   name against any existing record id (15,013 live rows to choose from). **Mitigation**: parameterize
   the underlying write, and independently add a field-name allow-list to the inline-edit endpoint's
   successor command (closing both the delivery mechanism and the underlying splice), per R3.
4. **SQL injection in the shared writer function's WAC lookup, reachable from the mobile-scanner
   external webservice** — a request-payload value is concatenated unescaped, fed directly from the
   external scanner device's own webservice request. **The first confirmed SQL-injection finding in this
   series reachable from outside the application's own session-authenticated web UI entirely** — a
   genuinely distinct exposure class from every other finding in this series, all of which required at
   minimum a logged-in web session. **Mitigation**: parameterize the underlying lookup; separately,
   confirm the scanner webservice's own authentication requirement (Open Question 13 below).

**Medium (4)**

5. **Net Cost and Accounting Net Cost compute from two different cost-basis columns on the same save, on
   any non-default GP-basis setting** — a confirmed formula divergence, not a security issue, but a real
   data-integrity risk for any location running a non-default cost-accounting basis. See this module's
   financial-pricing-logic documentation.
6. **Push To Quick Book holds an empty string (neither `Yes` nor `No`) on 990 of 15,013 live rows** — the
   writer producing these rows was not identified.
7. **A listview column reference uses a table alias with no corresponding join declared elsewhere in the
   entity class** — whether this produces a broken listview column or gracefully falls back to the base
   table's own column was not resolved; flagged rather than asserted as a confirmed defect.
8. **Accounting Net Cost's three override layers have no confirmed mutual-exclusivity guard** — not
   observed conflicting on live data, but the code shape permits it. See this module's
   financial-pricing-logic documentation.

**Low / Informational (5)**

9. **Six files carry confirmed, unadapted Campaigns-module copy-paste artifacts** — a dead currency-
   conversion block, an always-blank record-title assignment confirmed **live** (not merely dead code, on
   the module's own everyday record-view page), two files whose relation-table writes target a different
   module's own tables entirely, and one JS file referencing form fields that do not exist on this
   entity's own edit form. Candidates for exclusion, not migration, in a new implementation's scope
   decision — the widest share of one module's own file count carrying this specific defect class of any
   module in this series to date (6 of 20 files).
10. **`.sellprice` is confirmed dead on all 15,013 live rows** — every traced writer sets it to blank
    explicitly; no code path computes a real value.
11. **The entity save hook's bin/zone/shelf WMS-branch splice is unparameterized but second-order** —
    stored DB-lookup values, not request-supplied — low practical exploitability today, worth
    parameterizing as defense-in-depth regardless.
12. **A bare base64-decode call exists in the ListView's `pricingavail` branch, not itself exploitable** —
    a clean-ish negative finding, noted alongside that branch's actual injection (Finding 1).
13. **No wrong-entity-class instantiation found anywhere in the module** — a clean negative finding on
    this specific systemic-bug class, worth recording since it rules out a pattern several sibling modules
    in this series confirmed for themselves.

## 9.2 This module's calibrated risk framing, carried forward from the blueprint's own consolidation review

The blueprint's own final consolidation pass is explicit that this module — the ninth consecutive module
carried through this series with at least one confirmed, live, unmitigated SQL injection — carries the
widest Critical-finding-per-file-count ratio of any module in the series to date (20 files, roughly 0.2
Critical findings per file), and should be ranked at the **higher-urgency end** of the series' risk
stack, not the lower end (Pass 8 §6):

- **Two of the four findings (the `pricingavail` branch, the product-variant detail popup) are reachable
  through the module's own everyday, session-authenticated UI**, matching the reachability profile of
  most prior modules' own Critical findings.
- **The third (the entity save hook's cost splice, chained through the inline-edit endpoint) is reachable
  through a routine inline-edit endpoint using nothing more than an existing record id** — arguably as
  exposed as any Critical finding in this series, since the endpoint shape is a routine, everyday-use ajax
  call every module in this codebase's own detail-view inline-edit feature uses identically.
- **The fourth (the shared writer function's WAC splice via the mobile-scanner webservice) is the first
  confirmed SQL-injection finding in this series reachable from outside the application's own
  session-authenticated web UI entirely** — a genuinely distinct exposure class, pending confirmation of
  the scanner webservice's own authentication bar (Open Question 13).
- **Recommendation, restated from the blueprint's own deployment-facing document**: this should be
  treated as a "patch the legacy system now" item at the higher end of this series' remediation-urgency
  stack, with the mobile-scanner-reachable finding in particular considered for immediate, standalone
  legacy-system remediation ahead of and independent of any rewrite timeline, given its external
  reachability profile.

## 9.3 Master open-questions list (13 items, grouped by theme)

Consolidated from all eight blueprint analysis passes.

**A. Schema/labeling ambiguities (3 items)**
1. Whether the "Product Description" field's cross-table registration (against the Products entity's own
   name column, not this entity's own table) is a configuration error or an intentional cross-module
   registration.
2. The exact business meaning of "M2" (the field this entity resyncs from a product custom column on
   every save) — never identified by any pass.
3. Why the location field `Cost`/`Net Cost` hardcode as their own default differs from the field
   Accounting Net Cost's own "Average Landed Cost" GP-basis setting value maps to — two distinct
   location-level cost fields whose precise relationship was never resolved.

**B. `change_type` follow-ups (3 items)**
4. Whether `'Sales Order - Manual QoH Update'`, `'Quick Edit'`, and `'Product Cut'` are live `change_type`
   values on other tenants — zero live rows under those exact strings on this dev snapshot, but the code
   branches checking for them are real.
5. The relationship between `'Manual Physical Count Report'` and `'Manual Physical Count Report++'` — two
   live, distinct values differing only by a suffix, not traced to a specific writer.
6. Whether `change_type = 'Manufacturing'` (found in the shared writer function's own callers) is live on
   any tenant — absent from this dev snapshot's distribution.

**C. Cross-module/writer-completeness follow-ups (3 items)**
7. Which specific writer(s) among the ≥26 confirmed callers produce the 990 rows with a blank
   `push_to_qb` value — not identified.
8. Whether any of the 22 grep-confirmed-but-not-full-read writer files pass request-derived values into
   the entity's own field map the way the mobile-scanner webservice and the inline-edit endpoint do — a
   full-read sweep of all ≥26 writer files would be needed to rule further injection candidates in or out
   beyond the four confirmed.
9. PurchaseOrder's own receiving-variance PDF report's use of ProductTracking data — not read; whether it
   recomputes or merely displays this module's own cost/QoH figures is unconfirmed.

**D. Framework/shared-code boundaries (3 items)**
10. The generic shared delete helper's own internals — not read; whether it performs any further
    integrity/permission check beyond the module's own presence check is unconfirmed.
11. The shared framework's generic where-condition builder's internals for the non-`pricingavail`
    ListView path — not traced to its terminal query construction.
12. Whether the listview's `'crmentity'` table-alias reference (with no corresponding join declared
    elsewhere) produces a broken "Created Time" listview column or a graceful fallback to the base
    table's own column — shared-framework internals out of the blueprint's own budget.

**E. Security-scope follow-up (1 item)**
13. The mobile-scanner webservice's own authentication requirement for the shared writer function's call
    chain — not traced; material to Finding 4's exact exploitability bar.
