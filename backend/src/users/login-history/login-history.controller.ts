import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

import { LoginHistoryQueryDto } from './dto/login-history-query.dto';
import { LoginHistoryService } from './login-history.service';

@ApiTags('Login History')
@Controller('login-history')
@UseGuards(RolesGuard)
@Roles('Admin')
export class LoginHistoryController {
  constructor(private readonly loginHistory: LoginHistoryService) {}

  @Get()
  list(@Query() query: LoginHistoryQueryDto) {
    return this.loginHistory.list(query);
  }
}
