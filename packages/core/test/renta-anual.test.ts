import { describe, expect, it } from 'vitest';
import {
  getRentaAnualDueDate,
  parseRentaAnualTables,
  upcomingRentaAnual,
  urlRentaAnual,
} from '../src/renta-anual';

// Texto REAL de cRenta2025.html (las DOS tablas: General marzo/abril, MYPE mayo/junio).
const TEXTO_RENTA_2025 =
  '...fuera del ámbito de aplicación de la Ley N° 31940 ... (MYPE). ' +
  'ULTIMO DÍGITO DEL RUC Y OTROS FECHA DE VENCIMIENTO ' +
  '0 26 de marzo de 2026 1 27 de marzo de 2026 2 30 de marzo de 2026 3 31 de marzo de 2026 ' +
  '4 1 de abril de 2026 5 6 de abril de 2026 6 7 de abril de 2026 7 8 de abril de 2026 ' +
  '8 9 de abril de 2026 9 10 de abril de 2026 ' +
  'b) Cronograma para las personas naturales y MYPE con ingresos no mayores a 1700 UIT ' +
  'ULTIMO DÍGITO DEL RUC Y OTROS FECHA DE VENCIMIENTO ' +
  '0 27 de mayo de 2026 1 28 de mayo de 2026 2 29 de mayo de 2026 3 1 de junio de 2026 ' +
  '4 2 de junio de 2026 5 3 de junio de 2026 6 4 de junio de 2026 7 5 de junio de 2026 ' +
  '8 8 de junio de 2026 9 9 de junio de 2026';

describe('parseRentaAnualTables', () => {
  const tables = parseRentaAnualTables(TEXTO_RENTA_2025);

  it('detecta las dos tablas (General y MYPE)', () => {
    expect(tables).toHaveLength(2);
    expect(tables[0]).toHaveLength(10);
    expect(tables[1]).toHaveLength(10);
  });

  it('la 1.ª tabla es la General (marzo/abril); la 2.ª la MYPE (mayo/junio)', () => {
    expect(tables[0]![0]).toBe('2026-03-26');
    expect(tables[1]![0]).toBe('2026-05-27');
    expect(tables[1]![3]).toBe('2026-06-01'); // dígito 3, cruce de mes
  });
});

describe('getRentaAnualDueDate (cronograma MYPE)', () => {
  it('2025 dígito 0 = 27 de mayo de 2026 (NO marzo, que es el General)', () => {
    expect(getRentaAnualDueDate(2025, 0)).toEqual({ date: '2026-05-27', source: 'OFFICIAL' });
  });
  it('estimación para ejercicio sin publicar: fines de mayo del año siguiente', () => {
    const e = getRentaAnualDueDate(2026, 0);
    expect(e.source).toBe('ESTIMATED');
    expect(e.date.startsWith('2027-05')).toBe(true);
  });
});

describe('upcomingRentaAnual', () => {
  it('antes del vencimiento de mayo, la próxima es la del ejercicio anterior', () => {
    const u = upcomingRentaAnual('2026-02-01', 0);
    expect(u).toEqual({ ejercicio: 2025, date: '2026-05-27', source: 'OFFICIAL' });
  });
  it('pasado el vencimiento, apunta al ejercicio en curso (estimado)', () => {
    const u = upcomingRentaAnual('2026-07-23', 0);
    expect(u.ejercicio).toBe(2026);
    expect(u.source).toBe('ESTIMATED');
  });
});

describe('urlRentaAnual', () => {
  it('la DJ del ejercicio N vive en la carpeta del año N+1', () => {
    expect(urlRentaAnual(2025)).toContain('/2026/cRenta2025.html');
  });
});
