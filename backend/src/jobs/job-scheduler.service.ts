import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';

import { PrismaService } from '../prisma/prisma.service';

import { computeStaggeredCronPattern } from './compute-schedule';
import { CRON_JOBS_QUEUE } from './jobs.constants';

// `jobDefinitionId` is the JobDefinition's `public_id` (ADR-200) — BullMQ job data is
// JSON-serialized, and a raw internal bigint `id` neither survives that serialization nor
// belongs on a queue payload (internal-only per ADR-200). `JobRunProcessor` resolves it back to
// the internal `id` once, on pickup.
export interface CronJobPayload {
  jobDefinitionId: string;
  tenantSubdomain: string;
}

function repeatableJobId(jobName: string, tenantSubdomain: string): string {
  return `${jobName}:${tenantSubdomain}`;
}

// Syncs BullMQ's registered repeatable jobs against `JobDefinition`/`JobSchedule` (skeleton DB) —
// the control panel (T-027) doesn't talk to BullMQ directly, it edits these rows and calls
// `syncAll()`. Master-disabled or per-tenant-disabled combinations are removed from BullMQ
// entirely rather than left registered-but-skipped, so `queue.getRepeatableJobs()` always
// reflects what's actually scheduled to run.
@Injectable()
export class JobSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(JobSchedulerService.name);

  constructor(
    @InjectQueue(CRON_JOBS_QUEUE) private readonly queue: Queue<CronJobPayload>,
    private readonly skeleton: PrismaService,
  ) {}

  async onModuleInit() {
    await this.syncAll();
  }

  async syncAll(): Promise<void> {
    const definitions = await this.skeleton.jobDefinition.findMany({
      include: { schedules: true },
    });

    const desired = new Map<string, { pattern: string; payload: CronJobPayload }>();
    for (const definition of definitions) {
      if (!definition.masterEnabled) continue;

      for (const schedule of definition.schedules) {
        if (!schedule.enabled) continue;

        const id = repeatableJobId(definition.name, schedule.tenantSubdomain);
        const pattern = computeStaggeredCronPattern(
          definition.baseHour,
          definition.baseMinute,
          schedule.offsetMinutes,
        );
        desired.set(id, {
          pattern,
          payload: {
            jobDefinitionId: definition.publicId,
            tenantSubdomain: schedule.tenantSubdomain,
          },
        });
      }
    }

    const existing = await this.queue.getJobSchedulers();
    for (const scheduler of existing) {
      if (!desired.has(scheduler.key)) {
        await this.queue.removeJobScheduler(scheduler.key);
        this.logger.log(`Removed stale job scheduler: ${scheduler.key}`);
      }
    }

    for (const [id, { pattern, payload }] of desired) {
      await this.queue.upsertJobScheduler(id, { pattern }, { data: payload });
    }

    this.logger.log(`Synced ${desired.size} repeatable job(s).`);
  }
}
