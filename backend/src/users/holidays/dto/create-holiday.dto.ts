import { IsArray, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateHolidayDto {
  @IsString()
  name!: string;

  @IsISO8601()
  date!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  userIds?: string[];
}
