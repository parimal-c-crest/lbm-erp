import { IsIn, IsISO8601, IsInt, IsOptional, IsString, Matches } from 'class-validator';

const TIME_PATTERN = /^\d{2}:\d{2}$/;

export class SubmitPersonalDayDto {
  @IsIn(['holiday', 'personal', 'sick', 'vacation'])
  hoursType!: 'holiday' | 'personal' | 'sick' | 'vacation';

  @IsISO8601()
  startDate!: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsOptional()
  @IsInt()
  dayCount?: number;

  @IsOptional()
  @Matches(TIME_PATTERN)
  startTime?: string;

  @IsOptional()
  @Matches(TIME_PATTERN)
  endTime?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
