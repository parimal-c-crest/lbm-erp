import { Injectable, NotFoundException } from '@nestjs/common';

import { toPublicEntity } from '../../common/utils/public-entity.util';
import { EntityIdentifier } from '../../common/value-objects/entity-identifier';
import { TenantContextService } from '../../tenant/tenant-context.service';

import type { CreateWordTemplateDto } from './dto/create-word-template.dto';
import type { UpdateWordTemplateDto } from './dto/update-word-template.dto';

// Minimal backend-only CRUD (ADR-188 — no dedicated UI in this MVP, `4-schema.md` §3). Standalone
// entity, no FK to User.
@Injectable()
export class WordTemplatesService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get prisma() {
    return this.tenantContext.prisma;
  }

  async list() {
    const templates = await this.prisma.wordTemplate.findMany({ orderBy: { name: 'asc' } });
    return templates.map(toPublicEntity);
  }

  async create(dto: CreateWordTemplateDto) {
    return toPublicEntity(await this.prisma.wordTemplate.create({ data: dto }));
  }

  async update(id: string, dto: UpdateWordTemplateDto) {
    const identifier = EntityIdentifier.from(id);
    const existing = await this.prisma.wordTemplate.findFirst({
      where: { publicId: identifier.value },
    });
    if (!existing) throw new NotFoundException('Word template not found.');
    return toPublicEntity(
      await this.prisma.wordTemplate.update({ where: { id: existing.id }, data: dto }),
    );
  }

  async remove(id: string) {
    const identifier = EntityIdentifier.from(id);
    const existing = await this.prisma.wordTemplate.findFirst({
      where: { publicId: identifier.value },
    });
    if (!existing) throw new NotFoundException('Word template not found.');
    await this.prisma.wordTemplate.delete({ where: { id: existing.id } });
    return { deleted: true };
  }
}
