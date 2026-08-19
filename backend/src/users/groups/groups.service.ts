import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { toPublicEntity } from '../../common/utils/public-entity.util';
import { EntityIdentifier } from '../../common/value-objects/entity-identifier';
import { TenantContextService } from '../../tenant/tenant-context.service';

import type { CreateGroupDto, GroupMemberDto } from './dto/create-group.dto';
import type { UpdateGroupDto } from './dto/update-group.dto';

function toPublicGroup<
  T extends { id: bigint; publicId: string; memberships: { id: bigint; publicId: string }[] },
>(group: T) {
  return {
    ...toPublicEntity(group),
    memberships: group.memberships.map((m) => toPublicEntity(m)),
  };
}

// Assignment/roster targets only — no sharing-rule/visibility meaning (ADR-081).
@Injectable()
export class GroupsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get prisma() {
    return this.tenantContext.prisma;
  }

  async list() {
    const groups = await this.prisma.group.findMany({ include: { memberships: true } });
    return groups.map(toPublicGroup);
  }

  // Internal-only — real bigint `id`, for chaining further queries/writes within this service.
  private async findEntityByPublicId(publicId: string) {
    const identifier = EntityIdentifier.from(publicId);
    const group = await this.prisma.group.findFirst({
      where: { publicId: identifier.value },
      include: { memberships: true },
    });
    if (!group) throw new NotFoundException('Group not found.');
    return group;
  }

  async findById(id: string) {
    return toPublicGroup(await this.findEntityByPublicId(id));
  }

  async create(dto: CreateGroupDto) {
    const group = await this.prisma.group.create({
      data: { name: dto.name, description: dto.description },
    });
    if (dto.members?.length) {
      await this.replaceMembers(group.id, dto.members);
    }
    return this.findById(group.publicId);
  }

  async update(id: string, dto: UpdateGroupDto, members?: GroupMemberDto[]) {
    const existing = await this.findEntityByPublicId(id);
    await this.prisma.group.update({ where: { id: existing.id }, data: dto });
    if (members) {
      await this.replaceMembers(existing.id, members);
    }
    return this.findById(existing.publicId);
  }

  // `member.memberId` is polymorphic (a User or Role `public_id`, per `member.memberType`) —
  // resolved to the referenced row's internal bigint `id` before storage (ADR-200). Stored as the
  // string form of that internal id (`group_memberships.member_id` is `TEXT`, not a real FK —
  // application-validated against `memberType` instead), never the raw `public_id`, so lookups
  // against it agree with the real `users.id`/`roles.id` columns.
  private async replaceMembers(groupId: bigint, members: GroupMemberDto[]) {
    const resolved = await Promise.all(
      members.map(async (member) => {
        if (member.memberType === 'USER') {
          const user = await this.prisma.user.findFirst({
            where: { publicId: member.memberId, isDeleted: false },
          });
          if (!user) throw new NotFoundException(`Member User ${member.memberId} not found.`);
          return { memberType: member.memberType, internalId: user.id, userId: user.id };
        }
        const role = await this.prisma.role.findFirst({ where: { publicId: member.memberId } });
        if (!role) throw new NotFoundException(`Member Role ${member.memberId} not found.`);
        return { memberType: member.memberType, internalId: role.id, userId: null };
      }),
    );

    await this.prisma.groupMembership.deleteMany({ where: { groupId } });
    await this.prisma.groupMembership.createMany({
      data: resolved.map((member) => ({
        groupId,
        memberType: member.memberType,
        memberId: member.internalId.toString(),
        userId: member.userId,
      })),
    });
  }

  // `transferToGroupId` isn't consumed against a real dependent — Groups have no owned/assigned
  // records of their own to reassign (ADR-081, assignment/roster only). Still validated and
  // routed through the shared BR-001 delete contract for consistency with User/Role/Profile,
  // matching `9-ui.md` §4's "same transfer-target-picker pattern as Role above".
  async remove(id: string, transferToGroupId: string) {
    const existing = await this.findEntityByPublicId(id);
    const transferTarget = await this.findEntityByPublicId(transferToGroupId);
    if (existing.id === transferTarget.id) {
      throw new ConflictException('Cannot transfer a group to itself.');
    }
    await this.prisma.group.delete({ where: { id: existing.id } });
    return { deleted: true };
  }
}
