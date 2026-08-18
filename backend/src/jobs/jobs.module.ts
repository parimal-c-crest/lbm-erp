import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { JobManagementController } from './job-management.controller';
import { JobRunProcessor } from './job-run.processor';
import { JobSchedulerService } from './job-scheduler.service';
import { CRON_JOBS_QUEUE } from './jobs.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        // Plain options, not a pre-built ioredis instance — lets BullMQ own the connection
        // lifecycle (opened/closed per queue/worker) instead of leaking a connection Nest
        // doesn't know how to close on module teardown.
        const url = new URL(config.getOrThrow<string>('REDIS_URL'));
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port || 6379),
            password: url.password || undefined,
            maxRetriesPerRequest: null,
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: CRON_JOBS_QUEUE }),
  ],
  controllers: [JobManagementController],
  providers: [JobSchedulerService, JobRunProcessor],
})
export class JobsModule {}
