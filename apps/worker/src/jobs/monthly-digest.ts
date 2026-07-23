import { todayLimaIso } from '@tributo/core';
import { monthlyDigestMsg } from '@tributo/notify';
import { calcSettingsOf, InvoiceModel, PeriodModel, PurchaseModel, SettingsModel, summaryOf } from '../db';
import { sendOnce } from '../notify';
import { logger } from '../logger';

// SPEC §6 monthly-digest — día 1, 09:00. Resumen del mes anterior + checklist implícito.
export async function monthlyDigest(): Promise<void> {
  const today = todayLimaIso();
  const [y, m] = today.split('-').map(Number);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;

  const settings = await SettingsModel.findById('singleton').lean();
  if (!settings) return;
  const calc = calcSettingsOf(settings as never);

  const [invoices, purchases, period, summary] = await Promise.all([
    InvoiceModel.find({ period: prev, kind: 'FACTURA', status: { $ne: 'VOIDED' } }).lean(),
    PurchaseModel.find({ period: prev }).lean(),
    PeriodModel.findById(prev).lean(),
    summaryOf(prev, calc),
  ]);

  const msg = monthlyDigestMsg({
    prevPeriod: prev,
    facturadoCents: invoices.reduce((a, i) => a + (i.baseCents ?? 0), 0),
    comprasCents: purchases.reduce((a, p) => a + (p.baseCents ?? 0), 0),
    igvPagarCents: summary.igvPagarCents,
    declaracionStatus: period?.status ?? 'sin periodo',
  });
  const sent = await sendOnce(`digest:${prev}`, 'MONTHLY_DIGEST', msg);
  if (sent) logger.info({ prev }, 'resumen mensual enviado');
}
