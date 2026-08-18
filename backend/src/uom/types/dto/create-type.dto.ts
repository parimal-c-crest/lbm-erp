import { IsInt, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateTypeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  // Optional — a Type may declare which Category it belongs to but is never required to
  // (ADR-192, resolving UOM-FX-OQ-001).
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
