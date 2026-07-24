// Parser del cronograma publicado en la página oficial de SUNAT
// (www.sunat.gob.pe/orientacion/cronogramas/<año>/cObligacionMensual<año>.html).
// Función PURA sobre el texto plano de la página (el fetch/strip vive en el worker).
// Se usa SOLO para VERIFICAR la tabla estática (watchdog) — nunca como fuente de cálculo.

import { COLUMNA_POR_DIGITO, getDueDate } from './cronograma';

const MESES: Record<string, string> = {
  Ene: '01', Feb: '02', Mar: '03', Abr: '04', May: '05', Jun: '06',
  Jul: '07', Ago: '08', Set: '09', Sep: '09', Oct: '10', Nov: '11', Dic: '12',
};
const MES_RE = 'Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Set|Sep|Oct|Nov|Dic';

export function urlCronogramaSunat(year: number): string {
  return `https://www.sunat.gob.pe/orientacion/cronogramas/${year}/cObligacionMensual${year}.html`;
}

/**
 * Extrae del texto plano la tabla: periodo "YYYY-MM" → 6 fechas ISO (columnas SUNAT
 * 0 | 1 | 2y3 | 4y5 | 6y7 | 8y9; la columna BC/UESP se ignora). Devuelve solo las
 * filas que parsean completas — el llamador decide si son las 12.
 */
export function parseCronogramaSunat(texto: string, year: number): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const filaRe = new RegExp(`(${MES_RE})[-\\s]${year}`, 'g');
  const filas = [...texto.matchAll(filaRe)];
  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i]!;
    const mesPeriodo = MESES[fila[1]!]!;
    const inicio = fila.index! + fila[0].length;
    const fin = i + 1 < filas.length ? filas[i + 1]!.index! : texto.length;
    const segmento = texto.slice(inicio, Math.min(fin, inicio + 400));
    const fechas: string[] = [];
    const fechaRe = new RegExp(`(\\d{1,2})\\s+(${MES_RE})\\.?\\s*(\\d{4})?`, 'g');
    for (const f of segmento.matchAll(fechaRe)) {
      if (fechas.length >= 6) break; // BC/UESP y notas quedan fuera
      const dia = f[1]!.padStart(2, '0');
      const mes = MESES[f[2]!]!;
      // Sin año explícito: el vencimiento cae el año del periodo, salvo Dic → Ene.
      const anio = f[3] ?? String(mes === '01' && mesPeriodo === '12' ? year + 1 : year);
      fechas.push(`${anio}-${mes}-${dia}`);
    }
    if (fechas.length === 6) out[`${year}-${mesPeriodo}`] = fechas;
  }
  return out;
}

export interface CronogramaMismatch {
  period: string;
  digit: number;
  local: string; // lo que calcula la app (con su source)
  sunat: string; // lo que dice la página oficial
}

/** Compara la tabla parseada de SUNAT contra lo que la app calcularía (dígitos 0-9). */
export function compareCronograma(
  parsed: Record<string, string[]>,
  year: number,
): CronogramaMismatch[] {
  const out: CronogramaMismatch[] = [];
  for (const [period, cols] of Object.entries(parsed)) {
    if (!period.startsWith(`${year}-`)) continue;
    for (let digit = 0; digit <= 9; digit++) {
      const sunat = cols[COLUMNA_POR_DIGITO[digit]!];
      if (!sunat) continue;
      const local = getDueDate(period, digit);
      if (local.date !== sunat) {
        out.push({ period, digit, local: `${local.date} (${local.source})`, sunat });
      }
    }
  }
  return out;
}
