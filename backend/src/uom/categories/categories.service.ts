import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { EntityIdentifier } from '../../common/value-objects/entity-identifier';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { resolveUserId, toPublicEntity } from '../shared/public-id.util';

import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

// UOMCategory CRUD (T-074, `8-api.md` `/uom/categories*`, BR-010 free admin management). Category
// is freely admin-manageable — no fixed enum (ADR-094).
//
// ADR-200 — every read/write below resolves a client-supplied `publicId` (UUID, on the wire still
// called `id`) to the row's internal bigint `id` before using it in a relational query, and every
// response is reshaped through `toPublicEntity` so the bigint `id` never reaches the client.
@Injectable()
export class CategoriesService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get prisma() {
    return this.tenantContext.prisma;
  }

  async list(params: { search?: string; skip?: number; take?: number }) {
    const where = {
      isDeleted: false,
      ...(params.search ? { name: { contains: params.search, mode: 'insensitive' as const } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.uOMCategory.findMany({
        where,
        skip: params.skip ?? 0,
        take: params.take ?? 20,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.uOMCategory.count({ where }),
    ]);
    return { items: items.map(toPublicEntity), total };
  }

  // Internal helper — returns the raw Prisma record (bigint `id` intact) for callers that need to
  // resolve a client-supplied publicId to the internal id for a further relational query/write.
  private async findEntityByPublicId(publicId: string) {
    const category = await this.prisma.uOMCategory.findFirst({
      where: { publicId, isDeleted: false },
    });
    if (!category) throw new NotFoundException('Category not found.');
    return category;
  }

  async findById(id: string) {
    const identifier = EntityIdentifier.from(id);
    const category = await this.findEntityByPublicId(identifier.value);
    return toPublicEntity(category);
  }

  // VR-001/BR-010 — name required + unique among non-deleted rows, enforced at the DB layer by a
  // partial unique index; the pre-check here (BR-018 parameterized query, no string concatenation)
  // surfaces a clean 409 instead of a raw constraint-violation error.
  async create(dto: CreateCategoryDto, userId?: string) {
    await this.assertNameAvailable(dto.name);
    const actorId = await resolveUserId(this.prisma, userId);
    const created = await this.prisma.uOMCategory.create({
      data: { name: dto.name, sortOrder: dto.sortOrder, createdBy: actorId, updatedBy: actorId },
    });
    return toPublicEntity(created);
  }

  async update(id: string, dto: UpdateCategoryDto, userId?: string) {
    const identifier = EntityIdentifier.from(id);
    const existing = await this.findEntityByPublicId(identifier.value);
    if (dto.name) await this.assertNameAvailable(dto.name, existing.id);
    const actorId = await resolveUserId(this.prisma, userId);
    const updated = await this.prisma.uOMCategory.update({
      where: { id: existing.id },
      data: { name: dto.name, sortOrder: dto.sortOrder, updatedBy: actorId },
    });
    return toPublicEntity(updated);
  }

  // BR-014/VR-015 — in-use RESTRICT delete guard, surfaced as a clear "still in use" error rather
  // than a raw FK-violation message.
  async remove(id: string) {
    const identifier = EntityIdentifier.from(id);
    const existing = await this.findEntityByPublicId(identifier.value);

    const [typeCount, groupCount] = await Promise.all([
      this.prisma.uOMType.count({ where: { categoryId: existing.id, isDeleted: false } }),
      this.prisma.uOMGroup.count({ where: { categoryId: existing.id, isDeleted: false } }),
    ]);
    if (typeCount > 0 || groupCount > 0) {
      const parts: string[] = [];
      if (typeCount > 0) parts.push(`${typeCount} Type(s)`);
      if (groupCount > 0) parts.push(`${groupCount} Group(s)`);
      throw new ConflictException(`Category still in use by ${parts.join(' and ')}.`);
    }

    await this.prisma.uOMCategory.update({
      where: { id: existing.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { deleted: true };
  }

  private async assertNameAvailable(name: string, excludeId?: bigint) {
    const existing = await this.prisma.uOMCategory.findFirst({
      where: { name, isDeleted: false, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (existing) throw new ConflictException('Category name is required and must be unique.');
  }
}
