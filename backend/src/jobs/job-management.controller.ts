import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { SkeletonOnlyGuard } from '../tenant/skeleton-only.guard';

import { JobRunQueryDto } from './dto/job-run-query.dto';
import { ToggleEnabledDto } from './dto/toggle-enabled.dto';
import { JobSchedulerService } from './job-scheduler.service';

// Design doc §7/§8 — called by the control panel UI (T-027). Skeleton subdomain + Super Admin
// only, same guard pattern as tenant provisioning (T-024).
@Controller('skeleton/jobs')
@UseGuards(SkeletonOnlyGuard, RolesGuard)
@Roles('Super Admin')
export class JobManagementController {
  constructor(
    private readonly skeleton: PrismaService,
    private readonly scheduler: JobSchedulerService,
  ) {}

  @Get()
  list() {
    return this.skeleton.jobDefinition.findMany({ include: { schedules: true } });
  }

  @Patch(':id/master')
  async toggleMaster(@Param('id') id: string, @Body() dto: ToggleEnabledDto) {
    const definition = await this.skeleton.jobDefinition.update({
      where: { id },
      data: { masterEnabled: dto.enabled },
    });
    await this.scheduler.syncAll();
    return definition;
  }

  @Patch('schedules/:scheduleId')
  async toggleSchedule(@Param('scheduleId') scheduleId: string, @Body() dto: ToggleEnabledDto) {
    const schedule = await this.skeleton.jobSchedule.update({
      where: { id: scheduleId },
      data: { enabled: dto.enabled },
    });
    await this.scheduler.syncAll();
    return schedule;
  }

  @Get('runs')
  listRuns(@Query() query: JobRunQueryDto) {
    return this.skeleton.jobRun.findMany({
      where: {
        jobDefinitionId: query.jobDefinitionId,
        tenantSubdomain: query.tenantSubdomain,
        status: query.status,
        startedAt: {
          gte: query.from ? new Date(query.from) : undefined,
          lte: query.to ? new Date(query.to) : undefined,
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }
}
