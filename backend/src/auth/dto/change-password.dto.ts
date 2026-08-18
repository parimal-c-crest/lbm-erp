import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

import { PASSWORD_MESSAGE, PASSWORD_PATTERN } from '../../users/dto/create-user.dto';

// Self-service and admin-reset password change, collapsed into one command (closes the legacy
// system's two divergent, differently-argument-ordered password-change paths, USR-RULE-009/010).
export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  oldPassword?: string;

  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  @MinLength(8)
  newPassword!: string;
}
