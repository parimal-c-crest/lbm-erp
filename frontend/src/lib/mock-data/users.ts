import { faker } from '@faker-js/faker';

import type {
  Group,
  ModulePermission,
  PersonalDayRequest,
  Profile,
  QuickBooksSyncRecord,
  Role,
  TimeClockRecord,
  User,
} from '@/types/user';

// Shared Users-module mock dataset (T-029, expanded by T-030/T-031/T-045) — one fixture imported
// by every page so navigating between them shows consistent data, not independently randomized
// values per page (Module Design-First Strategy, `8-implementation/1-implement-task.md`). Generic
// fields (name/email/phone) use `@faker-js/faker`; role/group/location names are hand-written,
// domain-real per `docs-kit/5-modules/users/` — not faker output, per that same strategy's split.

faker.seed(20260818); // deterministic across renders/reloads — a fixture, not live random data.

// ADR-002's 5 tenant-facing roles, seeded flat (`4-schema.md` §1: "starting flat layer" — Admin
// can reparent via drag-and-drop, T-031). `requiresTwoFactor` is `role_two_factor_requirements`
// (ADR-075) — the one and only source of truth for 2FA, never a per-User field. B2B Customer
// excluded from this application's own navigation (nav doc §10) — not seeded here.
export const MOCK_ROLES: Role[] = [
  { id: 'role-admin', name: 'Admin', description: 'Full administrative access to every module.', parentRoleId: null, depth: 0, requiresTwoFactor: true },
  { id: 'role-counter-sales', name: 'Counter/Sales Staff', description: 'Front-counter sales, quotes, and order entry.', parentRoleId: null, depth: 0, requiresTwoFactor: false },
  { id: 'role-warehouse', name: 'Warehouse/Fulfillment Staff', description: 'Picking, receiving, and stock handling.', parentRoleId: null, depth: 0, requiresTwoFactor: false },
  { id: 'role-accounting', name: 'Accounting/Management', description: 'Billing, payroll, and financial reporting.', parentRoleId: null, depth: 0, requiresTwoFactor: true },
  { id: 'role-purchasing', name: 'Purchasing Staff', description: 'Vendor ordering and purchase-order management.', parentRoleId: null, depth: 0, requiresTwoFactor: false },
];

// Assignment/roster targets only — no sharing-rule/visibility meaning (ADR-081). Role-type
// members reference `MOCK_ROLES` above; a couple of individual User members are appended below
// once `MOCK_USERS` exists (forward-reference — Group is seeded before Users in this file).
export const MOCK_GROUPS: Group[] = [
  {
    id: 'group-all-staff',
    name: 'All Staff Notifications',
    description: 'Broadcast recipient list for company-wide announcements.',
    members: MOCK_ROLES.map((role) => ({ id: role.id, type: 'ROLE', label: role.name })),
  },
  {
    id: 'group-warehouse-team',
    name: 'Warehouse Team',
    description: 'Houston + Dallas warehouse crews.',
    members: [{ id: 'role-warehouse', type: 'ROLE_AND_SUBORDINATES', label: 'Warehouse/Fulfillment Staff (+ subordinates)' }],
  },
  {
    id: 'group-payroll-reviewers',
    name: 'Payroll Reviewers',
    description: 'Approve time-card overrides and payroll runs.',
    members: [{ id: 'role-accounting', type: 'ROLE', label: 'Accounting/Management' }],
  },
];

// Matches the Location names already used in the Dashboard's mock dataset
// (`lib/mock-data/dashboard.ts` WAREHOUSE_SUMMARY) — same fictional distributor, consistent
// fixture across modules until a real Location module UI exists.
export const MOCK_LOCATIONS = ['Main Branch - Houston', 'Dallas Warehouse', 'Austin Retail'];

function usernameFor(first: string, last: string, taken: Set<string>) {
  const base = `${first[0]}${last}`.toLowerCase().replace(/[^a-z0-9]/g, '');
  let candidate = base;
  let suffix = 1;
  while (taken.has(candidate)) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
  taken.add(candidate);
  return candidate;
}

