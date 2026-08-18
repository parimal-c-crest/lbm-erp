import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class GroupMemberDto {
  @IsUUID()
  memberId!: string;

  @IsIn(['USER', 'ROLE', 'ROLE_AND_SUBORDINATES'])
  memberType!: 'USER' | 'ROLE' | 'ROLE_AND_SUBORDINATES';
}

export class CreateGroupDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => GroupMemberDto)
  members?: GroupMemberDto[];
}
