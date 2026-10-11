// Formateo para el browser. Reusa @tributo/core (funciones puras, corren en el cliente).
import { formatPen } from '@tributo/core';

export { formatPen };

export function formatFecha(iso: string): string {
  // iso puede venir como "2026-08-18" o ISO completo; tomamos la parte de fecha.
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export function soles(cents: number): number {
  return cents / 100;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** "2026-09" -> "Setiembre 2026" */
export function formatPeriodo(period: string): string {
  const [y, m] = period.split('-');
  return `${MESES[Number(m) - 1] ?? m} ${y}`;
}

/** "2026-10-15" -> "15 oct 2026" */
export function formatFechaCorta(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${Number(d)} ${(MESES[Number(m) - 1] ?? m).slice(0, 3).toLowerCase()} ${y}`;
}

export function diasHasta(todayIso: string, dueIso: string): number {
  const a = new Date(`${todayIso}T00:00:00Z`).getTime();
  const b = new Date(`${dueIso.slice(0, 10)}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function diasLabel(days: number): string {
  if (days < 0) return `vencido hace ${-days} d`;
  if (days === 0) return 'vence HOY';
  if (days === 1) return 'vence mañana';
  return `faltan ${days} días`;
}

/** Dólares: "US$ 2,800.00" (céntimos enteros). */
export function formatUsd(cents: number): string {
  return `US$ ${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
