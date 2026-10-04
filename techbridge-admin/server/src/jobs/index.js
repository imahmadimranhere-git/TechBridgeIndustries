import cron from 'node-cron';
import env from '../config/env.js';
import logger from '../config/logger.js';
import { markOverdueInvoices } from './overdueInvoices.js';

const DEFAULT_OVERDUE_CRON = '0 1 * * *';

/**
 * Wraps a job so that:
 *  - an error is logged instead of crashing the server
 *  - a slow run is never started twice at the same time
 */
function guarded(name, task) {
  let running = false;
  return async () => {
    if (running) {
      logger.warn(`Job "${name}" is still running; skipping this turn`);
      return;
    }
    running = true;
    try {
      await task();
    } catch (err) {
      logger.error(`Job "${name}" failed: ${err.stack || err.message}`);
    } finally {
      running = false;
    }
  };
}

/**
 * Starts all scheduled jobs. Returns an async stop() used on shutdown.
 */
export function startJobs() {
  let expression = env.OVERDUE_CRON;
  if (!cron.validate(expression)) {
    logger.warn(`OVERDUE_CRON "${expression}" is not a valid cron expression; using "${DEFAULT_OVERDUE_CRON}"`);
    expression = DEFAULT_OVERDUE_CRON;
  }

  const runOverdue = guarded('overdue-invoices', () => markOverdueInvoices());

  const task = cron.schedule(expression, runOverdue, {
    timezone: env.APP_TIMEZONE,
    name: 'overdue-invoices',
  });
  logger.info(`Job scheduled: overdue invoices at "${expression}" (${env.APP_TIMEZONE})`);

  // Catch up right away, in case the server was off at the scheduled time
  runOverdue();

  return async function stopJobs() {
    task.stop();
    logger.info('Scheduled jobs stopped');
  };
}