// Envío idempotente (SPEC §3.5): el alert con dedupeKey único es la reserva.
// Si ya existe (duplicado) → no se reenvía. Si el envío falla tras insertar,
// se borra el alert para reintentar en la próxima corrida.

import { sendEmail, sendTelegram } from '@tributo/notify';
import { AlertModel } from './db';
import { loadConfig } from './config';
import { logger } from './logger';

type AlertType =
  | 'DUE_REMINDER'
  | 'BUZON_SOL'
  | 'DETRACCION_PENDING'
  | 'DETRACCION_OVERDUE'
  | 'MONTHLY_DIGEST'
  | 'SYSTEM';

const cfg = loadConfig();

function isDuplicateKeyError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: number }).code === 11000;
}

/**
 * Envía por Telegram una sola vez por dedupeKey. Devuelve true si envió, false si ya existía.
 */
export async function sendOnce(dedupeKey: string, type: AlertType, text: string): Promise<boolean> {
  try {
    await AlertModel.create({
      dedupeKey,
      type,
      channel: 'TELEGRAM',
      sentAt: new Date(),
      payloadPreview: text.slice(0, 200),
    });
  } catch (e) {
    if (isDuplicateKeyError(e)) return false; // ya enviado
    throw e;
  }

  try {
    await sendTelegram(cfg.telegram, text);
    return true;
  } catch (e) {
    // Deshacer la reserva para reintentar luego; intentar email de respaldo.
    await AlertModel.deleteOne({ dedupeKey });
    logger.error({ err: e, dedupeKey }, 'fallo envío Telegram; se reintentará');
    try {
      await sendEmail(cfg.email, `[Tributo] ${type}`, text);
      logger.warn({ dedupeKey }, 'enviado por email de respaldo (Telegram falló)');
    } catch (e2) {
      logger.error({ err: e2, dedupeKey }, 'también falló el email de respaldo');
    }
    return false;
  }
}
