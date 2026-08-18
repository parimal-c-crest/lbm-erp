import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { EntityIdentifier } from '../../common/value-objects/entity-identifier';
import { TenantContextService } from '../../tenant/tenant-context.service';

import type { ResolveConversionDto } from './dto/resolve-conversion.dto';

// Base-unit-pivot conversion arithmetic (T-078, BR-005/BR-007/BR-008). `units_per_base` is read as
// "how many Base units equal one unit of this Type" — the standard ERP "units-per" convention and
// the only reading consistent with the seeded fixture data (`frontend/src/lib/mock-data/uom.ts`,
// e.g. Bagged Concrete Mix: Base=Pound, Each.unitsPerBase=80 → 1 Each = 80 Pounds) and with
// BR-003's whole-number-≥1 constraint (only sound if Base, being the group's smallest unit, is the
// side being multiplied up to, not divided down to). `3-business-rules.md` BR-003/004 itself flags
// the exact enforcement-direction wording as Underspecified — this is this task's own resolved
// implementation choice, not a silent guess.
@Injectable()
export class ConversionService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get prisma() {
    return this.tenantContext.prisma;
  }

  async resolve(dto: ResolveConversionDto): Promise<{ result: number }> {
    const groupId = EntityIdentifier.from(dto.groupId).value;
    const typeId = EntityIdentifier.from(dto.typeId).value;

    const group = await this.prisma.uOMGroup.findFirst({
      where: { id: groupId, isDeleted: false },
    });
    if (!group) throw new NotFoundException('Group not found.');

    const rate = await this.resolveRate(groupId, typeId, group.baseTypeId, dto.asOfDate);

    // BR-007 — always fractional, never whole-number-rounded, no config flag either direction.
    const result = dto.direction === 'uom_to_base' ? dto.value * rate : dto.value / rate;

    return { result };
  }

  private async resolveRate(
    groupId: string,
    typeId: string,
    baseTypeId: string,
    asOfDate?: string,
  ): Promise<number> {
    if (typeId === baseTypeId) return 1; // BR-003 — Base Type's own factor is implicitly 1.

    if (asOfDate) {
      const historical = await this.prisma.uOMTypeFactorHistory.findFirst({
        where: {
          groupId,
          typeId,
          effectiveFrom: { lte: new Date(asOfDate) },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date(asOfDate) } }],
        },
        orderBy: { effectiveFrom: 'desc' },
      });
      if (!historical) {
        throw new BadRequestException(
          `Type is not reachable through this Group as of ${asOfDate} (no effective Conversion Factor).`,
        );
      }
      return Number(historical.rate);
    }

    const factor = await this.prisma.uOMConversionFactor.findUnique({
      where: { groupId_typeId: { groupId, typeId } },
    });
    if (!factor) {
      throw new BadRequestException(
        'Type is not reachable through this Group (not Base, no Conversion Factor row).',
      );
    }
    return Number(factor.unitsPerBase);
  }
}
