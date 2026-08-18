import { IsOptional, IsUUID } from 'class-validator';

export class ReparentRoleDto {
  @IsOptional()
  @IsUUID()
  parentRoleId?: string | null;
}
