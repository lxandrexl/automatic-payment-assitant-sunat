// Cálculo de comprobantes (SPEC §4.2). Todo en céntimos enteros.

export interface CalcSettings {
  igvRate: number; // 0.18
  detraccionRate: number; // 0.12
  detraccionThresholdCents: number; // 70000 (S/ 700)
  pagoCuentaRate: number; // 0.01
  retencion4taRate: number; // 0.08
}

/** RxH: la retención aplica solo si el bruto supera S/ 1,500 (regla SUNAT 4ta categoría). */
export const RXH_RETENCION_THRESHOLD_CENTS = 1500_00;

export interface DetraccionCalc {
  /** Depósito esperado, redondeado a soles enteros (práctica del sistema de detracciones). */
  amountCents: number;
  /** 12% exacto, para conciliar. */
  exactAmountCents: number;
}

export interface FacturaCalc {
  igvCents: number;
  totalCents: number;
  detraccion: DetraccionCalc | null;
  /** Lo que transfiere el cliente: total − detracción (o total si no aplica). */
  netCents: number;
}

export function computeFactura(baseCents: number, s: CalcSettings): FacturaCalc {
  const igvCents = Math.round(baseCents * s.igvRate);
  const totalCents = baseCents + igvCents;
  let detraccion: DetraccionCalc | null = null;
  if (totalCents > s.detraccionThresholdCents) {
    const exactAmountCents = Math.round(totalCents * s.detraccionRate);
    detraccion = {
      amountCents: Math.round(exactAmountCents / 100) * 100,
      exactAmountCents,
    };
  }
  return { igvCents, totalCents, detraccion, netCents: totalCents - (detraccion?.amountCents ?? 0) };
}

export interface RxhCalc {
  retencionCents: number;
  netCents: number;
}

export function computeRxh(brutoCents: number, s: CalcSettings): RxhCalc {
  const retencionCents =
    brutoCents > RXH_RETENCION_THRESHOLD_CENTS ? Math.round(brutoCents * s.retencion4taRate) : 0;
  return { retencionCents, netCents: brutoCents - retencionCents };
}

/**
 * Un depósito "matchea" si cae entre el exacto y el redondeado, con ±1 sol de margen (SPEC §4.2).
 * Caso base: exacto 1,274.40 / redondeado 1,274.00 → acepta [1,273.00 .. 1,275.40].
 */
export function isDetraccionDepositMatch(depositCents: number, det: DetraccionCalc): boolean {
  const lo = Math.min(det.exactAmountCents, det.amountCents) - 100;
  const hi = Math.max(det.exactAmountCents, det.amountCents) + 100;
  return depositCents >= lo && depositCents <= hi;
}
