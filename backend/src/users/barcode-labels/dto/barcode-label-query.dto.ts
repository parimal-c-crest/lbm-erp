import { IsIn } from 'class-validator';

export const LABEL_SIZES = ['2x1', '3x2', '4x3'] as const;
export type LabelSize = (typeof LABEL_SIZES)[number];

export class BarcodeLabelQueryDto {
  @IsIn(LABEL_SIZES)
  size!: LabelSize;
}
