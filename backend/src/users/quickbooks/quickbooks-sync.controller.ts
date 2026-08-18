import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

import { QuickBooksSyncService } from './quickbooks-sync.service';

@ApiTags('QuickBooks Sync')
@Controller('quickbooks-sync')
@UseGuards(RolesGuard)
@Roles('Admin')
export class QuickBooksSyncController {
  constructor(private readonly quickBooksSync: QuickBooksSyncService) {}

  @Get('status')
  status() {
    return this.quickBooksSync.listStatus();
  }
}
