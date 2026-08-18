import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

import { PayrollReportQueryDto } from './dto/payroll-report-query.dto';
import { PayrollService } from './payroll.service';

// `docs-kit/5-modules/users/8-api.md` §3 GET /payroll/report — Admin or Accounting/Management
// only. On-screen only, CSV/ZIP export deferred past MVP (ADR-078).
@ApiTags('Payroll')
@Controller('payroll')
@UseGuards(RolesGuard)
@Roles('Admin', 'Accounting/Management')
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @Get('report')
  report(@Query() query: PayrollReportQueryDto) {
    return this.payroll.report(query.start, query.end);
  }
}
