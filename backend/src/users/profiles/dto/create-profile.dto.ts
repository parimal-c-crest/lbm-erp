import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';

import { PERMISSION_ACTIONS, PERMISSION_MODULES } from '../../permissions/permission-catalog';

export class PermissionGrantDto {
  @IsIn(PERMISSION_MODULES)
  module!: string;

  @IsIn(PERMISSION_ACTIONS)
  action!: string;

  @IsBoolean()
  granted!: boolean;
}

export class CreateProfileDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Every permission explicitly set — no fail-open default (ADR-156). Any module/action combo
  // not listed here defaults to `granted: false`, never silently `true`.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionGrantDto)
  permissions?: PermissionGrantDto[];
}
