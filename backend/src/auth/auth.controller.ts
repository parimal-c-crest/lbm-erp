import { Body, Controller, Post } from '@nestjs/common';

import { Public } from '../common/decorators/public.decorator';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { VerifyTwoFactorDto } from './dto/verify-two-factor.dto';

// `docs-kit/5-modules/users/8-api.md` §3 — `/auth/login`, `/auth/2fa/verify` are the one
// public, pre-authentication route pair (`4-ui/1-navigation.md` §19); `/auth/logout` requires an
// existing session, so it's not `@Public()`.
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password);
  }

  @Public()
  @Post('2fa/verify')
  verifyTwoFactor(@Body() dto: VerifyTwoFactorDto) {
    return this.auth.verifyTwoFactor(dto.challengeToken, dto.code);
  }

  @Post('logout')
  logout() {
    // Stateless JWT bearer auth (`4-ui/8-frontend-development-standards.md` §18) — no
    // server-side session store to invalidate; the client discards its tokens.
    return { ok: true };
  }
}
