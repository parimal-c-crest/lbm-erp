import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';

// Run history filters (design doc §7 — "filterable by job/tenant/date/status").
export class JobRunQueryDto {
  @IsOptional()
  @IsString()
  jobDefinitionId?: string;

  @IsOptional()
  @IsString()
  tenantSubdomain?: string;

  @IsOptional()
  @IsIn(['running', 'success', 'failure', 'timeout'])
  status?: 'running' | 'success' | 'failure' | 'timeout';

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
