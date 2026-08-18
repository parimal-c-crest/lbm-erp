import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpsertMailAccountDto {
  @IsString()
  displayName!: string;

  @IsEmail()
  replyToEmail!: string;

  @IsOptional()
  @IsString()
  signature?: string;
}
