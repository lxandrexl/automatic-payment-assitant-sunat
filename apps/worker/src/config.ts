// Config del worker desde env (SPEC §8.4).

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} es requerido`);
  return v;
}

export interface WorkerConfig {
  mongoUri: string;
  telegram: { botToken: string; chatId: string };
  email: { smtpUser: string; smtpAppPassword: string; to: string };
  imap: { user: string; password: string };
}

export function loadConfig(): WorkerConfig {
  const smtpUser = req('SMTP_USER');
  const smtpAppPassword = req('SMTP_APP_PASSWORD');
  return {
    mongoUri: req('MONGODB_URI'),
    telegram: { botToken: req('TELEGRAM_BOT_TOKEN'), chatId: req('TELEGRAM_CHAT_ID') },
    email: { smtpUser, smtpAppPassword, to: process.env.NOTIFY_EMAIL ?? smtpUser },
    imap: { user: smtpUser, password: smtpAppPassword },
  };
}
