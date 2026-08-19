import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import type { AuthenticatedUser } from '../../auth/jwt.strategy';

import { UpsertMailAccountDto } from './dto/upsert-mail-account.dto';
import { MailAccountsService } from './mail-accounts.service';

@ApiTags('Mail Account')
@Controller('users/me/mail-account')
export class MailAccountsController {
  constructor(private readonly mailAccounts: MailAccountsService) {}

  @Get()
  findOwn(@Req() req: Request & { user?: AuthenticatedUser }) {
    return this.mailAccounts.findOwn(req.user!.internalId);
  }

  @Put()
  upsertOwn(@Body() dto: UpsertMailAccountDto, @Req() req: Request & { user?: AuthenticatedUser }) {
    return this.mailAccounts.upsertOwn(req.user!.internalId, dto);
  }
}
