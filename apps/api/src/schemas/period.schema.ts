import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// Pago de UN formulario del mes (F.621 o F.616): se presentan y pagan por separado.
@Schema({ _id: false })
export class FormPayment {
  @Prop({ required: true }) paidAt!: Date;
  @Prop({ required: true }) amountCents!: number; // lo realmente pagado (puede ser 0 si cubrió la detracción)
  @Prop({ default: '' }) ref!: string; // N.º de operación / orden
}
const FormPaymentSchema = SchemaFactory.createForClass(FormPayment);

@Schema({ timestamps: true, collection: 'periods' })
export class Period {
  @Prop({ required: true }) _id!: string; // "YYYY-MM"
  @Prop({ required: true }) year!: number;
  @Prop({ required: true }) month!: number;
  @Prop({ required: true }) dueDate!: Date;
  @Prop({ required: true, enum: ['OFFICIAL', 'ESTIMATED'] })
  dueDateSource!: 'OFFICIAL' | 'ESTIMATED';
  @Prop({ default: 'OPEN', enum: ['OPEN', 'DECLARED', 'PAID'] })
  status!: 'OPEN' | 'DECLARED' | 'PAID';
  @Prop({ type: Date, default: null }) declaredAt!: Date | null;
  @Prop({ type: String, default: null }) paymentRef!: string | null;
  @Prop({ type: FormPaymentSchema, default: null }) f621Payment!: FormPayment | null;
  @Prop({ type: FormPaymentSchema, default: null }) f616Payment!: FormPayment | null;
  @Prop({ default: '' }) notes!: string;
}

export type PeriodDocument = HydratedDocument<Period>;
export const PeriodSchema = SchemaFactory.createForClass(Period);
