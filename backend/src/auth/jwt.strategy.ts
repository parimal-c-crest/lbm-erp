import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { TenantContextService } from '../tenant/tenant-context.service';

// `sub` (user's `public_id` — a JWT is client-decodable, so per ADR-200 only the external UUID
// identity is ever placed in it, never the internal bigint `id`), `tenant` (subdomain,
// auditability only — isolation is physical per ADR-056), `role` — see
// `3-api/2-authentication.md` §8.
export interface JwtPayload {
  sub: string;
  tenant: string;
  role: string;
}

// Request-attached user shape after this strategy runs: the raw JWT payload plus `internalId`,
// the bigint resolved from `sub` (`public_id`) once per request here — the single point every
// controller/service reads for an audit-column (`created_by`/`updated_by`) actor value, so no
// individual write site re-resolves it (ADR-200's "one extra lookup per foreign reference", paid
// once per request instead of once per write).
export interface AuthenticatedUser extends JwtPayload {
  internalId: bigint;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly tenantContext: TenantContextService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.tenantContext.prisma.user.findUnique({
      where: { publicId: payload.sub },
      select: { id: true },
    });
    if (!user) throw new UnauthorizedException('Token no longer matches an existing user.');
    return { ...payload, internalId: user.id };
  }
}
