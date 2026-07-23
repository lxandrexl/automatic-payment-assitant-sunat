// Montos en céntimos enteros (PEN) para evitar flotantes — SPEC §3.

export function toCents(soles: number): number {
  return Math.round(soles * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

const penFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Formato de mensajes/UI: "S/ 1,274.40" — SPEC §6.
export function formatPen(cents: number): string {
  return `S/ ${penFormat.format(cents / 100)}`;
}
