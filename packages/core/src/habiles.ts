// Días hábiles: lunes–viernes excluyendo feriados (SPEC §4.1).
// Todas las fechas del core son strings ISO `YYYY-MM-DD` en hora de Lima;
// la conversión Date↔ISO se hace en los bordes (api/worker), no aquí.

import { FERIADOS } from './feriados';

const DAY_MS = 86_400_000;

function toUtc(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function addDays(iso: string, days: number): string {
  return new Date(toUtc(iso).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function isBusinessDay(iso: string): boolean {
  const dow = toUtc(iso).getUTCDay();
  if (dow === 0 || dow === 6) return false;
  return !FERIADOS.has(iso);
}

/** Primer día hábil >= iso (incluye iso mismo si es hábil). */
export function nextBusinessDayFrom(iso: string): string {
  let d = iso;
  while (!isBusinessDay(d)) d = addDays(d, 1);
  return d;
}

/** N-ésimo día hábil del mes (1-indexado). */
export function nthBusinessDayOfMonth(year: number, month: number, n: number): string {
  let d = `${year}-${String(month).padStart(2, '0')}-01`;
  let count = 0;
  for (;;) {
    if (isBusinessDay(d)) {
      count += 1;
      if (count === n) return d;
    }
    d = addDays(d, 1);
  }
}

/** Días hábiles estrictamente entre hoy y target (0 si target <= hoy). */
export function businessDaysUntil(todayIso: string, targetIso: string): number {
  let count = 0;
  let d = todayIso;
  while (d < targetIso) {
    d = addDays(d, 1);
    if (d <= targetIso && isBusinessDay(d)) count += 1;
  }
  return count;
}
