import { Injectable, NotFoundException } from '@nestjs/common';

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

  list() {
    return this.prisma.notificationScheduler.findMany({ orderBy: { name: 'asc' } });
  }

  create(dto: CreateNotificationSchedulerDto) {
    return this.prisma.notificationScheduler.create({ data: dto });
  }

  async update(id: string, dto: UpdateNotificationSchedulerDto) {
    const identifier = EntityIdentifier.from(id);
    const existing = await this.prisma.notificationScheduler.findUnique({
      where: { id: identifier.value },
    });
    if (!existing) throw new NotFoundException('Notification scheduler not found.');
    return this.prisma.notificationScheduler.update({ where: { id: identifier.value }, data: dto });
  }

  async remove(id: string) {
    const identifier = EntityIdentifier.from(id);
    const existing = await this.prisma.notificationScheduler.findUnique({
      where: { id: identifier.value },
    });
    if (!existing) throw new NotFoundException('Notification scheduler not found.');
    await this.prisma.notificationScheduler.delete({ where: { id: identifier.value } });
    return { deleted: true };
  }
}
