import { describe, expect, it } from 'vitest';
import type { CalcSettings } from '../src/calculos';
import {
  computeChainedSummaries,
  computePeriodSummary,
  type InvoiceForSummary,
  type PurchaseForSummary,
} from '../src/summary';

const S: CalcSettings = {
  igvRate: 0.18,
  detraccionRate: 0.12,
  detraccionThresholdCents: 700_00,
  pagoCuentaRate: 0.01,
  retencion4taRate: 0.08,
};

const facturaTipo = (over: Partial<InvoiceForSummary> = {}): InvoiceForSummary => ({
  kind: 'FACTURA',
  status: 'ISSUED',
  baseCents: 900000,
  igvCents: 162000,
  detraccion: { status: 'PENDING', amountCents: 127400 },
  ...over,
});

const compra = (baseCents: number, creditFiscal = true): PurchaseForSummary => ({
  baseCents,
  igvCents: Math.round(baseCents * 0.18),
  creditFiscal,
});

describe('computePeriodSummary', () => {
  it('mes tipo del SPEC: 1 factura + compras con crédito', () => {
    const s = computePeriodSummary([facturaTipo()], [compra(100000), compra(50000)], S);
    expect(s.ventasBaseCents).toBe(900000);
    expect(s.igvVentasCents).toBe(162000);
    expect(s.comprasBaseCents).toBe(150000);
    expect(s.igvComprasCents).toBe(27000);
    expect(s.igvPagarCents).toBe(135000);
    expect(s.saldoFavorCents).toBe(0);
    expect(s.pagoCuentaCents).toBe(9000); // 1% de 9,000
    expect(s.totalMesCents).toBe(144000);
    expect(s.detrDisponibleEstimadaCents).toBe(0); // detracción aún PENDING
    expect(s.npsEstimadoCents).toBe(144000);
  });

  it('excluye VOIDED y RXH de ventas; compras sin crédito no suman IGV', () => {
    const s = computePeriodSummary(
      [
        facturaTipo({ status: 'VOIDED' }),
        { kind: 'RXH', status: 'ISSUED', baseCents: 900000, igvCents: 0 },
      ],
      [compra(100000, false)],
      S,
    );
    expect(s.ventasBaseCents).toBe(0);
    expect(s.igvComprasCents).toBe(0);
    expect(s.pagoCuentaCents).toBe(0);
    expect(s.saldoFavorCents).toBe(0);
  });

  it('detracción DEPOSITED reduce el NPS estimado', () => {
    const s = computePeriodSummary(
      [facturaTipo({ detraccion: { status: 'DEPOSITED', amountCents: 127400 } })],
      [],
      S,
    );
    expect(s.detrDisponibleEstimadaCents).toBe(127400);
    expect(s.npsEstimadoCents).toBe(162000 + 9000 - 127400);
  });

  it('saldo a favor anterior reduce IGV a pagar y el excedente arrastra', () => {
    // IGV ventas 162,000; saldo anterior 200,000 → paga 0 y arrastra 38,000
    const s = computePeriodSummary([facturaTipo()], [], S, 200000);
    expect(s.igvPagarCents).toBe(0);
    expect(s.saldoFavorCents).toBe(38000);
    expect(s.totalMesCents).toBe(9000); // solo pago a cuenta
  });
});

describe('computeChainedSummaries (arrastre en cadena, SPEC §4.4)', () => {
  it('arrastra saldo a favor entre periodos', () => {
    // Mes 1: solo compras grandes → saldo a favor. Mes 2: factura → usa el saldo.
    const out = computeChainedSummaries(
      [
        { period: '2026-07', invoices: [], purchases: [compra(1000000)] }, // IGV 180,000
        { period: '2026-08', invoices: [facturaTipo()], purchases: [] }, // IGV ventas 162,000
        { period: '2026-09', invoices: [facturaTipo()], purchases: [] },
      ],
      S,
    );
    expect(out.get('2026-07')!.saldoFavorCents).toBe(180000);
    const ago = out.get('2026-08')!;
    expect(ago.igvPagarCents).toBe(0); // 162,000 − 180,000
    expect(ago.saldoFavorCents).toBe(18000);
    const sep = out.get('2026-09')!;
    expect(sep.igvPagarCents).toBe(144000); // 162,000 − 18,000
    expect(sep.saldoFavorCents).toBe(0);
  });

  it('rechaza periodos fuera de orden', () => {
    expect(() =>
      computeChainedSummaries(
        [
          { period: '2026-08', invoices: [], purchases: [] },
          { period: '2026-07', invoices: [], purchases: [] },
        ],
        S,
      ),
    ).toThrow(/fuera de orden/);
  });
});
