import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const PURCHASE_CATEGORIES = [
  'EQUIPO',
  'SOFTWARE_CLOUD',
  'INTERNET',
  'CELULAR',
  'CONTADOR',
  'OFICINA',
  'OTROS',
] as const;
export type PurchaseCategory = (typeof PURCHASE_CATEGORIES)[number];

@Schema({ timestamps: true, collection: 'purchases' })
export class Purchase {
  @Prop({ required: true, index: true }) period!: string;
  @Prop({ required: true }) issueDate!: Date;
  @Prop({ required: true }) supplierName!: string;
  @Prop({ required: true }) supplierRuc!: string;
  @Prop({ required: true }) series!: string;
  @Prop({ required: true }) number!: string;
  @Prop({ default: '' }) concept!: string;
  @Prop({ required: true, enum: PURCHASE_CATEGORIES }) category!: PurchaseCategory;
  @Prop({ required: true }) baseCents!: number;
  @Prop({ required: true }) igvCents!: number;
  @Prop({ required: true }) totalCents!: number;
  @Prop({ default: true }) creditFiscal!: boolean;
  @Prop({ default: true }) deductibleIR!: boolean;
  @Prop({ default: false }) bancarizado!: boolean;
  @Prop({ default: '' }) notes!: string;
}

export type PurchaseDocument = HydratedDocument<Purchase>;
export const PurchaseSchema = SchemaFactory.createForClass(Purchase);
