import { IsInt, Min, IsUUID } from 'class-validator';

export class GroupPickingHierarchyDto {
  @IsUUID()
  typeId!: string;

  @IsInt()
  @Min(0)
  sortOrder!: number;
}
