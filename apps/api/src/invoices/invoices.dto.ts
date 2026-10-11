import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class RateInfoDto {
  @IsString() source!: string;
  @IsOptional() @IsIn(['venta', 'compra']) kind?: 'venta' | 'compra';
  @IsArray() @IsString({ each: true }) dates!: string[];
  @IsArray() @IsNumber({}, { each: true }) values!: number[];
  @IsOptional() @IsBoolean() provisional?: boolean;
}

// Completa los datos en moneda extranjera de un RxH ya registrado (que quedó solo en soles).
export class CompleteForeignDto {
  @IsInt() @Min(0) foreignGrossCents!: number;
  @IsNumber() @Min(0.0001) exchangeRate!: number;
  @IsOptional() @ValidateNested() @Type(() => RateInfoDto) rateInfo?: RateInfoDto;
}

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
  @IsOptional() @ValidateNested() @Type(() => RateInfoDto) rateInfo?: RateInfoDto;
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
