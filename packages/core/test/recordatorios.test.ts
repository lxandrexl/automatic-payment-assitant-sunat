import { describe, expect, it } from 'vitest';
import { detraccionState, remindersToFire } from '../src/recordatorios';
import { formatFechaLima } from '../src/fechas';

describe('remindersToFire', () => {
  const due = '2026-08-18';
  it('dispara N días calendario antes del vencimiento', () => {
    expect(remindersToFire('2026-08-15', due, [3, 1])).toEqual([3]);
    expect(remindersToFire('2026-08-17', due, [3, 1])).toEqual([1]);
  });
  it('dispara N=0 el día del vencimiento', () => {
    expect(remindersToFire('2026-08-18', due, [3, 1])).toEqual([0]);
  });
  it('no dispara en días intermedios', () => {
    expect(remindersToFire('2026-08-16', due, [3, 1])).toEqual([]);
    expect(remindersToFire('2026-08-19', due, [3, 1])).toEqual([]);
  });
});

describe('detraccionState', () => {
  const limite = '2026-08-10'; // 5.º hábil de agosto (lunes)
  it('OVERDUE pasada la fecha límite', () => {
    expect(detraccionState('2026-08-11', limite)).toBe('OVERDUE');
  });
  it('SOON si faltan ≤2 días hábiles', () => {
    expect(detraccionState('2026-08-10', limite)).toBe('SOON'); // hoy mismo
    expect(detraccionState('2026-08-07', limite)).toBe('SOON'); // vie → lun = 1 hábil
  });
  it('OK si falta más', () => {
    expect(detraccionState('2026-08-03', limite)).toBe('OK');
  });
});

describe('formatFechaLima', () => {
  it('formatea como en los mensajes', () => {
    expect(formatFechaLima('2026-08-18')).toBe('mar 18/08/2026');
    expect(formatFechaLima('2026-07-28')).toBe('mar 28/07/2026');
  });
});
