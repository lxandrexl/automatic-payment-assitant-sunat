import { describe, expect, it } from 'vitest';
import { formatPen, fromCents, toCents } from '../src/money';

describe('money', () => {
  it('convierte soles a céntimos sin errores de flotante', () => {
    expect(toCents(9000)).toBe(900000);
    expect(toCents(1274.4)).toBe(127440);
    expect(toCents(0.1 + 0.2)).toBe(30);
  });

  it('fromCents es inverso de toCents', () => {
    expect(fromCents(toCents(10620))).toBe(10620);
    expect(fromCents(127440)).toBe(1274.4);
  });

  it('formatea PEN como en los mensajes del SPEC', () => {
    expect(formatPen(127440)).toBe('S/ 1,274.40');
    expect(formatPen(900000)).toBe('S/ 9,000.00');
    expect(formatPen(0)).toBe('S/ 0.00');
  });
});
