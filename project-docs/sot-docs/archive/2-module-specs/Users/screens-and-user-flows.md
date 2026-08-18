# Users — Screens & User Flows

> Views, fields, interactions, states. No component library or framework assumption.

Source: `docs_from_blueprint/module/Users/08-screens-and-user-flows.md`. The source blueprint does
not document UI screens directly (out of scope for its Pass 0 structural inventory, which catalogs
entry points/functions, not screen layouts) — this section infers the implied screen/interaction
structure from the entities, rules, status model, payroll pipeline, and outputs the blueprint does
document, expressed as views/fields/interactions/states rather than any specific UI framework,
mirroring the inference approach used by the SalesOrder pilot's own screens-and-user-flows file.

Unlike a module with two parallel "full" and "quick" versions of the same screen, Users' implied UI
surface is naturally organized into **distinct functional clusters**, each serving a different
actor group: login/session screens (public-facing, pre-authentication); user administration screens
(admin-facing CRUD over Users, Roles, Profiles, Groups, and Sharing Rules); self-service screens
(any authenticated user's own password, mail account, calendar/notification preferences, and
personal-day/time-off submissions); time-clock/payroll screens; and small settings/utility screens
(barcode printing, Word-template management, notification-scheduler toggles, org-wide sharing
configuration).

## Screen Inventory

| Screen | Purpose |
|---|---|
| Login view | Public, pre-authentication; includes barcode-login and 2FA-code-entry sub-states, and an already-authenticated-session redirect shortcut (USR-RULE-034). |
| User List view (admin-only) | A filterable (role/location/text search), paginated, sortable grid of users, with an export-to-file action. |
| User Detail view (read-only) | Displays the user header, an audit trail, and linked sales-account data for an existing user. |
| User Edit/Create view | The full create/edit screen: header fields, password fields (client-side complexity/confirmation checks with no full server-side equivalent), role/group assignment, and the long tail of preference/notification toggles. |
| Change Password modal/interaction | Old/new/confirm password entry, with a client-side complexity-pattern hint. |
| Role administration views | A role-hierarchy tree picker (expand/collapse/select), a drag-and-drop reparenting interaction (recomputing nesting depth), and a Delete Role confirmation flow. |
| Profile administration views | Create/Edit Profile form (with an ajax duplicate-name check), and the module/field/action permission grid. |
| Group administration views | Create/Edit Group form (ajax duplicate-name check), a member picker splitting a flat submitted list into users/roles/roles-and-subordinates buckets, and a Delete Group confirmation flow with a transfer-target picker. |
| Org-Wide Default Sharing view (admin-only) | A per-module access-level grid. |
| Sharing Rule administration views | Create/delete interactions against the (legacy) nine-variant, (new-design) unified sharing-rule concept. |
| Delete confirmation flows for User/Role/Profile/Group | Each with a "choose transfer-to target" popup step before the actual delete fires. **This is the module's highest-stakes interaction cluster.** |
| 2FA verification-code entry | A login-flow sub-state, role-allowlist-gated, with a 15-minute-validity code. |
| Protected-Area lockout-password prompt | A secondary credential re-entry modal for sensitive in-app actions (payment overrides, Store Transfer actions, End-of-Day, cash-drawer/deposit), distinct from primary login. |
| Time Clock interactions | A clock-in/clock-out action (button or barcode scan), a "what are you working on" annotation prompt, and admin/manager time-card override screens. |
| Personal Day / Time Off submission forms | Two distinct form shapes (whole-day-count vs. start/end-time-of-day) writing into one conceptual entity. |
| Payroll Report view | A date-range-scoped, multi-user report with per-hours-type columns and an overtime column, plus a CSV/ZIP export action. |
| Time-Card Detail view | A per-user, per-day clock-in/out breakdown with its own CSV/ZIP export. |
| Personal-Days listing widget | Admin-filterable listing of a user's (or all users') personal-day entries. |
| Barcode Label print action | A print-label interaction with layout parameters, forking to either a cloud-print-service handoff or a local/client-render fallback. |
| Mail Account administration views | Add/Edit and Detail views for a user's personal webmail connection settings. |
| CSV Import wizard (admin-only) | A three-step flow: upload, column-mapping, and a validate-then-create/update processing step. |
| Mass Update view (admin-only) | A field/value picker for bulk User edits, scoped by selected user ids or role-based criteria. |

