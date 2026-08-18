# T-045 — Seed realistic mock/demo dataset — Users

Status: 2/2 complete

Built incrementally alongside each screen (T-029–T-044) rather than as a separate up-front step —
this task is the wrap-up verification that the resulting fixture (`lib/mock-data/users.ts`) is
complete and consistent, per its own required coverage:

- [x] Coverage confirmed: 14 domain-realistic users across all 5 ADR-002 roles (incl. 2 inactive);
  role hierarchy (reparentable, one nested via T-031's own verification); 3 groups with mixed
  Role/Role+Subordinates/User membership; 3 profiles with full 9-module permission grids; 4
  time-clock records including one deliberately unclosed punch (ADR-037); 2 personal-day requests
  (one per shape); 14 QuickBooks sync records spanning all 3 statuses. `@faker-js/faker` used only
  for generic fields (name/email/phone), seeded deterministically; all domain-specific content
  (role/group/profile/location names, tasks, notes) hand-written.
- [x] Final full-suite verify: `pnpm typecheck` / `pnpm lint` clean across all files touched this
  sprint.
