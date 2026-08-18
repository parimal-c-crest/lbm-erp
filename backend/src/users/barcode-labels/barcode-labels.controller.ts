import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

import { BarcodeLabelsService } from './barcode-labels.service';
import { BarcodeLabelQueryDto } from './dto/barcode-label-query.dto';

@ApiTags('Barcode Labels')
@Controller('barcode-labels')
@UseGuards(RolesGuard)
@Roles('Admin')
export class BarcodeLabelsController {
  constructor(private readonly barcodeLabels: BarcodeLabelsService) {}

  @Get(':userId')
  generate(@Param('userId') userId: string, @Query() query: BarcodeLabelQueryDto) {
    return this.barcodeLabels.generate(userId, query.size);
  }
}
