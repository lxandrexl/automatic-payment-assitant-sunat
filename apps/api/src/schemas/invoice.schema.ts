import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
export class Detraccion {
  @Prop({ required: true }) applies!: boolean;
  @Prop({ required: true }) amountCents!: number;
  @Prop({ required: true }) exactAmountCents!: number;
  @Prop({ required: true }) depositDueDate!: Date;
  @Prop({ type: Date, default: null }) depositedAt!: Date | null;
  @Prop({ type: String, default: null }) constanciaNumber!: string | null;
  // Referencia libre cuando no se tiene la constancia (p. ej. "usado en F.621 202608, orden …").
  @Prop({ default: '' }) reference!: string;
  @Prop({ default: 'PENDING', enum: ['PENDING', 'DEPOSITED', 'OVERDUE'] })
  status!: 'PENDING' | 'DEPOSITED' | 'OVERDUE';
}
const DetraccionSchema = SchemaFactory.createForClass(Detraccion);

@Schema({ _id: false })
export class Retencion {
  @Prop({ required: true }) amountCents!: number;
}
const RetencionSchema = SchemaFactory.createForClass(Retencion);

// RxH cobrado en moneda extranjera: montos en céntimos de ESA moneda. baseCents sigue en soles.
// Con qué tipo de cambio se hizo el cálculo y de dónde salió (trazabilidad).
@Schema({ _id: false })
export class RateInfo {
  @Prop({ required: true }) source!: string; // 'SUNAT (vía apis.net.pe)' | 'MANUAL'
  @Prop({ default: 'venta', enum: ['venta', 'compra'] }) kind!: 'venta' | 'compra';
  @Prop({ type: [String], default: [] }) dates!: string[]; // días hábiles promediados
  @Prop({ type: [Number], default: [] }) values!: number[];
  @Prop({ default: false }) provisional!: boolean; // mes aún en curso
}
const RateInfoSchema = SchemaFactory.createForClass(RateInfo);

@Schema({ _id: false })
export class Foreign {
  @Prop({ required: true, enum: ['USD'] }) currency!: 'USD';
  @Prop({ required: true }) grossCents!: number;
  @Prop({ required: true }) exchangeRate!: number;
  @Prop({ required: true }) withholdingCents!: number; // retenido en el exterior
  @Prop({ type: RateInfoSchema, default: null }) rateInfo!: RateInfo | null;
}
const ForeignSchema = SchemaFactory.createForClass(Foreign);

@Schema({ timestamps: true, collection: 'invoices' })
export class Invoice {
  @Prop({ required: true, index: true }) period!: string;
  @Prop({ required: true, enum: ['FACTURA', 'RXH'] }) kind!: 'FACTURA' | 'RXH';
  @Prop({ required: true }) series!: string;
  @Prop({ required: true }) number!: string;
  @Prop({ type: Types.ObjectId, required: true }) clientId!: Types.ObjectId;
  @Prop({ required: true }) issueDate!: Date;
  @Prop({ required: true }) baseCents!: number;
  @Prop({ required: true }) igvCents!: number;
  @Prop({ required: true }) totalCents!: number;
  @Prop({ type: DetraccionSchema, default: null }) detraccion!: Detraccion | null;
  @Prop({ type: RetencionSchema, default: null }) retencion!: Retencion | null;
  @Prop({ type: ForeignSchema, default: null }) foreign!: Foreign | null;
  @Prop({ type: Date, default: null }) paidAt!: Date | null;
  @Prop({ default: 'ISSUED', enum: ['ISSUED', 'PAID', 'VOIDED'] })
  status!: 'ISSUED' | 'PAID' | 'VOIDED';
}

export type InvoiceDocument = HydratedDocument<Invoice>;
export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
