// Cliente Telegram: un POST a sendMessage. Sin librería (fetch nativo de Node 22).

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export async function sendTelegram(cfg: TelegramConfig, text: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: cfg.chatId, text, disable_web_page_preview: true }),
  });
  if (!res.ok) {
    throw new Error(`Telegram ${res.status}: ${await res.text()}`);
  }
}
