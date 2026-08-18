import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateNotificationSchedulerDto {
  @IsString()
  name!: string;

  @IsString()
  cronExpression!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
