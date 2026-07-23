import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateInvoiceDto {
  @IsIn(['FACTURA', 'RXH']) kind!: 'FACTURA' | 'RXH';
  @IsString() clientId!: string;
  @IsString() series!: string;
  @IsString() number!: string;
  @IsString() issueDate!: string; // ISO date
  @IsInt() @Min(0) baseCents!: number;
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
