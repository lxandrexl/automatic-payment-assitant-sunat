import { createHash } from 'node:crypto';
import {
  COLUMNA_POR_DIGITO,
  compareCronograma,
  diffFeriados,
  getRentaAnualDueDate,
  hasOfficialCronograma,
  parseCronogramaSunat,
  parseRentaAnualTables,
  todayLimaIso,
  urlCronogramaSunat,
  urlRentaAnual,
} from '@tributo/core';
import { SettingsModel } from '../db';
import { sendOnce } from '../notify';
import { logger } from '../logger';

// Watchdog mensual de la data estática (feriados + cronograma). La data en duro
// sigue siendo la fuente de verdad para TODO cálculo; esto solo la vigila:
//  - Cruza los feriados locales contra Nager.Date (API pública, sin key) y alerta
//    si hay diferencias, para verificar a mano contra El Peruano.
//  - Recuerda (nov-dic, y siempre si falta el año en curso) pegar el cronograma
//    oficial nuevo cuando SUNAT publique la R.S. — no existe API para eso.

const NAGER = 'https://date.nager.at/api/v3/PublicHolidays';

interface NagerHoliday {
  date: string; // YYYY-MM-DD
  localName: string;
  global: boolean;
}

// Feriados por leyes recientes (31788, 31381, 31530 y Batalla de Ayacucho) que
// Nager.Date aún no incluye — verificado manualmente contra la API el 2026-07-23.
// Si la API los agrega algún día, estos filtros simplemente no filtran nada.
const LEYES_RECIENTES_MMDD = new Set(['06-07', '07-23', '08-06', '12-09']);

function esFinDeSemana(iso: string): boolean {
  const dow = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return dow === 0 || dow === 6;
}

