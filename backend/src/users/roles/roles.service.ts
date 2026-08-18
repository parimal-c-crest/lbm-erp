import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

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

  list() {
    return this.prisma.role.findMany({
      include: { twoFactorRequirement: true },
      orderBy: { depth: 'asc' },
    });
  }

  async findById(id: string) {
    const identifier = EntityIdentifier.from(id);
    const role = await this.prisma.role.findUnique({
      where: { id: identifier.value },
      include: { twoFactorRequirement: true },
    });
    if (!role) throw new NotFoundException('Role not found.');
    return role;
  }

  async create(dto: CreateRoleDto) {
    const depth = dto.parentRoleId ? (await this.findById(dto.parentRoleId)).depth + 1 : 0;
    return this.prisma.role.create({
      data: { name: dto.name, description: dto.description, parentRoleId: dto.parentRoleId, depth },
    });
  }

  async update(id: string, dto: UpdateRoleDto) {
    const identifier = EntityIdentifier.from(id);
    await this.findById(identifier.value);
    return this.prisma.role.update({ where: { id: identifier.value }, data: dto });
  }

  // Reparent: recomputes `depth` for the moved Role and all its descendants server-side
  // (`4-schema.md` §3), refuses to create a cycle (a role can't become its own descendant's
  // child).
  async reparent(id: string, newParentId: string | null | undefined) {
    const identifier = EntityIdentifier.from(id);
    const role = await this.findById(identifier.value);

    if (newParentId) {
      let cursor: string | null = newParentId;
      while (cursor) {
        if (cursor === role.id) {
          throw new ConflictException('Cannot move a role under its own descendant.');
        }
        const parent: { parentRoleId: string | null } | null = await this.prisma.role.findUnique({
          where: { id: cursor },
          select: { parentRoleId: true },
        });
        cursor = parent?.parentRoleId ?? null;
      }
    }

    const newDepth = newParentId ? (await this.findById(newParentId)).depth + 1 : 0;
    await this.prisma.role.update({
      where: { id: role.id },
      data: { parentRoleId: newParentId ?? null, depth: newDepth },
    });
    await this.recomputeDescendantDepths(role.id, newDepth);
    return this.findById(role.id);
  }

  private async recomputeDescendantDepths(parentId: string, parentDepth: number) {
    const children = await this.prisma.role.findMany({ where: { parentRoleId: parentId } });
    for (const child of children) {
      const childDepth = parentDepth + 1;
      await this.prisma.role.update({ where: { id: child.id }, data: { depth: childDepth } });
      await this.recomputeDescendantDepths(child.id, childDepth);
    }
  }

  async setTwoFactorRequired(id: string, required: boolean) {
    const identifier = EntityIdentifier.from(id);
    await this.findById(identifier.value);

    // `users.email` becomes required (application-layer, ADR-075's conditional-required-field
    // rule) for any User whose Role has `required=true` — surface which Users are missing Email
    // rather than silently succeeding and locking them out at their next login.
    if (required) {
      const membersWithoutEmail = await this.prisma.user.findMany({
        where: { roleId: identifier.value, isDeleted: false, email: '' },
        select: { id: true, firstName: true, lastName: true },
      });
      if (membersWithoutEmail.length > 0) {
        throw new ConflictException(
          `Cannot enable 2FA — these users have no email on file: ${membersWithoutEmail.map((u) => `${u.firstName} ${u.lastName}`).join(', ')}`,
        );
      }
    }

    return this.prisma.roleTwoFactorRequirement.upsert({
      where: { roleId: identifier.value },
      create: { roleId: identifier.value, required },
      update: { required },
    });
  }

  // Transfer-target-required delete (BR-001) — member Users and any child Roles reassigned to
  // the transfer target before the Role itself is removed.
  async remove(id: string, transferToRoleId: string) {
    const identifier = EntityIdentifier.from(id);
    const transferTarget = EntityIdentifier.from(transferToRoleId);
    if (identifier.value === transferTarget.value) {
      throw new ConflictException("Cannot transfer a role's members to itself.");
    }
    await this.findById(identifier.value);
    await this.findById(transferTarget.value);

    await this.prisma.user.updateMany({
      where: { roleId: identifier.value },
      data: { roleId: transferTarget.value },
    });
    await this.prisma.role.updateMany({
      where: { parentRoleId: identifier.value },
      data: { parentRoleId: transferTarget.value },
    });
    await this.prisma.role.delete({ where: { id: identifier.value } });
    return { deleted: true };
  }
}
