import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateNotificationSchedulerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  cronExpression?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
