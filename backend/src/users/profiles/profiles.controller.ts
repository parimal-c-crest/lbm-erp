import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

import { CreateProfileDto } from './dto/create-profile.dto';
import { DeleteProfileDto } from './dto/delete-profile.dto';
import { SetPermissionDto } from './dto/set-permission.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfilesService } from './profiles.service';

@ApiTags('Profiles')
@Controller('profiles')
@UseGuards(RolesGuard)
@Roles('Admin')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get()
  list() {
    return this.profiles.list();
  }

  @Post()
  create(@Body() dto: CreateProfileDto) {
    return this.profiles.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProfileDto) {
    return this.profiles.update(id, dto);
  }

  @Patch(':id/permissions')
  setPermission(@Param('id') id: string, @Body() dto: SetPermissionDto) {
    return this.profiles.setPermission(id, dto.module, dto.action, dto.granted);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Body() dto: DeleteProfileDto) {
    return this.profiles.remove(id, dto.transferToProfileId);
  }
}
