// Seed de datos de ejemplo (SPEC §9.5): settings + periodo 2026-07 + factura tipo + RxH tipo.
// Todo marcado notes:"SEED". Idempotente (upsert por claves naturales).
//   pnpm seed   (desde la raíz)

import mongoose, { Types } from 'mongoose';
import {
  computeFactura,
  computeRxh,
  detraccionDepositDueDate,
  limaIsoToDate,
} from '@tributo/core';
import { InvoiceModel, PeriodModel, SettingsModel, connect } from './db';

const CALC = {
  igvRate: 0.18,
  detraccionRate: 0.12,
  detraccionThresholdCents: 70000,
  pagoCuentaRate: 0.01,
  retencion4taRate: 0.08,
};

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI es requerido');
  await connect(uri);

  const clienteFacturaId = new Types.ObjectId();
  const clienteRxhId = new Types.ObjectId();

  await SettingsModel.updateOne(
    { _id: 'singleton' },
    {
      $set: {
        ruc: process.env.RUC ?? '10727357730',
        rucLastDigit: Number(process.env.RUC_LAST_DIGIT ?? 0),
        regimen: 'RMT',
        uitCents: 550000,
        igvRate: 0.18,
        detraccionRate: 0.12,
        detraccionThresholdCents: 70000,
        detraccionCode: '037',
        pagoCuentaRate: 0.01,
        retencion4taRate: 0.08,
        otrosGastosCents: 0,
        bnDetraccionAccount: null,
        clients: [
          { _id: clienteFacturaId, name: 'Cliente Empresa', ruc: '20123456789', kind: 'FACTURA', defaultBaseCents: 900000 },
          { _id: clienteRxhId, name: 'Cliente RxH', ruc: '20555555555', kind: 'RXH', defaultBaseCents: 900000 },
        ],
        notify: { telegramChatId: '', email: '', reminderDaysBefore: [3, 1], dailyDigest: false },
      },
    },
    { upsert: true },
  );

  await PeriodModel.updateOne(
    { _id: '2026-07' },
    {
      $set: {
        year: 2026,
        month: 7,
        dueDate: limaIsoToDate('2026-08-18'),
        dueDateSource: 'OFFICIAL',
        status: 'OPEN',
        notes: 'SEED',
      },
    },
    { upsert: true },
  );

  // Factura tipo: 9,000 + IGV → 10,620; detracción 1,274.40 / depósito 1,274.
  const f = computeFactura(900000, CALC);
  await InvoiceModel.updateOne(
    { period: '2026-07', kind: 'FACTURA', series: 'E001', number: 'SEED-1' },
    {
      $set: {
        clientId: clienteFacturaId,
        issueDate: limaIsoToDate('2026-07-20'),
        baseCents: 900000,
        igvCents: f.igvCents,
        totalCents: f.totalCents,
        detraccion: f.detraccion
          ? {
              applies: true,
              amountCents: f.detraccion.amountCents,
              exactAmountCents: f.detraccion.exactAmountCents,
              depositDueDate: limaIsoToDate(detraccionDepositDueDate('2026-07-20')),
              depositedAt: null,
              constanciaNumber: null,
              status: 'PENDING',
            }
          : null,
        retencion: null,
        status: 'ISSUED',
        notes: 'SEED',
      },
    },
    { upsert: true },
  );

  // RxH tipo: 9,000 brutos → retención 720.
  const r = computeRxh(900000, CALC);
  await InvoiceModel.updateOne(
    { period: '2026-07', kind: 'RXH', series: 'E001', number: 'SEED-R1' },
    {
      $set: {
        clientId: clienteRxhId,
        issueDate: limaIsoToDate('2026-07-15'),
        baseCents: 900000,
        igvCents: 0,
        totalCents: 900000,
        detraccion: null,
        retencion: { amountCents: r.retencionCents },
        status: 'ISSUED',
        notes: 'SEED',
      },
    },
    { upsert: true },
  );

  console.log('Seed OK: settings + periodo 2026-07 + factura tipo (1,274.40) + RxH tipo (720).');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed falló:', err);
  process.exit(1);
});
