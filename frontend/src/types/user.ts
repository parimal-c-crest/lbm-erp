// Users module shared types (T-029) — mirrors `docs-kit/5-modules/users/4-schema.md` §4 field
// shapes and `5-data-dictionary.md`, ahead of the real backend (EPIC-005). Kept intentionally
// narrow to what the UI-Design epic's pages need — not a 1:1 Prisma model mirror.

export type UserStatus = 'active' | 'inactive';

export interface Role {
  id: string;
  name: string;
  description: string;
  parentRoleId: string | null;
  depth: number;
  // `role_two_factor_requirements` (`4-schema.md`) — Admin-configurable per role (ADR-075), never
  // a per-User field. `User.requiresTwoFactor` below is a read-only derived value, not a second
  // source of truth.
  requiresTwoFactor: boolean;
}

export type GroupMemberType = 'USER' | 'ROLE' | 'ROLE_AND_SUBORDINATES';

export interface GroupMember {
  id: string;
  type: GroupMemberType;
  /** Denormalized display label for the mock UI (real system resolves this from `member_id`). */
  label: string;
}

// Assignment/roster target only — no sharing-rule/visibility meaning (ADR-081).
export interface Group {
  id: string;
  name: string;
  description: string;
  members: GroupMember[];
}

// Per-module action grant (`profile_module_action_permissions` / `profile_module_access`,
// `4-schema.md` §4) — every permission explicitly set on create, no fail-open default (ADR-156).
export interface ModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface Profile {
  id: string;
  name: string;
  description: string;
  permissions: Record<string, ModulePermission>;
}

export type TimeClockStatus = 'clock_in' | 'clock_out' | 'unclosed_needs_resolution';
export type HoursType = 'regular' | 'holiday' | 'personal' | 'sick' | 'vacation';
export type LaborStatus = 'working' | 'break' | 'lunch';

// `time_clock_records` (`4-schema.md` §4) — `clockOut` is `null` when open, never a sentinel
// timestamp; a punch still open at pay-period close surfaces as `unclosed_needs_resolution`
// (ADR-037), never silently excluded from payroll.
export interface TimeClockRecord {
  id: string;
  userId: string;
  clockIn: string;
  clockOut: string | null;
  punchDate: string;
  status: TimeClockStatus;
  hoursType: HoursType;
  laborStatus: LaborStatus;
  task: string;
}

export type PersonalDayHoursType = 'personal' | 'sick' | 'vacation';

// `personal_days` (`4-schema.md` §4) — two form shapes sharing one entity
// (`2-functional-specification.md` FR-010): a whole-day-count submission, or a start/end
// time-of-day submission on a single date. Exactly one of `dayCount` or `startTime`/`endTime` is
// set, based on `shape`.
export interface PersonalDayRequest {
  id: string;
  userId: string;
  shape: 'day-count' | 'time-range';
  hoursType: PersonalDayHoursType;
  startDate: string;
  endDate: string | null;
  dayCount: number | null;
  startTime: string | null;
  endTime: string | null;
  note: string;
  submittedAt: string;
}

export type QuickBooksSyncStatus = 'synced' | 'pending' | 'error';

// `quickbooks_sync_pointers` (`4-schema.md` §4) — revived employee sync, not excluded (ADR-074).
export interface QuickBooksSyncRecord {
  userId: string;
  status: QuickBooksSyncStatus;
  qbListId: string | null;
  lastSyncedAt: string | null;
  errorMessage: string | null;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  roleId: string;
  groupIds: string[];
  status: UserStatus;
  defaultLocation: string;
  requiresTwoFactor: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}
