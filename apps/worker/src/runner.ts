import { sendTelegram } from '@tributo/notify';
import { loadConfig } from './config';
import { logger } from './logger';

const FAIL_THRESHOLD = 3; // SPEC §6: alerta SYSTEM si un job falla 3 ejecuciones seguidas.
const consecutiveFails = new Map<string, number>();

/** Corre un job capturando errores; tras 3 fallos seguidos avisa por Telegram. */
export async function runJob(name: string, fn: () => Promise<void>): Promise<void> {
  const started = Date.now();
  try {
    await fn();
    consecutiveFails.set(name, 0);
    logger.info({ job: name, ms: Date.now() - started }, 'job ok');
  } catch (err) {
    const fails = (consecutiveFails.get(name) ?? 0) + 1;
    consecutiveFails.set(name, fails);
    logger.error({ job: name, err, fails }, 'job falló');
    if (fails >= FAIL_THRESHOLD) {
      try {
        await sendTelegram(
          loadConfig().telegram,
          `⚠️ SYSTEM: el job "${name}" falló ${fails} veces seguidas. Revisar el worker.`,
        );
      } catch (e2) {
        logger.error({ err: e2 }, 'no se pudo enviar la alerta SYSTEM');
      }
    }
  }
}
