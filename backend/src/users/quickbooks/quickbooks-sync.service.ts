import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

import { TenantContextService } from '../../tenant/tenant-context.service';

import { QUICKBOOKS_SYNC_QUEUE } from './quickbooks.constants';

// `userId` here is the User's `public_id` (ADR-200) — BullMQ job data is JSON-serialized, and a
// raw internal bigint `id` neither survives that serialization nor belongs on a queue payload
// (internal-only per ADR-200). The processor resolves it back to the internal `id` once, on
// pickup.
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

  // ADR-200 — selects `publicId` (never the internal bigint `id`/`userId`) for both the User and
  // its `QuickBooksSyncPointer` (a shared-PK 1:1 extension with no `publicId` of its own — its
  // `userId` FK is internal-only and must not reach the response either).
  async listStatus() {
    const users = await this.tenantContext.prisma.user.findMany({
      where: { isDeleted: false },
      select: {
        publicId: true,
        firstName: true,
        lastName: true,
        quickBooksSync: {
          select: {
            qbListId: true,
            qbEditSequence: true,
            status: true,
            errorMessage: true,
            lastSyncedAt: true,
          },
        },
      },
    });
    return users.map(({ publicId, ...rest }) => ({ ...rest, id: publicId }));
  }
}
