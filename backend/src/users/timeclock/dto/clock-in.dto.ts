import { IsIn, IsOptional, IsString } from 'class-validator';

export class ClockInDto {
  @IsOptional()
  @IsString()
  task?: string;

  @IsOptional()
  @IsIn(['working', 'break', 'lunch'])
  laborStatus?: 'working' | 'break' | 'lunch';
}
