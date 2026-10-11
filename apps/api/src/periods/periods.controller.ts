import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { type PayableForm, PeriodsService } from './periods.service';

class DeclareDto {
  @IsOptional() @IsString() declaredAt?: string;
  @IsOptional() @IsString() paymentRef?: string;
}

class PaymentDto {
  @IsString() paidAt!: string; // YYYY-MM-DD
  @IsInt() @Min(0) amountCents!: number;
  @IsOptional() @IsString() ref?: string;
}

function asForm(form: string): PayableForm {
  if (form !== 'f621' && form !== 'f616') throw new BadRequestException('Formulario inválido (f621 | f616)');
  return form;
}

@Controller('periods')
export class PeriodsController {
  constructor(private readonly service: PeriodsService) {}

  @Get()
  list(@Query('year') year?: string) {
    return this.service.listByYear(Number(year ?? new Date().getFullYear()));
  }

  @Post('recompute-due-dates')
  recompute() {
    return this.service.recomputeDueDates();
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Post(':id/payments/:form')
  pay(@Param('id') id: string, @Param('form') form: string, @Body() dto: PaymentDto) {
    return this.service.registerPayment(id, asForm(form), dto);
  }

  @Delete(':id/payments/:form')
  unpay(@Param('id') id: string, @Param('form') form: string) {
    return this.service.clearPayment(id, asForm(form));
  }

  @Post(':id/declare')
  declare(@Param('id') id: string, @Body() dto: DeclareDto) {
    return this.service.declare(id, dto.declaredAt, dto.paymentRef);
  }
}
