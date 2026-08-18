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

import { CreateTypeDto } from './dto/create-type.dto';
import { UpdateTypeDto } from './dto/update-type.dto';
import { TypesService } from './types.service';

@ApiTags('UOM')
@Controller('uom/types')
@UseGuards(RolesGuard)
@Roles('Admin')
export class TypesController {
  constructor(private readonly types: TypesService) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.types.list({
      search,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.types.findById(id);
  }

  @Post()
  create(@Body() dto: CreateTypeDto, @Req() req: Request & { user?: JwtPayload }) {
    return this.types.create(dto, req.user?.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTypeDto,
    @Req() req: Request & { user?: JwtPayload },
  ) {
    return this.types.update(id, dto, req.user?.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.types.remove(id);
  }
}
