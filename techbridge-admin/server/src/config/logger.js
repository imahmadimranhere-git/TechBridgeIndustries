import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import winston from 'winston';
import env from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logDir = path.resolve(__dirname, '../../logs');
fs.mkdirSync(logDir, { recursive: true });

const { combine, timestamp, errors, json, colorize, printf, splat } = winston.format;

// Human-friendly format for the terminal
const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp: time, stack }) => `${time} ${level}: ${stack || message}`)
);

const FIVE_MB = 5 * 1024 * 1024;

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  // Structured JSON format for log files
  format: combine(errors({ stack: true }), splat(), timestamp(), json()),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: FIVE_MB,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: FIVE_MB,
      maxFiles: 5,
    }),
  ],
});

if (!env.isTest) {
  logger.add(new winston.transports.Console({ format: consoleFormat }));
}

// Used by morgan to send HTTP request logs through winston
export const morganStream = {
  write: (message) => logger.http(message.trim()),
};

export default logger;