async function checkFeriados(year: number): Promise<void> {
  const res = await fetch(`${NAGER}/${year}/PE`);
  if (!res.ok) throw new Error(`Nager.Date ${res.status} para ${year}`);
  const holidays = (await res.json()) as NagerHoliday[];
  const externa = holidays.filter((h) => h.global !== false).map((h) => h.date);
  const diff = diffFeriados(year, externa);
  // Diferencias conocidas/benignas: feriados de la API en fin de semana no afectan
  // días hábiles; los de leyes recientes ya están verificados en nuestro archivo.
  const faltan = diff.faltanEnLocal.filter((d) => !esFinDeSemana(d));
  const sobran = diff.sobranEnLocal.filter((d) => !LEYES_RECIENTES_MMDD.has(d.slice(5)));
  if (faltan.length === 0 && sobran.length === 0) {
    logger.info({ year }, 'watchdog feriados: sin diferencias relevantes');
    return;
  }
  const detalle = [
    faltan.length ? `La API reporta y NO tenemos: ${faltan.join(', ')}` : '',
    sobran.length ? `Tenemos y la API NO reporta: ${sobran.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const hash = createHash('sha1').update(detalle).digest('hex').slice(0, 8);
  await sendOnce(
    `watchdog:feriados:${year}:${hash}`,
    'SYSTEM',
    `🧐 Watchdog de feriados ${year}: hay diferencias con Nager.Date.\n${detalle}\n` +
      `Verificar contra El Peruano y actualizar packages/core/src/feriados.ts si corresponde.`,
  );
}

/** Descarga una página de SUNAT y la deja como texto plano (o null si falla). */
async function fetchTextoPlano(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    return (await res.text())
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;?/g, ' ')
      .replace(/\s+/g, ' ');
  } catch (e) {
    logger.warn({ url, err: e }, 'watchdog: no se pudo leer la página SUNAT');
    return null;
  }
}

/** Las 12 fechas del dígito dado, listas para pegar en cronograma.ts. */
function fechasParaDigito(parsed: Record<string, string[]>, digit: number): string {
  const col = COLUMNA_POR_DIGITO[digit] ?? 0;
  return Object.keys(parsed)
    .sort()
    .map((p) => `${p}: ${parsed[p]![col]}`)
    .join('\n');
}

/**
 * Verifica la DJ Anual de un ejercicio contra su página oficial. Si SUNAT ya la
 * publicó y la app la tiene ESTIMADA, alerta con AMBAS tablas parseadas (la General
 * y la MYPE) para que el humano cargue la correcta (la MYPE = fechas más tardías).
 */
async function checkRentaAnual(ejercicio: number, digit: number): Promise<void> {
  if (getRentaAnualDueDate(ejercicio, digit).source === 'OFFICIAL') return;
  const url = urlRentaAnual(ejercicio);
  const texto = await fetchTextoPlano(url);
  if (!texto) return;
  const tables = parseRentaAnualTables(texto);
  if (tables.length < 2) return;
  const general = tables[0]!;
  const mype = tables[tables.length - 1]!;
  const fmt = (t: string[]) => t.map((d, i) => `  ${i}: ${d}`).join('\n');
  await sendOnce(
    `renta-anual-pub:${ejercicio}`,
    'SYSTEM',
    `📆 SUNAT publicó la DJ Anual del ejercicio ${ejercicio}.\n` +
      `Tu cronograma (MYPE/PN, el de fechas más tardías):\n${fmt(mype)}\n\n` +
      `(General, empresas >1700 UIT — NO es el tuyo):\n${fmt(general)}\n\n` +
      `Fuente: ${url}\nPásame la tabla MYPE para cargarla verificada.`,
  );
}

/**
 * Verifica la tabla mensual local contra la página oficial de SUNAT.
 * Devuelve 'OK' | 'PARSE_FAIL' (página inexistente o formato cambiado).
 */
async function checkCronogramaContraSunat(year: number, digit: number): Promise<'OK' | 'PARSE_FAIL'> {
  const url = urlCronogramaSunat(year);
  const texto = await fetchTextoPlano(url);
  if (!texto) return 'PARSE_FAIL';

  const parsed = parseCronogramaSunat(texto, year);
  if (Object.keys(parsed).length < 12) return 'PARSE_FAIL';

  const diffs = compareCronograma(parsed, year);
  if (diffs.length === 0) {
    logger.info({ year }, 'watchdog cronograma: tabla local coincide con SUNAT');
    return 'OK';
  }

  const esEstimado = diffs.every((d) => d.local.includes('ESTIMATED'));
  const detalle = diffs
    .slice(0, 8)
    .map((d) => `${d.period} díg.${d.digit}: app=${d.local} vs SUNAT=${d.sunat}`)
    .join('\n');
  const hash = createHash('sha1').update(detalle).digest('hex').slice(0, 8);
  const msg = esEstimado
    ? `📅 SUNAT ya publicó el cronograma ${year} y la app lo tiene ESTIMADO.\n` +
      `Estas son las 12 fechas del dígito ${digit} (leídas de la página oficial):\n\n` +
      `${fechasParaDigito(parsed, digit)}\n\n` +
      `Fuente: ${url}\n` +
      `Pásame estas fechas (o el link) para cargar la tabla verificada, correr los tests ` +
      `y recalcular los periodos abiertos.`
    : `🔴 El cronograma local NO coincide con la página de SUNAT (${year}):\n${detalle}\n` +
      `Fuente: ${url}\nVerificar la R.S. (¿prórroga/errata?) y avisarme.`;
  await sendOnce(`watchdog:cronograma:${year}:${hash}`, 'SYSTEM', msg);
  return 'OK';
}

export async function dataWatchdog(): Promise<void> {
  const today = todayLimaIso();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const digit = (await SettingsModel.findById('singleton').lean())?.rucLastDigit ?? 0;

  // Feriados: año actual siempre; el siguiente también desde noviembre.
  await checkFeriados(year);
  if (month >= 11) await checkFeriados(year + 1);

  // Cronograma: verificar contra la página oficial (año actual siempre; el siguiente
  // desde octubre, para detectar la publicación de la R.S. apenas salga).
  // DJ Anual: la del ejercicio recién cerrado se publica a inicios del año siguiente.
  await checkRentaAnual(year - 1, digit);

  const aVerificar = [year, ...(month >= 10 ? [year + 1] : [])];
  for (const y of aVerificar) {
    const resultado = await checkCronogramaContraSunat(y, digit);
    // Fallback: si la página no existe/cambió Y nuestra tabla falta, recordar a mano.
    if (resultado === 'PARSE_FAIL' && !hasOfficialCronograma(y, digit) && (y === year || month >= 11)) {
      await sendOnce(
        `watchdog:cronograma:${y}:${today.slice(0, 7)}`,
        'SYSTEM',
        `📅 Falta cargar el cronograma oficial ${y} (dígito ${digit}) y no pude leer la ` +
          `página de SUNAT para verificarlo.\n` +
          `Mientras tanto los vencimientos van ESTIMADOS (⚠️ en cada recordatorio).\n\n` +
          `Qué hacer (5 min):\n` +
          `1. Abre: ${urlCronogramaSunat(y)}\n` +
          `   (índice: https://orientacion.sunat.gob.pe/13-cronogramas)\n` +
          `2. Copia las 12 fechas del dígito ${digit} (o el link de la R.S.)\n` +
          `3. Pégaselas a Claude Code — actualiza la tabla, corre los tests, despliega ` +
          `y recalcula los periodos abiertos.`,
      );
    }
  }
}
