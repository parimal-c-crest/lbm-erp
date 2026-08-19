import { Injectable, NotFoundException } from '@nestjs/common';

import { toPublicEntity } from '../../common/utils/public-entity.util';
import { TenantContextService } from '../../tenant/tenant-context.service';

import type { CreateHolidayDto } from './dto/create-holiday.dto';

function toPublicHoliday<
  T extends { id: bigint; publicId: string; assignments: { id: bigint; publicId: string }[] },
>(holiday: T) {
  return {
    ...toPublicEntity(holiday),
    assignments: holiday.assignments.map((a) => toPublicEntity(a)),
  };
}

// System-wide holiday catalog + per-user assignment (`8-api.md` §3 GET/POST /holidays,
// `4-schema.md` §3 "Holiday / HolidayAssignment" — see raid-log R-005 for this task's own
// column-level shape, since the approved doc never specified one).
@Injectable()
export class HolidaysService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get prisma() {
    return this.tenantContext.prisma;
  }

  async list() {
    const holidays = await this.prisma.holiday.findMany({
      orderBy: { date: 'asc' },
      include: { assignments: true },
    });
    return holidays.map(toPublicHoliday);
  }

  async create(dto: CreateHolidayDto) {
    const holiday = await this.prisma.holiday.create({
      data: { name: dto.name, date: new Date(dto.date) },
    });

    if (dto.userIds?.length) {
      // `dto.userIds` are client-supplied `public_id`s — resolved to each User's internal `id`
      // before writing the FK (ADR-200).
      const users = await this.prisma.user.findMany({
        where: { publicId: { in: dto.userIds }, isDeleted: false },
        select: { id: true, publicId: true },
      });
      const foundPublicIds = new Set(users.map((u) => u.publicId));
      const missing = dto.userIds.filter((id) => !foundPublicIds.has(id));
      if (missing.length > 0) {
        throw new NotFoundException(`User(s) not found: ${missing.join(', ')}`);
      }
      await this.prisma.holidayAssignment.createMany({
        data: users.map((user) => ({ holidayId: holiday.id, userId: user.id })),
      });
    }

    const created = await this.prisma.holiday.findUnique({
      where: { id: holiday.id },
      include: { assignments: true },
    });
    return toPublicHoliday(created!);
  }
}
