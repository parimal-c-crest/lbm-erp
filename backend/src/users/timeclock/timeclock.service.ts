import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ConcurrencyLockService } from '../../common/locks/concurrency-lock.service';
import { EntityIdentifier } from '../../common/value-objects/entity-identifier';
import { TenantContextService } from '../../tenant/tenant-context.service';

import type { ClockInDto } from './dto/clock-in.dto';
import type { OverrideTimeClockDto } from './dto/override.dto';

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

const OVERRIDE_LOCK_RESOURCE = 'timeclock-override';

// Time Clock state machine (`3-business-rules.md` §6): `(none) → CLOCK IN → CLOCK OUT`. A
// second clock-in while a punch is open is rejected (409) — the new design's own guard, closing
// the legacy system's confirmed absence of one.
@Injectable()
export class TimeclockService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly locks: ConcurrencyLockService,
  ) {}

  private get prisma() {
    return this.tenantContext.prisma;
  }

  async clockIn(userId: string, dto: ClockInDto) {
    const open = await this.prisma.timeClockRecord.findFirst({
      where: { userId, status: 'clock_in' },
    });
    if (open) {
      throw new ConflictException('A punch is already open for this user.');
    }

    const now = new Date();
    return this.prisma.timeClockRecord.create({
      data: {
        userId,
        clockIn: now,
        punchDate: startOfDay(now),
        status: 'clock_in',
        taskDetails:
          dto.task || dto.laborStatus
            ? { create: [{ laborStatus: dto.laborStatus ?? 'working', task: dto.task }] }
            : undefined,
      },
    });
  }

  async clockOut(userId: string) {
    const open = await this.prisma.timeClockRecord.findFirst({
      where: { userId, status: 'clock_in' },
    });
    if (!open) {
      throw new NotFoundException('No open punch found for this user.');
    }

    return this.prisma.timeClockRecord.update({
      where: { id: open.id },
      data: { clockOut: new Date(), status: 'clock_out' },
    });
  }

  // Concurrent-edit lock (ADR-079/080/084) — acquired before an admin/manager starts editing a
  // punch, so a second user opening the same record is blocked with a detailed "currently being
  // edited by X" message rather than silently racing to save. `heldByName` is resolved fresh
  // from the User table here, not cached in Redis alongside the lock, so it can never go stale.
  async lockOverride(recordId: string, userId: string) {
    const identifier = EntityIdentifier.from(recordId);
    const result = await this.locks.acquire(OVERRIDE_LOCK_RESOURCE, identifier.value, userId);
    if (result.acquired) return { acquired: true as const };

    const holder = result.heldByUserId
      ? await this.prisma.user.findUnique({ where: { id: result.heldByUserId } })
      : null;
    const holderName = holder
      ? [holder.firstName, holder.lastName].filter(Boolean).join(' ')
      : 'another user';
    throw new ConflictException(`Currently being edited by ${holderName}, locked for you.`);
  }

  async heartbeatOverrideLock(recordId: string, userId: string) {
    const identifier = EntityIdentifier.from(recordId);
    const renewed = await this.locks.heartbeat(OVERRIDE_LOCK_RESOURCE, identifier.value, userId);
    if (!renewed) throw new ConflictException('Lock is no longer held by you.');
    return { renewed: true as const };
  }

  async releaseOverrideLock(recordId: string, userId: string) {
    const identifier = EntityIdentifier.from(recordId);
    await this.locks.release(OVERRIDE_LOCK_RESOURCE, identifier.value, userId);
    return { released: true as const };
  }

  // Admin/Accounting/Management correction of clock-in/out timestamps (`8-api.md` §3
  // POST /timeclock/override). Cross-field validation: clock-out must not precede clock-in
  // (`6-validation.md` §4, closes the legacy admin-override screens' confirmed absence of this
  // check). Requires the caller to hold the concurrent-edit lock (ADR-079/080/084) — releases it
  // instantly on a successful save, matching ADR-079's "releases the moment the editor leaves
  // edit mode" behavior.
  async override(dto: OverrideTimeClockDto, actorId: string) {
    const identifier = EntityIdentifier.from(dto.recordId);

    const holdsLock = await this.locks.isHeldBy(OVERRIDE_LOCK_RESOURCE, identifier.value, actorId);
    if (!holdsLock) {
      throw new ConflictException('You must hold the edit lock before submitting an override.');
    }

    const record = await this.prisma.timeClockRecord.findUnique({
      where: { id: identifier.value },
    });
    if (!record) {
      throw new NotFoundException('Time clock record not found.');
    }

    const clockIn = new Date(dto.clockIn);
    const clockOut = dto.clockOut ? new Date(dto.clockOut) : null;
    if (clockOut && clockOut < clockIn) {
      throw new BadRequestException('Clock-out must not precede clock-in.');
    }

    const updated = await this.prisma.timeClockRecord.update({
      where: { id: identifier.value },
      data: {
        clockIn,
        clockOut,
        status: clockOut ? 'clock_out' : 'clock_in',
      },
    });

    await this.locks.release(OVERRIDE_LOCK_RESOURCE, identifier.value, actorId);
    return updated;
  }
}
