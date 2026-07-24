// Liquidación del periodo para el dashboard (SPEC §4.4).

import { computePago616, type CalcSettings } from './calculos';

export interface InvoiceForSummary {
  kind: 'FACTURA' | 'RXH';
  status: 'ISSUED' | 'PAID' | 'VOIDED';
  baseCents: number;
  igvCents: number;
  detraccion?: { status: 'PENDING' | 'DEPOSITED' | 'OVERDUE'; amountCents: number } | null;
  retencionCents?: number; // solo RXH
}

export interface PurchaseForSummary {
  baseCents: number;
  igvCents: number;
  creditFiscal: boolean;
}

export interface PeriodSummary {
  ventasBaseCents: number;
  igvVentasCents: number;
  comprasBaseCents: number;
  igvComprasCents: number;
  igvPagarCents: number;
  saldoFavorCents: number;
  pagoCuentaCents: number;
  totalMesCents: number;
  detrDisponibleEstimadaCents: number;
  npsEstimadoCents: number;
  /** RxH del mes (4ta categoría, no entra al F.621). */
  rxhBrutoCents: number;
  /** Pago a cuenta de 4ta del mes (F.616): 8% del bruto − retenido. */
  pago616Cents: number;
}

export function computePeriodSummary(
  invoices: InvoiceForSummary[],
  purchases: PurchaseForSummary[],
  s: CalcSettings,
  saldoFavorAnteriorCents = 0,
): PeriodSummary {
  const facturas = invoices.filter((i) => i.kind === 'FACTURA' && i.status !== 'VOIDED');
  const ventasBaseCents = facturas.reduce((a, i) => a + i.baseCents, 0);
  const igvVentasCents = facturas.reduce((a, i) => a + i.igvCents, 0);
  const conCredito = purchases.filter((p) => p.creditFiscal);
  const comprasBaseCents = conCredito.reduce((a, p) => a + p.baseCents, 0);
  const igvComprasCents = conCredito.reduce((a, p) => a + p.igvCents, 0);

  const igvPagarCents = Math.max(0, igvVentasCents - igvComprasCents - saldoFavorAnteriorCents);
  const saldoFavorCents = Math.max(0, igvComprasCents + saldoFavorAnteriorCents - igvVentasCents);
  const pagoCuentaCents = Math.round(ventasBaseCents * s.pagoCuentaRate);
  const totalMesCents = igvPagarCents + pagoCuentaCents;
  const detrDisponibleEstimadaCents = facturas.reduce(
    (a, i) => a + (i.detraccion?.status === 'DEPOSITED' ? i.detraccion.amountCents : 0),
    0,
  );
  const rxhs = invoices.filter((i) => i.kind === 'RXH' && i.status !== 'VOIDED');
  const rxhBrutoCents = rxhs.reduce((a, i) => a + i.baseCents, 0);
  const rxhRetenidoCents = rxhs.reduce((a, i) => a + (i.retencionCents ?? 0), 0);
  return {
    ventasBaseCents,
    igvVentasCents,
    comprasBaseCents,
    igvComprasCents,
    igvPagarCents,
    saldoFavorCents,
    pagoCuentaCents,
    totalMesCents,
    detrDisponibleEstimadaCents,
    npsEstimadoCents: Math.max(0, totalMesCents - detrDisponibleEstimadaCents),
    rxhBrutoCents,
    pago616Cents: computePago616(rxhBrutoCents, rxhRetenidoCents, s.retencion4taRate),
  };
}

export interface PeriodData {
  period: string; // "YYYY-MM"
  invoices: InvoiceForSummary[];
  purchases: PurchaseForSummary[];
}

/**
 * DECISIÓN SPEC §4.4: el saldo a favor se computa EN CADENA desde el primer periodo
 * (el volumen es mínimo). Los periodos deben venir en orden; se valida.
 */
export function computeChainedSummaries(
  periods: PeriodData[],
  s: CalcSettings,
): Map<string, PeriodSummary> {
  const out = new Map<string, PeriodSummary>();
  let saldo = 0;
  let prev = '';
  for (const p of periods) {
    if (p.period <= prev) throw new Error(`Periodos fuera de orden: ${prev} → ${p.period}`);
    prev = p.period;
    const summary = computePeriodSummary(p.invoices, p.purchases, s, saldo);
    saldo = summary.saldoFavorCents;
    out.set(p.period, summary);
  }
  return out;
}
