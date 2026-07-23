import { describe, expect, it } from 'vitest';
import {
  addDays,
  businessDaysUntil,
  isBusinessDay,
  nextBusinessDayFrom,
  nthBusinessDayOfMonth,
} from '../src/habiles';

describe('días hábiles', () => {
  it('excluye fines de semana', () => {
    expect(isBusinessDay('2026-07-25')).toBe(false); // sábado
    expect(isBusinessDay('2026-07-26')).toBe(false); // domingo
    expect(isBusinessDay('2026-07-27')).toBe(true); // lunes
  });

  it('excluye feriados nacionales', () => {
    expect(isBusinessDay('2026-07-28')).toBe(false); // Fiestas Patrias
    expect(isBusinessDay('2026-08-06')).toBe(false); // Batalla de Junín
    expect(isBusinessDay('2027-03-25')).toBe(false); // Jueves Santo 2027
  });

  it('addDays cruza meses y años', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01'); // 2026 no bisiesto
  });

  it('nextBusinessDayFrom devuelve el mismo día si es hábil', () => {
    expect(nextBusinessDayFrom('2026-07-27')).toBe('2026-07-27');
    // 28–29 feriado, 30 jueves hábil
    expect(nextBusinessDayFrom('2026-07-28')).toBe('2026-07-30');
  });

  it('nthBusinessDayOfMonth salta fines de semana y feriados', () => {
    // Agosto 2026: 1 sáb, 2 dom, 3–5 hábiles, 6 feriado, 7 hábil, 8–9 finde, 10 hábil
    expect(nthBusinessDayOfMonth(2026, 8, 1)).toBe('2026-08-03');
    expect(nthBusinessDayOfMonth(2026, 8, 4)).toBe('2026-08-07');
    expect(nthBusinessDayOfMonth(2026, 8, 5)).toBe('2026-08-10');
  });

  it('businessDaysUntil cuenta solo hábiles entre hoy y target', () => {
    expect(businessDaysUntil('2026-07-27', '2026-07-27')).toBe(0);
    // 27 lun → 30 jue: 28 y 29 feriados, 30 hábil = 1
    expect(businessDaysUntil('2026-07-27', '2026-07-30')).toBe(1);
    expect(businessDaysUntil('2026-07-30', '2026-07-27')).toBe(0); // target en el pasado
  });
});
