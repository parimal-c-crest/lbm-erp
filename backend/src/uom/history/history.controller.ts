import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { RolesGuard } from '../../common/guards/roles.guard';

import { HistoryService } from './history.service';

// Any authenticated caller (e.g. SalesHistory resolving a historical rate) — no `@Roles()`
// restriction, `RolesGuard` no-ops when no roles are set on the handler (see `roles.guard.ts`).
@ApiTags('UOM')
@Controller('uom/groups/:groupId/conversion-factors/:typeId/history')
@UseGuards(RolesGuard)
export class HistoryController {
  constructor(private readonly history: HistoryService) {}

  @Get()
  get(
    @Param('groupId') groupId: string,
    @Param('typeId') typeId: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.history.forPair(groupId, typeId, asOfDate);
  }
}
