import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

import { TenantContextService } from '../../tenant/tenant-context.service';

import { QUICKBOOKS_SYNC_QUEUE } from './quickbooks.constants';

export interface QuickBooksSyncJobPayload {
  userId: string;
  tenantSubdomain: string;
}

// QuickBooks employee sync (`8-api.md` §2 GET /quickbooks-sync/status, FR-013) — **revived**, not
// excluded (ADR-074), reversing the legacy system's confirmed-dead, every-enqueue-call-commented-
// out state. Real-time enqueue on User save (ADR-031's standing non-blocking-external-integration
// principle) — `UsersService.create`/`update` call `enqueue()` after their own save completes.
@Injectable()
export class QuickBooksSyncService {
  constructor(
    private readonly tenantContext: TenantContextService,
    @InjectQueue(QUICKBOOKS_SYNC_QUEUE) private readonly queue: Queue<QuickBooksSyncJobPayload>,
  ) {}

  async enqueue(userId: string) {
    await this.queue.add('sync-user', { userId, tenantSubdomain: this.tenantContext.subdomain });
  }

  listStatus() {
    return this.tenantContext.prisma.user.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        quickBooksSync: true,
      },
    });
  }
}
