import { Controller, InternalServerErrorException, Module, Post } from '@nestjs/common';
import { sendEmail, sendTelegram } from '@tributo/notify';

// POST /notify/test (SPEC §5): mensaje de prueba a Telegram y email.
// Las credenciales son opcionales en la api (el worker es quien notifica en régimen);
// aquí se leen de env solo para la prueba manual desde /config.
@Controller('notify')
class NotifyController {
  @Post('test')
  async test() {
    const results: Record<string, string> = {};
    const text = '✅ Tributo: notificación de prueba';

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (botToken && chatId) {
      await sendTelegram({ botToken, chatId }, text);
      results.telegram = 'enviado';
    } else {
      results.telegram = 'sin credenciales (TELEGRAM_BOT_TOKEN/CHAT_ID)';
    }

    const smtpUser = process.env.SMTP_USER;
    const smtpAppPassword = process.env.SMTP_APP_PASSWORD;
    if (smtpUser && smtpAppPassword) {
      await sendEmail(
        { smtpUser, smtpAppPassword, to: process.env.NOTIFY_EMAIL ?? smtpUser },
        '[Tributo] Prueba',
        text,
      );
      results.email = 'enviado';
    } else {
      results.email = 'sin credenciales (SMTP_USER/APP_PASSWORD)';
    }

    if (results.telegram !== 'enviado' && results.email !== 'enviado') {
      throw new InternalServerErrorException('No hay credenciales de notificación configuradas');
    }
    return results;
  }
}

@Module({ controllers: [NotifyController] })
export class NotifyModule {}
