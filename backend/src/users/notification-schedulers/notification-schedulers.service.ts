import { Injectable, NotFoundException } from '@nestjs/common';

import { toPublicEntity } from '../../common/utils/public-entity.util';
import { EntityIdentifier } from '../../common/value-objects/entity-identifier';
import { TenantContextService } from '../../tenant/tenant-context.service';

import type { CreateNotificationSchedulerDto } from './dto/create-notification-scheduler.dto';
import type { UpdateNotificationSchedulerDto } from './dto/update-notification-scheduler.dto';

// Minimal backend-only CRUD (ADR-188 — no dedicated UI in this MVP, `4-schema.md` §3). Standalone
// entity, no FK to User.
@Injectable()
export class NotificationSchedulersService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private get prisma() {
    return this.tenantContext.prisma;
  }

  async list() {
    const items = await this.prisma.notificationScheduler.findMany({ orderBy: { name: 'asc' } });
    return items.map(toPublicEntity);
  }

  async create(dto: CreateNotificationSchedulerDto) {
    return toPublicEntity(await this.prisma.notificationScheduler.create({ data: dto }));
  }

  async update(id: string, dto: UpdateNotificationSchedulerDto) {
    const identifier = EntityIdentifier.from(id);
    const existing = await this.prisma.notificationScheduler.findFirst({
      where: { publicId: identifier.value },
    });
    if (!existing) throw new NotFoundException('Notification scheduler not found.');
    return toPublicEntity(
      await this.prisma.notificationScheduler.update({ where: { id: existing.id }, data: dto }),
    );
  }

  async remove(id: string) {
    const identifier = EntityIdentifier.from(id);
    const existing = await this.prisma.notificationScheduler.findFirst({
      where: { publicId: identifier.value },
    });
    if (!existing) throw new NotFoundException('Notification scheduler not found.');
    await this.prisma.notificationScheduler.delete({ where: { id: existing.id } });
    return { deleted: true };
  }
}
