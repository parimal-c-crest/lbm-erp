import { IsEmail, IsIn, IsString, Matches, MinLength } from 'class-validator';

import type { TenantType } from '../../generated/prisma/enums';

// Subdomain becomes a Postgres database name segment — lowercase alphanumeric + hyphen only,
// starting with a letter, matching real subdomain conventions (ADR-056: `wbc`, `npl`, `pmi`).
const SUBDOMAIN_PATTERN = /^[a-z][a-z0-9-]{1,30}$/;

export class ProvisionTenantDto {
  @IsString()
  @Matches(SUBDOMAIN_PATTERN, {
    message: 'subdomain must be lowercase alphanumeric/hyphen, starting with a letter',
  })
  subdomain!: string;

  @IsIn(['live', 'demo', 'testing'])
  type!: TenantType;

  @IsEmail()
  superAdminEmail!: string;

  @IsString()
  @MinLength(8)
  superAdminPassword!: string;
}
