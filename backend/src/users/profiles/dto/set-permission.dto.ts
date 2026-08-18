import { IsBoolean, IsIn } from 'class-validator';

import { PERMISSION_ACTIONS, PERMISSION_MODULES } from '../../permissions/permission-catalog';

export class SetPermissionDto {
  @IsIn(PERMISSION_MODULES)
  module!: string;

  @IsIn(PERMISSION_ACTIONS)
  action!: string;

  @IsBoolean()
  granted!: boolean;
}
