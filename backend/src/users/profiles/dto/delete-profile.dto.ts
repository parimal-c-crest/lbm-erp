import { IsUUID } from 'class-validator';

export class DeleteProfileDto {
  @IsUUID()
  transferToProfileId!: string;
}
