import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import type { JwtPayload } from '../../auth/jwt.strategy';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

import { ImportGroupsDto } from './dto/import-groups.dto';
import { ImportExportService } from './import-export.service';

@ApiTags('UOM')
@Controller('uom/groups')
@UseGuards(RolesGuard)
@Roles('Admin')
export class ImportExportController {
  constructor(private readonly importExport: ImportExportService) {}

  @Post('import')
  importGroups(@Body() dto: ImportGroupsDto, @Req() req: Request & { user?: JwtPayload }) {
    return this.importExport.importGroups(dto, req.user?.sub);
  }

  @Get('export')
  exportGroups() {
    return this.importExport.exportGroups();
  }
}
