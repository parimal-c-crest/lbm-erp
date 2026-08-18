import { IsString } from 'class-validator';

export class CreateWordTemplateDto {
  @IsString()
  name!: string;

  @IsString()
  content!: string;
}
