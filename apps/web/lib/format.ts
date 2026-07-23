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
