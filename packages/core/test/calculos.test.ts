import { describe, expect, it } from 'vitest';
import {
  computeFactura,
  computeRxh,
  isDetraccionDepositMatch,
  type CalcSettings,
} from '../src/calculos';

const S: CalcSettings = {
  igvRate: 0.18,
  detraccionRate: 0.12,
  detraccionThresholdCents: 700_00,
  pagoCuentaRate: 0.01,
  retencion4taRate: 0.08,
};

describe('computeFactura', () => {
  it('caso base del SPEC: 9,000 + IGV = 10,620; detracción 1,274.40 → depósito 1,274', () => {
    const f = computeFactura(900000, S);
    expect(f.igvCents).toBe(162000);
    expect(f.totalCents).toBe(1062000);
    expect(f.detraccion).toEqual({ amountCents: 127400, exactAmountCents: 127440 });
    // Neto = total − detracción EXACTA (SPEC §0: transferencia S/ 9,345.60), no la redondeada.
    expect(f.netCents).toBe(934560); // 9,345.60
  });

  it('factura real Métrica (base 3,600): neto = 3,738.24, no 3,738.00', () => {
    const f = computeFactura(360000, S);
    expect(f.totalCents).toBe(424800); // 4,248.00
    expect(f.detraccion).toEqual({ amountCents: 51000, exactAmountCents: 50976 }); // depósito 510
    expect(f.netCents).toBe(373824); // 3,738.24 = 4,248.00 − 509.76
  });

  it('sin detracción si total <= S/ 700', () => {
    // base 593.22 → total 700.00 exacto: NO supera el umbral
    const justo = computeFactura(59322, S);
    expect(justo.totalCents).toBe(70000);
    expect(justo.detraccion).toBeNull();
    expect(justo.netCents).toBe(70000);
    // un céntimo más de base → aplica
    expect(computeFactura(59323, S).detraccion).not.toBeNull();
  });

  it('redondeo del depósito a soles enteros (mitad hacia arriba)', () => {
    // base 1000.00 → total 1180.00 → 12% = 141.60 → depósito 142.00
    const f = computeFactura(100000, S);
    expect(f.detraccion).toEqual({ amountCents: 14200, exactAmountCents: 14160 });
  });
});

describe('isDetraccionDepositMatch (banda exacto↔redondeado ±1 sol)', () => {
  const det = { amountCents: 127400, exactAmountCents: 127440 };
  it('acepta exacto, redondeado y la banda ±1 sol', () => {
    expect(isDetraccionDepositMatch(127440, det)).toBe(true);
    expect(isDetraccionDepositMatch(127400, det)).toBe(true);
    expect(isDetraccionDepositMatch(127300, det)).toBe(true); // redondeado − 1 sol
    expect(isDetraccionDepositMatch(127540, det)).toBe(true); // exacto + 1 sol
  });
  it('rechaza fuera de banda', () => {
    expect(isDetraccionDepositMatch(127299, det)).toBe(false);
    expect(isDetraccionDepositMatch(127541, det)).toBe(false);
    expect(isDetraccionDepositMatch(0, det)).toBe(false);
  });
});

describe('computeRxh', () => {
  it('caso base del SPEC: 9,000 brutos → retención 720, neto 8,280', () => {
    expect(computeRxh(900000, S)).toEqual({ retencionCents: 72000, netCents: 828000 });
  });

  it('sin retención hasta S/ 1,500 inclusive', () => {
    expect(computeRxh(150000, S)).toEqual({ retencionCents: 0, netCents: 150000 });
    expect(computeRxh(150100, S)).toEqual({ retencionCents: 12008, netCents: 138092 });
  });
});
