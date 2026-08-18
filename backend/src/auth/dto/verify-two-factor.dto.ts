import { IsString } from 'class-validator';

export class VerifyTwoFactorDto {
  // Short-lived signed challenge token returned by `POST /auth/login` when 2FA is required —
  // binds this verification to that specific login attempt (not a raw userId, security review
  // finding: missing session binding on 2FA).
  @IsString()
  challengeToken!: string;

  @IsString()
  code!: string;
}
