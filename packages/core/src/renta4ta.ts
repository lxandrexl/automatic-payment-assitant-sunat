// Liquidación anual de renta de 4ta categoría (persona natural), Art. 45/46/53 LIR.
// Modelo tomado del plan financiero del dueño (hoja RXH_4TA):
// bruto − 20% (tope 24 UIT) − 7 UIT − gastos 3 UIT → escala 8/14/17/20/30% − créditos.

export interface Renta4taInput {
  brutoAnualCents: number; // Σ RxH emitidos del año
  retencionesCents: number; // Σ retenciones sufridas (8% de clientes domiciliados)
  pagosCuentaCents: number; // Σ pagos F.616 del año
  gastos3UitCents: number; // deducción adicional acreditada (editable en settings)
  uitCents: number;
}

export interface Renta4taProjection {
  deduccion20Cents: number;
  rentaNeta4taCents: number;
  rentaNetaTrabajoCents: number;
  irAnualCents: number;
  /** IR menos retenciones y pagos a cuenta. Negativo = saldo a favor. */
  saldoCents: number;
}

// Escala progresiva de rentas del trabajo (Art. 53 LIR): tramos en UIT acumuladas.
const TRAMOS: [number, number][] = [
  [5, 0.08],
  [20, 0.14],
  [35, 0.17],
  [45, 0.2],
  [Infinity, 0.3],
];

export function irEscalaTrabajo(rentaNetaCents: number, uitCents: number): number {
  let tax = 0;
  let prev = 0;
  for (const [uitTope, rate] of TRAMOS) {
    const capCents = uitTope === Infinity ? Infinity : uitTope * uitCents;
    const slice = Math.min(rentaNetaCents, capCents) - prev;
    if (slice <= 0) break;
    tax += slice * rate;
    prev = capCents;
  }
  return Math.round(tax);
}

export function computeAnnualRenta4ta(i: Renta4taInput): Renta4taProjection {
  const deduccion20Cents = Math.min(Math.round(i.brutoAnualCents * 0.2), 24 * i.uitCents);
  const rentaNeta4taCents = i.brutoAnualCents - deduccion20Cents;
  const gastos = Math.min(i.gastos3UitCents, 3 * i.uitCents);
  const rentaNetaTrabajoCents = Math.max(0, rentaNeta4taCents - 7 * i.uitCents - gastos);
  const irAnualCents = irEscalaTrabajo(rentaNetaTrabajoCents, i.uitCents);
  return {
    deduccion20Cents,
    rentaNeta4taCents,
    rentaNetaTrabajoCents,
    irAnualCents,
    saldoCents: irAnualCents - i.retencionesCents - i.pagosCuentaCents,
  };
}
