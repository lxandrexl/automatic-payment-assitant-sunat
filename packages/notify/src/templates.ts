// Plantillas centralizadas de los mensajes (SPEC §6). Texto plano, emojis moderados,
// montos "S/ 1,274.40" y fechas "mar 18/08/2026".

import { formatFechaLima, formatPen } from '@tributo/core';

const ESTIMATED_SUFFIX = '\n⚠️ fecha estimada — confirmar cronograma oficial';

export interface DueReminderData {
  period: string;
  dueDateIso: string;
  daysBefore: number; // 0 = hoy vence
  estimated: boolean;
  igvPagarCents: number;
  pagoCuentaCents: number;
  npsEstimadoCents: number;
  /** Pago a cuenta de 4ta del mes (F.616, mismo vencimiento). 0 = no aplica. */
  pago616Cents?: number;
}

export function dueReminderMsg(d: DueReminderData): string {
  const cuando = d.daysBefore === 0 ? '🔴 VENCE HOY' : `⏰ Faltan ${d.daysBefore} día(s)`;
  const declaraciones = d.pago616Cents ? 'F.621 + F.616' : 'F.621';
  let base =
    `${cuando} — Declaración ${declaraciones} periodo ${d.period}\n` +
    `Vencimiento: ${formatFechaLima(d.dueDateIso)}\n` +
    `IGV a pagar: ${formatPen(d.igvPagarCents)}\n` +
    `Pago a cuenta 3ra: ${formatPen(d.pagoCuentaCents)}\n` +
    `NPS estimado: ${formatPen(d.npsEstimadoCents)}`;
  if (d.pago616Cents) {
    base += `\nF.616 (4ta, RxH sin retención): ${formatPen(d.pago616Cents)}`;
  }
  return d.estimated ? base + ESTIMATED_SUFFIX : base;
}

export function buzonMsg(subject: string): string {
  return `📬 Notificación SUNAT: ${subject}`;
}

export interface DetraccionAlertData {
  period: string;
  amountCents: number;
  depositDueDateIso: string;
}

export function detraccionOverdueMsg(d: DetraccionAlertData): string {
  return (
    `🔴 Detracción VENCIDA (${d.period}) — ${formatPen(d.amountCents)}\n` +
    `Límite era ${formatFechaLima(d.depositDueDateIso)}. Reclamar la constancia al cliente.`
  );
}

export function detraccionSoonMsg(d: DetraccionAlertData): string {
  return (
    `⏰ Detracción por vencer (${d.period}) — ${formatPen(d.amountCents)}\n` +
    `Depositar hasta ${formatFechaLima(d.depositDueDateIso)}.`
  );
}

export interface DigestData {
  prevPeriod: string;
  facturadoCents: number;
  comprasCents: number;
  igvPagarCents: number;
  declaracionStatus: string;
}

export function monthlyDigestMsg(d: DigestData): string {
  return (
    `📊 Resumen ${d.prevPeriod}\n` +
    `Facturado: ${formatPen(d.facturadoCents)}\n` +
    `Compras: ${formatPen(d.comprasCents)}\n` +
    `IGV estimado a pagar: ${formatPen(d.igvPagarCents)}\n` +
    `Declaración: ${d.declaracionStatus}`
  );
}
