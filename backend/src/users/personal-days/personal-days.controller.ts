import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import type { JwtPayload } from '../../auth/jwt.strategy';

import { SubmitPersonalDayDto } from './dto/submit-personal-day.dto';
import { PersonalDaysService } from './personal-days.service';

// `docs-kit/5-modules/users/8-api.md` §3 POST /personal-days — self-service, own record only.
@ApiTags('Personal Days')
@Controller('personal-days')
export class PersonalDaysController {
  constructor(private readonly personalDays: PersonalDaysService) {}

  @Post()
  submit(@Body() dto: SubmitPersonalDayDto, @Req() req: Request & { user?: JwtPayload }) {
    return this.personalDays.submit(req.user!.sub, dto);
  }
}
