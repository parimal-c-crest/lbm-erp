import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class OverrideTimeClockDto {
  @IsUUID()
  recordId!: string;

  @IsDateString()
  clockIn!: string;

  @IsOptional()
  @IsDateString()
  clockOut?: string;
}
