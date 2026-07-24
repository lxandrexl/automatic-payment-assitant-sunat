// Feriados nacionales de Perú 2026–2027 (días NO laborables para el cómputo de días hábiles).
// Fuente: Ley 29073 / D.L. 713 y leyes que añadieron 06-07 (Batalla de Arica, Ley 31788),
// 07-23 (Día de la Fuerza Aérea, Ley 31381), 08-06 (Batalla de Junín, Ley 31530) y
// 12-09 (Batalla de Ayacucho). Semana Santa: 2026 → 02–03 abr; 2027 → 25–26 mar.
// EDITABLE: agregar aquí los años siguientes cuando se publiquen (los "días no laborables"
// por decreto para el sector público NO van — no afectan vencimientos SUNAT).

export function feriadosDelAnio(year: number): string[] {
  return [...FERIADOS].filter((d) => d.startsWith(`${year}-`)).sort();
}

/**
 * Cruce contra una fuente externa (watchdog): qué fechas reporta la fuente que no
 * tenemos, y cuáles tenemos que la fuente no reporta. Cualquier diferencia se
 * verifica a mano — la fuente de verdad sigue siendo este archivo.
 */
export function diffFeriados(
  year: number,
  fuenteExterna: string[],
): { faltanEnLocal: string[]; sobranEnLocal: string[] } {
  const local = new Set(feriadosDelAnio(year));
  const externa = new Set(fuenteExterna.filter((d) => d.startsWith(`${year}-`)));
  return {
    faltanEnLocal: [...externa].filter((d) => !local.has(d)).sort(),
    sobranEnLocal: [...local].filter((d) => !externa.has(d)).sort(),
  };
}

export const FERIADOS: ReadonlySet<string> = new Set([
  // 2026
  '2026-01-01', // Año Nuevo
  '2026-04-02', // Jueves Santo
  '2026-04-03', // Viernes Santo
  '2026-05-01', // Día del Trabajo
  '2026-06-07', // Batalla de Arica y Día de la Bandera
  '2026-06-29', // San Pedro y San Pablo
  '2026-07-23', // Día de la Fuerza Aérea
  '2026-07-28', // Fiestas Patrias
  '2026-07-29', // Fiestas Patrias
  '2026-08-06', // Batalla de Junín
  '2026-08-30', // Santa Rosa de Lima
  '2026-10-08', // Combate de Angamos
  '2026-11-01', // Todos los Santos
  '2026-12-08', // Inmaculada Concepción
  '2026-12-09', // Batalla de Ayacucho
  '2026-12-25', // Navidad
  // 2027
  '2027-01-01', // Año Nuevo
  '2027-03-25', // Jueves Santo
  '2027-03-26', // Viernes Santo
  '2027-05-01', // Día del Trabajo
  '2027-06-07', // Batalla de Arica y Día de la Bandera
  '2027-06-29', // San Pedro y San Pablo
  '2027-07-23', // Día de la Fuerza Aérea
  '2027-07-28', // Fiestas Patrias
  '2027-07-29', // Fiestas Patrias
  '2027-08-06', // Batalla de Junín
  '2027-08-30', // Santa Rosa de Lima
  '2027-10-08', // Combate de Angamos
  '2027-11-01', // Todos los Santos
  '2027-12-08', // Inmaculada Concepción
  '2027-12-09', // Batalla de Ayacucho
  '2027-12-25', // Navidad
]);
