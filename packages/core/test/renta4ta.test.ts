import { describe, expect, it } from 'vitest';
import { computePago616, computeRxh, type CalcSettings } from '../src/calculos';
import { computeAnnualRenta4ta, irEscalaTrabajo } from '../src/renta4ta';

const S: CalcSettings = {
  igvRate: 0.18,
  detraccionRate: 0.12,
  detraccionThresholdCents: 700_00,
  pagoCuentaRate: 0.01,
  retencion4taRate: 0.08,
};

const UIT = 550000; // S/ 5,500 (2026)

describe('computeRxh con cliente no domiciliado', () => {
  it('no retiene aunque supere S/ 1,500 (el pagador no es agente de retención)', () => {
    expect(computeRxh(900000, S, false)).toEqual({ retencionCents: 0, netCents: 900000 });
  });
  it('el default sigue reteniendo (cliente domiciliado)', () => {
    expect(computeRxh(900000, S)).toEqual({ retencionCents: 72000, netCents: 828000 });
  });
});

describe('computePago616 (pago a cuenta mensual de 4ta)', () => {
  it('caso chileno: 8% de 9,000 sin retención = S/ 720', () => {
    expect(computePago616(900000, 0, 0.08)).toBe(72000);
  });
  it('con retención del pagador cubre todo → 0', () => {
    expect(computePago616(900000, 72000, 0.08)).toBe(0);
  });
  it('mixto: retención parcial', () => {
    // 18,000 brutos (2 RxH), solo uno retuvo 720 → 1,440 − 720 = 720
    expect(computePago616(1800000, 72000, 0.08)).toBe(72000);
  });
});

describe('irEscalaTrabajo (8/14/17/20/30 por tramos de UIT)', () => {
  it('dentro del primer tramo (≤5 UIT) es 8% plano', () => {
    expect(irEscalaTrabajo(5 * UIT, UIT)).toBe(Math.round(5 * UIT * 0.08));
  });
  it('cruza al segundo tramo: 8% de 5 UIT + 14% del exceso', () => {
    const neta = 10 * UIT;
    expect(irEscalaTrabajo(neta, UIT)).toBe(Math.round(5 * UIT * 0.08 + 5 * UIT * 0.14));
  });
  it('renta 0 → 0', () => {
    expect(irEscalaTrabajo(0, UIT)).toBe(0);
  });
});

describe('computeAnnualRenta4ta (modelo hoja RXH_4TA)', () => {
  it('caso del dueño: 108,000 brutos anuales, cliente chileno (sin retención)', () => {
    // bruto 108,000 → 20% = 21,600 → neta 4ta 86,400 → −7 UIT (38,500) = 47,900
    // IR: 5 UIT (27,500) al 8% = 2,200 + (47,900−27,500) al 14% = 2,856 → 5,056
    const p = computeAnnualRenta4ta({
      brutoAnualCents: 10800000,
      retencionesCents: 0,
      pagosCuentaCents: 12 * 72000, // 12 pagos F.616 de 720
      gastos3UitCents: 0,
      uitCents: UIT,
    });
    expect(p.deduccion20Cents).toBe(2160000);
    expect(p.rentaNeta4taCents).toBe(8640000);
    expect(p.rentaNetaTrabajoCents).toBe(4790000);
    expect(p.irAnualCents).toBe(505600);
    // pagó 8,640 a cuenta vs IR 5,056 → saldo a favor de 3,584
    expect(p.saldoCents).toBe(505600 - 864000);
  });

  it('la deducción del 20% se topa en 24 UIT', () => {
    const brutoGrande = 100 * UIT * 5; // 500 UIT
    const p = computeAnnualRenta4ta({
      brutoAnualCents: brutoGrande,
      retencionesCents: 0,
      pagosCuentaCents: 0,
      gastos3UitCents: 0,
      uitCents: UIT,
    });
    expect(p.deduccion20Cents).toBe(24 * UIT);
  });

  it('los gastos 3 UIT se topan en 3 UIT y reducen la renta', () => {
    const base = computeAnnualRenta4ta({
      brutoAnualCents: 10800000,
      retencionesCents: 0,
      pagosCuentaCents: 0,
      gastos3UitCents: 99 * UIT, // intenta pasar el tope
      uitCents: UIT,
    });
    expect(base.rentaNetaTrabajoCents).toBe(4790000 - 3 * UIT);
  });

  it('renta baja no paga (7 UIT la absorben)', () => {
    const p = computeAnnualRenta4ta({
      brutoAnualCents: 4000000, // 40,000 → neta 32,000 < 38,500
      retencionesCents: 100000,
      pagosCuentaCents: 0,
      gastos3UitCents: 0,
      uitCents: UIT,
    });
    expect(p.irAnualCents).toBe(0);
    expect(p.saldoCents).toBe(-100000); // todo lo retenido es saldo a favor
  });
});
