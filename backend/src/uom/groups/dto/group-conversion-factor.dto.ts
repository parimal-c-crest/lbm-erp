import { IsInt, IsPositive, IsUUID } from 'class-validator';

export class GroupConversionFactorDto {
  @IsUUID()
  typeId!: string;

  // VR-011/BR-003/BR-004 — positive whole number.
  @IsInt()
  @IsPositive()
  unitsPerBase!: number;
}
