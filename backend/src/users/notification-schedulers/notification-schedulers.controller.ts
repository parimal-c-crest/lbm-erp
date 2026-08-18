import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

import { CreateNotificationSchedulerDto } from './dto/create-notification-scheduler.dto';
import { UpdateNotificationSchedulerDto } from './dto/update-notification-scheduler.dto';
import { NotificationSchedulersService } from './notification-schedulers.service';

@ApiTags('Notification Schedulers')
@Controller('notification-schedulers')
@UseGuards(RolesGuard)
@Roles('Admin')
export class NotificationSchedulersController {
  constructor(private readonly schedulers: NotificationSchedulersService) {}

  @Get()
  list() {
    return this.schedulers.list();
  }

  @Post()
  create(@Body() dto: CreateNotificationSchedulerDto) {
    return this.schedulers.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNotificationSchedulerDto) {
    return this.schedulers.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.schedulers.remove(id);
  }
}
