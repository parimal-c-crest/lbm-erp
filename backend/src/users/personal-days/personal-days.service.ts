import { BadRequestException, Injectable } from '@nestjs/common';

import type { HoursType } from '../../generated/prisma/enums';
import { TenantContextService } from '../../tenant/tenant-context.service';

import type { SubmitPersonalDayDto } from './dto/submit-personal-day.dto';

const WORKDAY_START_HOUR = 9;
const WORKDAY_END_HOUR = 17;

function parseTimeOfDay(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setUTCHours(hours, minutes, 0, 0);
  return result;
}

function eachDateInclusive(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

// Personal Day submission (`8-api.md` POST /personal-days, FR-010) — bridges into a real,
// already-closed `TimeClockRecord` per day at submission time, the single documented mechanism
// that closes the legacy system's confirmed disconnect between Personal Day entries and payroll
// (`calculations.md` §4). Payroll (`PayrollService`) never reads `PersonalDay` directly — this is
// the one place that connection is made.
@Injectable()
export class PersonalDaysService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get prisma() {
    return this.tenantContext.prisma;
  }

  async submit(userId: string, dto: SubmitPersonalDayDto) {
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    if (dto.startTime && dto.endTime) {
      const start = parseTimeOfDay(startDate, dto.startTime);
      const end = parseTimeOfDay(startDate, dto.endTime);
      if (end <= start) {
        throw new BadRequestException('End time must not precede start time.');
      }
    }

    const personalDay = await this.prisma.personalDay.create({
      data: {
        userId,
        hoursType: dto.hoursType,
        startDate,
        endDate,
        dayCount: dto.dayCount,
        startTime: dto.startTime,
        endTime: dto.endTime,
        note: dto.note,
      },
    });

    await this.bridgeToTimeClock(userId, personalDay);

    return personalDay;
  }

  private async bridgeToTimeClock(
    userId: string,
    personalDay: {
      hoursType: HoursType;
      startDate: Date;
      endDate: Date | null;
      startTime: string | null;
      endTime: string | null;
    },
  ) {
    if (personalDay.startTime && personalDay.endTime) {
      const clockIn = parseTimeOfDay(personalDay.startDate, personalDay.startTime);
      const clockOut = parseTimeOfDay(personalDay.startDate, personalDay.endTime);
      await this.prisma.timeClockRecord.create({
        data: {
          userId,
          clockIn,
          clockOut,
          punchDate: personalDay.startDate,
          status: 'clock_out',
          hoursType: personalDay.hoursType,
        },
      });
      return;
    }

    const days = eachDateInclusive(
      personalDay.startDate,
      personalDay.endDate ?? personalDay.startDate,
    );
    for (const day of days) {
      const clockIn = new Date(day);
      clockIn.setUTCHours(WORKDAY_START_HOUR, 0, 0, 0);
      const clockOut = new Date(day);
      clockOut.setUTCHours(WORKDAY_END_HOUR, 0, 0, 0);

      await this.prisma.timeClockRecord.create({
        data: {
          userId,
          clockIn,
          clockOut,
          punchDate: day,
          status: 'clock_out',
          hoursType: personalDay.hoursType,
        },
      });
    }
  }
}
