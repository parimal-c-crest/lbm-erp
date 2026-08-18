import { IsUUID } from 'class-validator';

export class DeleteRoleDto {
  @IsUUID()
  transferToRoleId!: string;
}
