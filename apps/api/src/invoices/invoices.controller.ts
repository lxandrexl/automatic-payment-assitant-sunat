import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateInvoiceDto, DetraccionDepositDto, UpdateInvoiceDto } from './invoices.dto';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get()
  list(@Query('period') period?: string) {
    return this.service.list(period);
  }

  @Post()
  create(@Body() dto: CreateInvoiceDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/detraccion-deposit')
  deposit(@Param('id') id: string, @Body() dto: DetraccionDepositDto) {
    return this.service.registerDetraccionDeposit(id, dto);
  }

  @Delete(':id')
  void(@Param('id') id: string) {
    return this.service.void(id);
  }
}
