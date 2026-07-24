import {
  computeAnnualRenta4ta,
  computeAnnualProjection,
  remindersToFire,
  todayLimaIso,
  upcomingRentaAnual,
} from '@tributo/core';
import { rentaAnualReminderMsg } from '@tributo/notify';
import { calcSettingsOf, InvoiceModel, PurchaseModel, SettingsModel } from '../db';
import { sendOnce } from '../notify';
import { logger } from '../logger';

// Recordatorio de la DJ Anual del IR. Corre a diario junto con due-reminders;
// dispara a T-15 / T-7 / T-1 y el día del vencimiento (más aviso que el mensual).
const DIAS_ANTES_ANUAL = [15, 7, 1];

export async function rentaAnualReminder(): Promise<void> {
  const today = todayLimaIso();
  const settings = await SettingsModel.findById('singleton').lean();
  if (!settings) return;
  const digit = settings.rucLastDigit ?? 0;
  const up = upcomingRentaAnual(today, digit);
  const fire = remindersToFire(today, up.date, DIAS_ANTES_ANUAL);
  if (fire.length === 0) return;

  const calc = calcSettingsOf(settings as never);
  const uitCents = settings.uitCents ?? 550000;
  const gastos3UitCents = (settings as { gastos3UitCents?: number }).gastos3UitCents ?? 0;
  const from = new Date(Date.UTC(up.ejercicio, 0, 1, 5));
  const to = new Date(Date.UTC(up.ejercicio + 1, 0, 1, 5));
  const [facturas, purchases, rxhs] = await Promise.all([
    InvoiceModel.find({ period: rangoPeriodos(up.ejercicio), kind: 'FACTURA', status: { $ne: 'VOIDED' } }).lean(),
    PurchaseModel.find({ issueDate: { $gte: from, $lt: to }, deductibleIR: true }).lean(),
    InvoiceModel.find({ period: rangoPeriodos(up.ejercicio), kind: 'RXH', status: { $ne: 'VOIDED' } }).lean(),
  ]);

  const ventasBaseCents = facturas.reduce((a, i) => a + (i.baseCents ?? 0), 0);
  const proj3ra = computeAnnualProjection({
    ventasBaseCents,
    comprasDeduciblesCents: purchases.reduce((a, p) => a + (p.baseCents ?? 0), 0),
    otrosGastosCents: settings.otrosGastosCents ?? 0,
    pagosACuentaCents: Math.round(ventasBaseCents * calc.pagoCuentaRate),
    uitCents,
  });
  const proj4ta = computeAnnualRenta4ta({
    brutoAnualCents: rxhs.reduce((a, i) => a + (i.baseCents ?? 0), 0),
    retencionesCents: rxhs.reduce((a, i) => a + (i.retencion?.amountCents ?? 0), 0),
    pagosCuentaCents: 0,
    gastos3UitCents,
    uitCents,
  });

  for (const n of fire) {
    const msg = rentaAnualReminderMsg({
      ejercicio: up.ejercicio,
      dueDateIso: up.date,
      daysBefore: n,
      estimated: up.source === 'ESTIMATED',
      regularizacion3raCents: proj3ra.regularizacionEstimadaCents,
      saldo4taCents: proj4ta.saldoCents,
    });
    const sent = await sendOnce(`renta-anual:${up.ejercicio}:T-${n}`, 'DUE_REMINDER', msg);
    if (sent) logger.info({ ejercicio: up.ejercicio, n }, 'recordatorio DJ anual enviado');
  }
}

/** Regex de periodos "YYYY-MM" de un ejercicio, para las queries por period. */
function rangoPeriodos(year: number): { $regex: string } {
  return { $regex: `^${year}-` };
}
