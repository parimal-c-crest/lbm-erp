# T-029 — Code Review

**Reviewer**: Claude Code (self-review, solo-developer project)
**Date**: 2026-08-18

---

## 1. Todo checklist

All 6 items in `T-029-todos.md` confirmed checked off before review.

## 2. Correctness vs. `docs-kit/5-modules/users/9-ui.md`

- Screen inventory matches: User List, User Detail, User Create/Edit all present with the documented
  columns/filters/fields.
- **Defect found and fixed**: `UserForm` originally exposed a per-user "Require 2FA for this user's
  role" checkbox, bound to a `requiresTwoFactor` field on the `User` create/edit payload. Per
  `4-schema.md` §1 and `5-data-dictionary.md` §4 ("Two-Factor Required (per Role) ... Admin-
  configurable per role, not hardcoded"), 2FA requirement is a **Role**-level setting
  (`role_two_factor_requirements`), never edited from an individual User's form — that belongs to
  Role administration (T-031). `9-ui.md`'s own User Create/Edit field list doesn't list a 2FA toggle
  at all. Fixed: removed the checkbox and its schema field; replaced the "Preferences & HR" section's
  placeholder with a genuinely `UserPreference`-scoped toggle (`emailNotificationsEnabled`, per
  `4-schema.md` §3's "UI/calendar/POS/print display preferences" description) plus a note pointing
  2FA configuration to Role administration instead. Re-verified in browser after the fix — no
  regressions, typecheck/lint clean.
- Delete action correctly **not** built in this task (List page has Edit only) — `TransferTargetPicker`
  is T-030's own scope; not bundled in early.
- Create page stays blank (no pre-fill); Edit/Detail read from the same shared fixture — confirmed via
  the List→Detail→Edit→Create browser walkthrough (T-029-todos.md).

## 3. Code quality / standards (`6-development/3-coding-standards.md`)

- Naming, file layout (kebab-case routes, PascalCase components) match existing codebase precedent
  (`Sidebar.tsx`, `RecentOrdersTable.tsx`, login page).
- Comments are WHY-only, matching project convention (no full JSDoc blocks — matches the terse-comment
  style already shipped in `badge.tsx`/`form-field.tsx`, not the aspirational per-component JSDoc
  template in `4-ui/4-component-standards.md` §14 that the existing shipped components don't follow
  either).
- No dead code, no leftover debug artifacts.
- `zod` schema uses a single shape + `superRefine` for the create-vs-edit password rule rather than
  two structurally different schemas — avoided a real `Resolver` type mismatch (noted in the todos);
  reasonable, not over-engineered.

## 4. Security

- Password complexity enforced client-side only (no real backend yet, EPIC-005) — correctly scoped as
  UX convenience, not the real gate; matches `6-development/3-coding-standards.md` §12's "client-side
  validation is convenience only."
- No secrets, no `dangerouslySetInnerHTML`, no raw string interpolation into markup.
- Mock dataset seeded deterministically (`faker.seed`) — no live network calls, nothing sensitive.

## 5. Performance

- Client-side filter/sort/paginate over 14 mock rows — trivially fine at this scale; not a real
  measurement question yet (no backend, no real dataset size).

## 6. Scope

- Diff is limited to: `types/user.ts`, `lib/mock-data/users.ts`, `components/shared/users/UserForm.tsx`,
  the 4 `app/(dashboard)/users/**` page files, `frontend/package.json` (`@faker-js/faker`), and the
  plan/doc bookkeeping files (`task-list.md`, `epics.md`, `sprint-3.md`, `T-029-todos.md`). No
  unrelated files touched by this task's own work (the large pre-existing uncommitted diff in the
  working tree predates this task and isn't part of it).

## Verdict: **Approved with minor fixes** (fix applied during this review)

One real defect found (per-user 2FA toggle contradicting the documented per-Role design) — fixed in
place, re-verified. No other changes requested.

## Tech debt logged

None — the one issue found was fixed, not deferred.
