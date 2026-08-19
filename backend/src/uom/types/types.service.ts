import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { EntityIdentifier } from '../../common/value-objects/entity-identifier';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { resolveUserId, toPublicEntity } from '../shared/public-id.util';

import type { CreateTypeDto } from './dto/create-type.dto';
import type { UpdateTypeDto } from './dto/update-type.dto';

const WITH_CATEGORY = { category: { select: { publicId: true } } };

// UOMType CRUD (T-074, `8-api.md` `/uom/types*`, BR-010). `categoryId` is optional (ADR-192).
//
// ADR-200 — `categoryId` on the wire is (and stays) the referenced Category's publicId (UUID), the
// pre-existing documented shape (`frontend/src/types/uom.ts`'s `UOMType.categoryId`); internally it
// is now a bigint FK, resolved both ways at this service's boundary.
@Injectable()
export class TypesService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get prisma() {
    return this.tenantContext.prisma;
  }

  private toPublic(type: { category?: { publicId: string } | null } & Record<string, unknown>) {
    const { category, ...rest } = type;
    return { ...toPublicEntity(rest as never), categoryId: category?.publicId ?? null };
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
        include: WITH_CATEGORY,
      }),
      this.prisma.uOMType.count({ where }),
    ]);
    return { items: items.map((item) => this.toPublic(item)), total };
  }

  private async findEntityByPublicId(publicId: string) {
    const type = await this.prisma.uOMType.findFirst({
      where: { publicId, isDeleted: false },
      include: WITH_CATEGORY,
    });
    if (!type) throw new NotFoundException('Type not found.');
    return type;
  }

  async findById(id: string) {
    const identifier = EntityIdentifier.from(id);
    const type = await this.findEntityByPublicId(identifier.value);
    return this.toPublic(type);
  }

  async create(dto: CreateTypeDto, userId?: string) {
    await this.assertNameAvailable(dto.name);
    const categoryId = dto.categoryId ? await this.resolveCategoryId(dto.categoryId) : undefined;
    const actorId = await resolveUserId(this.prisma, userId);
    const created = await this.prisma.uOMType.create({
      data: {
        name: dto.name,
        categoryId,
        sortOrder: dto.sortOrder,
        createdBy: actorId,
        updatedBy: actorId,
      },
      include: WITH_CATEGORY,
    });
    return this.toPublic(created);
  }

  async update(id: string, dto: UpdateTypeDto, userId?: string) {
    const identifier = EntityIdentifier.from(id);
    const existing = await this.findEntityByPublicId(identifier.value);
    if (dto.name) await this.assertNameAvailable(dto.name, existing.id);
    const categoryId = dto.categoryId ? await this.resolveCategoryId(dto.categoryId) : undefined;
    const actorId = await resolveUserId(this.prisma, userId);
    const updated = await this.prisma.uOMType.update({
      where: { id: existing.id },
      data: {
        name: dto.name,
        categoryId,
        sortOrder: dto.sortOrder,
        updatedBy: actorId,
      },
      include: WITH_CATEGORY,
    });
    return this.toPublic(updated);
  }

  // BR-014 (in-use guard across Base Type/Role Assignment/Conversion Factor/Picking Hierarchy
  // references) + BR-016 (Pricing fixed-price-override cascade, stubbed — see note below).
  async remove(id: string) {
    const identifier = EntityIdentifier.from(id);
    const existing = await this.findEntityByPublicId(identifier.value);

    const [baseCount, roleCount, factorCount, pickingCount] = await Promise.all([
      this.prisma.uOMGroup.count({ where: { baseTypeId: existing.id, isDeleted: false } }),
      this.prisma.uOMRoleAssignment.count({ where: { typeId: existing.id } }),
      this.prisma.uOMConversionFactor.count({ where: { typeId: existing.id } }),
      this.prisma.uOMPickingHierarchy.count({
        where: { typeId: existing.id, isDeleted: false },
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
      where: { id: existing.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { deleted: true };
  }

  private async assertNameAvailable(name: string, excludeId?: bigint) {
    const existing = await this.prisma.uOMType.findFirst({
      where: { name, isDeleted: false, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (existing) throw new ConflictException('Type name is required and must be unique.');
  }

  // Resolves a client-supplied Category publicId (UUID) to its internal bigint id (ADR-200) and
  // confirms it is a live (non-deleted) Category — the pre-existing `assertCategoryActive` guard,
  // now doubling as the FK-resolution step every write into `categoryId` needs.
  private async resolveCategoryId(categoryPublicId: string): Promise<bigint> {
    const category = await this.prisma.uOMCategory.findFirst({
      where: { publicId: categoryPublicId, isDeleted: false },
      select: { id: true },
    });
    if (!category) throw new ConflictException('Referenced Category does not exist.');
    return category.id;
  }
}
