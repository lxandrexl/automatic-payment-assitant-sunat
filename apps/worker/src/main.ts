import cron from 'node-cron';
import { connect } from './db';
import { loadConfig } from './config';
import { logger } from './logger';
import { runJob } from './runner';
import { dueReminders } from './jobs/due-reminders';
import { detraccionCheck } from './jobs/detraccion-check';
import { buzonWatcher } from './jobs/buzon-watcher';
import { monthlyDigest } from './jobs/monthly-digest';
import { periodBootstrap } from './jobs/period-bootstrap';

const TZ = { timezone: 'America/Lima' } as const;

async function main() {
  const cfg = loadConfig();
  await connect(cfg.mongoUri);
  logger.info('worker conectado a Mongo; programando jobs (America/Lima)');

  // SPEC §6 — todos en hora de Lima.
  cron.schedule('0 9 * * *', () => void runJob('due-reminders', dueReminders), TZ);
  cron.schedule('0 9 * * *', () => void runJob('detraccion-check', detraccionCheck), TZ);
  cron.schedule('*/15 * * * *', () => void runJob('buzon-watcher', buzonWatcher), TZ);
  cron.schedule('0 9 1 * *', () => void runJob('monthly-digest', monthlyDigest), TZ);
  cron.schedule('0 1 1 * *', () => void runJob('period-bootstrap', periodBootstrap), TZ);

  logger.info('jobs programados');
}

main().catch((err) => {
  logger.error({ err }, 'fallo al arrancar el worker');
  process.exit(1);
});
