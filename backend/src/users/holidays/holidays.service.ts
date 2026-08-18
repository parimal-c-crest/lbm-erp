import { Injectable } from '@nestjs/common';

import { TenantContextService } from '../../tenant/tenant-context.service';

import type { CreateHolidayDto } from './dto/create-holiday.dto';

// System-wide holiday catalog + per-user assignment (`8-api.md` §3 GET/POST /holidays,
// `4-schema.md` §3 "Holiday / HolidayAssignment" — see raid-log R-005 for this task's own
// column-level shape, since the approved doc never specified one).
@Injectable()
export class HolidaysService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get prisma() {
    return this.tenantContext.prisma;
  }

  list() {
    return this.prisma.holiday.findMany({
      orderBy: { date: 'asc' },
      include: { assignments: true },
    });
  }

  async create(dto: CreateHolidayDto) {
    const holiday = await this.prisma.holiday.create({
      data: { name: dto.name, date: new Date(dto.date) },
    });

    if (dto.userIds?.length) {
      await this.prisma.holidayAssignment.createMany({
        data: dto.userIds.map((userId) => ({ holidayId: holiday.id, userId })),
      });
    }

    return this.prisma.holiday.findUnique({
      where: { id: holiday.id },
      include: { assignments: true },
    });
  }
}
