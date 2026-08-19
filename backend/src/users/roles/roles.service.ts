import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { toPublicEntity, toPublicEntityOrNull } from '../../common/utils/public-entity.util';
import { EntityIdentifier } from '../../common/value-objects/entity-identifier';
import { TenantContextService } from '../../tenant/tenant-context.service';

import type { CreateRoleDto } from './dto/create-role.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get prisma() {
    return this.tenantContext.prisma;
  }

  async list() {
    const roles = await this.prisma.role.findMany({
      include: { twoFactorRequirement: true },
      orderBy: { depth: 'asc' },
    });
    return roles.map((role) => ({
      ...toPublicEntity(role),
      twoFactorRequirement: role.twoFactorRequirement,
    }));
  }

  // Internal-only — real bigint `id`, for chaining further queries/writes within this service.
  private async findEntityByPublicId(publicId: string) {
    const identifier = EntityIdentifier.from(publicId);
    const role = await this.prisma.role.findFirst({
      where: { publicId: identifier.value },
      include: { twoFactorRequirement: true },
    });
    if (!role) throw new NotFoundException('Role not found.');
    return role;
  }

  async findById(id: string) {
    const role = await this.findEntityByPublicId(id);
    return { ...toPublicEntity(role), twoFactorRequirement: role.twoFactorRequirement };
  }

  async create(dto: CreateRoleDto) {
    const parent = dto.parentRoleId ? await this.findEntityByPublicId(dto.parentRoleId) : null;
    const depth = parent ? parent.depth + 1 : 0;
    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        parentRoleId: parent?.id,
        depth,
      },
    });
    return toPublicEntity(role);
  }

  async update(id: string, dto: UpdateRoleDto) {
    const existing = await this.findEntityByPublicId(id);
    const role = await this.prisma.role.update({ where: { id: existing.id }, data: dto });
    return toPublicEntity(role);
  }

  // Reparent: recomputes `depth` for the moved Role and all its descendants server-side
  // (`4-schema.md` §3), refuses to create a cycle (a role can't become its own descendant's
  // child).
  async reparent(id: string, newParentPublicId: string | null | undefined) {
    const role = await this.findEntityByPublicId(id);
    const newParent = newParentPublicId ? await this.findEntityByPublicId(newParentPublicId) : null;

    if (newParent) {
      let cursor: bigint | null = newParent.id;
      while (cursor) {
        if (cursor === role.id) {
          throw new ConflictException('Cannot move a role under its own descendant.');
        }
        const parent: { parentRoleId: bigint | null } | null = await this.prisma.role.findUnique({
          where: { id: cursor },
          select: { parentRoleId: true },
        });
        cursor = parent?.parentRoleId ?? null;
      }
    }

    const newDepth = newParent ? newParent.depth + 1 : 0;
    await this.prisma.role.update({
      where: { id: role.id },
      data: { parentRoleId: newParent?.id ?? null, depth: newDepth },
    });
    await this.recomputeDescendantDepths(role.id, newDepth);
    return this.findById(role.publicId);
  }

  private async recomputeDescendantDepths(parentId: bigint, parentDepth: number) {
    const children = await this.prisma.role.findMany({ where: { parentRoleId: parentId } });
    for (const child of children) {
      const childDepth = parentDepth + 1;
      await this.prisma.role.update({ where: { id: child.id }, data: { depth: childDepth } });
      await this.recomputeDescendantDepths(child.id, childDepth);
    }
  }

  async setTwoFactorRequired(id: string, required: boolean) {
    const role = await this.findEntityByPublicId(id);

    // `users.email` becomes required (application-layer, ADR-075's conditional-required-field
    // rule) for any User whose Role has `required=true` — surface which Users are missing Email
    // rather than silently succeeding and locking them out at their next login.
    if (required) {
      const membersWithoutEmail = await this.prisma.user.findMany({
        where: { roleId: role.id, isDeleted: false, email: '' },
        select: { id: true, firstName: true, lastName: true },
      });
      if (membersWithoutEmail.length > 0) {
        throw new ConflictException(
          `Cannot enable 2FA — these users have no email on file: ${membersWithoutEmail.map((u) => `${u.firstName} ${u.lastName}`).join(', ')}`,
        );
      }
    }

    return this.prisma.roleTwoFactorRequirement.upsert({
      where: { roleId: role.id },
      create: { roleId: role.id, required },
      update: { required },
    });
  }

  // Transfer-target-required delete (BR-001) — member Users and any child Roles reassigned to
  // the transfer target before the Role itself is removed.
  async remove(id: string, transferToRoleId: string) {
    const role = await this.findEntityByPublicId(id);
    const transferTarget = await this.findEntityByPublicId(transferToRoleId);
    if (role.id === transferTarget.id) {
      throw new ConflictException("Cannot transfer a role's members to itself.");
    }

    await this.prisma.user.updateMany({
      where: { roleId: role.id },
      data: { roleId: transferTarget.id },
    });
    await this.prisma.role.updateMany({
      where: { parentRoleId: role.id },
      data: { parentRoleId: transferTarget.id },
    });
    await this.prisma.role.delete({ where: { id: role.id } });
    return { deleted: true };
  }
}
