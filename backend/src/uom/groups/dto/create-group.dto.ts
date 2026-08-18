import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { GroupConversionFactorDto } from './group-conversion-factor.dto';
import { GroupPickingHierarchyDto } from './group-picking-hierarchy.dto';
import { GroupRoleAssignmentDto } from './group-role-assignment.dto';

// One atomic request shape for Group + Role Assignments + Conversion Factors (+ Picking
// Hierarchy) — `8-api.md` POST/PATCH `/uom/groups`. Splitting these into separate calls would
// reopen the exact race BR-019's completeness validation exists to close.
export class CreateGroupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsUUID()
  baseTypeId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupRoleAssignmentDto)
  roleAssignments!: GroupRoleAssignmentDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupConversionFactorDto)
  conversionFactors!: GroupConversionFactorDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupPickingHierarchyDto)
  pickingHierarchy?: GroupPickingHierarchyDto[];
}
