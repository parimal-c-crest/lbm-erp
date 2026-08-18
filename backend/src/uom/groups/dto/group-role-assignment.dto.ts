import { IsUUID } from 'class-validator';

export class GroupRoleAssignmentDto {
  @IsUUID()
  roleId!: string;

  @IsUUID()
  typeId!: string;
}
