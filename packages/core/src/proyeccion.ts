// Proyección anual informativa (SPEC §4.5). RMT: IR 10% hasta 15×UIT, 29.5% el exceso.

export interface AnnualProjectionInput {
  ventasBaseCents: number; // Σ ventasBase del año
  comprasDeduciblesCents: number; // Σ compras con deductibleIR
  otrosGastosCents: number; // campo editable en settings
  pagosACuentaCents: number; // Σ pagos a cuenta del año
  uitCents: number;
}

export interface AnnualProjection {
  rentaNetaCents: number;
  irEstimadoCents: number;
  regularizacionEstimadaCents: number; // negativo = saldo a favor
  gastosFaltantesParaTramo10Cents: number;
}

export function computeAnnualProjection(i: AnnualProjectionInput): AnnualProjection {
  const rentaNetaCents = Math.max(
    0,
    i.ventasBaseCents - i.comprasDeduciblesCents - i.otrosGastosCents,
  );
  const limiteCents = 15 * i.uitCents;
  const irEstimadoCents =
    rentaNetaCents <= limiteCents
      ? Math.round(rentaNetaCents * 0.1)
      : Math.round(limiteCents * 0.1 + (rentaNetaCents - limiteCents) * 0.295);
  return {
    rentaNetaCents,
    irEstimadoCents,
    regularizacionEstimadaCents: irEstimadoCents - i.pagosACuentaCents,
    gastosFaltantesParaTramo10Cents: Math.max(0, rentaNetaCents - limiteCents),
  };
}
