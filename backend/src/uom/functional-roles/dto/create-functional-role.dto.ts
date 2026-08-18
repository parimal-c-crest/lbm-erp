import { IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFunctionalRoleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
