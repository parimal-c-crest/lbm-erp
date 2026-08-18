import { Body, Controller, Delete, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import type { JwtPayload } from '../../auth/jwt.strategy';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

import { ClockInDto } from './dto/clock-in.dto';
import { OverrideTimeClockDto } from './dto/override.dto';
import { TimeclockService } from './timeclock.service';

// `docs-kit/5-modules/users/8-api.md` §3 — clock-in/out are self-service (any authenticated
// user, own record only); override is Admin/Accounting-Management only. The
// `override/:recordId/lock*` routes are this task's own design (T-063) implementing the
// project-wide concurrent-edit lock (ADR-079/080/084) for this screen.
@ApiTags('Timeclock')
@Controller('timeclock')
export class TimeclockController {
  constructor(private readonly timeclock: TimeclockService) {}

  @Post('clock-in')
  clockIn(@Body() dto: ClockInDto, @Req() req: Request & { user?: JwtPayload }) {
    return this.timeclock.clockIn(req.user!.sub, dto);
  }

  @Post('clock-out')
  clockOut(@Req() req: Request & { user?: JwtPayload }) {
    return this.timeclock.clockOut(req.user!.sub);
  }

  @Post('override/:recordId/lock')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Accounting/Management')
  lockOverride(@Param('recordId') recordId: string, @Req() req: Request & { user?: JwtPayload }) {
    return this.timeclock.lockOverride(recordId, req.user!.sub);
  }

  @Post('override/:recordId/lock/heartbeat')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Accounting/Management')
  heartbeatOverrideLock(
    @Param('recordId') recordId: string,
    @Req() req: Request & { user?: JwtPayload },
  ) {
    return this.timeclock.heartbeatOverrideLock(recordId, req.user!.sub);
  }

  @Delete('override/:recordId/lock')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Accounting/Management')
  releaseOverrideLock(
    @Param('recordId') recordId: string,
    @Req() req: Request & { user?: JwtPayload },
  ) {
    return this.timeclock.releaseOverrideLock(recordId, req.user!.sub);
  }

  @Post('override')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Accounting/Management')
  override(@Body() dto: OverrideTimeClockDto, @Req() req: Request & { user?: JwtPayload }) {
    return this.timeclock.override(dto, req.user!.sub);
  }
}
