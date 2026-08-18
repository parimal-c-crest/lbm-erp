import { Injectable, NotFoundException } from '@nestjs/common';

import { EntityIdentifier } from '../../common/value-objects/entity-identifier';
import { TenantContextService } from '../../tenant/tenant-context.service';

// Conversion Factor History (T-076, `8-api.md` GET .../history, FR-007). Writing is owned by
// `GroupsService` (BR-009 — history is written inside the same transaction as a factor value
// change, on Group create/update); this service is the read side only.
@Injectable()
export class HistoryService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get prisma() {
    return this.tenantContext.prisma;
  }

  async forPair(groupId: string, typeId: string, asOfDate?: string) {
    const group = EntityIdentifier.from(groupId);
    const type = EntityIdentifier.from(typeId);

    if (asOfDate) {
      const date = new Date(asOfDate);
      const row = await this.prisma.uOMTypeFactorHistory.findFirst({
        where: {
          groupId: group.value,
          typeId: type.value,
          effectiveFrom: { lte: date },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
        },
        orderBy: { effectiveFrom: 'desc' },
      });
      if (!row) {
        throw new NotFoundException(`No effective Conversion Factor rate found as of ${asOfDate}.`);
      }
      return row;
    }

    const rows = await this.prisma.uOMTypeFactorHistory.findMany({
      where: { groupId: group.value, typeId: type.value },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (rows.length === 0) throw new NotFoundException('No factor history exists for this pair.');
    return rows;
  }
}
