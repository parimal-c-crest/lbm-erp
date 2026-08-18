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

import { CreateFunctionalRoleDto } from './dto/create-functional-role.dto';
import { UpdateFunctionalRoleDto } from './dto/update-functional-role.dto';
import { FunctionalRolesService } from './functional-roles.service';

@ApiTags('UOM')
@Controller('uom/functional-roles')
@UseGuards(RolesGuard)
@Roles('Admin')
export class FunctionalRolesController {
  constructor(private readonly roles: FunctionalRolesService) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.roles.list({
      search,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roles.findById(id);
  }

  @Post()
  create(@Body() dto: CreateFunctionalRoleDto, @Req() req: Request & { user?: JwtPayload }) {
    return this.roles.create(dto, req.user?.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFunctionalRoleDto,
    @Req() req: Request & { user?: JwtPayload },
  ) {
    return this.roles.update(id, dto, req.user?.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roles.remove(id);
  }
}
