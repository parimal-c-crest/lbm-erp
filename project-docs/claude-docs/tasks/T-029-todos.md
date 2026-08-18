# T-029 — User List + Detail + Create/Edit screens (mock data)

Status: 6/6 complete

- [x] Add shared `User`/`Role`/`Group` types (`frontend/src/types/user.ts`) — mirrors `docs-kit/5-modules/users/4-schema.md` §4 field shapes, scoped to what these screens need.
- [x] Build shared mock dataset (`frontend/src/lib/mock-data/users.ts`) — 5 ADR-002 roles (flat, per `4-schema.md` §1), 3 groups, 14 domain-realistic users spread across every role/status/2FA combination. `@faker-js/faker` (added to `frontend/package.json`) for generic fields (name/email/phone) only, seeded deterministic; role/group/location names and the seed spread are hand-written per `9-ui.md`/`4-schema.md`, not faker output.
- [x] Build User List page (`(dashboard)/users/page.tsx`) — search, role/location filters, sortable columns, pagination, Create button, empty state, Edit link per row (Delete deferred to T-030 per its own task scope — `TransferTargetPicker` doesn't exist yet).
- [x] Build User Detail page (`(dashboard)/users/[id]/page.tsx`) — read-only header + Audit Trail section, Edit button, Back link.
- [x] Build shared `UserForm` (`components/shared/users/UserForm.tsx`) + Create (`users/new/page.tsx`) and Edit (`users/[id]/edit/page.tsx`) pages — header/password/role/group/preferences fields per `9-ui.md` §4, ADR-155 password-complexity validated client-side, Create stays blank (no pre-fill), Edit pre-fills from the shared fixture, Cancel/Save button order per `4-ui/5-form-standards.md` §13.
- [x] Verify: `pnpm typecheck` / `pnpm lint` clean; real-browser check via Playwright (dev server, `localhost:3000`) — List → Detail → Edit → Back → Create navigation all real routes against the one shared fixture, no console/page errors, screenshots reviewed.

**Notes**:
- Ran `npx next typegen` once to resolve the new dynamic-route `PageProps<'/users/[id]'>` /
  `PageProps<'/users/[id]/edit'>` literal types (Next 16 typed-routes convention, confirmed via
  `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` per this repo's
  own `frontend/AGENTS.md` instruction to check the vendored docs before writing code against this
  Next.js version).
- `UserForm`'s create/edit password rule uses one schema (`superRefine`, `isEdit`-gated) instead of
  two structurally different Zod schemas — avoided a `Resolver<...>` type mismatch between required
  vs. optional `password` that two-schema-branching produced.
- Login page (T-016, mock, pre-Users-module) still uses Email as its field label — ADR-187's
  Username-based login only applies once the real Users module/backend exists (EPIC-005); out of
  this task's scope, already flagged in ADR-187's own Consequences.
