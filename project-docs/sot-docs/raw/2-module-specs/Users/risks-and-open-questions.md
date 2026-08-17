# Users — Risks & Open Questions

Source: `docs_from_blueprint/module/Users/09-risks-and-open-questions.md`, itself from
`blueprint/module/Users/07-risk-findings.md` ("Doc1 Pass 7") and
`blueprint/module/Users/08-consolidation-review.md` ("Doc1 Pass 8", the master consolidation/
rollup pass).

## Explicit urgency callout — two findings need legacy-system remediation now

The source blueprint's own final verdict explicitly states that two of the findings below are
**live, directly exploitable/triggerable defects in the current production system, independent of
any rewrite timeline** — "patch the legacy system now" items, not "note it for the design doc"
items: **R1** — the fully-traced `deleteRole()` mechanism is a confirmed root cause of a **prior
real data-loss incident** on the project's dev environment, and no guard has been added anywhere in
that call chain since the incident occurred; the same one-line fix that would have prevented it is
still absent today. **R2** — the SQL-injection sites in the ordinary clock-in/out endpoint are
newly discovered by this blueprint effort and reachable by **any authenticated user**, not an
admin-only screen — a materially lower bar than R1's admin-only entry point. The blueprint
additionally names **R5 (no server-side password complexity) and R6 (no account lockout)** as
compounding each other into a materially weak authentication perimeter that should not wait for a
rewrite either.

## Risk Register

22 findings: 2 Critical, 6 High, 2 Medium-High, 4 Medium, 1 Low-Medium, 5 Low. Consolidated from the
source blueprint's Pass 7 (risk re-verification) and Pass 8 (final consolidation, which
additionally promoted 7 findings documented in Pass 2 but never carried into Pass 7's own backlog).