## Flows

- **Login flow**: entry at the Login view → credential/barcode resolution (USR-RULE-027) → 2FA
  sub-state if role-allowlisted (USR-RULE-028) → IP-restriction check for non-admins
  (USR-RULE-021) → Account Status check (USR-RULE-022) → success lands on the user's default page,
  or an already-authenticated session short-circuits straight there (USR-RULE-034). Exit/failure
  state: a generic failure message for every mode except IP-restriction denial (deliberate
  anti-enumeration posture, USR-RULE-030).
- **User Edit/Create flow**: entry from User List (edit) or a "Create User" action → header fields,
  role/group assignment, preference toggles → save triggers privilege/sharing-cache regeneration
  unconditionally (USR-RULE-012). **Note**: per USR-RULE-002/003/004, non-admin users editing
  another user's record should be hard-blocked, not merely shown a non-halting message — a new
  implementation should treat server-side enforcement of this restriction as a requirement, not an
  assumption already satisfied by the legacy system's inconsistent mix of a soft message and a hard
  redirect for what should be the same class of check.
- **Change Password flow**: entry via the Change Password modal from the User Edit view or a
  dedicated self-service link → old/new/confirm entry with client-side complexity hint → submit. A
  distinct, independently-triggered second password-change code path exists in the legacy system
  (USR-RULE-010) that a new implementation should collapse into one command, not preserve as two.
- **Role/Profile/Group/Sharing-Rule administration flows**: entry from their respective
  administration views → create/edit/delete. Delete flows for all four entity types share one
  interaction shape (a "choose transfer-to target" popup before the delete fires) and are, per the
  module's risk register, the highest-stakes interaction cluster — every one of these four flows
  corresponds to a rule group with zero parameter validation in the legacy system (USR-RULE-052–059);
  a new implementation must treat the transfer-target selection and the identifier-validation
  precondition as non-bypassable parts of this flow's contract, not a UI nicety layered on top of an
  unguarded backend command.
- **Time Clock flow**: clock-in action → optional "what are you working on" annotation → clock-out
  action (client-initiated, auto-clock-out safety net, or admin override — see `workflows.md` for
  the full transition table).
- **Personal Day / Time Off flow**: entry via one of two distinct form shapes (whole-day-count vs.
  start/end-time-of-day) → submission writes a Personal Day row. Disconnected from the payroll
  pipeline in the legacy system (see `calculations.md` §4) — a user or admin must separately
  "clock in as personal time" for the submission to actually count toward payroll hours.
- **Payroll Report / Time-Card Detail flow**: date-range/report-type selection → view → optional
  CSV/ZIP export action (see `outputs.md`).
- **CSV Import wizard flow**: upload → column-mapping → validate-then-create/update processing step,
  with hard exclusion of rows failing barcode/username/role-name/is_admin-format checks
  (USR-RULE-064/065) and **no password validation at this layer at all** (USR-RULE-066).

## States

- **User-level state**: Active/Inactive account status, admin flag, role/group membership, whether
  2FA is required (role-dependent), whether the account is barcode-login-enabled.
- **Time-clock state**: currently clocked in/out, with the module's confirmed live reality that the
  overwhelming majority of punches sit open — a new implementation's payroll views should surface
  this as a visible "Incomplete" state, not silently omit affected hours the way the legacy system
  does.
- **Role/Profile/Group administration state**: hierarchy depth (Role), permission-grid values
  (Profile), and sharing-rule actor-type/permission-level combinations.
- **Validation/error states**: hard-blocked actions should surface clear, specific error messaging
  tied to the blocking rule (e.g., duplicate username, weak password, invalid barcode format, empty
  delete-target identifier) rather than a generic failure — directly relevant given how many of the
  legacy system's checks are client-side-only or silently no-op today.
- **Delete-confirmation state**: given the module's Critical finding around unguarded delete
  operations, a new implementation's delete confirmation flows should present a distinct,
  reviewable state whenever the identifier or transfer-target resolution fails — never a silent
  proceed-anyway.
- **Loading/empty/no-permission/read-only states**: not independently documented by any blueprint
  pass — the source material's scope was entry points/functions/rules, not UI interaction states at
  this level of granularity. Not guessed at here; flag as a gap for whichever downstream process
  designs the actual screens.
