import { describe, expect, it } from 'vitest';
import { dateToLimaIso, limaIsoToDate, periodOfDate, todayLimaIso } from '../src/fechas';

describe('fechas Lima ↔ UTC', () => {
  it('medianoche de Lima es 05:00Z', () => {
    expect(limaIsoToDate('2026-08-18').toISOString()).toBe('2026-08-18T05:00:00.000Z');
  });

  it('ida y vuelta es identidad', () => {
    expect(dateToLimaIso(limaIsoToDate('2026-08-18'))).toBe('2026-08-18');
  });

  it('las 03:00Z siguen siendo el día anterior en Lima', () => {
    expect(dateToLimaIso(new Date('2026-08-18T03:00:00Z'))).toBe('2026-08-17');
    expect(todayLimaIso(new Date('2026-08-18T03:00:00Z'))).toBe('2026-08-17');
    expect(dateToLimaIso(new Date('2026-08-18T05:00:00Z'))).toBe('2026-08-18');
  });

  it('periodOfDate', () => {
    expect(periodOfDate('2026-07-20')).toBe('2026-07');
  });
});
