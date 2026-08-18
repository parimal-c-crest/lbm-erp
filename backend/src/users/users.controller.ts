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

import { ChangePasswordDto } from '../auth/dto/change-password.dto';
import type { JwtPayload } from '../auth/jwt.strategy';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

import { CreateUserDto } from './dto/create-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

// REST contract per `docs-kit/5-modules/users/8-api.md` §2/§3. `/users/me*` routes are
// self-service (any authenticated user, own record only); every other route is Admin-only.
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('Admin')
  list(
    @Query('search') search?: string,
    @Query('roleId') roleId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.users.list({
      search,
      roleId,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('Admin')
  findOne(@Param('id') id: string) {
    return this.users.findById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('Admin')
  create(@Body() dto: CreateUserDto, @Req() req: Request & { user?: JwtPayload }) {
    return this.users.create(dto, req.user?.sub ?? null);
  }

  @Patch('me')
  updateSelf(@Body() dto: UpdateUserDto, @Req() req: Request & { user?: JwtPayload }) {
    // Self-service — status/role changes are ignored here at the DTO's own field set boundary
    // in the real system's field-level permission gate; for this MVP slice, no additional
    // enforcement beyond "you may only edit your own record" (Admin edits others via PATCH /:id).
    return this.users.update(req.user!.sub, dto, req.user!.sub);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('Admin')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request & { user?: JwtPayload },
  ) {
    return this.users.update(id, dto, req.user?.sub ?? null);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('Admin')
  remove(@Param('id') id: string, @Body() dto: DeleteUserDto) {
    return this.users.remove(id, dto.transferToUserId);
  }

  @Post('me/password')
  changeOwnPassword(@Body() dto: ChangePasswordDto, @Req() req: Request & { user?: JwtPayload }) {
    return this.users.changePassword(
      req.user!.sub,
      dto.newPassword,
      req.user!.sub,
      dto.oldPassword,
    );
  }

  @Post(':id/password-reset')
  @UseGuards(RolesGuard)
  @Roles('Admin')
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request & { user?: JwtPayload },
  ) {
    return this.users.changePassword(id, dto.newPassword, req.user?.sub ?? null);
  }
}
