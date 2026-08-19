import { Injectable, NotFoundException } from '@nestjs/common';

import { EntityIdentifier } from '../../common/value-objects/entity-identifier';
import { TenantContextService } from '../../tenant/tenant-context.service';

import type { LabelSize } from './dto/barcode-label-query.dto';

const LABEL_DIMENSIONS_INCHES: Record<LabelSize, { widthInches: number; heightInches: number }> = {
  '2x1': { widthInches: 2, heightInches: 1 },
  '3x2': { widthInches: 3, heightInches: 2 },
  '4x3': { widthInches: 4, heightInches: 3 },
};

// Barcode Label Print (`9-ui.md` §2, `2-functional-specification.md` §6 Outputs) — layout
// parameters for the badge-based clock-in fallback (T-035/T-044). The badge's barcode encodes
// the user's own `username` (matches the frontend preview, `9-ui.md`'s worked example) — no
// separate stored barcode column exists or is needed. **Not built**: the optional cloud-print
// delivery channel (`1-module.md` §11) — no credentials/sandbox exist in this environment, same
// class of gap as T-049/T-059's stubbed integrations. This endpoint returns layout data only.
@Injectable()
export class BarcodeLabelsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get prisma() {
    return this.tenantContext.prisma;
  }

  async generate(userId: string, size: LabelSize) {
    const identifier = EntityIdentifier.from(userId);
    const user = await this.prisma.user.findFirst({
      where: { publicId: identifier.value, isDeleted: false },
      include: { role: true },
    });
    if (!user) throw new NotFoundException('User not found.');

    return {
      userId: user.publicId,
      name: [user.firstName, user.lastName].filter(Boolean).join(' '),
      role: user.role?.name ?? null,
      barcodeValue: user.username.toUpperCase(),
      labelSize: size,
      dimensions: LABEL_DIMENSIONS_INCHES[size],
    };
  }
}
