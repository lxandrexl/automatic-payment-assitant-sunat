import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

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
  @Prop({ default: '' }) notes!: string;
}

export type PeriodDocument = HydratedDocument<Period>;
export const PeriodSchema = SchemaFactory.createForClass(Period);
