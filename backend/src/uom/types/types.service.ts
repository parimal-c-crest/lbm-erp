import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { EntityIdentifier } from '../../common/value-objects/entity-identifier';
import { TenantContextService } from '../../tenant/tenant-context.service';

import type { CreateTypeDto } from './dto/create-type.dto';
import type { UpdateTypeDto } from './dto/update-type.dto';

// UOMType CRUD (T-074, `8-api.md` `/uom/types*`, BR-010). `categoryId` is optional (ADR-192).
@Injectable()
export class TypesService {
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
      this.prisma.uOMType.findMany({
        where,
        skip: params.skip ?? 0,
        take: params.take ?? 20,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.uOMType.count({ where }),
    ]);
    return { items, total };
  }

  async findById(id: string) {
    const identifier = EntityIdentifier.from(id);
    const type = await this.prisma.uOMType.findFirst({
      where: { id: identifier.value, isDeleted: false },
    });
    if (!type) throw new NotFoundException('Type not found.');
    return type;
  }

  async create(dto: CreateTypeDto, userId?: string) {
    await this.assertNameAvailable(dto.name);
    if (dto.categoryId) await this.assertCategoryActive(dto.categoryId);
    return this.prisma.uOMType.create({
      data: {
        name: dto.name,
        categoryId: dto.categoryId,
        sortOrder: dto.sortOrder,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async update(id: string, dto: UpdateTypeDto, userId?: string) {
    const identifier = EntityIdentifier.from(id);
    await this.findById(identifier.value);
    if (dto.name) await this.assertNameAvailable(dto.name, identifier.value);
    if (dto.categoryId) await this.assertCategoryActive(dto.categoryId);
    return this.prisma.uOMType.update({
      where: { id: identifier.value },
      data: {
        name: dto.name,
        categoryId: dto.categoryId,
        sortOrder: dto.sortOrder,
        updatedBy: userId,
      },
    });
  }

  // BR-014 (in-use guard across Base Type/Role Assignment/Conversion Factor/Picking Hierarchy
  // references) + BR-016 (Pricing fixed-price-override cascade, stubbed — see note below).
  async remove(id: string) {
    const identifier = EntityIdentifier.from(id);
    await this.findById(identifier.value);

    const [baseCount, roleCount, factorCount, pickingCount] = await Promise.all([
      this.prisma.uOMGroup.count({ where: { baseTypeId: identifier.value, isDeleted: false } }),
      this.prisma.uOMRoleAssignment.count({ where: { typeId: identifier.value } }),
      this.prisma.uOMConversionFactor.count({ where: { typeId: identifier.value } }),
      this.prisma.uOMPickingHierarchy.count({
        where: { typeId: identifier.value, isDeleted: false },
      }),
    ]);
    const reasons: string[] = [];
    if (baseCount > 0) reasons.push(`${baseCount} Group Base Type reference(s)`);
    if (roleCount > 0) reasons.push(`${roleCount} Role Assignment(s)`);
    if (factorCount > 0) reasons.push(`${factorCount} Conversion Factor(s)`);
    if (pickingCount > 0) reasons.push(`${pickingCount} Picking Hierarchy row(s)`);
    if (reasons.length > 0) {
      throw new ConflictException(`Type still in use by ${reasons.join(', ')}.`);
    }

    // BR-016/ADR-053 — deleting a UOM Type cascades a fixed-price-override delete in Pricing.
    // Pricing's module does not exist in this codebase yet (M3 doesn't include it) — per this
    // task's own instructions, this is a documented no-op/TODO rather than a guessed direct write
    // into a table UOM does not own (would itself violate BR-015/ADR-053's module-boundary rule).
    // TODO(Pricing module): once Pricing's own service exists, call its cascade-delete API here.

    await this.prisma.uOMType.update({
      where: { id: identifier.value },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { deleted: true };
  }

  private async assertNameAvailable(name: string, excludeId?: string) {
    const existing = await this.prisma.uOMType.findFirst({
      where: { name, isDeleted: false, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (existing) throw new ConflictException('Type name is required and must be unique.');
  }

  private async assertCategoryActive(categoryId: string) {
    const category = await this.prisma.uOMCategory.findFirst({
      where: { id: categoryId, isDeleted: false },
    });
    if (!category) throw new ConflictException('Referenced Category does not exist.');
  }
}
