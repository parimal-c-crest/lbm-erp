import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

import { CreateRoleDto } from './dto/create-role.dto';
import { DeleteRoleDto } from './dto/delete-role.dto';
import { ReparentRoleDto } from './dto/reparent-role.dto';
import { TwoFactorRequirementDto } from './dto/two-factor-requirement.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(RolesGuard)
@Roles('Admin')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  list() {
    return this.roles.list();
  }

  @Post()
  create(@Body() dto: CreateRoleDto) {
    return this.roles.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.roles.update(id, dto);
  }

  @Patch(':id/reparent')
  reparent(@Param('id') id: string, @Body() dto: ReparentRoleDto) {
    return this.roles.reparent(id, dto.parentRoleId);
  }

  @Patch(':id/two-factor-requirement')
  setTwoFactorRequirement(@Param('id') id: string, @Body() dto: TwoFactorRequirementDto) {
    return this.roles.setTwoFactorRequired(id, dto.required);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Body() dto: DeleteRoleDto) {
    return this.roles.remove(id, dto.transferToRoleId);
  }
}
