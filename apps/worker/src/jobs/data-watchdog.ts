import { createHash } from 'node:crypto';
import { diffFeriados, hasOfficialCronograma, todayLimaIso } from '@tributo/core';
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

export async function dataWatchdog(): Promise<void> {
  const today = todayLimaIso();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const digit = (await SettingsModel.findById('singleton').lean())?.rucLastDigit ?? 0;

  // Feriados: año actual siempre; el siguiente también desde noviembre.
  await checkFeriados(year);
  if (month >= 11) await checkFeriados(year + 1);

  // Cronograma: si falta el del año en curso es urgente; el del siguiente, desde noviembre.
  const targets = [
    ...(hasOfficialCronograma(year, digit) ? [] : [year]),
    ...(month >= 11 && !hasOfficialCronograma(year + 1, digit) ? [year + 1] : []),
  ];
  for (const y of targets) {
    await sendOnce(
      `watchdog:cronograma:${y}:${today.slice(0, 7)}`,
      'SYSTEM',
      `📅 Falta cargar el cronograma oficial ${y} (dígito ${digit}) en cronograma.ts.\n` +
        `SUNAT lo publica por R.S. en diciembre. Mientras tanto los vencimientos van ESTIMADOS.\n` +
        `Verificar: https://orientacion.sunat.gob.pe/cronograma-de-obligaciones-mensuales\n` +
        `Feriados nuevos: https://busquedas.elperuano.pe/\n` +
        `Tras actualizar la tabla: POST /periods/recompute-due-dates (runbook del README).`,
    );
  }
}
