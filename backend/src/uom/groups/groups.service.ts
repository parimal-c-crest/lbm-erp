import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { EntityIdentifier } from '../../common/value-objects/entity-identifier';
import { TenantContextService } from '../../tenant/tenant-context.service';

import type { CreateGroupDto } from './dto/create-group.dto';
import type { UpdateGroupDto } from './dto/update-group.dto';
import { GroupLockedException } from './group-locked.exception';

const DETAIL_INCLUDE = {
  category: true,
  baseType: true,
  roleAssignments: { include: { role: true, type: true } },
  conversionFactors: { include: { type: true } },
  pickingHierarchy: {
    where: { isDeleted: false },
    orderBy: { sortOrder: 'asc' as const },
    include: { type: true },
  },
};

// Group backend — the load-bearing task of the UOM module (T-075, `dependencies.md`). Owns the
// atomic Group + Role Assignments + Conversion Factors (+ Picking Hierarchy) save transaction,
// BR-019's save-time completeness validation, BR-001/ADR-191's case-insensitive name uniqueness
// (create + rename), BR-002's Base-Type-required rule, and BR-020/ADR-190's transaction-reference
// lock.
@Injectable()
export class GroupsService {
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
      this.prisma.uOMGroup.findMany({
        where,
        skip: params.skip ?? 0,
        take: params.take ?? 20,
        orderBy: { name: 'asc' },
        include: {
          category: true,
          baseType: true,
          pickingHierarchy: { where: { isDeleted: false }, select: { id: true } },
          _count: { select: { roleAssignments: true } },
        },
      }),
      this.prisma.uOMGroup.count({ where }),
    ]);
    return {
      items: items.map((group) => ({
        ...group,
        usesPickingHierarchy: group.pickingHierarchy.length > 0,
        pickingHierarchy: undefined,
        roleAssignmentCount: group._count.roleAssignments,
        _count: undefined,
      })),
      total,
    };
  }

  async findById(id: string) {
    const identifier = EntityIdentifier.from(id);
    const group = await this.prisma.uOMGroup.findFirst({
      where: { id: identifier.value, isDeleted: false },
      include: DETAIL_INCLUDE,
    });
    if (!group) throw new NotFoundException('Group not found.');
    return { ...group, usesPickingHierarchy: group.pickingHierarchy.length > 0 };
  }

  // BR-020/ADR-190/`4-schema.md` §9 — application-layer existence check against every known
  // transactional-consumer table's `uom_group_id` FK usage. No consuming module (SalesOrder,
  // PurchaseOrder, StoreTransfer, Receiving, etc.) exists in this codebase yet (M3 has no
  // cross-module Backend/API dependency on UOM, per `dependencies.md`), so the known-table list is
  // currently empty and this always resolves to "not locked" — an honest, documented state, not a
  // guess. Exposed as a service call per the doc's own recommendation so a future consuming
  // module's schema work only needs to register its table here, not reimplement the check.
  // `groupId` will be threaded into each per-table check below once a real consuming module
  // registers one; kept in the signature now so every call site is already correct.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async isGroupLocked(groupId: string): Promise<boolean> {
    // TODO(future consumer modules): as SalesOrder/PurchaseOrder/Receiving/StoreTransfer/etc. ship
    // their own `uom_group_id`-bearing transaction tables, add a `prisma.<table>.count({ where: {
    // uomGroupId: groupId } })` check here — any non-zero count locks the Group.
    const knownConsumerChecks: Promise<number>[] = [];
    if (knownConsumerChecks.length === 0) return false;
    const counts = await Promise.all(knownConsumerChecks);
    return counts.some((count) => count > 0);
  }

  async create(dto: CreateGroupDto, userId?: string) {
    await this.assertNameAvailable(dto.name);
    await this.assertTypeActive(dto.baseTypeId, 'Base Type');
    if (dto.categoryId) await this.assertCategoryActive(dto.categoryId);

    await this.assertRoleAssignmentsValid(dto.roleAssignments);
    await this.assertConversionFactorsValid(dto.conversionFactors);
    this.assertRoleAssignmentUniqueness(dto.roleAssignments);
    this.assertConversionFactorUniqueness(dto.conversionFactors);
    await this.assertCompleteness(dto.baseTypeId, dto.roleAssignments, dto.conversionFactors);
    if (dto.pickingHierarchy) {
      this.assertPickingHierarchyUniqueness(dto.pickingHierarchy);
      await this.assertPickingTypesValid(dto.pickingHierarchy);
    }

    const groupId = await this.prisma.$transaction(async (tx) => {
      const group = await tx.uOMGroup.create({
        data: {
          name: dto.name,
          categoryId: dto.categoryId,
          baseTypeId: dto.baseTypeId,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      if (dto.roleAssignments.length > 0) {
        await tx.uOMRoleAssignment.createMany({
          data: dto.roleAssignments.map((ra) => ({
            groupId: group.id,
            roleId: ra.roleId,
            typeId: ra.typeId,
            createdBy: userId,
            updatedBy: userId,
          })),
        });
      }

      const today = new Date();
      for (const factor of dto.conversionFactors) {
        await tx.uOMConversionFactor.create({
          data: {
            groupId: group.id,
            typeId: factor.typeId,
            unitsPerBase: factor.unitsPerBase,
            createdBy: userId,
            updatedBy: userId,
          },
        });
        // BR-009 — the initial rate is versioned the same as any later change, so history is
        // never missing a "since creation" starting row.
        await tx.uOMTypeFactorHistory.create({
          data: {
            groupId: group.id,
            typeId: factor.typeId,
            rate: factor.unitsPerBase,
            effectiveFrom: today,
            effectiveTo: null,
          },
        });
      }

      if (dto.pickingHierarchy && dto.pickingHierarchy.length > 0) {
        await tx.uOMPickingHierarchy.createMany({
          data: dto.pickingHierarchy.map((row) => ({
            groupId: group.id,
            typeId: row.typeId,
            sortOrder: row.sortOrder,
            createdBy: userId,
            updatedBy: userId,
          })),
        });
      }

      return group.id;
    });

    return this.findById(groupId);
  }

  async update(id: string, dto: UpdateGroupDto, userId?: string) {
    const identifier = EntityIdentifier.from(id);
    const existing = await this.prisma.uOMGroup.findFirst({
      where: { id: identifier.value, isDeleted: false },
      include: { roleAssignments: true, conversionFactors: true, pickingHierarchy: true },
    });
    if (!existing) throw new NotFoundException('Group not found.');

    // VR-018/BR-020 — submitted top-level fields, read from what the caller actually sent (not
    // just non-undefined resolved values), so a partial PATCH is judged on its own real shape.
    const submittedFields = Object.keys(dto);
    const isLocked = await this.isGroupLocked(identifier.value);
    if (isLocked) {
      const lockedFieldsSubmitted = submittedFields.filter((field) => field !== 'name');
      if (lockedFieldsSubmitted.length > 0) throw new GroupLockedException(lockedFieldsSubmitted);
    }

    if (dto.name && dto.name !== existing.name) {
      await this.assertNameAvailable(dto.name, identifier.value);
    }

    const finalBaseTypeId = dto.baseTypeId ?? existing.baseTypeId;
    const finalRoleAssignments =
      dto.roleAssignments ??
      existing.roleAssignments.map((ra) => ({ roleId: ra.roleId, typeId: ra.typeId }));
    const finalConversionFactors =
      dto.conversionFactors ??
      existing.conversionFactors.map((cf) => ({
        typeId: cf.typeId,
        unitsPerBase: Number(cf.unitsPerBase),
      }));

    if (dto.baseTypeId) await this.assertTypeActive(dto.baseTypeId, 'Base Type');
    if (dto.categoryId) await this.assertCategoryActive(dto.categoryId);
    if (dto.roleAssignments) {
      await this.assertRoleAssignmentsValid(dto.roleAssignments);
      this.assertRoleAssignmentUniqueness(dto.roleAssignments);
    }
    if (dto.conversionFactors) {
      await this.assertConversionFactorsValid(dto.conversionFactors);
      this.assertConversionFactorUniqueness(dto.conversionFactors);
    }
    if (dto.roleAssignments || dto.conversionFactors || dto.baseTypeId) {
      await this.assertCompleteness(finalBaseTypeId, finalRoleAssignments, finalConversionFactors);
    }
    if (dto.pickingHierarchy) {
      this.assertPickingHierarchyUniqueness(dto.pickingHierarchy);
      await this.assertPickingTypesValid(dto.pickingHierarchy);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.uOMGroup.update({
        where: { id: identifier.value },
        data: {
          name: dto.name,
          categoryId: dto.categoryId,
          baseTypeId: dto.baseTypeId,
          updatedBy: userId,
        },
      });

      if (dto.roleAssignments) {
        await tx.uOMRoleAssignment.deleteMany({ where: { groupId: identifier.value } });
        if (dto.roleAssignments.length > 0) {
          await tx.uOMRoleAssignment.createMany({
            data: dto.roleAssignments.map((ra) => ({
              groupId: identifier.value,
              roleId: ra.roleId,
              typeId: ra.typeId,
              createdBy: userId,
              updatedBy: userId,
            })),
          });
        }
      }

      if (dto.conversionFactors) {
        const today = new Date();
        const existingByType = new Map(existing.conversionFactors.map((cf) => [cf.typeId, cf]));
        const newTypeIds = new Set(dto.conversionFactors.map((cf) => cf.typeId));

        // Removed pairs: BR-009 is silent on retroactively closing history for a removed factor —
        // the row is deleted (CASCADE-equivalent via explicit delete since this is a soft-deleted
        // parent, not a real FK cascade trigger), history rows are left as the historical record.
        for (const [typeId] of existingByType) {
          if (!newTypeIds.has(typeId)) {
            await tx.uOMConversionFactor.deleteMany({
              where: { groupId: identifier.value, typeId },
            });
          }
        }

        for (const factor of dto.conversionFactors) {
          const prior = existingByType.get(factor.typeId);
          if (!prior) {
            await tx.uOMConversionFactor.create({
              data: {
                groupId: identifier.value,
                typeId: factor.typeId,
                unitsPerBase: factor.unitsPerBase,
                createdBy: userId,
                updatedBy: userId,
              },
            });
            await tx.uOMTypeFactorHistory.create({
              data: {
                groupId: identifier.value,
                typeId: factor.typeId,
                rate: factor.unitsPerBase,
                effectiveFrom: today,
                effectiveTo: null,
              },
            });
            continue;
          }

          if (Number(prior.unitsPerBase) !== factor.unitsPerBase) {
            await tx.uOMConversionFactor.update({
              where: { id: prior.id },
              data: { unitsPerBase: factor.unitsPerBase, updatedBy: userId },
            });
            // BR-009 — value change: close the currently-effective history row, open a new one.
            await tx.uOMTypeFactorHistory.updateMany({
              where: { groupId: identifier.value, typeId: factor.typeId, effectiveTo: null },
              data: { effectiveTo: today },
            });
            await tx.uOMTypeFactorHistory.create({
              data: {
                groupId: identifier.value,
                typeId: factor.typeId,
                rate: factor.unitsPerBase,
                effectiveFrom: today,
                effectiveTo: null,
              },
            });
          }
        }
      }

      if (dto.pickingHierarchy) {
        await tx.uOMPickingHierarchy.deleteMany({ where: { groupId: identifier.value } });
        if (dto.pickingHierarchy.length > 0) {
          await tx.uOMPickingHierarchy.createMany({
            data: dto.pickingHierarchy.map((row) => ({
              groupId: identifier.value,
              typeId: row.typeId,
              sortOrder: row.sortOrder,
              createdBy: userId,
              updatedBy: userId,
            })),
          });
        }
      }
    });

    return this.findById(identifier.value);
  }

  // BR-020 — delete always rejected once transaction-referenced, no exception.
  async remove(id: string) {
    const identifier = EntityIdentifier.from(id);
    const existing = await this.prisma.uOMGroup.findFirst({
      where: { id: identifier.value, isDeleted: false },
    });
    if (!existing) throw new NotFoundException('Group not found.');

    if (await this.isGroupLocked(identifier.value)) {
      throw new GroupLockedException(['*']);
    }

    await this.prisma.uOMGroup.update({
      where: { id: identifier.value },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { deleted: true };
  }

  // BR-021/ADR-192 — Base-Type fallback when no explicit Role Assignment exists.
  async resolveRole(groupId: string, roleId: string) {
    const group = await this.findById(groupId);
    const role = await this.prisma.uOMFunctionalRole.findFirst({
      where: { id: roleId, isDeleted: false },
    });
    if (!role) throw new NotFoundException('Functional Role not found.');

    const explicit = await this.prisma.uOMRoleAssignment.findFirst({
      where: { groupId: group.id, roleId },
    });
    if (explicit) return { typeId: explicit.typeId, resolution: 'explicit' as const };
    return { typeId: group.baseTypeId, resolution: 'base_type_fallback' as const };
  }

  // FR-010 — single batched query (not N per-Type calls), BR-013's computed indicator agrees with
  // this endpoint's own emptiness by construction.
  async pickBreakdown(groupId: string) {
    const group = await this.findById(groupId);
    return group.pickingHierarchy.map((row) => ({
      typeId: row.typeId,
      sortOrder: row.sortOrder,
      typeName: row.type.name,
    }));
  }

  // --- validation helpers -----------------------------------------------------------------

  // Case-insensitive comparison per BR-001/ADR-191 — scans all non-deleted Groups (a small
  // reference-data table) rather than a raw-SQL `lower()` filter; the DB's own functional unique
  // index (`uom_groups_name_lower_key`) is the storage-layer backstop either way.
  private async assertNameAvailable(name: string, excludeId?: string) {
    const candidates = await this.prisma.uOMGroup.findMany({
      where: { isDeleted: false, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true, name: true },
    });
    const normalized = name.trim().toLowerCase();
    const duplicate = candidates.find((c) => c.name.trim().toLowerCase() === normalized);
    if (duplicate) throw new ConflictException('Group name is required and must be unique.');
  }

  private async assertTypeActive(typeId: string, label: string) {
    const type = await this.prisma.uOMType.findFirst({ where: { id: typeId, isDeleted: false } });
    if (!type) throw new BadRequestException(`${label} does not reference an existing Type.`);
  }

  private async assertCategoryActive(categoryId: string) {
    const category = await this.prisma.uOMCategory.findFirst({
      where: { id: categoryId, isDeleted: false },
    });
    if (!category) throw new BadRequestException('Referenced Category does not exist.');
  }

  private async assertRoleAssignmentsValid(assignments: { roleId: string; typeId: string }[]) {
    for (const assignment of assignments) {
      const [role, type] = await Promise.all([
        this.prisma.uOMFunctionalRole.findFirst({
          where: { id: assignment.roleId, isDeleted: false },
        }),
        this.prisma.uOMType.findFirst({ where: { id: assignment.typeId, isDeleted: false } }),
      ]);
      if (!role)
        throw new BadRequestException('Role Assignment references a non-existent Functional Role.');
      if (!type) throw new BadRequestException('Role Assignment references a non-existent Type.');
    }
  }

  private async assertConversionFactorsValid(factors: { typeId: string; unitsPerBase: number }[]) {
    for (const factor of factors) {
      const type = await this.prisma.uOMType.findFirst({
        where: { id: factor.typeId, isDeleted: false },
      });
      if (!type) throw new BadRequestException('Conversion Factor references a non-existent Type.');
    }
  }

  // BR-011/VR-008
  private assertRoleAssignmentUniqueness(assignments: { roleId: string; typeId: string }[]) {
    const seen = new Set<string>();
    for (const assignment of assignments) {
      if (seen.has(assignment.roleId)) {
        throw new ConflictException(
          `Duplicate Role Assignment for the same Functional Role submitted.`,
        );
      }
      seen.add(assignment.roleId);
    }
  }

  // BR-006/VR-009
  private assertConversionFactorUniqueness(factors: { typeId: string; unitsPerBase: number }[]) {
    const seen = new Set<string>();
    for (const factor of factors) {
      if (seen.has(factor.typeId)) {
        throw new ConflictException('Duplicate Conversion Factor for the same Type submitted.');
      }
      seen.add(factor.typeId);
    }
  }

  // BR-012/VR-014
  private assertPickingHierarchyUniqueness(rows: { typeId: string; sortOrder: number }[]) {
    const seenTypes = new Set<string>();
    const seenSortOrders = new Set<number>();
    for (const row of rows) {
      if (seenTypes.has(row.typeId)) {
        throw new ConflictException('Duplicate Picking Hierarchy row for the same Type submitted.');
      }
      if (seenSortOrders.has(row.sortOrder)) {
        throw new ConflictException('Duplicate Picking Hierarchy Sort Order submitted.');
      }
      seenTypes.add(row.typeId);
      seenSortOrders.add(row.sortOrder);
    }
  }

  private async assertPickingTypesValid(rows: { typeId: string; sortOrder: number }[]) {
    for (const row of rows) {
      const type = await this.prisma.uOMType.findFirst({
        where: { id: row.typeId, isDeleted: false },
      });
      if (!type)
        throw new BadRequestException('Picking Hierarchy row references a non-existent Type.');
    }
  }

  // BR-019/VR-010 — every role-assigned, non-Base Type must have a Conversion Factor row.
  // Rejects the whole save, naming every offending Type/Role (not just the first).
  private async assertCompleteness(
    baseTypeId: string,
    roleAssignments: { roleId: string; typeId: string }[],
    conversionFactors: { typeId: string; unitsPerBase: number }[],
  ) {
    const factorTypeIds = new Set(conversionFactors.map((f) => f.typeId));
    const offending = roleAssignments.filter(
      (ra) => ra.typeId !== baseTypeId && !factorTypeIds.has(ra.typeId),
    );
    if (offending.length === 0) return;

    const [roles, types] = await Promise.all([
      this.prisma.uOMFunctionalRole.findMany({
        where: { id: { in: offending.map((o) => o.roleId) } },
      }),
      this.prisma.uOMType.findMany({ where: { id: { in: offending.map((o) => o.typeId) } } }),
    ]);
    const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? id;
    const typeName = (id: string) => types.find((t) => t.id === id)?.name ?? id;

    const messages = offending.map(
      (o) => `${roleName(o.roleId)} (${typeName(o.typeId)}) is missing a Conversion Factor`,
    );
    throw new ConflictException(
      `Group save rejected — every role-assigned, non-Base Type needs a Conversion Factor: ${messages.join('; ')}`,
    );
  }
}
