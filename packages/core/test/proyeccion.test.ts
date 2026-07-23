import { describe, expect, it } from 'vitest';
import { computeAnnualProjection } from '../src/proyeccion';

const UIT = 550000; // S/ 5,500 (2026)
const LIMITE_15_UIT = 15 * UIT; // S/ 82,500 = 8,250,000 céntimos

describe('computeAnnualProjection (RMT 10% / 29.5%)', () => {
  it('renta neta dentro del tramo 10%', () => {
    const p = computeAnnualProjection({
      ventasBaseCents: 5000000, // 50,000
      comprasDeduciblesCents: 1000000, // 10,000
      otrosGastosCents: 0,
      pagosACuentaCents: 50000,
      uitCents: UIT,
    });
    expect(p.rentaNetaCents).toBe(4000000);
    expect(p.irEstimadoCents).toBe(400000); // 10%
    expect(p.regularizacionEstimadaCents).toBe(350000);
    expect(p.gastosFaltantesParaTramo10Cents).toBe(0);
  });

  it('cruce del tramo 15 UIT: 10% hasta el límite + 29.5% del exceso', () => {
    const rentaNeta = LIMITE_15_UIT + 1000000; // exceso de 10,000
    const p = computeAnnualProjection({
      ventasBaseCents: rentaNeta,
      comprasDeduciblesCents: 0,
      otrosGastosCents: 0,
      pagosACuentaCents: 0,
      uitCents: UIT,
    });
    expect(p.irEstimadoCents).toBe(Math.round(LIMITE_15_UIT * 0.1 + 1000000 * 0.295));
    expect(p.gastosFaltantesParaTramo10Cents).toBe(1000000);
  });

  it('exactamente en el límite sigue al 10% y no faltan gastos', () => {
    const p = computeAnnualProjection({
      ventasBaseCents: LIMITE_15_UIT,
      comprasDeduciblesCents: 0,
      otrosGastosCents: 0,
      pagosACuentaCents: 0,
      uitCents: UIT,
    });
    expect(p.irEstimadoCents).toBe(LIMITE_15_UIT * 0.1);
    expect(p.gastosFaltantesParaTramo10Cents).toBe(0);
  });

  it('renta neta no baja de 0 y la regularización puede ser saldo a favor', () => {
    const p = computeAnnualProjection({
      ventasBaseCents: 1000000,
      comprasDeduciblesCents: 2000000,
      otrosGastosCents: 0,
      pagosACuentaCents: 30000,
      uitCents: UIT,
    });
    expect(p.rentaNetaCents).toBe(0);
    expect(p.irEstimadoCents).toBe(0);
    expect(p.regularizacionEstimadaCents).toBe(-30000);
  });
});
