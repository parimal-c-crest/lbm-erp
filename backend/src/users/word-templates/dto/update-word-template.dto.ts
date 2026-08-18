import { IsOptional, IsString } from 'class-validator';

export class UpdateWordTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  content?: string;
}