interface SeedUser {
  firstName: string;
  lastName: string;
  roleId: string;
  status: 'active' | 'inactive';
  defaultLocation: string;
}

// Hand-picked role/status/location spread (not faker) so every role and an inactive account are
// represented — a realistic distribution to actually catch UI/UX problems (empty states, badge
// variety), not 14 identical rows. 2FA is derived from role below, not seeded per-user.
const SEED: SeedUser[] = [
  { firstName: 'Marcus', lastName: 'Whitfield', roleId: 'role-admin', status: 'active', defaultLocation: 'Main Branch - Houston' },
  { firstName: 'Dana', lastName: 'Okafor', roleId: 'role-accounting', status: 'active', defaultLocation: 'Main Branch - Houston' },
  { firstName: 'Ray', lastName: 'Delgado', roleId: 'role-counter-sales', status: 'active', defaultLocation: 'Main Branch - Houston' },
  { firstName: 'Priya', lastName: 'Nair', roleId: 'role-counter-sales', status: 'active', defaultLocation: 'Dallas Warehouse' },
  { firstName: 'Colton', lastName: 'Baumgardner', roleId: 'role-warehouse', status: 'active', defaultLocation: 'Main Branch - Houston' },
  { firstName: 'Levi', lastName: 'Hutchins', roleId: 'role-warehouse', status: 'active', defaultLocation: 'Dallas Warehouse' },
  { firstName: 'Sofia', lastName: 'Marchetti', roleId: 'role-warehouse', status: 'inactive', defaultLocation: 'Austin Retail' },
  { firstName: 'Greg', lastName: 'Novak', roleId: 'role-purchasing', status: 'active', defaultLocation: 'Dallas Warehouse' },
  { firstName: 'Bethany', lastName: 'Cho', roleId: 'role-purchasing', status: 'active', defaultLocation: 'Main Branch - Houston' },
  { firstName: 'Tomas', lastName: 'Reyes', roleId: 'role-counter-sales', status: 'active', defaultLocation: 'Austin Retail' },
  { firstName: 'Wendy', lastName: 'Fitzgerald', roleId: 'role-accounting', status: 'active', defaultLocation: 'Main Branch - Houston' },
  { firstName: 'Adrian', lastName: 'Solis', roleId: 'role-warehouse', status: 'active', defaultLocation: 'Austin Retail' },
  { firstName: 'Naomi', lastName: 'Petrova', roleId: 'role-admin', status: 'active', defaultLocation: 'Dallas Warehouse' },
  { firstName: 'Jamal', lastName: 'Winters', roleId: 'role-counter-sales', status: 'inactive', defaultLocation: 'Main Branch - Houston' },
];

const takenUsernames = new Set<string>();

export const MOCK_USERS: User[] = SEED.map((seed, index) => {
  const id = `user-${String(index + 1).padStart(3, '0')}`;
  const username = usernameFor(seed.firstName, seed.lastName, takenUsernames);
  const createdAt = faker.date.past({ years: 2 }).toISOString();
  const groupIds =
    seed.roleId === 'role-warehouse'
      ? ['group-all-staff', 'group-warehouse-team']
      : seed.roleId === 'role-accounting'
        ? ['group-all-staff', 'group-payroll-reviewers']
        : ['group-all-staff'];

  return {
    id,
    firstName: seed.firstName,
    lastName: seed.lastName,
    username,
    email: `${username}@lbm.local`,
    phone: faker.phone.number({ style: 'national' }),
    roleId: seed.roleId,
    groupIds,
    status: seed.status,
    defaultLocation: seed.defaultLocation,
    requiresTwoFactor: MOCK_ROLES.find((role) => role.id === seed.roleId)?.requiresTwoFactor ?? false,
    createdAt,
    updatedAt: faker.date.between({ from: createdAt, to: new Date() }).toISOString(),
    createdBy: 'Marcus Whitfield',
    updatedBy: 'Marcus Whitfield',
  };
});

