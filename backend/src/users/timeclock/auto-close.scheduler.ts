import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';

import { TIMECLOCK_AUTO_CLOSE_QUEUE } from './timeclock.constants';

const DAILY_AT_00_10_UTC = '10 0 * * *';
const REPEATABLE_JOB_ID = 'timeclock-auto-close-daily';

// Registers the one repeatable sweep job on boot — idempotent (`upsertJobScheduler`), so
// restarting the app doesn't create duplicate schedules.
@Injectable()
export class TimeclockAutoCloseScheduler implements OnModuleInit {
  constructor(@InjectQueue(TIMECLOCK_AUTO_CLOSE_QUEUE) private readonly queue: Queue) {}

  async onModuleInit() {
    await this.queue.upsertJobScheduler(REPEATABLE_JOB_ID, { pattern: DAILY_AT_00_10_UTC });
  }
}
