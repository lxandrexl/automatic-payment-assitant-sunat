// Declaración Jurada Anual del Impuesto a la Renta (SPEC ampliado).
// El contribuyente (RUC 10, MYPE, ingresos ≤ 1700 UIT) usa el cronograma de
// PERSONAS NATURALES Y MYPE (Ley 31940 amplía el plazo vs. el cronograma general
// de empresas grandes: mayo/junio en vez de marzo/abril). La DJ del ejercicio N se
// presenta en N+1. Fuente: www.sunat.gob.pe/orientacion/cronogramas/<N+1>/cRenta<N>.html
// (la 2.ª tabla de la página — la de fechas más tardías).

import { nextBusinessDayFrom } from './habiles';
import type { DueDateSource } from './cronograma';

const MES_LARGO: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06', julio: '07',
};

/** ejercicio gravable → fecha ISO por dígito 0-9 (cronograma MYPE/PN, verificado). */
export const RENTA_ANUAL_MYPE: Record<string, string[]> = {
  '2025': [
    '2026-05-27', '2026-05-28', '2026-05-29', '2026-06-01', '2026-06-02',
    '2026-06-03', '2026-06-04', '2026-06-05', '2026-06-08', '2026-06-09',
  ],
};

export function urlRentaAnual(ejercicio: number): string {
  return `https://www.sunat.gob.pe/orientacion/cronogramas/${ejercicio + 1}/cRenta${ejercicio}.html`;
}

export function getRentaAnualDueDate(
  ejercicio: number,
  digit: number,
): { date: string; source: DueDateSource } {
  const official = RENTA_ANUAL_MYPE[String(ejercicio)]?.[digit];
  if (official) return { date: official, source: 'OFFICIAL' };
  // Estimación MYPE: fines de mayo del año siguiente (Ley 31940), siguiente día hábil.
  return { date: nextBusinessDayFrom(`${ejercicio + 1}-05-26`), source: 'ESTIMATED' };
}

export interface UpcomingRentaAnual {
  ejercicio: number;
  date: string;
  source: DueDateSource;
}

/** La próxima DJ Anual a presentar: la del ejercicio cuyo vencimiento aún no pasó. */
export function upcomingRentaAnual(todayIso: string, digit: number): UpcomingRentaAnual {
  const y = Number(todayIso.slice(0, 4));
  for (const ejercicio of [y - 1, y]) {
    const d = getRentaAnualDueDate(ejercicio, digit);
    if (d.date >= todayIso) return { ejercicio, ...d };
  }
  return { ejercicio: y, ...getRentaAnualDueDate(y, digit) };
}

/**
 * Extrae TODAS las tablas dígito(0-9)→fecha de la página anual (general y MYPE),
 * en el orden en que aparecen. La del contribuyente es la de fechas más tardías
 * (la MYPE/PN con la ampliación) — el watchdog las presenta ambas para verificar.
 */
export function parseRentaAnualTables(texto: string): string[][] {
  const re =
    /\b([0-9])\s+(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio)\s+de\s+(\d{4})/gi;
  const tables: string[][] = [];
  let current: string[] = [];
  let expected = 0;
  for (const m of texto.matchAll(re)) {
    const digit = Number(m[1]);
    if (digit === 0) {
      if (current.length) tables.push(current);
      current = [];
      expected = 0;
    }
    if (digit !== expected) continue;
    const dd = m[2]!.padStart(2, '0');
    const mm = MES_LARGO[m[3]!.toLowerCase()]!;
    current.push(`${m[4]}-${mm}-${dd}`);
    expected += 1;
  }
  if (current.length) tables.push(current);
  return tables.filter((t) => t.length === 10);
}
