import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_LOCK_CLIENT = 'REDIS_LOCK_CLIENT';

// Its own plain `ioredis` connection — deliberately not shared with BullMQ's connection (that
// one is owned/lifecycle-managed by `@nestjs/bullmq`, not meant for direct commands like this
// lock's `SET NX PX` / Lua eval). `LocksModule` closes it in `onApplicationShutdown` so a test
// teardown (`app.close()`) doesn't leave a dangling handle.
export const redisLockClientProvider: Provider = {
  provide: REDIS_LOCK_CLIENT,
  useFactory: (config: ConfigService) => new Redis(config.getOrThrow<string>('REDIS_URL')),
  inject: [ConfigService],
};
