import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { EntityIdentifier } from '../../common/value-objects/entity-identifier';
import { TenantContextService } from '../../tenant/tenant-context.service';

import type { CreateGroupDto, GroupMemberDto } from './dto/create-group.dto';
import type { UpdateGroupDto } from './dto/update-group.dto';

// Assignment/roster targets only — no sharing-rule/visibility meaning (ADR-081).
@Injectable()
export class GroupsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get prisma() {
    return this.tenantContext.prisma;
  }

  list() {
    return this.prisma.group.findMany({ include: { memberships: true } });
  }

  async findById(id: string) {
    const identifier = EntityIdentifier.from(id);
    const group = await this.prisma.group.findUnique({
      where: { id: identifier.value },
      include: { memberships: true },
    });
    if (!group) throw new NotFoundException('Group not found.');
    return group;
  }

  async create(dto: CreateGroupDto) {
    const group = await this.prisma.group.create({
      data: { name: dto.name, description: dto.description },
    });
    if (dto.members?.length) {
      await this.replaceMembers(group.id, dto.members);
    }
    return this.findById(group.id);
  }

  async update(id: string, dto: UpdateGroupDto, members?: GroupMemberDto[]) {
    const identifier = EntityIdentifier.from(id);
    await this.findById(identifier.value);
    await this.prisma.group.update({ where: { id: identifier.value }, data: dto });
    if (members) {
      await this.replaceMembers(identifier.value, members);
    }
    return this.findById(identifier.value);
  }

  private async replaceMembers(groupId: string, members: GroupMemberDto[]) {
    await this.prisma.groupMembership.deleteMany({ where: { groupId } });
    await this.prisma.groupMembership.createMany({
      data: members.map((member) => ({
        groupId,
        memberType: member.memberType,
        memberId: member.memberId,
        userId: member.memberType === 'USER' ? member.memberId : null,
      })),
    });
  }

  // `transferToGroupId` isn't consumed against a real dependent — Groups have no owned/assigned
  // records of their own to reassign (ADR-081, assignment/roster only). Still validated and
  // routed through the shared BR-001 delete contract for consistency with User/Role/Profile,
  // matching `9-ui.md` §4's "same transfer-target-picker pattern as Role above".
  async remove(id: string, transferToGroupId: string) {
    const identifier = EntityIdentifier.from(id);
    const transferTarget = EntityIdentifier.from(transferToGroupId);
    if (identifier.value === transferTarget.value) {
      throw new ConflictException('Cannot transfer a group to itself.');
    }
    await this.findById(identifier.value);
    await this.findById(transferTarget.value);
    await this.prisma.group.delete({ where: { id: identifier.value } });
    return { deleted: true };
  }
}
