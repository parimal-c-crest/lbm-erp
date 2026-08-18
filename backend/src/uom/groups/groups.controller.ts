import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import type { JwtPayload } from '../../auth/jwt.strategy';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupsService } from './groups.service';

// `docs-kit/5-modules/uom/8-api.md` §3 `/uom/groups*`. Read endpoints (list/detail/resolve/
// pick-breakdown) are open to any authenticated caller (consuming modules need them, e.g.
// Products rendering a unit dropdown, `1-module.md` §11); writes are Admin-only (BR-017/ADR-006).
@ApiTags('UOM')
@Controller('uom/groups')
@UseGuards(RolesGuard)
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.groups.list({
      search,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groups.findById(id);
  }

  @Get(':id/roles/:roleId/resolve')
  resolveRole(@Param('id') id: string, @Param('roleId') roleId: string) {
    return this.groups.resolveRole(id, roleId);
  }

  @Get(':id/pick-breakdown')
  pickBreakdown(@Param('id') id: string) {
    return this.groups.pickBreakdown(id);
  }

  @Post()
  @Roles('Admin')
  create(@Body() dto: CreateGroupDto, @Req() req: Request & { user?: JwtPayload }) {
    return this.groups.create(dto, req.user?.sub);
  }

  @Patch(':id')
  @Roles('Admin')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
    @Req() req: Request & { user?: JwtPayload },
  ) {
    return this.groups.update(id, dto, req.user?.sub);
  }

  @Delete(':id')
  @Roles('Admin')
  remove(@Param('id') id: string) {
    return this.groups.remove(id);
  }
}
