// Conversión fecha-calendario Lima ↔ Date UTC (SPEC §1: Mongo guarda UTC, se convierte
// en los bordes). Perú no tiene horario de verano: offset fijo UTC-5.

const LIMA_OFFSET_MS = 5 * 3600_000;

/** "2026-08-18" → Date de la medianoche de Lima (05:00Z). */
export function limaIsoToDate(iso: string): Date {
  return new Date(`${iso}T00:00:00-05:00`);
}

/** Date UTC → fecha calendario de Lima "YYYY-MM-DD". */
export function dateToLimaIso(d: Date): string {
  return new Date(d.getTime() - LIMA_OFFSET_MS).toISOString().slice(0, 10);
}

export function todayLimaIso(now: Date = new Date()): string {
  return dateToLimaIso(now);
}

/** "2026-07-20" → "2026-07" */
export function periodOfDate(iso: string): string {
  return iso.slice(0, 7);
}

const DOW_ES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** "2026-08-18" → "mar 18/08/2026" (formato de los mensajes, SPEC §6). */
export function formatFechaLima(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const dow = DOW_ES[d.getUTCDay()];
  const [y, m, day] = iso.split('-');
  return `${dow} ${day}/${m}/${y}`;
}
