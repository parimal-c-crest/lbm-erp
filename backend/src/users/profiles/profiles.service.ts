import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { EntityIdentifier } from '../../common/value-objects/entity-identifier';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { PERMISSION_ACTIONS, PERMISSION_MODULES } from '../permissions/permission-catalog';

import type { CreateProfileDto, PermissionGrantDto } from './dto/create-profile.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get prisma() {
    return this.tenantContext.prisma;
  }

  list() {
    return this.prisma.profile.findMany({ include: { moduleActionPermissions: true } });
  }

  async findById(id: string) {
    const identifier = EntityIdentifier.from(id);
    const profile = await this.prisma.profile.findUnique({
      where: { id: identifier.value },
      include: { moduleActionPermissions: true },
    });
    if (!profile) throw new NotFoundException('Profile not found.');
    return profile;
  }

  // Every permission explicitly set on create, no fail-open default (ADR-156, closes
  // USR-RISK-013) — every module/action combo in the catalog gets a row, `granted: false`
  // unless the caller's `permissions` array says otherwise.
  async create(dto: CreateProfileDto) {
    const overrides = new Map(
      (dto.permissions ?? []).map((grant: PermissionGrantDto) => [
        `${grant.module}:${grant.action}`,
        grant.granted,
      ]),
    );

    const profile = await this.prisma.profile.create({
      data: { name: dto.name, description: dto.description },
    });
    await this.prisma.profileModuleActionPermission.createMany({
      data: PERMISSION_MODULES.flatMap((module) =>
        PERMISSION_ACTIONS.map((action) => ({
          profileId: profile.id,
          module,
          action,
          granted: overrides.get(`${module}:${action}`) ?? false,
        })),
      ),
    });
    return this.findById(profile.id);
  }

  async update(id: string, dto: UpdateProfileDto) {
    const identifier = EntityIdentifier.from(id);
    await this.findById(identifier.value);
    return this.prisma.profile.update({ where: { id: identifier.value }, data: dto });
  }

  async setPermission(id: string, module: string, action: string, granted: boolean) {
    const identifier = EntityIdentifier.from(id);
    await this.findById(identifier.value);
    return this.prisma.profileModuleActionPermission.update({
      where: { profileId_module_action: { profileId: identifier.value, module, action } },
      data: { granted },
    });
  }

  // `transferToProfileId` isn't consumed against any real dependent yet — Profile is reached via
  // Role -> RoleProfile, and no create/update path in this MVP slice writes a `RoleProfile` row
  // (deferred, no SoT source shows the Role-admin screen driving that assignment concretely
  // yet). Still validated and routed through the same shared BR-001 contract as User/Role/Group
  // for a consistent delete flow, per `8-api.md`'s documented Profile DELETE contract.
  async remove(id: string, transferToProfileId: string) {
    const identifier = EntityIdentifier.from(id);
    const transferTarget = EntityIdentifier.from(transferToProfileId);
    if (identifier.value === transferTarget.value) {
      throw new ConflictException('Cannot transfer a profile to itself.');
    }
    await this.findById(identifier.value);
    await this.findById(transferTarget.value);
    await this.prisma.profile.delete({ where: { id: identifier.value } });
    return { deleted: true };
  }
}
