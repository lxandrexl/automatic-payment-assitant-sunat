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
  /**
   * Lo que transfiere el cliente = total − detracción EXACTA (no la redondeada).
   * El depósito al Banco de la Nación se redondea a soles enteros (amountCents),
   * pero el "monto neto pendiente de pago" de la factura SUNAT usa el exacto.
   * Caso base §0: 10,620 − 1,274.40 = 9,345.60 (no 9,346.00).
   */
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
  return {
    igvCents,
    totalCents,
    detraccion,
    netCents: totalCents - (detraccion?.exactAmountCents ?? 0),
  };
}

export interface RxhCalc {
  retencionCents: number;
  netCents: number;
}

/**
 * `pagadorRetiene`: false cuando el cliente es NO domiciliado (ej. empresa chilena) —
 * un no domiciliado no es agente de retención de SUNAT, cobra el bruto completo y el
 * pago a cuenta lo hace el emisor vía F.616 (ver computePago616).
 */
export function computeRxh(brutoCents: number, s: CalcSettings, pagadorRetiene = true): RxhCalc {
  const retencionCents =
    pagadorRetiene && brutoCents > RXH_RETENCION_THRESHOLD_CENTS
      ? Math.round(brutoCents * s.retencion4taRate)
      : 0;
  return { retencionCents, netCents: brutoCents - retencionCents };
}

/**
 * Pago a cuenta mensual de 4ta (F.616): 8% del bruto del mes menos lo ya retenido.
 * Vence con el mismo cronograma que el F.621.
 */
export function computePago616(
  brutoMesCents: number,
  retenidoMesCents: number,
  retencion4taRate: number,
): number {
  return Math.max(0, Math.round(brutoMesCents * retencion4taRate) - retenidoMesCents);
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
