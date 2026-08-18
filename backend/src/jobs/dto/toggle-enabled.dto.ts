import { IsBoolean } from 'class-validator';

export class ToggleEnabledDto {
  @IsBoolean()
  enabled!: boolean;
}
