import { IsDateString, IsIn, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class ResolveConversionDto {
  @IsUUID()
  groupId!: string;

  @IsUUID()
  typeId!: string;

  @IsIn(['base_to_uom', 'uom_to_base'])
  direction!: 'base_to_uom' | 'uom_to_base';

  @IsIn(['qty', 'price'])
  kind!: 'qty' | 'price';

  @IsNumber()
  value!: number;

  @IsOptional()
  @IsDateString()
  asOfDate?: string;
}
