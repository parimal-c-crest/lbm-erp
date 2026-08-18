import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { TenantClientRegistryService } from '../../tenant/tenant-client-registry.service';

import type { QuickBooksSyncJobPayload } from './quickbooks-sync.service';
import { QUICKBOOKS_SYNC_QUEUE } from './quickbooks.constants';

// No HTTP request context in a queue worker — resolves its own tenant client via
// `TenantClientRegistryService`, same pattern as `TimeclockAutoCloseProcessor`.
//
// **Known limitation, flagged not hidden**: this project has no QuickBooks sandbox
// credentials/API client wired up (same class of gap as T-049's 2FA email delivery) — the actual
// external call is stubbed with a deterministic fake `qbListId`/`qbEditSequence` rather than a
// real QuickBooks Online API request. The pointer-update mechanism, real-time enqueue-on-save
// trigger, and status-read endpoint are all real; only the external HTTP call itself is not.
@Processor(QUICKBOOKS_SYNC_QUEUE)
export class QuickBooksSyncProcessor extends WorkerHost {
  constructor(private readonly registry: TenantClientRegistryService) {
    super();
  }

  async process(job: Job<QuickBooksSyncJobPayload>): Promise<void> {
    const { userId, tenantSubdomain } = job.data;
    const prisma = await this.registry.resolve(tenantSubdomain);

    const existing = await prisma.quickBooksSyncPointer.findUnique({ where: { userId } });
    const nextSequence = String(Number(existing?.qbEditSequence ?? '0') + 1);

    await prisma.quickBooksSyncPointer.upsert({
      where: { userId },
      create: {
        userId,
        status: 'synced',
        qbListId: `80${userId.slice(0, 4)}-${Date.now()}`,
        qbEditSequence: nextSequence,
        lastSyncedAt: new Date(),
      },
      update: {
        status: 'synced',
        qbEditSequence: nextSequence,
        lastSyncedAt: new Date(),
      },
    });
  }
}
