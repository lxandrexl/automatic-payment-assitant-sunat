import { getDueDate, limaIsoToDate, parsePeriod, todayLimaIso } from '@tributo/core';
import { PeriodModel, SettingsModel } from '../db';
import { logger } from '../logger';

// SPEC §6 period-bootstrap — día 1, 01:00. Crea el periodo del mes que inicia si no existe.
export async function periodBootstrap(): Promise<void> {
  const period = todayLimaIso().slice(0, 7);
  if (await PeriodModel.findById(period).lean()) return;
  const settings = await SettingsModel.findById('singleton').lean();
  const digit = settings?.rucLastDigit ?? 0;
  const { year, month } = parsePeriod(period);
  const { date, source } = getDueDate(period, digit);
  await PeriodModel.create({
    _id: period,
    year,
    month,
    dueDate: limaIsoToDate(date),
    dueDateSource: source,
    status: 'OPEN',
  });
  logger.info({ period, dueDate: date }, 'periodo creado por bootstrap');
}
