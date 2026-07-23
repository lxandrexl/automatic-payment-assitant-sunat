import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { PURCHASE_CATEGORIES, type PurchaseCategory } from '../schemas/purchase.schema';

// RUC proveedor: 11 dígitos empezando 10|15|17|20 (SPEC §3.4).
const RUC_RE = /^(10|15|17|20)\d{9}$/;

export class CreatePurchaseDto {
  @IsString() issueDate!: string;
  @IsString() supplierName!: string;
  @Matches(RUC_RE, { message: 'RUC de proveedor inválido (11 dígitos, empieza 10|15|17|20)' })
  supplierRuc!: string;
  @IsString() series!: string;
  @IsString() number!: string;
  @IsOptional() @IsString() concept?: string;
  @IsIn(PURCHASE_CATEGORIES) category!: PurchaseCategory;
  @IsInt() @Min(0) baseCents!: number;
  @IsOptional() @IsInt() @Min(0) igvCents?: number;
  @IsOptional() @IsBoolean() creditFiscal?: boolean;
  @IsOptional() @IsBoolean() deductibleIR?: boolean;
  @IsOptional() @IsBoolean() bancarizado?: boolean;
  @IsOptional() @IsString() notes?: string;
}

export class UpdatePurchaseDto {
  @IsOptional() @IsString() concept?: string;
  @IsOptional() @IsIn(PURCHASE_CATEGORIES) category?: PurchaseCategory;
  @IsOptional() @IsInt() @Min(0) baseCents?: number;
  @IsOptional() @IsInt() @Min(0) igvCents?: number;
  @IsOptional() @IsBoolean() creditFiscal?: boolean;
  @IsOptional() @IsBoolean() deductibleIR?: boolean;
  @IsOptional() @IsBoolean() bancarizado?: boolean;
  @IsOptional() @IsString() notes?: string;
}
