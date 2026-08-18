import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

import { CreateGroupDto } from '../../groups/dto/create-group.dto';

export class ImportGroupsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGroupDto)
  groups!: CreateGroupDto[];
}
