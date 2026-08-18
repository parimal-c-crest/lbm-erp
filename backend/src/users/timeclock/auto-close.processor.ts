import { Processor, WorkerHost } from '@nestjs/bullmq';

import { TimeclockAutoCloseService } from './auto-close.service';
import { TIMECLOCK_AUTO_CLOSE_QUEUE } from './timeclock.constants';

@Processor(TIMECLOCK_AUTO_CLOSE_QUEUE)
export class TimeclockAutoCloseProcessor extends WorkerHost {
  constructor(private readonly autoClose: TimeclockAutoCloseService) {
    super();
  }

  async process(): Promise<void> {
    await this.autoClose.sweepAllTenants();
  }
}
