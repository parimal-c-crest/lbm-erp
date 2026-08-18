import { IsBoolean } from 'class-validator';

export class TwoFactorRequirementDto {
  @IsBoolean()
  required!: boolean;
}
