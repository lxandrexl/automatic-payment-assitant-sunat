import { describe, expect, it } from 'vitest';
import { detraccionDepositDueDate, getDueDate, parsePeriod } from '../src/cronograma';

describe('cronograma F.621', () => {
  it('tabla oficial 2026 dígito 0 completa (R.S. citada en SPEC §4.1)', () => {
    const esperado: Record<string, string> = {
      '2026-01': '2026-02-16',
      '2026-02': '2026-03-16',
      '2026-03': '2026-04-17',
      '2026-04': '2026-05-18',
      '2026-05': '2026-06-15',
      '2026-06': '2026-07-15',
      '2026-07': '2026-08-18',
      '2026-08': '2026-09-15',
      '2026-09': '2026-10-16',
      '2026-10': '2026-11-16',
      '2026-11': '2026-12-17',
      '2026-12': '2027-01-18',
    };
    for (const [period, date] of Object.entries(esperado)) {
      expect(getDueDate(period, 0)).toEqual({ date, source: 'OFFICIAL' });
    }
  });

  it('estima para periodos sin tabla: siguiente hábil >= día 16 del mes siguiente', () => {
    // 2027-02-16 es martes hábil
    expect(getDueDate('2027-01', 0)).toEqual({ date: '2027-02-16', source: 'ESTIMATED' });
    // 2027-05-16 domingo → lunes 17
    expect(getDueDate('2027-04', 0)).toEqual({ date: '2027-05-17', source: 'ESTIMATED' });
  });

  it('tabla completa: otros dígitos también OFFICIAL (transcrita de la página SUNAT)', () => {
    expect(getDueDate('2026-07', 5)).toEqual({ date: '2026-08-21', source: 'OFFICIAL' });
    expect(getDueDate('2026-07', 9)).toEqual({ date: '2026-08-25', source: 'OFFICIAL' });
    expect(getDueDate('2026-12', 3)).toEqual({ date: '2027-01-20', source: 'OFFICIAL' });
  });

  it('rechaza periodos malformados', () => {
    expect(() => getDueDate('2026-13', 0)).toThrow();
    expect(() => getDueDate('julio', 0)).toThrow();
    expect(parsePeriod('2026-07')).toEqual({ year: 2026, month: 7 });
  });

  it('depositDueDate: 5.º hábil del mes siguiente a la emisión', () => {
    // Emitida en julio 2026 → agosto: 5.º hábil = 10 (6 feriado, finde 1-2 y 8-9)
    expect(detraccionDepositDueDate('2026-07-20')).toBe('2026-08-10');
    // Emitida en diciembre 2026 → enero 2027: 1 vie feriado, 2-3 finde,
    // hábiles: 4,5,6,7,8 → 5.º = 2027-01-08
    expect(detraccionDepositDueDate('2026-12-31')).toBe('2027-01-08');
  });
});
