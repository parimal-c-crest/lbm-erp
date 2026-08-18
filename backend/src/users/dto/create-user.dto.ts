import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

// Password complexity as a domain invariant at every password-set call site, no disable toggle
// (ADR-155: min 8 chars, 1 upper, 1 lower, 1 number, no special-character requirement).
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
export const PASSWORD_MESSAGE =
  'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number.';

export class CreateUserDto {
  @IsString()
  firstName!: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsString()
  username!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsString()
  defaultLocation?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsOptional()
  @IsBoolean()
  isSuperAdmin?: boolean;

  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  @MinLength(8)
  password!: string;
}
