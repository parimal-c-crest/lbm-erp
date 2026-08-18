import { IsUUID } from 'class-validator';

// Transfer-target selection required before a delete fires (BR-001) — every User/Role/Profile/
// Group delete shares this same contract.
export class DeleteUserDto {
  @IsUUID()
  transferToUserId!: string;
}
