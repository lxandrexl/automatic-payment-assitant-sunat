import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { PeriodsService } from './periods.service';

class DeclareDto {
  @IsOptional() @IsString() declaredAt?: string;
  @IsOptional() @IsString() paymentRef?: string;
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

  @Post(':id/declare')
  declare(@Param('id') id: string, @Body() dto: DeclareDto) {
    return this.service.declare(id, dto.declaredAt, dto.paymentRef);
  }
}
