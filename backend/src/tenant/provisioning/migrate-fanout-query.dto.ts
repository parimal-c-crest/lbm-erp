import { IsIn, IsOptional } from 'class-validator';

import type { TenantType } from '../../generated/prisma/enums';

export class MigrateFanoutQueryDto {
  @IsOptional()
  @IsIn(['live', 'demo', 'testing'])
  type?: TenantType;
}
