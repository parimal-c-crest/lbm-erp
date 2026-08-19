import { Injectable, NotFoundException } from '@nestjs/common';

import { EntityIdentifier } from '../../common/value-objects/entity-identifier';
import { TenantContextService } from '../../tenant/tenant-context.service';

// Conversion Factor History (T-076, `8-api.md` GET .../history, FR-007). Writing is owned by
// `GroupsService` (BR-009 — history is written inside the same transaction as a factor value
// change, on Group create/update); this service is the read side only.
//
// ADR-200 — `groupId`/`typeId` path params are publicId UUIDs, resolved to internal bigint ids
// before querying; each returned row's own internal `id` is dropped and its `publicId` promoted to
// `id`, and `typeId` on the row is re-expressed as the (already-known) Type publicId rather than
// the internal bigint FK — no internal bigint ever reaches the response body.
@Injectable()
export class HistoryService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get prisma() {
    return this.tenantContext.prisma;
  }

  private toPublic(
    row: { publicId: string; rate: unknown; effectiveFrom: Date; effectiveTo: Date | null },
    typePublicId: string,
  ) {
    return {
      id: row.publicId,
      typeId: typePublicId,
      rate: row.rate,
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo,
    };
  }

  async forPair(groupId: string, typeId: string, asOfDate?: string) {
    const groupPublicId = EntityIdentifier.from(groupId).value;
    const typePublicId = EntityIdentifier.from(typeId).value;

    const group = await this.prisma.uOMGroup.findFirst({
      where: { publicId: groupPublicId, isDeleted: false },
      select: { id: true },
    });
    if (!group) throw new NotFoundException('Group not found.');

    const type = await this.prisma.uOMType.findFirst({
      where: { publicId: typePublicId, isDeleted: false },
      select: { id: true },
    });
    if (!type) throw new NotFoundException('Type not found.');

    if (asOfDate) {
      const date = new Date(asOfDate);
      const row = await this.prisma.uOMTypeFactorHistory.findFirst({
        where: {
          groupId: group.id,
          typeId: type.id,
          effectiveFrom: { lte: date },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
        },
        orderBy: { effectiveFrom: 'desc' },
      });
      if (!row) {
        throw new NotFoundException(`No effective Conversion Factor rate found as of ${asOfDate}.`);
      }
      return this.toPublic(row, typePublicId);
    }

    const rows = await this.prisma.uOMTypeFactorHistory.findMany({
      where: { groupId: group.id, typeId: type.id },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (rows.length === 0) throw new NotFoundException('No factor history exists for this pair.');
    return rows.map((row) => this.toPublic(row, typePublicId));
  }
}
