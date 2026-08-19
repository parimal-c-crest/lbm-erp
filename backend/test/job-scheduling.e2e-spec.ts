import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Queue } from 'bullmq';

import { AppModule } from '../src/app.module';
import type { CronJobPayload } from '../src/jobs/job-scheduler.service';
import { JobSchedulerService } from '../src/jobs/job-scheduler.service';
import { CRON_JOBS_QUEUE } from '../src/jobs/jobs.constants';
import { PrismaService } from '../src/prisma/prisma.service';

// Real end-to-end check against real Postgres + Redis. Waiting for an actual daily cron trigger
// would be far too slow for a test, so this verifies the two things separately: (1) `syncAll()`
// registers the correctly-staggered pattern in BullMQ, and (2) the processor correctly records
// run history when a job fires — proven by adding one immediate one-off job with the same payload
// shape a scheduled firing would use, rather than waiting on the schedule itself.
describe('Job scheduling (e2e)', () => {
  let app: INestApplication;
  let scheduler: JobSchedulerService;
  let skeleton: PrismaService;
  let queue: Queue<CronJobPayload>;
  const jobName = 'e2e-test-job';

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    scheduler = app.get(JobSchedulerService);
    skeleton = app.get(PrismaService);
    queue = app.get(getQueueToken(CRON_JOBS_QUEUE));
  });

  afterEach(async () => {
    const definition = await skeleton.jobDefinition.findUnique({ where: { name: jobName } });
    if (definition) {
      await skeleton.jobRun.deleteMany({ where: { jobDefinitionId: definition.id } });
      await skeleton.jobSchedule.deleteMany({ where: { jobDefinitionId: definition.id } });
      await skeleton.jobDefinition.delete({ where: { id: definition.id } });
    }
    await scheduler.syncAll();
    await app.close();
  }, 15000);

  it('registers a correctly-staggered schedule and records a run', async () => {
    const definition = await skeleton.jobDefinition.create({
      data: { name: jobName, baseHour: 2, baseMinute: 0, masterEnabled: true },
    });
    await skeleton.jobSchedule.create({
      data: { jobDefinitionId: definition.id, tenantSubdomain: 'demo', offsetMinutes: 15 },
    });

    await scheduler.syncAll();

    const schedulers = await queue.getJobSchedulers();
    const registered = schedulers.find((s) => s.key === `${jobName}:demo`);
    expect(registered).toBeDefined();
    expect(registered?.pattern).toBe('15 2 * * *'); // 2:00 + 15min offset = 2:15

    // Simulate a firing without waiting for the real schedule (see class comment above).
    // `CronJobPayload.jobDefinitionId` is the wire/queue-payload shape (ADR-200) — the publicId,
    // not the internal bigint `id`; `JobRunProcessor` resolves it back to `id` on pickup.
    await queue.add(jobName, { jobDefinitionId: definition.publicId, tenantSubdomain: 'demo' });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const runs = await skeleton.jobRun.findMany({ where: { jobDefinitionId: definition.id } });
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe('success');
    expect(runs[0].tenantSubdomain).toBe('demo');
  }, 15000);

  it('removes a schedule from BullMQ when disabled', async () => {
    const definition = await skeleton.jobDefinition.create({
      data: { name: jobName, baseHour: 3, baseMinute: 0, masterEnabled: true },
    });
    const schedule = await skeleton.jobSchedule.create({
      data: { jobDefinitionId: definition.id, tenantSubdomain: 'demo', offsetMinutes: 0 },
    });
    await scheduler.syncAll();
    expect((await queue.getJobSchedulers()).some((s) => s.key === `${jobName}:demo`)).toBe(true);

    await skeleton.jobSchedule.update({ where: { id: schedule.id }, data: { enabled: false } });
    await scheduler.syncAll();

    expect((await queue.getJobSchedulers()).some((s) => s.key === `${jobName}:demo`)).toBe(false);
  }, 15000);
});
