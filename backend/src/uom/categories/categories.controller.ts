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

import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

// `docs-kit/5-modules/uom/8-api.md` §3 `/uom/categories*` — Admin-only (BR-017/ADR-006, server-side
// enforced, not a UI-layer flag).
@ApiTags('UOM')
@Controller('uom/categories')
@UseGuards(RolesGuard)
@Roles('Admin')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.categories.list({
      search,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categories.findById(id);
  }

  @Post()
  create(@Body() dto: CreateCategoryDto, @Req() req: Request & { user?: JwtPayload }) {
    return this.categories.create(dto, req.user?.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @Req() req: Request & { user?: JwtPayload },
  ) {
    return this.categories.update(id, dto, req.user?.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categories.remove(id);
  }
}
