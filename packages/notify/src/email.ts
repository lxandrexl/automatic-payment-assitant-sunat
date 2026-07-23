// Email de respaldo por SMTP Gmail (app password). SPEC §1/§8.4.

import nodemailer from 'nodemailer';

export interface EmailConfig {
  smtpUser: string;
  smtpAppPassword: string;
  to: string;
}

export async function sendEmail(cfg: EmailConfig, subject: string, text: string): Promise<void> {
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: cfg.smtpUser, pass: cfg.smtpAppPassword },
  });
  await transport.sendMail({ from: cfg.smtpUser, to: cfg.to, subject, text });
}
