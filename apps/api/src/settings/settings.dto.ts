import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class ClientDto {
  // Presente al editar la lista: preserva la referencia de comprobantes ya emitidos.
  @IsOptional() @IsString() _id?: string;
  @IsString() name!: string;
  @IsString() ruc!: string;
  @IsIn(['FACTURA', 'RXH']) kind!: 'FACTURA' | 'RXH';
  @IsInt() @Min(0) defaultBaseCents!: number;
  @IsOptional() @IsBoolean() domiciliado?: boolean;
  @IsOptional() @IsIn(['PEN', 'USD']) currency?: 'PEN' | 'USD';
  @IsOptional() @IsNumber() @Min(0) @Max(1) retencionExteriorRate?: number;
}

class NotifyDto {
  @IsOptional() @IsString() telegramChatId?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsArray() @IsInt({ each: true }) reminderDaysBefore?: number[];
  @IsOptional() @IsBoolean() dailyDigest?: boolean;
}

export class UpdateSettingsDto {
  @IsOptional() @IsInt() @Min(0) uitCents?: number;
  @IsOptional() @IsInt() @Min(0) otrosGastosCents?: number;
  @IsOptional() @IsInt() @Min(0) gastos3UitCents?: number;
  @IsOptional() @IsString() bnDetraccionAccount?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ClientDto)
  clients?: ClientDto[];
  @IsOptional() @ValidateNested() @Type(() => NotifyDto) notify?: NotifyDto;
}
