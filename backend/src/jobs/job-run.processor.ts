import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { PrismaService } from '../prisma/prisma.service';

import type { CronJobPayload } from './job-scheduler.service';
import { CRON_JOBS_QUEUE } from './jobs.constants';

// Records run history (design doc §7) for every fired repeatable job. The job body itself is a
// placeholder — real work is a per-consuming-module concern, added once those modules exist
// (design doc §9). This proves the scheduling/staggering/history mechanism end-to-end without
// pretending to implement business logic that doesn't exist yet.
@Processor(CRON_JOBS_QUEUE)
export class JobRunProcessor extends WorkerHost {
  private readonly logger = new Logger(JobRunProcessor.name);

  constructor(private readonly skeleton: PrismaService) {
    super();
  }

  async process(job: Job<CronJobPayload>): Promise<void> {
    const { jobDefinitionId: publicJobDefinitionId, tenantSubdomain } = job.data;
    const startedAt = Date.now();

    // ADR-200 — the queue payload carries the JobDefinition's `public_id`; resolve to the
    // internal `id` (`JobRun.jobDefinitionId`'s real FK type) once, here.
    const definition = await this.skeleton.jobDefinition.findFirst({
      where: { publicId: publicJobDefinitionId },
    });
    if (!definition) {
      this.logger.warn(`Job definition ${publicJobDefinitionId} no longer exists — skipping run.`);
      return;
    }
    const jobDefinitionId = definition.id;

    const run = await this.skeleton.jobRun.create({
      data: { jobDefinitionId, tenantSubdomain, status: 'running' },
    });

    try {
      // No-op placeholder — see class comment.
      await this.skeleton.jobRun.update({
        where: { id: run.id },
        data: {
          status: 'success',
          finishedAt: new Date(),
          durationMs: Date.now() - startedAt,
        },
      });
    } catch (error) {
      await this.skeleton.jobRun.update({
        where: { id: run.id },
        data: {
          status: 'failure',
          finishedAt: new Date(),
          durationMs: Date.now() - startedAt,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }

    this.logger.log(`Ran ${jobDefinitionId} for ${tenantSubdomain}`);
  }
}
