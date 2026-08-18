import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class LoginHistoryQueryDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