// Individual User members appended now that `MOCK_USERS` exists (forward-reference resolved) —
// same convention as `user-XXX` id generation above.
{
  const warehouseTeam = MOCK_GROUPS.find((group) => group.id === 'group-warehouse-team');
  const individualMembers = MOCK_USERS.filter((user) => ['Levi Hutchins', 'Colton Baumgardner'].includes(`${user.firstName} ${user.lastName}`));
  if (warehouseTeam) {
    warehouseTeam.members.push(
      ...individualMembers.map((user) => ({
        id: user.id,
        type: 'USER' as const,
        label: `${user.firstName} ${user.lastName}`,
      })),
    );
  }
}

export function roleNameFor(roleId: string): string {
  return MOCK_ROLES.find((role) => role.id === roleId)?.name ?? 'Unassigned';
}

// --- Time Clock (T-036/T-037) ---------------------------------------------------------------

function userByName(firstName: string, lastName: string) {
  return MOCK_USERS.find((user) => user.firstName === firstName && user.lastName === lastName);
}

function isoAt(daysAgo: number, hour: number, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

// A realistic spread including one deliberately unclosed punch (ADR-037 — surfaced as an
// explicit "Needs Resolution" exception, never silently excluded from payroll) — see
// `9-ui.md` Payroll Report §4 and the Time-Card override screen (T-037).
export const MOCK_TIME_CLOCK_RECORDS: TimeClockRecord[] = [
  {
    id: 'tc-001',
    userId: userByName('Levi', 'Hutchins')?.id ?? '',
    clockIn: isoAt(1, 7, 58),
    clockOut: isoAt(1, 16, 4),
    punchDate: isoAt(1, 0),
    status: 'clock_out',
    hoursType: 'regular',
    laborStatus: 'working',
    task: 'Receiving — PO-4821',
  },
  {
    id: 'tc-002',
    userId: userByName('Colton', 'Baumgardner')?.id ?? '',
    clockIn: isoAt(1, 8, 2),
    clockOut: isoAt(1, 12, 0),
    punchDate: isoAt(1, 0),
    status: 'clock_out',
    hoursType: 'regular',
    laborStatus: 'working',
    task: 'Pulling — SO-9401',
  },
  {
    id: 'tc-003',
    userId: userByName('Adrian', 'Solis')?.id ?? '',
    clockIn: isoAt(2, 7, 55),
    clockOut: null,
    punchDate: isoAt(2, 0),
    status: 'unclosed_needs_resolution',
    hoursType: 'regular',
    laborStatus: 'working',
    task: 'Cycle count — Austin Retail',
  },
  {
    id: 'tc-004',
    userId: userByName('Dana', 'Okafor')?.id ?? '',
    clockIn: isoAt(1, 9, 0),
    clockOut: isoAt(1, 17, 30),
    punchDate: isoAt(1, 0),
    status: 'clock_out',
    hoursType: 'regular',
    laborStatus: 'working',
    task: 'Month-end close review',
  },
];

// Admin/manager correction (`9-ui.md` §2 Time-Card override, `8-api.md` POST /timeclock/override)
// — clock-out must not precede clock-in (`6-validation.md` §4, closes the legacy system's
// confirmed absence of this check). Resolves an unclosed punch back to `clock_out` once a real
// clock-out time is supplied.
export function overrideTimeClockRecord(id: string, input: { clockIn: string; clockOut: string }) {
  const record = MOCK_TIME_CLOCK_RECORDS.find((candidate) => candidate.id === id);
  if (!record) {return { ok: false as const, error: 'Record not found.' };}
  if (new Date(input.clockOut).getTime() <= new Date(input.clockIn).getTime()) {
    return { ok: false as const, error: 'Clock-out must be after clock-in.' };
  }
  record.clockIn = input.clockIn;
  record.clockOut = input.clockOut;
  record.status = 'clock_out';
  return { ok: true as const };
}

// --- Personal Days / Time Off (T-038) --------------------------------------------------------

export const MOCK_PERSONAL_DAYS: PersonalDayRequest[] = [
  {
    id: 'pd-001',
    userId: userByName('Priya', 'Nair')?.id ?? '',
    shape: 'day-count',
    hoursType: 'vacation',
    startDate: isoAt(-8, 0).slice(0, 10),
    endDate: isoAt(-10, 0).slice(0, 10),
    dayCount: 3,
    startTime: null,
    endTime: null,
    note: 'Family trip.',
    submittedAt: isoAt(20, 9),
  },
  {
    id: 'pd-002',
    userId: userByName('Greg', 'Novak')?.id ?? '',
    shape: 'time-range',
    hoursType: 'sick',
    startDate: isoAt(3, 0).slice(0, 10),
    endDate: null,
    dayCount: null,
    startTime: '09:00',
    endTime: '13:00',
    note: 'Doctor appointment.',
    submittedAt: isoAt(4, 8),
  },
];

function nextPersonalDayId() {
  return `pd-${faker.string.alphanumeric({ length: 8, casing: 'lower' })}`;
}

// Bridges into the payroll pipeline via a corresponding Time Clock Record with the matching
// hours-type classification (`2-functional-specification.md` FR-010 Main Flow) — not modeled as
// a second write here (this mock's Payroll Report, T-039, reads Personal Days directly instead).
export function addPersonalDayRequest(input: Omit<PersonalDayRequest, 'id' | 'submittedAt'>): PersonalDayRequest {
  const request: PersonalDayRequest = { ...input, id: nextPersonalDayId(), submittedAt: new Date().toISOString() };
  MOCK_PERSONAL_DAYS.push(request);
  return request;
}

// --- QuickBooks employee sync (T-040) — revived, not excluded (ADR-074) ---------------------

export const MOCK_QUICKBOOKS_SYNC: QuickBooksSyncRecord[] = MOCK_USERS.map((user, index) => {
  if (index % 5 === 4) {
    return { userId: user.id, status: 'error', qbListId: null, lastSyncedAt: isoAt(2, 3), errorMessage: 'QuickBooks rejected duplicate employee name.' };
  }
  if (index % 5 === 3) {
    return { userId: user.id, status: 'pending', qbListId: null, lastSyncedAt: null, errorMessage: null };
  }
  return {
    userId: user.id,
    status: 'synced',
    qbListId: `80000${index}-${faker.string.numeric(10)}`,
    lastSyncedAt: isoAt(1, 2, 15),
    errorMessage: null,
  };
});

// Mutates the shared fixture in place so a delete (T-030) is reflected on any page mounted
// afterward in the same client session — mock-only; there's no real backend to persist this
// (EPIC-005 replaces this entirely with a real DELETE call).
export function removeMockUser(id: string) {
  const index = MOCK_USERS.findIndex((user) => user.id === id);
  if (index !== -1) {
    MOCK_USERS.splice(index, 1);
  }
}

// Mass Update (T-042) — same field/value semantics as a single User edit, applied to every
// selected id. Admin-only in the real system (`9-ui.md` §2 Mass Update).
export function massUpdateUsers(ids: string[], field: 'status' | 'roleId' | 'defaultLocation', value: string) {
  const idSet = new Set(ids);
  let updated = 0;
  for (const user of MOCK_USERS) {
    if (idSet.has(user.id)) {
      if (field === 'status') {user.status = value as User['status'];}
      else if (field === 'roleId') {
        user.roleId = value;
        user.requiresTwoFactor = MOCK_ROLES.find((role) => role.id === value)?.requiresTwoFactor ?? false;
      } else {user.defaultLocation = value;}
      updated += 1;
    }
  }
  return updated;
}

// --- Role administration (T-031) ---------------------------------------------------------

function nextRoleId() {
  return `role-${faker.string.alphanumeric({ length: 8, casing: 'lower' })}`;
}

export function addRole(input: { name: string; description: string; parentRoleId: string | null }): Role {
  const parent = input.parentRoleId ? MOCK_ROLES.find((role) => role.id === input.parentRoleId) : undefined;
  const role: Role = {
    id: nextRoleId(),
    name: input.name,
    description: input.description,
    parentRoleId: input.parentRoleId,
    depth: parent ? parent.depth + 1 : 0,
    requiresTwoFactor: false,
  };
  MOCK_ROLES.push(role);
  return role;
}

export function updateRole(id: string, input: { name: string; description: string }) {
  const role = MOCK_ROLES.find((candidate) => candidate.id === id);
  if (role) {
    role.name = input.name;
    role.description = input.description;
  }
}

export function setRoleTwoFactorRequired(id: string, required: boolean) {
  const role = MOCK_ROLES.find((candidate) => candidate.id === id);
  if (role) {
    role.requiresTwoFactor = required;
  }
  // Every User's derived 2FA flag reflects the role change on their very next "request"
  // (`2-functional-specification.md` FR-006 post-condition) — recomputed here since the mock
  // fixture denormalizes it onto `User` for display convenience.
  for (const user of MOCK_USERS) {
    if (user.roleId === id) {
      user.requiresTwoFactor = required;
    }
  }
}

// Recomputes `depth` for a role and every descendant, server-side in the real system
// (`4-schema.md` §3 roles table) — here, walked client-side over the in-memory fixture.
export function reparentRole(id: string, newParentId: string | null) {
  const role = MOCK_ROLES.find((candidate) => candidate.id === id);
  if (!role || role.id === newParentId) {return;}

  // Refuse to make a role its own descendant's child (would create a cycle).
  let cursor = newParentId;
  while (cursor) {
    if (cursor === id) {return;}
    cursor = MOCK_ROLES.find((candidate) => candidate.id === cursor)?.parentRoleId ?? null;
  }

  role.parentRoleId = newParentId;
  const parent = newParentId ? MOCK_ROLES.find((candidate) => candidate.id === newParentId) : undefined;
  role.depth = parent ? parent.depth + 1 : 0;

  const recomputeDescendants = (parentId: string, parentDepth: number) => {
    for (const child of MOCK_ROLES.filter((candidate) => candidate.parentRoleId === parentId)) {
      child.depth = parentDepth + 1;
      recomputeDescendants(child.id, child.depth);
    }
  };
  recomputeDescendants(role.id, role.depth);
}

// Transfer-target-required delete (BR-001) — every User currently on this Role, and any child
// Role, is reassigned to `transferTargetRoleId` before the Role itself is removed.
export function removeRole(id: string, transferTargetRoleId: string) {
  for (const user of MOCK_USERS) {
    if (user.roleId === id) {
      user.roleId = transferTargetRoleId;
    }
  }
  for (const role of MOCK_ROLES) {
    if (role.parentRoleId === id) {
      role.parentRoleId = transferTargetRoleId;
    }
  }
  const index = MOCK_ROLES.findIndex((role) => role.id === id);
  if (index !== -1) {
    MOCK_ROLES.splice(index, 1);
  }
}

// --- Profile / permission administration (T-032) ------------------------------------------

// The business modules a Profile's grid grants access to — matches the sidebar's own module set
// (`config/nav-items.ts`, minus Dashboard, which isn't a permission-gated business module).
export const PERMISSION_MODULES = [
  { key: 'sales-orders', label: 'Sales Orders' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'products', label: 'Products' },
  { key: 'purchase-orders', label: 'Purchase Orders' },
  { key: 'vendors', label: 'Vendors' },
  { key: 'locations', label: 'Location' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'users', label: 'Users' },
  { key: 'settings', label: 'Settings' },
] as const;

function emptyPermissionSet(grant: boolean): Record<string, ModulePermission> {
  return Object.fromEntries(
    PERMISSION_MODULES.map((module) => [
      module.key,
      { view: grant, create: grant, edit: grant, delete: grant },
    ]),
  );
}

// Every permission explicitly set — no fail-open default (ADR-156, closes USR-RISK-013). New
// Profile create copies from an explicit, named default-profile template
// (`5-data-dictionary.md` §6), not the lowest-id accident the legacy system had.
export const DEFAULT_PROFILE_TEMPLATE_ID = 'profile-default-view-only';

export const MOCK_PROFILES: Profile[] = [
  {
    id: DEFAULT_PROFILE_TEMPLATE_ID,
    name: 'Default (View Only)',
    description: 'The named default-profile template every new Profile copies its baseline from.',
    permissions: Object.fromEntries(
      PERMISSION_MODULES.map((module) => [module.key, { view: true, create: false, edit: false, delete: false }]),
    ),
  },
  {
    id: 'profile-admin-full',
    name: 'Admin — Full Access',
    description: 'Every module, every action.',
    permissions: emptyPermissionSet(true),
  },
  {
    id: 'profile-warehouse-limited',
    name: 'Warehouse — Limited',
    description: 'Products and Location only; view/edit, no create/delete.',
    permissions: Object.fromEntries(
      PERMISSION_MODULES.map((module) => [
        module.key,
        ['products', 'locations'].includes(module.key)
          ? { view: true, create: false, edit: true, delete: false }
          : { view: false, create: false, edit: false, delete: false },
      ]),
    ),
  },
];

function nextProfileId() {
  return `profile-${faker.string.alphanumeric({ length: 8, casing: 'lower' })}`;
}

export function addProfile(input: { name: string; description: string }): Profile {
  const template = MOCK_PROFILES.find((profile) => profile.id === DEFAULT_PROFILE_TEMPLATE_ID);
  const profile: Profile = {
    id: nextProfileId(),
    name: input.name,
    description: input.description,
    permissions: template
      ? structuredClone(template.permissions)
      : emptyPermissionSet(false),
  };
  MOCK_PROFILES.push(profile);
  return profile;
}

export function updateProfile(id: string, input: { name: string; description: string }) {
  const profile = MOCK_PROFILES.find((candidate) => candidate.id === id);
  if (profile) {
    profile.name = input.name;
    profile.description = input.description;
  }
}

export function setModulePermission(profileId: string, moduleKey: string, permission: ModulePermission) {
  const profile = MOCK_PROFILES.find((candidate) => candidate.id === profileId);
  if (profile) {
    profile.permissions[moduleKey] = permission;
  }
}

// `transferTargetProfileId` isn't consumed here — this UI-Design mock doesn't model the
// Role<->Profile assignment (`role_profiles`, `4-schema.md` §4) that a real delete would need to
// reassign — still routed through the shared `TransferTargetPicker` for UI consistency with
// User/Role/Group (BR-001's identical contract), same as `8-api.md`'s documented Profile DELETE
// contract; EPIC-005 wires the real reassignment.
export function removeProfile(id: string, transferTargetProfileId: string) {
  void transferTargetProfileId;
  const index = MOCK_PROFILES.findIndex((profile) => profile.id === id);
  if (index !== -1) {
    MOCK_PROFILES.splice(index, 1);
  }
}

// --- Group administration (T-033) -----------------------------------------------------------

function nextGroupId() {
  return `group-${faker.string.alphanumeric({ length: 8, casing: 'lower' })}`;
}

export function addGroup(input: { name: string; description: string; members: Group['members'] }): Group {
  const group: Group = { id: nextGroupId(), name: input.name, description: input.description, members: input.members };
  MOCK_GROUPS.push(group);
  return group;
}

export function updateGroup(id: string, input: { name: string; description: string; members: Group['members'] }) {
  const group = MOCK_GROUPS.find((candidate) => candidate.id === id);
  if (group) {
    group.name = input.name;
    group.description = input.description;
    group.members = input.members;
  }
}

// `transferTargetGroupId` isn't consumed here — Groups are an assignment/roster target only
// (ADR-081), so this mock has no dependent records to reassign the way User/Role genuinely do.
// Still routed through the same `TransferTargetPicker` UI per `9-ui.md` §4 ("same transfer-
// target-picker pattern as Role above") for a consistent delete contract across all four
// entities (BR-001); EPIC-005 decides the real backend contract for this specific case.
export function removeGroup(id: string, transferTargetGroupId: string) {
  void transferTargetGroupId;
  const index = MOCK_GROUPS.findIndex((group) => group.id === id);
  if (index !== -1) {
    MOCK_GROUPS.splice(index, 1);
  }
}
