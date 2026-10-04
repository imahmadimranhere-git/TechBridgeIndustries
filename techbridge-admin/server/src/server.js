import { closeBrowser } from './services/PdfService.js';
import createApp from './app.js';
import env from './config/env.js';
import logger from './config/logger.js';
import { connectDB, disconnectDB } from './config/db.js';
import { closeMail } from './services/MailService.js';

// Extra cleanup added by later phases (cron jobs in Phase 14, Puppeteer browser in Phase 10)
const shutdownTasks = [closeBrowser, closeMail];

async function start() {
  await connectDB();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 API ready at ${env.SERVER_URL}/api  (${env.NODE_ENV})`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${env.PORT} is already in use. Close the other server or change PORT in .env`);
    } else {
      logger.error(`Server error: ${err.message}`);
    }
    process.exit(1);
  });

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down gracefully...`);

    server.close(async () => {
      for (const task of shutdownTasks) {
        await task().catch((err) => logger.error(`Shutdown task failed: ${err.message}`));
      }
      await disconnectDB().catch(() => {});
      logger.info('Goodbye 👋');
      process.exit(0);
    });

    // Don't hang forever if a request never finishes
    setTimeout(() => {
      logger.error('Forced shutdown after 10 seconds');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled promise rejection: ${reason?.stack || reason}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.stack || err.message}`);
  process.exit(1);
});

start().catch((err) => {
  logger.error(`Failed to start server: ${err.message}`);
  process.exit(1);
});