import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateInvoiceDto {
  @IsIn(['FACTURA', 'RXH']) kind!: 'FACTURA' | 'RXH';
  @IsString() clientId!: string;
  @IsString() series!: string;
  @IsString() number!: string;
  @IsString() issueDate!: string; // ISO date
  @IsInt() @Min(0) baseCents!: number;
  // RxH en moneda extranjera: bruto en céntimos de esa moneda + tipo de cambio.
  // Si vienen, el servidor recalcula baseCents (soles) a partir de ellos.
  @IsOptional() @IsInt() @Min(0) foreignGrossCents?: number;
  @IsOptional() @IsNumber() @Min(0.0001) exchangeRate?: number;
}

export class UpdateInvoiceDto {
  @IsOptional() @IsString() paidAt?: string;
  @IsOptional() @IsIn(['ISSUED', 'PAID', 'VOIDED']) status?: 'ISSUED' | 'PAID' | 'VOIDED';
}

export class DetraccionDepositDto {
  @IsString() depositedAt!: string;
  @IsString() constanciaNumber!: string;
  @IsInt() @Min(0) amountCents!: number;
}
