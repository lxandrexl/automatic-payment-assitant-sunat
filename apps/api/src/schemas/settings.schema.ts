import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema() // con _id propio (SPEC §3.1: clients[]._id ObjectId)
export class Client {
  _id!: Types.ObjectId;
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) ruc!: string;
  @Prop({ required: true, enum: ['FACTURA', 'RXH'] }) kind!: 'FACTURA' | 'RXH';
  @Prop({ required: true }) defaultBaseCents!: number;
  // false = cliente extranjero (ej. Chile): no es agente de retención → RxH sin 8%.
  @Prop({ default: true }) domiciliado!: boolean;
}
const ClientSchema = SchemaFactory.createForClass(Client);

@Schema({ _id: false })
export class NotifyPrefs {
  @Prop({ default: '' }) telegramChatId!: string;
  @Prop({ default: '' }) email!: string;
  @Prop({ type: [Number], default: [3, 1] }) reminderDaysBefore!: number[];
  @Prop({ default: false }) dailyDigest!: boolean;
}
const NotifyPrefsSchema = SchemaFactory.createForClass(NotifyPrefs);

@Schema({ timestamps: true, collection: 'settings' })
export class Settings {
  @Prop({ default: 'singleton' }) _id!: string;
  @Prop({ required: true }) ruc!: string;
  @Prop({ required: true }) rucLastDigit!: number;
  @Prop({ default: 'RMT' }) regimen!: string;
  @Prop({ default: 550000 }) uitCents!: number;
  @Prop({ default: 0.18 }) igvRate!: number;
  @Prop({ default: 0.12 }) detraccionRate!: number;
  @Prop({ default: 70000 }) detraccionThresholdCents!: number;
  @Prop({ default: '037' }) detraccionCode!: string;
  @Prop({ default: 0.01 }) pagoCuentaRate!: number;
  @Prop({ default: 0.08 }) retencion4taRate!: number;
  @Prop({ default: 0 }) otrosGastosCents!: number;
  // Gastos con deducción adicional de 4ta/5ta (tope 3 UIT), acreditados en el año.
  @Prop({ default: 0 }) gastos3UitCents!: number;
  @Prop({ type: String, default: null }) bnDetraccionAccount!: string | null;
  @Prop({ type: [ClientSchema], default: [] }) clients!: Client[];
  @Prop({ type: NotifyPrefsSchema, default: () => ({}) }) notify!: NotifyPrefs;
}

export type SettingsDocument = HydratedDocument<Settings>;
export const SettingsSchema = SchemaFactory.createForClass(Settings);
export const SETTINGS_ID = 'singleton';
