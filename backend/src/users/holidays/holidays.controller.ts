import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

import { CreateHolidayDto } from './dto/create-holiday.dto';
import { HolidaysService } from './holidays.service';

// `docs-kit/5-modules/users/8-api.md` §3 GET/POST /holidays — list is any authenticated user
// (everyone needs to see the org calendar); create is Admin-only.
@ApiTags('Holidays')
@Controller('holidays')
export class HolidaysController {
  constructor(private readonly holidays: HolidaysService) {}

  @Get()
  list() {
    return this.holidays.list();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('Admin')
  create(@Body() dto: CreateHolidayDto) {
    return this.holidays.create(dto);
  }
}
