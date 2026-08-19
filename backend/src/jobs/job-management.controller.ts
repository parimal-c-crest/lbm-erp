import { Body, Controller, Get, NotFoundException, Param, Patch, Query, UseGuards } from '@nestjs/common';

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { toPublicEntity } from '../common/utils/public-entity.util';
import { PrismaService } from '../prisma/prisma.service';
import { SkeletonOnlyGuard } from '../tenant/skeleton-only.guard';

import { JobRunQueryDto } from './dto/job-run-query.dto';
import { ToggleEnabledDto } from './dto/toggle-enabled.dto';
import { JobSchedulerService } from './job-scheduler.service';

function toPublicDefinition<
  T extends { id: bigint; publicId: string; schedules: { id: bigint; publicId: string }[] },
>(definition: T) {
  return {
    ...toPublicEntity(definition),
    schedules: definition.schedules.map((s) => toPublicEntity(s)),
  };
}

// Design doc §7/§8 — called by the control panel UI (T-027). Skeleton subdomain + Super Admin
// only, same guard pattern as tenant provisioning (T-024).
//
// ADR-200 — every `:id`/`:scheduleId`/`jobDefinitionId` filter value on this controller is a
// client-supplied `public_id`, resolved to the referenced row's internal bigint `id` before any
// query/write.
@Controller('skeleton/jobs')
@UseGuards(SkeletonOnlyGuard, RolesGuard)
@Roles('Super Admin')
export class JobManagementController {
  constructor(
    private readonly skeleton: PrismaService,
    private readonly scheduler: JobSchedulerService,
  ) {}

  @Get()
  async list() {
    const definitions = await this.skeleton.jobDefinition.findMany({
      include: { schedules: true },
    });
    return definitions.map(toPublicDefinition);
  }

  @Patch(':id/master')
  async toggleMaster(@Param('id') id: string, @Body() dto: ToggleEnabledDto) {
    const existing = await this.skeleton.jobDefinition.findFirst({ where: { publicId: id } });
    if (!existing) throw new NotFoundException('Job definition not found.');
    const definition = await this.skeleton.jobDefinition.update({
      where: { id: existing.id },
      data: { masterEnabled: dto.enabled },
    });
    await this.scheduler.syncAll();
    return toPublicEntity(definition);
  }

  @Patch('schedules/:scheduleId')
  async toggleSchedule(@Param('scheduleId') scheduleId: string, @Body() dto: ToggleEnabledDto) {
    const existing = await this.skeleton.jobSchedule.findFirst({ where: { publicId: scheduleId } });
    if (!existing) throw new NotFoundException('Job schedule not found.');
    const schedule = await this.skeleton.jobSchedule.update({
      where: { id: existing.id },
      data: { enabled: dto.enabled },
    });
    await this.scheduler.syncAll();
    return toPublicEntity(schedule);
  }

  @Get('runs')
  async listRuns(@Query() query: JobRunQueryDto) {
    const jobDefinition = query.jobDefinitionId
      ? await this.skeleton.jobDefinition.findFirst({ where: { publicId: query.jobDefinitionId } })
      : null;
    if (query.jobDefinitionId && !jobDefinition) return [];

    const runs = await this.skeleton.jobRun.findMany({
      where: {
        jobDefinitionId: jobDefinition?.id,
        tenantSubdomain: query.tenantSubdomain,
        status: query.status,
        startedAt: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        },
      },
      orderBy: { startedAt: 'desc' },
    });
    return runs.map(toPublicEntity);
  }
}
