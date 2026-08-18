import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { RolesGuard } from '../../common/guards/roles.guard';

import { ConversionService } from './conversion.service';
import { ResolveConversionDto } from './dto/resolve-conversion.dto';

// Any authenticated consuming-module caller (`8-api.md` `POST /uom/conversions/resolve`).
@ApiTags('UOM')
@Controller('uom/conversions')
@UseGuards(RolesGuard)
export class ConversionController {
  constructor(private readonly conversion: ConversionService) {}

  @Post('resolve')
  resolve(@Body() dto: ResolveConversionDto) {
    return this.conversion.resolve(dto);
  }
}
