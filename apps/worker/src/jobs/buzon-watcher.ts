import { ImapFlow } from 'imapflow';
import { buzonMsg } from '@tributo/notify';
import { loadConfig } from '../config';
import { sendOnce } from '../notify';
import { logger } from '../logger';

// SPEC §6 buzon-watcher — cada 15 min. IMAP a Gmail, correos de SUNAT de los últimos 2 días.
// NUNCA se parsea/almacena el cuerpo: solo subject + Message-ID para dedupe.
export async function buzonWatcher(): Promise<void> {
  const cfg = loadConfig();
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: cfg.imap.user, pass: cfg.imap.password },
    logger: false,
  });

  await client.connect();
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const since = new Date(Date.now() - 2 * 86_400_000);
      for await (const msg of client.fetch(
        { from: 'sunat.gob.pe', since },
        { envelope: true },
      )) {
        const messageId = msg.envelope?.messageId;
        const subject = msg.envelope?.subject ?? '(sin asunto)';
        if (!messageId) continue;
        const sent = await sendOnce(`buzon:${messageId}`, 'BUZON_SOL', buzonMsg(subject));
        if (sent) logger.info({ subject }, 'notificación SUNAT reenviada');
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}
