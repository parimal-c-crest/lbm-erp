import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { EntityIdentifier } from '../../common/value-objects/entity-identifier';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { resolveUserId, toPublicEntity } from '../shared/public-id.util';

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

type ResolvedRoleAssignment = { roleId: bigint; typeId: bigint };
type ResolvedConversionFactor = { typeId: bigint; unitsPerBase: number };
type ResolvedPickingRow = { typeId: bigint; sortOrder: number };

// Group backend — the load-bearing task of the UOM module (T-075, `dependencies.md`). Owns the
// atomic Group + Role Assignments + Conversion Factors (+ Picking Hierarchy) save transaction,
// BR-019's save-time completeness validation, BR-001/ADR-191's case-insensitive name uniqueness
// (create + rename), BR-002's Base-Type-required rule, and BR-020/ADR-190's transaction-reference
// lock.
//
// ADR-200 — every client-supplied identifier on the wire (Group id, categoryId, baseTypeId, and
// every roleId/typeId inside roleAssignments/conversionFactors/pickingHierarchy) is a publicId
// UUID, resolved to the referenced row's internal bigint `id` before use in any relational
// query/write (`resolveGroupWriteRefs` + the individual `resolve*Id` helpers below). Every response
// is reshaped back through `toPublicGroup`/`toPublicSummary` so no internal bigint `id`/FK column
// ever reaches the client — the documented wire shape (`frontend/src/types/uom.ts`) is unchanged.
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
    return { items: items.map((group) => this.toPublicSummary(group)), total };
  }

  private async findRawByPublicId(publicId: string) {
    const group = await this.prisma.uOMGroup.findFirst({
      where: { publicId, isDeleted: false },
      include: DETAIL_INCLUDE,
    });
    if (!group) throw new NotFoundException('Group not found.');
    return group;
  }

  private async findRawByInternalId(id: bigint) {
    const group = await this.prisma.uOMGroup.findFirst({
      where: { id, isDeleted: false },
      include: DETAIL_INCLUDE,
    });
    if (!group) throw new NotFoundException('Group not found.');
    return group;
  }

  async findById(id: string) {
    const identifier = EntityIdentifier.from(id);
    const group = await this.findRawByPublicId(identifier.value);
    return this.toPublicGroup(group);
  }

  // BR-020/ADR-190/`4-schema.md` §9 — application-layer existence check against every known
  // transactional-consumer table's `uom_group_id` FK usage. No consuming module (SalesOrder,
  // PurchaseOrder, StoreTransfer, Receiving, etc.) exists in this codebase yet (M3 has no
  // cross-module Backend/API dependency on UOM, per `dependencies.md`), so the known-table list is
  // currently empty and this always resolves to "not locked" — an honest, documented state, not a
  // guess. Exposed as a service call per the doc's own recommendation so a future consuming
  // module's schema work only needs to register its table here, not reimplement the check.
  // `groupId` is the Group's internal bigint `id` (ADR-200 — every future consumer table's
  // `uom_group_id` FK references `id`, not `publicId`); kept in the signature now so every call
  // site is already correct.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async isGroupLocked(groupId: bigint): Promise<boolean> {
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
    const refs = await this.resolveGroupWriteRefs(dto);
    const baseTypeId = refs.baseTypeId!;
    const categoryId = refs.categoryId;
    const roleAssignments = refs.roleAssignments!;
    const conversionFactors = refs.conversionFactors!;
    const pickingHierarchy = refs.pickingHierarchy;

    this.assertRoleAssignmentUniqueness(roleAssignments);
    this.assertConversionFactorUniqueness(conversionFactors);
    await this.assertCompleteness(baseTypeId, roleAssignments, conversionFactors);
    if (pickingHierarchy) this.assertPickingHierarchyUniqueness(pickingHierarchy);

    const actorId = await resolveUserId(this.prisma, userId);

    const groupId = await this.prisma.$transaction(async (tx) => {
      const group = await tx.uOMGroup.create({
        data: {
          name: dto.name,
          categoryId,
          baseTypeId,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });

      if (roleAssignments.length > 0) {
        await tx.uOMRoleAssignment.createMany({
          data: roleAssignments.map((ra) => ({
            groupId: group.id,
            roleId: ra.roleId,
            typeId: ra.typeId,
            createdBy: actorId,
            updatedBy: actorId,
          })),
        });
      }

      const today = new Date();
      for (const factor of conversionFactors) {
        await tx.uOMConversionFactor.create({
          data: {
            groupId: group.id,
            typeId: factor.typeId,
            unitsPerBase: factor.unitsPerBase,
            createdBy: actorId,
            updatedBy: actorId,
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

      if (pickingHierarchy && pickingHierarchy.length > 0) {
        await tx.uOMPickingHierarchy.createMany({
          data: pickingHierarchy.map((row) => ({
            groupId: group.id,
            typeId: row.typeId,
            sortOrder: row.sortOrder,
            createdBy: actorId,
            updatedBy: actorId,
          })),
        });
      }

      return group.id;
    });

    const created = await this.findRawByInternalId(groupId);
    return this.toPublicGroup(created);
  }

  async update(id: string, dto: UpdateGroupDto, userId?: string) {
    const identifier = EntityIdentifier.from(id);
    const existing = await this.findRawByPublicId(identifier.value);

    // VR-018/BR-020 — submitted top-level fields, read from what the caller actually sent (not
    // just non-undefined resolved values), so a partial PATCH is judged on its own real shape.
    const submittedFields = Object.keys(dto);
    const isLocked = await this.isGroupLocked(existing.id);
    if (isLocked) {
      const lockedFieldsSubmitted = submittedFields.filter((field) => field !== 'name');
      if (lockedFieldsSubmitted.length > 0) throw new GroupLockedException(lockedFieldsSubmitted);
    }

    if (dto.name && dto.name !== existing.name) {
      await this.assertNameAvailable(dto.name, existing.id);
    }

    const refs = await this.resolveGroupWriteRefs(dto);

    const finalBaseTypeId = refs.baseTypeId ?? existing.baseTypeId;
    const finalRoleAssignments: ResolvedRoleAssignment[] =
      refs.roleAssignments ??
      existing.roleAssignments.map((ra) => ({ roleId: ra.roleId, typeId: ra.typeId }));
    const finalConversionFactors: ResolvedConversionFactor[] =
      refs.conversionFactors ??
      existing.conversionFactors.map((cf) => ({
        typeId: cf.typeId,
        unitsPerBase: Number(cf.unitsPerBase),
      }));

    if (refs.roleAssignments) this.assertRoleAssignmentUniqueness(refs.roleAssignments);
    if (refs.conversionFactors) this.assertConversionFactorUniqueness(refs.conversionFactors);
    if (refs.roleAssignments || refs.conversionFactors || refs.baseTypeId) {
      await this.assertCompleteness(finalBaseTypeId, finalRoleAssignments, finalConversionFactors);
    }
    if (refs.pickingHierarchy) this.assertPickingHierarchyUniqueness(refs.pickingHierarchy);

    const actorId = await resolveUserId(this.prisma, userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.uOMGroup.update({
        where: { id: existing.id },
        data: {
          name: dto.name,
          categoryId: refs.categoryId,
          baseTypeId: refs.baseTypeId,
          updatedBy: actorId,
        },
      });

      if (refs.roleAssignments) {
        await tx.uOMRoleAssignment.deleteMany({ where: { groupId: existing.id } });
        if (refs.roleAssignments.length > 0) {
          await tx.uOMRoleAssignment.createMany({
            data: refs.roleAssignments.map((ra) => ({
              groupId: existing.id,
              roleId: ra.roleId,
              typeId: ra.typeId,
              createdBy: actorId,
              updatedBy: actorId,
            })),
          });
        }
      }

      if (refs.conversionFactors) {
        const today = new Date();
        const existingByType = new Map(
          existing.conversionFactors.map((cf) => [cf.typeId, cf] as const),
        );
        const newTypeIds = new Set(refs.conversionFactors.map((cf) => cf.typeId));

        // Removed pairs: BR-009 is silent on retroactively closing history for a removed factor —
        // the row is deleted (CASCADE-equivalent via explicit delete since this is a soft-deleted
        // parent, not a real FK cascade trigger), history rows are left as the historical record.
        for (const [typeId] of existingByType) {
          if (!newTypeIds.has(typeId)) {
            await tx.uOMConversionFactor.deleteMany({
              where: { groupId: existing.id, typeId },
            });
          }
        }

        for (const factor of refs.conversionFactors) {
          const prior = existingByType.get(factor.typeId);
          if (!prior) {
            await tx.uOMConversionFactor.create({
              data: {
                groupId: existing.id,
                typeId: factor.typeId,
                unitsPerBase: factor.unitsPerBase,
                createdBy: actorId,
                updatedBy: actorId,
              },
            });
            await tx.uOMTypeFactorHistory.create({
              data: {
                groupId: existing.id,
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
              data: { unitsPerBase: factor.unitsPerBase, updatedBy: actorId },
            });
            // BR-009 — value change: close the currently-effective history row, open a new one.
            await tx.uOMTypeFactorHistory.updateMany({
              where: { groupId: existing.id, typeId: factor.typeId, effectiveTo: null },
              data: { effectiveTo: today },
            });
            await tx.uOMTypeFactorHistory.create({
              data: {
                groupId: existing.id,
                typeId: factor.typeId,
                rate: factor.unitsPerBase,
                effectiveFrom: today,
                effectiveTo: null,
              },
            });
          }
        }
      }

      if (refs.pickingHierarchy) {
        await tx.uOMPickingHierarchy.deleteMany({ where: { groupId: existing.id } });
        if (refs.pickingHierarchy.length > 0) {
          await tx.uOMPickingHierarchy.createMany({
            data: refs.pickingHierarchy.map((row) => ({
              groupId: existing.id,
              typeId: row.typeId,
              sortOrder: row.sortOrder,
              createdBy: actorId,
              updatedBy: actorId,
            })),
          });
        }
      }
    });

    const updated = await this.findRawByInternalId(existing.id);
    return this.toPublicGroup(updated);
  }

  // BR-020 — delete always rejected once transaction-referenced, no exception.
  async remove(id: string) {
    const identifier = EntityIdentifier.from(id);
    const existing = await this.findRawByPublicId(identifier.value);

    if (await this.isGroupLocked(existing.id)) {
      throw new GroupLockedException(['*']);
    }

    await this.prisma.uOMGroup.update({
      where: { id: existing.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return { deleted: true };
  }

  // BR-021/ADR-192 — Base-Type fallback when no explicit Role Assignment exists.
  async resolveRole(groupId: string, roleId: string) {
    const groupIdentifier = EntityIdentifier.from(groupId);
    const group = await this.findRawByPublicId(groupIdentifier.value);

    const roleIdentifier = EntityIdentifier.from(roleId);
    const role = await this.prisma.uOMFunctionalRole.findFirst({
      where: { publicId: roleIdentifier.value, isDeleted: false },
    });
    if (!role) throw new NotFoundException('Functional Role not found.');

    const explicit = await this.prisma.uOMRoleAssignment.findFirst({
      where: { groupId: group.id, roleId: role.id },
      include: { type: true },
    });
    if (explicit) return { typeId: explicit.type.publicId, resolution: 'explicit' as const };
    return { typeId: group.baseType.publicId, resolution: 'base_type_fallback' as const };
  }

  // FR-010 — single batched query (not N per-Type calls), BR-013's computed indicator agrees with
  // this endpoint's own emptiness by construction.
  async pickBreakdown(groupId: string) {
    const identifier = EntityIdentifier.from(groupId);
    const group = await this.findRawByPublicId(identifier.value);
    return group.pickingHierarchy.map((row) => ({
      typeId: row.type.publicId,
      sortOrder: row.sortOrder,
      typeName: row.type.name,
    }));
  }

  // --- response shaping (ADR-200) --------------------------------------------------------

  private toPublicGroup(group: Awaited<ReturnType<GroupsService['findRawByPublicId']>>) {
    const { category, baseType, roleAssignments, conversionFactors, pickingHierarchy, ...scalars } =
      group;
    return {
      ...toPublicEntity(scalars),
      categoryId: category?.publicId ?? null,
      baseTypeId: baseType.publicId,
      category: category ? toPublicEntity(category) : null,
      baseType: toPublicEntity(baseType),
      roleAssignments: roleAssignments.map((ra) => ({
        roleId: ra.role.publicId,
        typeId: ra.type.publicId,
      })),
      conversionFactors: conversionFactors.map((cf) => ({
        typeId: cf.type.publicId,
        unitsPerBase: Number(cf.unitsPerBase),
      })),
      pickingHierarchy: pickingHierarchy.map((row) => ({
        typeId: row.type.publicId,
        sortOrder: row.sortOrder,
      })),
      usesPickingHierarchy: pickingHierarchy.length > 0,
    };
  }

  private toPublicSummary(group: {
    category: { publicId: string } | null;
    baseType: { publicId: string };
    pickingHierarchy: { id: bigint }[];
    _count: { roleAssignments: number };
    [key: string]: unknown;
  }) {
    const { category, baseType, pickingHierarchy, _count, ...scalars } = group;
    return {
      ...toPublicEntity(scalars as never),
      categoryId: category?.publicId ?? null,
      baseTypeId: baseType.publicId,
      usesPickingHierarchy: pickingHierarchy.length > 0,
      roleAssignmentCount: _count.roleAssignments,
    };
  }

  // --- relation resolution (ADR-200) ------------------------------------------------------

  private async resolveCategoryId(categoryPublicId: string): Promise<bigint> {
    const category = await this.prisma.uOMCategory.findFirst({
      where: { publicId: categoryPublicId, isDeleted: false },
      select: { id: true },
    });
    if (!category) throw new BadRequestException('Referenced Category does not exist.');
    return category.id;
  }

  private async resolveTypeId(typePublicId: string, label = 'Type'): Promise<bigint> {
    const type = await this.prisma.uOMType.findFirst({
      where: { publicId: typePublicId, isDeleted: false },
      select: { id: true },
    });
    if (!type) throw new BadRequestException(`${label} does not reference an existing Type.`);
    return type.id;
  }

  private async resolveRoleId(rolePublicId: string): Promise<bigint> {
    const role = await this.prisma.uOMFunctionalRole.findFirst({
      where: { publicId: rolePublicId, isDeleted: false },
      select: { id: true },
    });
    if (!role) {
      throw new BadRequestException('Role Assignment references a non-existent Functional Role.');
    }
    return role.id;
  }

  // Resolves every client-supplied publicId reference on a Create/Update Group DTO to its internal
  // bigint id in one place (ADR-200), folding in the pre-existing "does this Type/Category/Role
  // actually exist" business-rule checks (BR-002, Role Assignment/Conversion Factor/Picking
  // Hierarchy Type existence) that used to run as separate `assert*` calls against the (then-UUID)
  // `id` column directly.
  private async resolveGroupWriteRefs(dto: {
    categoryId?: string;
    baseTypeId?: string;
    roleAssignments?: { roleId: string; typeId: string }[];
    conversionFactors?: { typeId: string; unitsPerBase: number }[];
    pickingHierarchy?: { typeId: string; sortOrder: number }[];
  }): Promise<{
    categoryId?: bigint;
    baseTypeId?: bigint;
    roleAssignments?: ResolvedRoleAssignment[];
    conversionFactors?: ResolvedConversionFactor[];
    pickingHierarchy?: ResolvedPickingRow[];
  }> {
    const categoryId =
      dto.categoryId !== undefined ? await this.resolveCategoryId(dto.categoryId) : undefined;
    const baseTypeId =
      dto.baseTypeId !== undefined
        ? await this.resolveTypeId(dto.baseTypeId, 'Base Type')
        : undefined;
    const roleAssignments = dto.roleAssignments
      ? await Promise.all(
          dto.roleAssignments.map(async (ra) => ({
            roleId: await this.resolveRoleId(ra.roleId),
            typeId: await this.resolveTypeId(ra.typeId),
          })),
        )
      : undefined;
    const conversionFactors = dto.conversionFactors
      ? await Promise.all(
          dto.conversionFactors.map(async (cf) => ({
            typeId: await this.resolveTypeId(cf.typeId),
            unitsPerBase: cf.unitsPerBase,
          })),
        )
      : undefined;
    const pickingHierarchy = dto.pickingHierarchy
      ? await Promise.all(
          dto.pickingHierarchy.map(async (row) => ({
            typeId: await this.resolveTypeId(row.typeId),
            sortOrder: row.sortOrder,
          })),
        )
      : undefined;

    return { categoryId, baseTypeId, roleAssignments, conversionFactors, pickingHierarchy };
  }

  // --- validation helpers -----------------------------------------------------------------

  // Case-insensitive comparison per BR-001/ADR-191 — scans all non-deleted Groups (a small
  // reference-data table) rather than a raw-SQL `lower()` filter; the DB's own functional unique
  // index (`uom_groups_name_lower_key`) is the storage-layer backstop either way.
  private async assertNameAvailable(name: string, excludeId?: bigint) {
    const candidates = await this.prisma.uOMGroup.findMany({
      where: { isDeleted: false, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true, name: true },
    });
    const normalized = name.trim().toLowerCase();
    const duplicate = candidates.find((c) => c.name.trim().toLowerCase() === normalized);
    if (duplicate) throw new ConflictException('Group name is required and must be unique.');
  }

  // BR-011/VR-008
  private assertRoleAssignmentUniqueness(assignments: ResolvedRoleAssignment[]) {
    const seen = new Set<bigint>();
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
  private assertConversionFactorUniqueness(factors: ResolvedConversionFactor[]) {
    const seen = new Set<bigint>();
    for (const factor of factors) {
      if (seen.has(factor.typeId)) {
        throw new ConflictException('Duplicate Conversion Factor for the same Type submitted.');
      }
      seen.add(factor.typeId);
    }
  }

  // BR-012/VR-014
  private assertPickingHierarchyUniqueness(rows: ResolvedPickingRow[]) {
    const seenTypes = new Set<bigint>();
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

  // BR-019/VR-010 — every role-assigned, non-Base Type must have a Conversion Factor row.
  // Rejects the whole save, naming every offending Type/Role (not just the first).
  private async assertCompleteness(
    baseTypeId: bigint,
    roleAssignments: ResolvedRoleAssignment[],
    conversionFactors: ResolvedConversionFactor[],
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
    const roleName = (id: bigint) => roles.find((r) => r.id === id)?.name ?? id.toString();
    const typeName = (id: bigint) => types.find((t) => t.id === id)?.name ?? id.toString();

    const messages = offending.map(
      (o) => `${roleName(o.roleId)} (${typeName(o.typeId)}) is missing a Conversion Factor`,
    );
    throw new ConflictException(
      `Group save rejected — every role-assigned, non-Base Type needs a Conversion Factor: ${messages.join('; ')}`,
    );
  }
}
