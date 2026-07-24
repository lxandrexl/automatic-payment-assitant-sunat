// Acceso a Mongo del worker (mongoose directo). Los schemas son un contrato COMPARTIDO
// con apps/api (mismas colecciones); aquí solo se declaran los campos que el worker toca.
// La matemática tributaria NO se duplica: viene de @tributo/core.

import mongoose, { Schema } from 'mongoose';
import {
  computeChainedSummaries,
  type CalcSettings,
  type PeriodData,
  type PeriodSummary,
} from '@tributo/core';

// --- Settings (singleton) ---
const settingsSchema = new Schema(
  {
    _id: String,
    ruc: String,
    rucLastDigit: Number,
    uitCents: Number,
    igvRate: Number,
    detraccionRate: Number,
    detraccionThresholdCents: Number,
    pagoCuentaRate: Number,
    retencion4taRate: Number,
    otrosGastosCents: Number,
    gastos3UitCents: Number,
    notify: {
      telegramChatId: String,
      email: String,
      reminderDaysBefore: [Number],
      dailyDigest: Boolean,
    },
  },
  { strict: false, collection: 'settings' },
);
export const SettingsModel = mongoose.model('Settings', settingsSchema);

// --- Period ---
const periodSchema = new Schema(
  {
    _id: String,
    year: Number,
    month: Number,
    dueDate: Date,
    dueDateSource: String,
    status: String,
    declaredAt: Date,
  },
  { strict: false, collection: 'periods' },
);
export const PeriodModel = mongoose.model('Period', periodSchema);

// --- Invoice ---
const invoiceSchema = new Schema(
  {
    period: String,
    kind: String,
    baseCents: Number,
    igvCents: Number,
    status: String,
    detraccion: {
      amountCents: Number,
      depositDueDate: Date,
      depositedAt: Date,
      status: String,
    },
    retencion: { amountCents: Number },
  },
  { strict: false, collection: 'invoices' },
);
export const InvoiceModel = mongoose.model('Invoice', invoiceSchema);

// --- Purchase ---
const purchaseSchema = new Schema(
  { period: String, baseCents: Number, igvCents: Number, creditFiscal: Boolean },
  { strict: false, collection: 'purchases' },
);
export const PurchaseModel = mongoose.model('Purchase', purchaseSchema);

// --- Alert (idempotencia por dedupeKey único) ---
const alertSchema = new Schema(
  {
    dedupeKey: { type: String, unique: true },
    type: String,
    channel: String,
    sentAt: Date,
    payloadPreview: String,
  },
  { collection: 'alerts', timestamps: { createdAt: true, updatedAt: false } },
);
export const AlertModel = mongoose.model('Alert', alertSchema);

export async function connect(uri: string): Promise<void> {
  await mongoose.connect(uri);
  await AlertModel.init(); // asegura el índice único antes de operar
}

export function calcSettingsOf(s: {
  igvRate: number;
  detraccionRate: number;
  detraccionThresholdCents: number;
  pagoCuentaRate: number;
  retencion4taRate: number;
}): CalcSettings {
  return {
    igvRate: s.igvRate,
    detraccionRate: s.detraccionRate,
    detraccionThresholdCents: s.detraccionThresholdCents,
    pagoCuentaRate: s.pagoCuentaRate,
    retencion4taRate: s.retencion4taRate,
  };
}

/** Summary de un periodo con arrastre de saldo en cadena (delega en @tributo/core). */
export async function summaryOf(period: string, calc: CalcSettings): Promise<PeriodSummary> {
  const periods = await PeriodModel.find({ _id: { $lte: period } })
    .sort({ _id: 1 })
    .lean();
  const data: PeriodData[] = [];
  for (const p of periods) {
    const [invoices, purchases] = await Promise.all([
      InvoiceModel.find({ period: p._id }).lean(),
      PurchaseModel.find({ period: p._id }).lean(),
    ]);
    data.push({
      period: p._id as string,
      invoices: invoices.map((i) => ({
        kind: i.kind as 'FACTURA' | 'RXH',
        status: i.status as 'ISSUED' | 'PAID' | 'VOIDED',
        baseCents: i.baseCents ?? 0,
        igvCents: i.igvCents ?? 0,
        detraccion: i.detraccion
          ? {
              status: i.detraccion.status as 'PENDING' | 'DEPOSITED' | 'OVERDUE',
              amountCents: i.detraccion.amountCents ?? 0,
            }
          : null,
        retencionCents: i.retencion?.amountCents ?? 0,
      })),
      purchases: purchases.map((p2) => ({
        baseCents: p2.baseCents ?? 0,
        igvCents: p2.igvCents ?? 0,
        creditFiscal: p2.creditFiscal ?? true,
      })),
    });
  }
  const all = computeChainedSummaries(data, calc);
  return all.get(period) ?? computeChainedSummaries([{ period, invoices: [], purchases: [] }], calc).get(period)!;
}
