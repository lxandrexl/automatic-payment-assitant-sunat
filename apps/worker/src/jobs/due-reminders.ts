import { dateToLimaIso, remindersToFire, todayLimaIso } from '@tributo/core';
import { dueReminderMsg } from '@tributo/notify';
import { calcSettingsOf, PeriodModel, SettingsModel, summaryOf } from '../db';
import { sendOnce } from '../notify';
import { logger } from '../logger';

// SPEC §6 due-reminders — 09:00. Recordatorios T-N y T-0 para periodos OPEN.
export async function dueReminders(): Promise<void> {
  const today = todayLimaIso();
  const settings = await SettingsModel.findById('singleton').lean();
  if (!settings) return;
  const reminderDays: number[] = settings.notify?.reminderDaysBefore ?? [3, 1];
  const calc = calcSettingsOf(settings as never);

  const openPeriods = await PeriodModel.find({ status: 'OPEN' }).lean();
  for (const p of openPeriods) {
    if (!p.dueDate || !p._id) continue;
    const periodId = p._id;
    const dueIso = dateToLimaIso(p.dueDate);
    const fire = remindersToFire(today, dueIso, reminderDays);
    if (fire.length === 0) continue;
    const summary = await summaryOf(periodId, calc);
    for (const n of fire) {
      const msg = dueReminderMsg({
        period: periodId,
        dueDateIso: dueIso,
        daysBefore: n,
        estimated: p.dueDateSource === 'ESTIMATED',
        igvPagarCents: summary.igvPagarCents,
        pagoCuentaCents: summary.pagoCuentaCents,
        npsEstimadoCents: summary.npsEstimadoCents,
        pago616Cents: summary.pago616Cents,
      });
      const sent = await sendOnce(`due:${periodId}:T-${n}`, 'DUE_REMINDER', msg);
      if (sent) logger.info({ period: periodId, n }, 'recordatorio de vencimiento enviado');
    }
  }
}
