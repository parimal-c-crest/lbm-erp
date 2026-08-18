import { IsUUID } from 'class-validator';

export class DeleteGroupDto {
  @IsUUID()
  transferToGroupId!: string;
}
