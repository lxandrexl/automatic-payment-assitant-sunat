import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreatePurchaseDto, UpdatePurchaseDto } from './purchases.dto';
import { PurchasesService } from './purchases.service';

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly service: PurchasesService) {}

  @Get()
  list(@Query('period') period?: string) {
    return this.service.list(period);
  }

  @Post()
  create(@Body() dto: CreatePurchaseDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
