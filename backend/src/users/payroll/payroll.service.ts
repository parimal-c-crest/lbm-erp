import { Injectable } from '@nestjs/common';

import { TenantContextService } from '../../tenant/tenant-context.service';

const OVERTIME_THRESHOLD_HOURS = 40;
type HoursType = 'regular' | 'holiday' | 'personal' | 'sick' | 'vacation';

export interface PayrollRow {
  userId: string;
  userName: string;
  regular: number;
  holiday: number;
  personal: number;
  sick: number;
  vacation: number;
  overtime: number;
  status: 'complete' | 'needs_resolution';
}

function elapsedHours(clockIn: Date, clockOut: Date): number {
  return (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
}

// Monday-anchored week key — a plain grouping bucket, not real ISO-8601 week numbering; just
// needs to be consistent so hours-beyond-40 resets on the same day every week.
function weekKey(date: Date): string {
  const dayOfWeek = (date.getUTCDay() + 6) % 7; // Monday = 0
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - dayOfWeek);
  return monday.toISOString().slice(0, 10);
}

// Payroll pipeline (`3-business-rules.md` §5 Calculations, ADR-036/037) — one shared elapsed-time
// calculator and the standard US weekly-overtime rule. `TimeClockRecord` (all 5 `hoursType`
// values) is the single source this report reads — the Personal-Day→hours-classification bridge
// (`8-api.md` POST /personal-days, FR-010) happens at *submission* time in `PersonalDaysService`
// (T-057), which writes a real `TimeClockRecord` row; this report never reads `PersonalDay`
// directly, closing the legacy "confirmed disconnected" gap without a second, redundant join that
// would double-count once that bridge exists (`calculations.md` §4). Always computed fresh at
// view time — never cached (`8-api.md` §3 `/payroll/report`).
@Injectable()
export class PayrollService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get prisma() {
    return this.tenantContext.prisma;
  }

  async report(
    startIso: string,
    endIso: string,
  ): Promise<{ start: string; end: string; rows: PayrollRow[] }> {
    const start = new Date(startIso);
    const end = new Date(endIso);

    const users = await this.prisma.user.findMany({
      where: { isDeleted: false },
      select: { id: true, firstName: true, lastName: true },
    });

    const rows = await Promise.all(users.map((user) => this.buildRow(user, start, end)));

    return { start: startIso, end: endIso, rows };
  }

  private async buildRow(
    user: { id: string; firstName: string; lastName: string | null },
    start: Date,
    end: Date,
  ): Promise<PayrollRow> {
    const punches = await this.prisma.timeClockRecord.findMany({
      where: { userId: user.id, punchDate: { gte: start, lte: end } },
    });

    const hoursByType: Record<HoursType, number> = {
      regular: 0,
      holiday: 0,
      personal: 0,
      sick: 0,
      vacation: 0,
    };
    const weeklyRegularHours = new Map<string, number>();
    let hasUnresolved = false;

    for (const punch of punches) {
      if (punch.status !== 'clock_out' || !punch.clockOut) {
        // `unclosed_needs_resolution` (or any still-open punch caught before its sweep) is never
        // silently included in the total (ADR-037) — surfaced as a row-level flag instead.
        hasUnresolved = true;
        continue;
      }
      const hours = elapsedHours(punch.clockIn, punch.clockOut);
      hoursByType[punch.hoursType] += hours;
      if (punch.hoursType === 'regular') {
        const key = weekKey(punch.punchDate);
        weeklyRegularHours.set(key, (weeklyRegularHours.get(key) ?? 0) + hours);
      }
    }

    const overtime = [...weeklyRegularHours.values()].reduce(
      (total, weekHours) => total + Math.max(0, weekHours - OVERTIME_THRESHOLD_HOURS),
      0,
    );

    return {
      userId: user.id,
      userName: [user.firstName, user.lastName].filter(Boolean).join(' '),
      ...hoursByType,
      overtime,
      status: hasUnresolved ? 'needs_resolution' : 'complete',
    };
  }
}
