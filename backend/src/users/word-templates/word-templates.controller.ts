import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

import { CreateWordTemplateDto } from './dto/create-word-template.dto';
import { UpdateWordTemplateDto } from './dto/update-word-template.dto';
import { WordTemplatesService } from './word-templates.service';

@ApiTags('Word Templates')
@Controller('word-templates')
@UseGuards(RolesGuard)
@Roles('Admin')
export class WordTemplatesController {
  constructor(private readonly wordTemplates: WordTemplatesService) {}

  @Get()
  list() {
    return this.wordTemplates.list();
  }

  @Post()
  create(@Body() dto: CreateWordTemplateDto) {
    return this.wordTemplates.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWordTemplateDto) {
    return this.wordTemplates.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.wordTemplates.remove(id);
  }
}
