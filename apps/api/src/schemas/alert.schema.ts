import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'alerts' })
export class Alert {
  // Idempotencia (SPEC §3.5): índice único + upsert; duplicado → no se reenvía.
  @Prop({ required: true, unique: true }) dedupeKey!: string;
  @Prop({
    required: true,
    enum: [
      'DUE_REMINDER',
      'BUZON_SOL',
      'DETRACCION_PENDING',
      'DETRACCION_OVERDUE',
      'MONTHLY_DIGEST',
      'SYSTEM',
    ],
  })
  type!: string;
  @Prop({ required: true, enum: ['TELEGRAM', 'EMAIL'] }) channel!: 'TELEGRAM' | 'EMAIL';
  @Prop({ required: true }) sentAt!: Date;
  @Prop({ default: '' }) payloadPreview!: string;
}

export type AlertDocument = HydratedDocument<Alert>;
export const AlertSchema = SchemaFactory.createForClass(Alert);
