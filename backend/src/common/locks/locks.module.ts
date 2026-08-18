import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import type Redis from 'ioredis';

import { ConcurrencyLockService } from './concurrency-lock.service';
import { REDIS_LOCK_CLIENT, redisLockClientProvider } from './redis-lock-client.provider';

// Global, like `PrismaModule`/`TenantModule` — the concurrency-lock primitive (ADR-079/080/084)
// is meant to be reused by every future module, not re-registered per feature module.
@Global()
@Module({
  providers: [redisLockClientProvider, ConcurrencyLockService],
  exports: [ConcurrencyLockService],
})
export class LocksModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_LOCK_CLIENT) private readonly redis: Redis) {}

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
