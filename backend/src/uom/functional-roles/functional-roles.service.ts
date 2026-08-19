import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { EntityIdentifier } from '../../common/value-objects/entity-identifier';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { resolveUserId, toPublicEntity } from '../shared/public-id.util';

import type { CreateFunctionalRoleDto } from './dto/create-functional-role.dto';
import type { UpdateFunctionalRoleDto } from './dto/update-functional-role.dto';

// UOMFunctionalRole CRUD (T-074, `8-api.md` `/uom/functional-roles*`, BR-010). Seeded with 11
// starter roles by the migration (ADR-094) but freely admin-manageable thereafter.
//
// ADR-200 — client-supplied ids (on the wire, still called `id`) are publicId UUIDs, resolved to
// the internal bigint `id` before any relational query; responses are reshaped via `toPublicEntity`
// so the bigint `id` never reaches the client.
@Injectable()
export class FunctionalRolesService {
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
      this.prisma.uOMFunctionalRole.findMany({
        where,
        skip: params.skip ?? 0,
        take: params.take ?? 20,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.uOMFunctionalRole.count({ where }),
    ]);
    return { items: items.map(toPublicEntity), total };
  }

  private async findEntityByPublicId(publicId: string) {
    const role = await this.prisma.uOMFunctionalRole.findFirst({
      where: { publicId, isDeleted: false },
    });
    if (!role) throw new NotFoundException('Functional Role not found.');
    return role;
  }

  async findById(id: string) {
    const identifier = EntityIdentifier.from(id);
    const role = await this.findEntityByPublicId(identifier.value);
    return toPublicEntity(role);
  }

  async create(dto: CreateFunctionalRoleDto, userId?: string) {
    await this.assertNameAvailable(dto.name);
    const actorId = await resolveUserId(this.prisma, userId);
    const created = await this.prisma.uOMFunctionalRole.create({
      data: { name: dto.name, sortOrder: dto.sortOrder, createdBy: actorId, updatedBy: actorId },
    });
    return toPublicEntity(created);
  }

  async update(id: string, dto: UpdateFunctionalRoleDto, userId?: string) {
    const identifier = EntityIdentifier.from(id);
    const existing = await this.findEntityByPublicId(identifier.value);
    if (dto.name) await this.assertNameAvailable(dto.name, existing.id);
    const actorId = await resolveUserId(this.prisma, userId);
    const updated = await this.prisma.uOMFunctionalRole.update({
      where: { id: existing.id },
      data: { name: dto.name, sortOrder: dto.sortOrder, updatedBy: actorId },
    });
    return toPublicEntity(updated);
  }

  // BR-014/VR-020 (ADR-192, confirmed) — in-use guard against UOMRoleAssignment.
  async remove(id: string) {
    const identifier = EntityIdentifier.from(id);
    const existing = await this.findEntityByPublicId(identifier.value);

    const assignmentCount = await this.prisma.uOMRoleAssignment.count({
      where: { roleId: existing.id },
    });
    if (assignmentCount > 0) {
      throw new ConflictException(
        `Functional Role still in use by ${assignmentCount} Role Assignment(s).`,
      );
    }

    await this.prisma.uOMFunctionalRole.update({
      where: { id: existing.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { deleted: true };
  }

  private async assertNameAvailable(name: string, excludeId?: bigint) {
    const existing = await this.prisma.uOMFunctionalRole.findFirst({
      where: { name, isDeleted: false, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (existing) throw new ConflictException('Role name is required and must be unique.');
  }
}
