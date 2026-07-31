// Cronograma de vencimientos del F.621 (SPEC §4.1).
// Tabla oficial 2026 COMPLETA (todos los dígitos), transcrita de la página oficial
// https://www.sunat.gob.pe/orientacion/cronogramas/2026/cObligacionMensual2026.html
// (Base Legal: Anexo I, R.S. 281-2022/SUNAT). Verificada el 2026-07-23.
// Para periodos sin tabla cargada se estima: siguiente día hábil >= día 16 del mes
// siguiente, con source ESTIMATED. Al publicarse una R.S. nueva se agrega la data aquí
// y POST /periods/recompute-due-dates recalcula los periodos OPEN estimados.

import { nextBusinessDayFrom, nthBusinessDayOfMonth, subtractBusinessDays } from './habiles';

export type DueDateSource = 'OFFICIAL' | 'ESTIMATED';

// SUNAT agrupa en 6 columnas: 0 | 1 | 2y3 | 4y5 | 6y7 | 8y9 (BC/UESP no aplica).
export const COLUMNA_POR_DIGITO: readonly number[] = [0, 1, 2, 2, 3, 3, 4, 4, 5, 5];

/** periodo "YYYY-MM" → [fecha por columna SUNAT] */
export const OFICIAL: Record<string, string[]> = {
  '2026-01': ['2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-23'],
  '2026-02': ['2026-03-16', '2026-03-17', '2026-03-18', '2026-03-19', '2026-03-20', '2026-03-23'],
  '2026-03': ['2026-04-17', '2026-04-20', '2026-04-21', '2026-04-22', '2026-04-23', '2026-04-24'],
  '2026-04': ['2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22', '2026-05-25'],
  '2026-05': ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-22'],
  '2026-06': ['2026-07-15', '2026-07-16', '2026-07-17', '2026-07-20', '2026-07-21', '2026-07-22'],
  '2026-07': ['2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21', '2026-08-24', '2026-08-25'],
  '2026-08': ['2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-21', '2026-09-22'],
  '2026-09': ['2026-10-16', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'],
  '2026-10': ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-23'],
  '2026-11': ['2026-12-17', '2026-12-18', '2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24'],
  '2026-12': ['2027-01-18', '2027-01-19', '2027-01-20', '2027-01-21', '2027-01-22', '2027-01-25'],
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
  const col = COLUMNA_POR_DIGITO[digit];
  return col != null && OFICIAL[`${year}-01`]?.[col] != null;
}

export function getDueDate(period: string, digit: number): { date: string; source: DueDateSource } {
  const col = COLUMNA_POR_DIGITO[digit];
  const official = col != null ? OFICIAL[period]?.[col] : undefined;
  if (official) return { date: official, source: 'OFFICIAL' };
  const { year, month } = parsePeriod(period);
  const next = nextMonth(year, month);
  const day16 = `${next.year}-${String(next.month).padStart(2, '0')}-16`;
  return { date: nextBusinessDayFrom(day16), source: 'ESTIMATED' };
}

/**
 * Día sugerido para declarar/pagar: N días hábiles antes del vencimiento (colchón por
 * si hay saturación del portal, temas del banco, o falta depositar la detracción).
 */
export function suggestedPayDate(dueDateIso: string, businessDaysBefore = 2): string {
  return subtractBusinessDays(dueDateIso, businessDaysBefore);
}

/** Fecha límite del depósito de detracción: 5.º día hábil del mes siguiente a la emisión (SPEC §4.3). */
export function detraccionDepositDueDate(issueDateIso: string): string {
  const { year, month } = parsePeriod(issueDateIso.slice(0, 7));
  const next = nextMonth(year, month);
  return nthBusinessDayOfMonth(next.year, next.month, 5);
}
