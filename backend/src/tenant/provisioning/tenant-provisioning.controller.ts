import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SkeletonOnlyGuard } from '../skeleton-only.guard';

import { MigrateFanoutQueryDto } from './migrate-fanout-query.dto';
import { ProvisionTenantDto } from './provision-tenant.dto';
import { TenantProvisioningService } from './tenant-provisioning.service';

// `4-ui/1-navigation.md`-equivalent for skeleton (design doc §8) — called by the control panel UI
// (T-027). Guarded: skeleton subdomain only + Super Admin role (JwtAuthGuard already applies
// globally, `app.module.ts`).
@Controller('skeleton/tenants')
@UseGuards(SkeletonOnlyGuard, RolesGuard)
@Roles('Super Admin')
export class TenantProvisioningController {
  constructor(private readonly provisioning: TenantProvisioningService) {}

  @Post()
  provision(@Body() dto: ProvisionTenantDto) {
    return this.provisioning.provision(dto);
  }

  @Get()
  list() {
    return this.provisioning.listTenants();
  }

  @Post('migrate-fanout')
  migrateFanout(@Query() query: MigrateFanoutQueryDto) {
    return this.provisioning.migrateFanout(query.type);
  }
}
