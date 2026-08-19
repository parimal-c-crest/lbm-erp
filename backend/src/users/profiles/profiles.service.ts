import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { toPublicEntity } from '../../common/utils/public-entity.util';
import { EntityIdentifier } from '../../common/value-objects/entity-identifier';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { PERMISSION_ACTIONS, PERMISSION_MODULES } from '../permissions/permission-catalog';

import type { CreateProfileDto, PermissionGrantDto } from './dto/create-profile.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';

function toPublicProfile<
  T extends { id: bigint; publicId: string; moduleActionPermissions: { id: bigint; publicId: string }[] },
>(profile: T) {
  return {
    ...toPublicEntity(profile),
    moduleActionPermissions: profile.moduleActionPermissions.map((p) => toPublicEntity(p)),
  };
}

@Injectable()
export class ProfilesService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get prisma() {
    return this.tenantContext.prisma;
  }

  async list() {
    const profiles = await this.prisma.profile.findMany({
      include: { moduleActionPermissions: true },
    });
    return profiles.map(toPublicProfile);
  }

  // Internal-only — real bigint `id`, for chaining further queries/writes within this service.
  private async findEntityByPublicId(publicId: string) {
    const identifier = EntityIdentifier.from(publicId);
    const profile = await this.prisma.profile.findFirst({
      where: { publicId: identifier.value },
      include: { moduleActionPermissions: true },
    });
    if (!profile) throw new NotFoundException('Profile not found.');
    return profile;
  }

  async findById(id: string) {
    return toPublicProfile(await this.findEntityByPublicId(id));
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
    return this.findById(profile.publicId);
  }

  async update(id: string, dto: UpdateProfileDto) {
    const existing = await this.findEntityByPublicId(id);
    await this.prisma.profile.update({ where: { id: existing.id }, data: dto });
    return this.findById(existing.publicId);
  }

  async setPermission(id: string, module: string, action: string, granted: boolean) {
    const existing = await this.findEntityByPublicId(id);
    return toPublicEntity(
      await this.prisma.profileModuleActionPermission.update({
        where: { profileId_module_action: { profileId: existing.id, module, action } },
        data: { granted },
      }),
    );
  }

  // `transferToProfileId` isn't consumed against any real dependent yet — Profile is reached via
  // Role -> RoleProfile, and no create/update path in this MVP slice writes a `RoleProfile` row
  // (deferred, no SoT source shows the Role-admin screen driving that assignment concretely
  // yet). Still validated and routed through the same shared BR-001 contract as User/Role/Group
  // for a consistent delete flow, per `8-api.md`'s documented Profile DELETE contract.
  async remove(id: string, transferToProfileId: string) {
    const existing = await this.findEntityByPublicId(id);
    const transferTarget = await this.findEntityByPublicId(transferToProfileId);
    if (existing.id === transferTarget.id) {
      throw new ConflictException('Cannot transfer a profile to itself.');
    }
    await this.prisma.profile.delete({ where: { id: existing.id } });
    return { deleted: true };
  }
}