| ID | Finding | Severity | Impact | Source |
|---|---|---|---|---|
| USR-RISK-001 | `deleteRole()`'s empty-parameter full-role-subsystem wipe, root cause now fully traced: an empty/missing role-delete identifier flows past a parameterized lookup that correctly returns "no such role," but the caller's own null-handling then constructs a second, differently-shaped query whose `LIKE` match against a `null`-coerced-to-`"%"` pattern matches essentially every role in the system; `deleteRole()` then iterates that full role list and unconditionally deletes each one's Profile, Role-Profile mapping, Group memberships, and Sharing Rules, then the role row itself. | Critical | This is the confirmed, exact mechanism of a prior real data-loss incident — not a hypothesis. | Doc1 Pass 7/8 |
| USR-RISK-002 | SQL injection in the ordinary clock-in/clock-out ajax endpoint — both the clock-in INSERT and the clock-out UPDATE splice unescaped, unparameterized request values directly into live SQL, reachable by any authenticated user via the routine clock-in/out action, not an admin-only screen. | Critical | Directly exploitable by any authenticated user. | Doc1 Pass 7 |
| USR-RISK-003 | SQL injection in the Personal Day / Time Off submission forms — a free-text description field is spliced unescaped into both forms' INSERT statements, reachable by any authenticated user submitting their own personal day. | High | Same class as R2, on a different endpoint. | Doc1 Pass 7 |
| USR-RISK-004 | A live, DB-verified data-corruption bug: the Personal Day table's user-identifier column is typed to hold only two characters, while live user ids run to seven digits — any submission by a real user with an id ≥ 100 silently truncates and misattributes that row's ownership rather than erroring (confirmed via a live query against the dev database, non-strict SQL mode). | High | Silent ownership misattribution for a significant share of the user base. | Doc1 Pass 7, confirmed via live query |
| USR-RISK-005 | Password complexity is entirely client-side and toggle-gated — no file anywhere in the module contains a server-side length, character-class, or reuse/history check at any layer, for any password-set path (interactive change, CSV import, direct admin reset). | High | Weak authentication perimeter, compounds with R6. | Doc1 Pass 2/7 |
| USR-RISK-006 | No persistent, DB-backed account-lockout/login-rate-limiting exists — the only failed-login tracking is a session-scoped counter that only logs (never blocks) and resets on session loss; a scripted attack that doesn't preserve session state never accumulates a count at all. | High | Compounds with R5 into a materially weak authentication perimeter. | Doc1 Pass 2/7 |
| USR-RISK-007 | Payroll silently excludes the 96% of live time-clock rows that are still open — a defensive guard clause (added to prevent a garbage negative duration) has the side effect of silently omitting nearly every recorded punch from every payroll total. | High | A systemic, silent business-impact undercount, not a crash. | Doc1 Pass 4/7 |
| USR-RISK-008 | Two independently-implemented, materially divergent overtime formulas, with no daily-overtime rule anywhere; for any report period longer than one week, the two formulas produce materially different, both plausible-looking totals for the same underlying punches. | High | Payroll/compliance-relevant divergence, no authoritative source of truth today. | Doc1 Pass 4/7 |
| USR-RISK-009 (R12) | The QuickBooks employee-sync queue is confirmed dead — every enqueue call site is commented out; the third of three QuickBooks integrations examined across this blueprint effort to show the identical disabled pattern. | Medium-High | Integration payload is built correctly but never actually sent. | Doc1 Pass 6/7 |
| USR-RISK-010 (R18) | The admin account's 2FA codes are additionally CC'd to a hardcoded developer-email list on every send, with no environment check (dev vs. production) visible anywhere in the file. | Medium-High | A standing, ungated visibility channel into the admin account's live login codes. | Doc1 Pass 2/7 |
| USR-RISK-011 (R9) | An auto-clock-out ajax path reads a clock-record identifier from the request but then targets its update using the current user's own identifier instead — two unrelated id spaces, so the update either matches a coincidentally-numbered clock record or matches nothing. | Medium | Confirmed defect in the Time Clock transition table (see `workflows.md`). | Doc1 Pass 3/7 |
| USR-RISK-012 (R10) | A secondary ajax-mode lockout-override check is dead: the real logic is commented out and replaced with an unconditional failure, forcing all real usage down a single working (iFrame-mode) path. | Medium | — | Doc1 Pass 2/7 |
| USR-RISK-013 (R19) | New-profile creation defaults every standard-action permission checkbox to "granted" whenever the corresponding request field is simply absent — a permission the profile-edit UI doesn't happen to render for a given module silently defaults to granted rather than denied. | Medium | Fail-open permission default. | Doc1 Pass 2/7 |
| USR-RISK-014 (R20) | Three compounding 2FA gaps: coverage is role-allowlist-gated (some users never see 2FA at all); code (re)generation has no rate limit (the 15-minute validity window can be indefinitely refreshed); and 2FA is silently unusable, with no admin alert or fallback channel, for any user with no personal email configured. | Medium | — | Doc1 Pass 2/7 |
| USR-RISK-015 (R21) | A narrow, confirmed role-permission staleness window: a session-cached role id, set once at login, is read directly by a small named set of unrelated features rather than being re-resolved per request — for exactly those features, a role change made to an already-logged-in user stays stale until their next login. | Low-Medium | Inconsistent with the primary permission-check surface's near-immediate effectiveness. | Doc1 Pass 3/7 |
| USR-RISK-016 (R11) | A barcode-label print output's cloud-print delivery branch references a variable that is never assigned anywhere in the file, likely making that branch permanently unreachable as written. | Low | — | Doc1 Pass 5/7 |
| USR-RISK-017 (R13) | A legacy login-check method builds unparameterized SQL (a live-looking injection shape) but is confirmed dead code with zero live callers repo-wide. | Low | — | Doc1 Pass 2/7 |
| USR-RISK-018 (R14) | An architectural placement issue: several files physically living inside this module's directory operate on Leads/Calendar/Contacts/generic cross-module data entirely — a documentation-clarity risk for rewrite scoping, not a functional defect. | Low | — | Doc1 Pass 6/7 |
| USR-RISK-019 (R15) | A small number of unparameterized-but-bounded queries (values already confirmed-valid via a prior parameterized match) are inconsistent with the rest of the codebase's parameterized-query convention, though not independently exploitable with today's evidence. | Low | — | Doc1 Pass 2/7 |
| USR-RISK-020 (R16) | Two same-named-but-different duplicate-username/last-admin-demotion guard functions exist; the fully-implemented server-side one is never called from the real save path, so neither protection is actually enforced today despite the guard code already existing and having been fully validated. | Low | Unusually cheap to fix relative to its severity. | Doc1 Pass 2/7 |
| USR-RISK-021 (R17) | Zero required-field enforcement exists anywhere in the entity-save layer; whatever required-field UX exists is client-side JS only. | Low | — | Doc1 Pass 2/7 |
| USR-RISK-022 (R22) | The privilege-file and sharing-privilege-file generators have an implicit call-ordering dependency (the second `require`s the first's just-written output as bare global-scope variables); every caller found across the blueprint calls both in the correct order, so this is latent/structural, not a confirmed live bug. | Low | — | Doc1 Pass 2/7 |

## Ambiguous/unconfirmed field and table meanings

17 of 18 fields flagged as "Open Question" in the entity/field pass remain genuinely unresolved
after cross-checking every later blueprint pass — see `entities-and-fields.md` Known Gaps for the
full list. These require SME confirmation before being assigned normative meaning in a new schema;
they are **not** guessed at in this document. The 18th item, `vtiger_mail_accounts1` (a
byte-for-byte schema duplicate of the Mail Account table), is a table-level item re-confirmed
live-existing but with zero confirmed readers/writers across every blueprint pass.

One coverage gap running the *other* direction was found: a "Help Message" field on the Time Clock
Record entity is used by the auto-clock-out transition but had no entry at all in the original
field catalog — added to `entities-and-fields.md` as this consolidation's own explicit addendum, per
the source blueprint's own recommended fix.

## Open Questions

| ID | Question | Why It's Ambiguous | Current Best Guess | Needs Confirmation? |
|---|---|---|---|---|
| USR-OQ-001 | Do any of the 17 remaining ambiguous field-meaning pairs (Job Title vs. Title, Created Date vs. Created Time, Calendar Color vs. Event User Color, Named Days vs. Work Days, Holiday Hours vs. the Holiday Assignment entity, etc. — full list in `entities-and-fields.md`) have a real distinct business meaning, or are they legacy duplicates? | No `vtiger_field` label or code citation resolves the relationship for any of these pairs across 8 blueprint passes. | No guess ventured — carried forward as unresolved. | Yes |
| USR-OQ-002 | Is a specific clock-out ajax action still exercised by any live UI element, or has it been superseded by the auto-clock-out safety net? | Dead/unreachable-code question not traceable from static reads alone. | Unknown. | Yes |
| USR-OQ-003 | What file is the confirmed write site for the Holiday/Personal/Sick/Vacation hours-type classification that payroll's `typeofhours` bucketing depends on? | The file lives entirely outside this module's scope and was never read by any pass of the source blueprint. | Unknown — flagged as the single highest-priority follow-up read for the payroll pipeline. | Yes |
| USR-OQ-004 | What currently drives the on-screen "payroll listing widget" now that its originally-assumed source file is confirmed dead? | The originally-assumed source is confirmed dead (computation/display body commented out past an unused switch). | Unknown. | Yes |
| USR-OQ-005 | What happens for any barcode-label ZPL "environment" configuration value other than the one confirmed to populate the template body? | Only one named environment value was confirmed to produce a populated template; every other value produces an empty template, an unhandled case. | Unknown — not traced to a fallback template or confirmed intentional. | Yes |
| USR-OQ-006 | Does the Clock-In Task Detail's "Labor Status" field have a confirmed enum of valid values? | No enum/allow-list validation exists in code, and no other confirmed write/read site was found. | Unknown. | Yes |
| USR-OQ-007 | Could the role/profile staleness finding (R21/USR-RISK-015) be narrower or broader than documented? | The main per-request bootstrap that constructs the current-user object for ordinary pages was never traced end-to-end. | Current finding stands as the best available evidence. | Yes |
| USR-OQ-008 | Can the admin/manager time-card override screens' unrestricted record-id-keyed update be reached with an id belonging to a different user? | Never traced to its calling UI. | Unknown — flagged as a possible cross-user data-integrity gap. | Yes |
| USR-OQ-009 | Do the four confirmed SQL-injection sites (R2/R3) have any access-control layer above the ajax-dispatcher level that would narrow their practical exploitability? | Not traced in any pass. | Assume no additional layer exists (worst case) until confirmed otherwise. | Yes |
| USR-OQ-010 | Is production SQL-mode consistent with the dev-snapshot finding behind the Personal Day truncation risk (R4/USR-RISK-004)? | Checked against a dev snapshot only. | Assume the risk applies in production until confirmed otherwise. | Yes |
| USR-OQ-011 | What does the settings-lookup function backing every toggle referenced throughout this spec (password-complexity toggle, 2FA toggle, IP-allowlist toggle, overtime-week-start toggle, payroll-column-display toggle, cloud-print toggle) actually do? | Never read by any pass. | Assumed to be a straightforward key/value lookup based on usage patterns, not independently confirmed. | Yes |
| USR-OQ-012 | Were the six QuickBooks GL-mapping fields' orphaned `tabid=0` metadata bindings ever independently re-verified against the live DB? | Not re-verified by any later pass (moot given the confirmed-dead QuickBooks sync, but the schema-drift question itself remains open). | No. | Only if QuickBooks sync is ever revived |
| USR-OQ-013 | What is `vtiger_link_fuse5_sub_sharing`'s relationship (if any) to the nine standard sharing-rule tables? | Surfaced by a table-name search but never inspected or traced in any pass. | Unknown. | Yes |
| USR-OQ-014 | Should the QuickBooks employee sync be treated as "live" in any rewrite's requirements? | Confirmed structurally dead (every enqueue site commented out) but the source document/hypothesis behind an original "Hrm relationship" citation does not exist in this checkout, and QuickBooks' own revival intent is unconfirmed. | Treat as dead/excluded pending explicit sign-off (see R11 in `entities-and-fields.md` and `build-guidance.md`). | Yes |
| USR-OQ-015 | What did the hours-sum queries compute for open punches *before* the current defensive guard clause was added? | Inferred from a shared comment tag, not confirmed via history. | Unknown. | No (historical curiosity, not blocking) |
| USR-OQ-016 | Is there an un-zero-padded-hour risk in one overtime formula's string-parsing? | Flagged as structural but never confirmed against a live query output. | Unknown. | Yes, before the overtime formula is finalized |
| USR-OQ-017 | Is the live payroll-report CSV export actually reachable from the current UI? | Code path confirmed live by direct read, but no "Export" button/link UI entry point was located. | Unknown. | Yes |
| USR-OQ-018 | What are the shared field-picker's and shared export engine's full internal mechanics? | Read only at the structural/dispatch level in the source pass. | Sufficient to confirm no Users-specific branch exists; internals not traced further. | Only if the shared mechanism itself is being rewritten |
| USR-OQ-019 | What is the actual sharing-rule precedence/conflict-resolution logic inside the privilege-computation engine? | Confirmed validation-free by a full-file keyword grep, but never read line-by-line. | Unknown — if a new design needs to model sharing-rule precedence/conflict resolution, a dedicated follow-up read is recommended before finalizing that logic. | Yes, before Phase 5 of `build-guidance.md` |

## Cross-document consistency note

The source blueprint's own consolidation pass specifically checked three items for cross-document
contradiction and found **none**: the `deleteRole()` finding is treated identically (and
progressively resolved) across the validation-rules pass and the final risk pass; the QuickBooks-
dead finding is treated identically across the cross-module pass and the risk pass; and the
login-lockout-is-ephemeral finding is a clean, additive extension across the validation-rules pass
and the status-lifecycle pass, not a divergent claim. No completeness gap of the kind found in other
modules' consolidation reviews was found here beyond the one field-catalog gap already noted above
(the Time Clock Record "Help Message" field).
