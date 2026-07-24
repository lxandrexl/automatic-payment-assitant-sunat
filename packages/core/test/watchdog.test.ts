import { describe, expect, it } from 'vitest';
import { hasOfficialCronograma } from '../src/cronograma';
import { diffFeriados, feriadosDelAnio } from '../src/feriados';

describe('watchdog de data estática', () => {
  it('hasOfficialCronograma: 2026 cargado para todos los dígitos; 2027 no', () => {
    expect(hasOfficialCronograma(2026, 0)).toBe(true);
    expect(hasOfficialCronograma(2026, 5)).toBe(true);
    expect(hasOfficialCronograma(2026, 9)).toBe(true);
    expect(hasOfficialCronograma(2027, 0)).toBe(false);
  });

  it('feriadosDelAnio filtra por año', () => {
    const f2026 = feriadosDelAnio(2026);
    expect(f2026).toHaveLength(16);
    expect(f2026[0]).toBe('2026-01-01');
    expect(f2026.every((d) => d.startsWith('2026-'))).toBe(true);
  });

  it('diffFeriados sin diferencias cuando la fuente coincide', () => {
    const d = diffFeriados(2026, feriadosDelAnio(2026));
    expect(d.faltanEnLocal).toEqual([]);
    expect(d.sobranEnLocal).toEqual([]);
  });

  it('diffFeriados detecta faltantes y sobrantes', () => {
    const externa = [...feriadosDelAnio(2026).slice(1), '2026-03-15']; // quita año nuevo, agrega falso
    const d = diffFeriados(2026, externa);
    expect(d.faltanEnLocal).toEqual(['2026-03-15']);
    expect(d.sobranEnLocal).toEqual(['2026-01-01']);
  });

  it('diffFeriados ignora fechas de otros años en la fuente', () => {
    const d = diffFeriados(2026, [...feriadosDelAnio(2026), '2027-01-01']);
    expect(d.faltanEnLocal).toEqual([]);
  });
});
