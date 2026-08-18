import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { EntityIdentifier } from '../../common/value-objects/entity-identifier';
import { TenantContextService } from '../../tenant/tenant-context.service';

import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

// UOMCategory CRUD (T-074, `8-api.md` `/uom/categories*`, BR-010 free admin management). Category
// is freely admin-manageable — no fixed enum (ADR-094).
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
    return { items, total };
  }

  async findById(id: string) {
    const identifier = EntityIdentifier.from(id);
    const category = await this.prisma.uOMCategory.findFirst({
      where: { id: identifier.value, isDeleted: false },
    });
    if (!category) throw new NotFoundException('Category not found.');
    return category;
  }

  // VR-001/BR-010 — name required + unique among non-deleted rows, enforced at the DB layer by a
  // partial unique index; the pre-check here (BR-018 parameterized query, no string concatenation)
  // surfaces a clean 409 instead of a raw constraint-violation error.
  async create(dto: CreateCategoryDto, userId?: string) {
    await this.assertNameAvailable(dto.name);
    return this.prisma.uOMCategory.create({
      data: { name: dto.name, sortOrder: dto.sortOrder, createdBy: userId, updatedBy: userId },
    });
  }

  async update(id: string, dto: UpdateCategoryDto, userId?: string) {
    const identifier = EntityIdentifier.from(id);
    await this.findById(identifier.value);
    if (dto.name) await this.assertNameAvailable(dto.name, identifier.value);
    return this.prisma.uOMCategory.update({
      where: { id: identifier.value },
      data: { name: dto.name, sortOrder: dto.sortOrder, updatedBy: userId },
    });
  }

  // BR-014/VR-015 — in-use RESTRICT delete guard, surfaced as a clear "still in use" error rather
  // than a raw FK-violation message.
  async remove(id: string) {
    const identifier = EntityIdentifier.from(id);
    await this.findById(identifier.value);

    const [typeCount, groupCount] = await Promise.all([
      this.prisma.uOMType.count({ where: { categoryId: identifier.value, isDeleted: false } }),
      this.prisma.uOMGroup.count({ where: { categoryId: identifier.value, isDeleted: false } }),
    ]);
    if (typeCount > 0 || groupCount > 0) {
      const parts: string[] = [];
      if (typeCount > 0) parts.push(`${typeCount} Type(s)`);
      if (groupCount > 0) parts.push(`${groupCount} Group(s)`);
      throw new ConflictException(`Category still in use by ${parts.join(' and ')}.`);
    }

    await this.prisma.uOMCategory.update({
      where: { id: identifier.value },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { deleted: true };
  }

  private async assertNameAvailable(name: string, excludeId?: string) {
    const existing = await this.prisma.uOMCategory.findFirst({
      where: { name, isDeleted: false, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (existing) throw new ConflictException('Category name is required and must be unique.');
  }
}
