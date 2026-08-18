// Seeds realistic Users-module demo/test data into the local `demo` tenant database
// (`lbm_erp_dev`, per `TenantRegistry` — `seed-tenant-registry.ts`). Extends the frontend mock
// fixture (`frontend/src/lib/mock-data/users.ts`) server-side rather than inventing a second,
// inconsistent dataset — same names, roles, statuses, locations, and the one deliberately
// unclosed time-clock punch (ADR-037).
//
// Note on file location: `task-list.md` T-062 names `backend/prisma/seed.ts`, but this project's
// schema lives at the repo root (`prisma/schema.prisma`), not `backend/prisma/` — that directory
// doesn't exist. Placed here to match the existing `seed-tenant-registry.ts` convention instead
// of creating a one-off directory structure nothing else uses.
//
// Run: `pnpm --filter backend run seed:users`
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

import { PrismaClient } from '../src/generated/prisma/client';

const DEMO_PASSWORD = 'DemoPassw0rd!';
const BCRYPT_ROUNDS = 12;

const ROLES = [
  {
    key: 'admin',
    name: 'Admin',
    description: 'Full administrative access to every module.',
    requiresTwoFactor: true,
  },
  {
    key: 'counter-sales',
    name: 'Counter/Sales Staff',
    description: 'Front-counter sales, quotes, and order entry.',
    requiresTwoFactor: false,
  },
  {
    key: 'warehouse',
    name: 'Warehouse/Fulfillment Staff',
    description: 'Picking, receiving, and stock handling.',
    requiresTwoFactor: false,
  },
  {
    key: 'accounting',
    name: 'Accounting/Management',
    description: 'Billing, payroll, and financial reporting.',
    requiresTwoFactor: true,
  },
  {
    key: 'purchasing',
    name: 'Purchasing Staff',
    description: 'Vendor ordering and purchase-order management.',
    requiresTwoFactor: false,
  },
] as const;

const LOCATIONS = ['Main Branch - Houston', 'Dallas Warehouse', 'Austin Retail'];

interface SeedUser {
  firstName: string;
  lastName: string;
  roleKey: (typeof ROLES)[number]['key'];
  status: 'active' | 'inactive';
  defaultLocation: string;
}

// Same hand-picked spread as the frontend mock — every role and an inactive account
// represented, not 14 identical rows.
const USERS: SeedUser[] = [
  {
    firstName: 'Marcus',
    lastName: 'Whitfield',
    roleKey: 'admin',
    status: 'active',
    defaultLocation: LOCATIONS[0],
  },
  {
    firstName: 'Dana',
    lastName: 'Okafor',
    roleKey: 'accounting',
    status: 'active',
    defaultLocation: LOCATIONS[0],
  },
  {
    firstName: 'Ray',
    lastName: 'Delgado',
    roleKey: 'counter-sales',
    status: 'active',
    defaultLocation: LOCATIONS[0],
  },
  {
    firstName: 'Priya',
    lastName: 'Nair',
    roleKey: 'counter-sales',
    status: 'active',
    defaultLocation: LOCATIONS[1],
  },
  {
    firstName: 'Colton',
    lastName: 'Baumgardner',
    roleKey: 'warehouse',
    status: 'active',
    defaultLocation: LOCATIONS[0],
  },
  {
    firstName: 'Levi',
    lastName: 'Hutchins',
    roleKey: 'warehouse',
    status: 'active',
    defaultLocation: LOCATIONS[1],
  },
  {
    firstName: 'Sofia',
    lastName: 'Marchetti',
    roleKey: 'warehouse',
    status: 'inactive',
    defaultLocation: LOCATIONS[2],
  },
  {
    firstName: 'Greg',
    lastName: 'Novak',
    roleKey: 'purchasing',
    status: 'active',
    defaultLocation: LOCATIONS[1],
  },
  {
    firstName: 'Bethany',
    lastName: 'Cho',
    roleKey: 'purchasing',
    status: 'active',
    defaultLocation: LOCATIONS[0],
  },
  {
    firstName: 'Tomas',
    lastName: 'Reyes',
    roleKey: 'counter-sales',
    status: 'active',
    defaultLocation: LOCATIONS[2],
  },
  {
    firstName: 'Wendy',
    lastName: 'Fitzgerald',
    roleKey: 'accounting',
    status: 'active',
    defaultLocation: LOCATIONS[0],
  },
  {
    firstName: 'Adrian',
    lastName: 'Solis',
    roleKey: 'warehouse',
    status: 'active',
    defaultLocation: LOCATIONS[2],
  },
  {
    firstName: 'Naomi',
    lastName: 'Petrova',
    roleKey: 'admin',
    status: 'active',
    defaultLocation: LOCATIONS[1],
  },
  {
    firstName: 'Jamal',
    lastName: 'Winters',
    roleKey: 'counter-sales',
    status: 'inactive',
    defaultLocation: LOCATIONS[0],
  },
];

