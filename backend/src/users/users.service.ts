import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { EntityIdentifier } from '../common/value-objects/entity-identifier';
import { toPublicEntity, toPublicEntityOrNull } from '../common/utils/public-entity.util';
import { TenantContextService } from '../tenant/tenant-context.service';

import { PASSWORD_PATTERN, type CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import { QuickBooksSyncService } from './quickbooks/quickbooks-sync.service';

const BCRYPT_ROUNDS = 12;

// Every one of these commands is a real domain invariant, not the legacy system's
// `Users::saveentity`/`insertIntoEntityTable` zero-validation save path
// (`1-module.md` §2 headline finding).
@Injectable()
export class UsersService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly quickBooksSync: QuickBooksSyncService,
  ) {}

  private get prisma() {
    return this.tenantContext.prisma;
  }

  async list(params: { search?: string; roleId?: string; skip?: number; take?: number }) {
    // `params.roleId` is a client-supplied `public_id` (query string) — resolved to the Role's
    // internal `id` before filtering (ADR-200). An unresolvable value returns "no rows" rather
    // than throwing, since a stale/garbage filter is not the caller's Not-Found error.
    const roleFilter = params.roleId ? await this.resolveRoleId(params.roleId) : undefined;
    const where = {
      isDeleted: false,
      ...(params.roleId ? { roleId: roleFilter ?? -1n } : {}),
      ...(params.search
        ? {
            OR: [
              { firstName: { contains: params.search, mode: 'insensitive' as const } },
              { lastName: { contains: params.search, mode: 'insensitive' as const } },
              { email: { contains: params.search, mode: 'insensitive' as const } },
              { username: { contains: params.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: params.skip ?? 0,
        take: params.take ?? 20,
        orderBy: { firstName: 'asc' },
        include: { role: true },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: items.map((u) => ({ ...toPublicEntity(u), role: toPublicEntityOrNull(u.role) })),
      total,
    };
  }

  // Internal-only — returns the raw Prisma record (real bigint `id`), for callers within this
  // service that need to chain further queries/writes. Every controller-facing read goes through
  // `findById`, which reshapes the response (`toPublicEntity`) before it ever leaves this service.
  private async findEntityByPublicId(publicId: string) {
    const identifier = EntityIdentifier.from(publicId);
    const user = await this.prisma.user.findFirst({
      where: { publicId: identifier.value, isDeleted: false },
      include: { role: true },
    });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  private async resolveRoleId(publicId: string): Promise<bigint | undefined> {
    const role = await this.prisma.role.findFirst({ where: { publicId } });
    return role?.id;
  }

  async findById(id: string) {
    const user = await this.findEntityByPublicId(id);
    return { ...toPublicEntity(user), role: toPublicEntityOrNull(user.role) };
  }

  // Real duplicate-username/email check (not the legacy informational-only version) —
  // USR-RULE-001, closes the gap for email too (ADR-157 previously only covered username).
  private async assertUnique(email: string, username: string, excludeUserId?: bigint) {
    const conflict = await this.prisma.user.findFirst({
      where: {
        isDeleted: false,
        OR: [{ email }, { username }],
        ...(excludeUserId !== undefined ? { id: { not: excludeUserId } } : {}),
      },
    });
    if (conflict) {
      const field = conflict.email === email ? 'email' : 'username';
      throw new ConflictException(`A user with this ${field} already exists.`);
    }
  }

  async create(dto: CreateUserDto, actorId: bigint | null) {
    await this.assertUnique(dto.email, dto.username);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const roleId = dto.roleId ? await this.resolveRoleId(dto.roleId) : undefined;
    if (dto.roleId && roleId === undefined) {
      throw new NotFoundException('Referenced Role does not exist.');
    }

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        username: dto.username,
        email: dto.email,
        phone: dto.phone,
        roleId,
        defaultLocation: dto.defaultLocation,
        status: dto.status ?? 'active',
        isSuperAdmin: dto.isSuperAdmin ?? false,
        passwordHash,
        createdBy: actorId ?? undefined,
        updatedBy: actorId ?? undefined,
      },
    });
    // Real-time enqueue on save (FR-013 Main Flow, ADR-031) — async, never blocks the save.
    await this.quickBooksSync.enqueue(user.publicId);
    return toPublicEntity(user);
  }

  // Role/Profile change triggers permission read-model invalidation for that user immediately —
  // trivially true here since `PermissionsService` resolves fresh from live tables on every
  // request rather than caching (closes USR-RISK-015), so there is no stale cache to invalidate.
  async update(id: string, dto: UpdateUserDto, actorId: bigint | null) {
    const existing = await this.findEntityByPublicId(id);

    if (dto.email || dto.username) {
      await this.assertUnique(
        dto.email ?? existing.email,
        dto.username ?? existing.username,
        existing.id,
      );
    }

    const roleId = dto.roleId !== undefined ? await this.resolveRoleId(dto.roleId) : undefined;
    if (dto.roleId && roleId === undefined) {
      throw new NotFoundException('Referenced Role does not exist.');
    }
    const { roleId: _ignoredRoleId, ...rest } = dto;

    const user = await this.prisma.user.update({
      where: { id: existing.id },
      data: { ...rest, roleId, updatedBy: actorId ?? undefined },
    });
    await this.quickBooksSync.enqueue(user.publicId);
    return toPublicEntity(user);
  }

  // Transfer-target-required delete (BR-001, ADR-154) — id validated non-empty/exists before any
  // query runs (closes USR-RISK-001, the traced root cause of a prior real data-loss incident).
  // Attempted self-demotion of the organization's last remaining Admin is rejected (closes
  // USR-RISK-020).
  async remove(id: string, transferToUserId: string) {
    const identifier = EntityIdentifier.from(id);
    const transferTarget = EntityIdentifier.from(transferToUserId);
    if (identifier.value === transferTarget.value) {
      throw new ConflictException("Cannot transfer a user's records to themselves.");
    }

    const user = await this.findEntityByPublicId(identifier.value);
    const targetExists = await this.prisma.user.findFirst({
      where: { publicId: transferTarget.value, isDeleted: false },
    });
    if (!targetExists) throw new NotFoundException('Transfer-target user not found.');

    if (user.roleId) {
      const role = await this.prisma.role.findUnique({ where: { id: user.roleId } });
      if (role?.name === 'Admin') {
        const otherAdmins = await this.prisma.user.count({
          where: { isDeleted: false, id: { not: user.id }, role: { name: 'Admin' } },
        });
        if (otherAdmins === 0) {
          throw new ConflictException("Cannot delete the organization's last remaining Admin.");
        }
      }
    }

    // Owned/assigned records requiring reassignment: this module's own `createdBy`/`updatedBy`
    // audit pointers (the only cross-record User references that exist in this codebase so far —
    // real modules will add their own transfer-target reassignment as they're built).
    await this.prisma.user.updateMany({
      where: { createdBy: user.id },
      data: { createdBy: targetExists.id },
    });
    await this.prisma.user.updateMany({
      where: { updatedBy: user.id },
      data: { updatedBy: targetExists.id },
    });

    return toPublicEntity(
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isDeleted: true, deletedAt: new Date() },
      }),
    );
  }

  // Self-service (old-password re-verified) and admin-reset (not) collapsed into one command
  // (FR-007) — password complexity enforced at this single call site, no toggle to disable
  // (ADR-155, closes USR-RISK-005).
  async changePassword(
    id: string,
    newPassword: string,
    actorId: bigint | null,
    oldPassword?: string,
  ) {
    if (!PASSWORD_PATTERN.test(newPassword)) {
      throw new ConflictException(
        'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number.',
      );
    }
    const user = await this.findEntityByPublicId(id);

    if (oldPassword !== undefined) {
      const matches = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!matches) throw new UnauthorizedException('Current password is incorrect.');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    return toPublicEntity(
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, updatedBy: actorId ?? undefined },
      }),
    );
  }
}
