// Decisiones puras de los jobs del worker (SPEC §6). Sin IO ni Date.now():
// reciben "hoy" como string ISO para ser deterministas y testeables.

import { addDays, businessDaysUntil } from './habiles';

/**
 * Qué recordatorios de vencimiento disparar hoy (SPEC §6 due-reminders):
 * hoy == dueDate − N para cada N en reminderDaysBefore, y hoy == dueDate (N=0).
 * Devuelve los N que aplican; el dedupeKey del worker será `due:<period>:T-<N>`.
 */
export function remindersToFire(
  todayIso: string,
  dueDateIso: string,
  reminderDaysBefore: number[],
): number[] {
  const out: number[] = [];
  for (const n of reminderDaysBefore) {
    if (n > 0 && addDays(dueDateIso, -n) === todayIso) out.push(n);
  }
  if (todayIso === dueDateIso) out.push(0);
  return out;
}

export type DetraccionState = 'OVERDUE' | 'SOON' | 'OK';

/**
 * Estado del depósito de detracción hoy (SPEC §6 detraccion-check):
 * OVERDUE si hoy pasó la fecha límite; SOON si faltan ≤2 días hábiles; OK si no.
 */
export function detraccionState(todayIso: string, depositDueDateIso: string): DetraccionState {
  if (todayIso > depositDueDateIso) return 'OVERDUE';
  if (businessDaysUntil(todayIso, depositDueDateIso) <= 2) return 'SOON';
  return 'OK';
}