function usernameFor(first: string, last: string, taken: Set<string>): string {
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

function daysAgo(days: number, hour: number, minute = 0): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

async function main() {
  const demoTenantUrl = process.env.DEMO_TENANT_DATABASE_URL;
  if (!demoTenantUrl) {
    throw new Error('DEMO_TENANT_DATABASE_URL is not set (see backend/.env)');
  }

  const adapter = new PrismaPg({ connectionString: demoTenantUrl });
  const prisma = new PrismaClient({ adapter });

  // --- Roles + 2FA requirements ---------------------------------------------------------
  const roleIdByKey = new Map<string, string>();
  for (const role of ROLES) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: { name: role.name, description: role.description, depth: 0 },
    });
    roleIdByKey.set(role.key, created.id);
    await prisma.roleTwoFactorRequirement.upsert({
      where: { roleId: created.id },
      update: { required: role.requiresTwoFactor },
      create: { roleId: created.id, required: role.requiresTwoFactor },
    });
  }

  // --- Profiles + permissions (Default View-Only, Admin Full Access) --------------------
  const modules = [
    'sales-orders',
    'accounts',
    'products',
    'purchase-orders',
    'vendors',
    'locations',
    'pricing',
    'users',
    'settings',
  ];
  const actions = ['view', 'create', 'edit', 'delete'] as const;

  const defaultProfile = await prisma.profile.upsert({
    where: { name: 'Default (View Only)' },
    update: {},
    create: { name: 'Default (View Only)', description: 'Every module, view only.' },
  });
  const adminProfile = await prisma.profile.upsert({
    where: { name: 'Admin — Full Access' },
    update: {},
    create: { name: 'Admin — Full Access', description: 'Every module, every action.' },
  });

  for (const [profile, grant] of [
    [defaultProfile, (action: string) => action === 'view'],
    [adminProfile, () => true],
  ] as const) {
    for (const module of modules) {
      for (const action of actions) {
        await prisma.profileModuleActionPermission.upsert({
          where: { profileId_module_action: { profileId: profile.id, module, action } },
          update: { granted: grant(action) },
          create: { profileId: profile.id, module, action, granted: grant(action) },
        });
      }
    }
  }
  const adminRoleId = roleIdByKey.get('admin')!;
  await prisma.roleProfile.upsert({
    where: { roleId_profileId: { roleId: adminRoleId, profileId: adminProfile.id } },
    update: {},
    create: { roleId: adminRoleId, profileId: adminProfile.id },
  });

  // --- Users ------------------------------------------------------------------------------
  const takenUsernames = new Set<string>();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
  const userIdByName = new Map<string, string>();

  for (const seedUser of USERS) {
    const username = usernameFor(seedUser.firstName, seedUser.lastName, takenUsernames);
    const user = await prisma.user.upsert({
      where: { username },
      update: {
        status: seedUser.status,
        roleId: roleIdByKey.get(seedUser.roleKey),
        defaultLocation: seedUser.defaultLocation,
      },
      create: {
        firstName: seedUser.firstName,
        lastName: seedUser.lastName,
        username,
        email: `${username}@lbm.local`,
        passwordHash,
        roleId: roleIdByKey.get(seedUser.roleKey),
        status: seedUser.status,
        defaultLocation: seedUser.defaultLocation,
      },
    });
    userIdByName.set(`${seedUser.firstName} ${seedUser.lastName}`, user.id);
  }

  // --- Groups + memberships ---------------------------------------------------------------
  const allStaffGroup = await prisma.group.upsert({
    where: { name: 'All Staff Notifications' },
    update: {},
    create: {
      name: 'All Staff Notifications',
      description: 'Broadcast recipient list for company-wide announcements.',
    },
  });
  for (const role of ROLES) {
    const roleId = roleIdByKey.get(role.key)!;
    const existingMembership = await prisma.groupMembership.findFirst({
      where: { groupId: allStaffGroup.id, memberType: 'ROLE', memberId: roleId },
    });
    if (!existingMembership) {
      await prisma.groupMembership.create({
        data: { groupId: allStaffGroup.id, memberType: 'ROLE', memberId: roleId },
      });
    }
  }

  // --- Time Clock — closed punches + one deliberately unclosed punch (ADR-037) -----------
  const timeClockSeeds: { user: string; clockIn: Date; clockOut: Date | null; task: string }[] = [
    {
      user: 'Levi Hutchins',
      clockIn: daysAgo(1, 7, 58),
      clockOut: daysAgo(1, 16, 4),
      task: 'Receiving — PO-4821',
    },
    {
      user: 'Colton Baumgardner',
      clockIn: daysAgo(1, 8, 2),
      clockOut: daysAgo(1, 12, 0),
      task: 'Pulling — SO-9401',
    },
    {
      user: 'Adrian Solis',
      clockIn: daysAgo(2, 7, 55),
      clockOut: null,
      task: 'Cycle count — Austin Retail',
    },
    {
      user: 'Dana Okafor',
      clockIn: daysAgo(1, 9, 0),
      clockOut: daysAgo(1, 17, 30),
      task: 'Month-end close review',
    },
  ];
  for (const seed of timeClockSeeds) {
    const userId = userIdByName.get(seed.user);
    if (!userId) continue;
    const existing = await prisma.timeClockRecord.findFirst({
      where: { userId, clockIn: seed.clockIn },
    });
    if (existing) continue;
    await prisma.timeClockRecord.create({
      data: {
        userId,
        clockIn: seed.clockIn,
        clockOut: seed.clockOut,
        punchDate: startOfDay(seed.clockIn),
        status: seed.clockOut ? 'clock_out' : 'unclosed_needs_resolution',
        hoursType: 'regular',
        taskDetails: { create: [{ laborStatus: 'working', task: seed.task }] },
      },
    });
  }

  // --- Personal Days — bridged into TimeClockRecord, same mechanism T-057 built ----------
  const priyaId = userIdByName.get('Priya Nair');
  if (priyaId) {
    const existing = await prisma.personalDay.findFirst({
      where: { userId: priyaId, hoursType: 'vacation' },
    });
    if (!existing) {
      const start = startOfDay(daysAgo(10, 0));
      await prisma.personalDay.create({
        data: {
          userId: priyaId,
          hoursType: 'vacation',
          startDate: start,
          endDate: startOfDay(daysAgo(8, 0)),
          dayCount: 3,
          note: 'Family trip.',
        },
      });
      for (let offset = 8; offset <= 10; offset += 1) {
        const day = startOfDay(daysAgo(offset, 0));
        const clockIn = new Date(day);
        clockIn.setUTCHours(9, 0, 0, 0);
        const clockOut = new Date(day);
        clockOut.setUTCHours(17, 0, 0, 0);
        await prisma.timeClockRecord.create({
          data: {
            userId: priyaId,
            clockIn,
            clockOut,
            punchDate: day,
            status: 'clock_out',
            hoursType: 'vacation',
          },
        });
      }
    }
  }

  console.log(
    `Seeded ${ROLES.length} roles, 2 profiles, ${USERS.length} users (password: ${DEMO_PASSWORD}), time-clock history incl. 1 unclosed punch, 1 personal-day bridge.`,
  );
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
