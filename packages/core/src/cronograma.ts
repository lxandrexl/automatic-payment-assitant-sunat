// Cronograma de vencimientos del F.621 (SPEC §4.1).
// Data oficial 2026 SOLO para el dígito 0 (la del SPEC). Para el resto de dígitos y para
// periodos sin tabla cargada se estima: siguiente día hábil >= día 16 del mes siguiente,
// con source ESTIMATED. Al publicarse una R.S. nueva se agrega la data aquí y
// POST /periods/recompute-due-dates recalcula los periodos OPEN estimados.

import { nextBusinessDayFrom, nthBusinessDayOfMonth } from './habiles';

export type DueDateSource = 'OFFICIAL' | 'ESTIMATED';

/** periodo "YYYY-MM" → { dígito RUC → fecha de vencimiento ISO } */
const OFICIAL: Record<string, Record<number, string>> = {
  '2026-01': { 0: '2026-02-16' },
  '2026-02': { 0: '2026-03-16' },
  '2026-03': { 0: '2026-04-17' },
  '2026-04': { 0: '2026-05-18' },
  '2026-05': { 0: '2026-06-15' },
  '2026-06': { 0: '2026-07-15' },
  '2026-07': { 0: '2026-08-18' },
  '2026-08': { 0: '2026-09-15' },
  '2026-09': { 0: '2026-10-16' },
  '2026-10': { 0: '2026-11-16' },
  '2026-11': { 0: '2026-12-17' },
  '2026-12': { 0: '2027-01-18' },
};

export function parsePeriod(period: string): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) throw new Error(`Periodo inválido: "${period}" (esperado YYYY-MM)`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) throw new Error(`Periodo inválido: "${period}" (mes fuera de rango)`);
  return { year, month };
}

/** Mes siguiente al periodo, como {year, month}. */
function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/** ¿Está cargada la tabla oficial de un año para el dígito dado? (watchdog de data) */
export function hasOfficialCronograma(year: number, digit: number): boolean {
  return OFICIAL[`${year}-01`]?.[digit] != null;
}

export function getDueDate(period: string, digit: number): { date: string; source: DueDateSource } {
  const official = OFICIAL[period]?.[digit];
  if (official) return { date: official, source: 'OFFICIAL' };
  const { year, month } = parsePeriod(period);
  const next = nextMonth(year, month);
  const day16 = `${next.year}-${String(next.month).padStart(2, '0')}-16`;
  return { date: nextBusinessDayFrom(day16), source: 'ESTIMATED' };
}

/** Fecha límite del depósito de detracción: 5.º día hábil del mes siguiente a la emisión (SPEC §4.3). */
export function detraccionDepositDueDate(issueDateIso: string): string {
  const { year, month } = parsePeriod(issueDateIso.slice(0, 7));
  const next = nextMonth(year, month);
  return nthBusinessDayOfMonth(next.year, next.month, 5);
}
