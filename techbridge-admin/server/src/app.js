import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';
import morgan from 'morgan';
import env from './config/env.js';
import { morganStream } from './config/logger.js';
import { UPLOAD_ROOT } from './config/paths.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimit.js';
import apiRoutes from './routes/index.js';

export function createApp() {
  const app = express();

  // Behind Nginx in production: trust the first proxy so req.ip is the real visitor IP
  app.set('trust proxy', env.isProduction ? 1 : false);

  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());
  app.use(mongoSanitize());

  if (!env.isTest) {
    app.use(morgan(env.isProduction ? 'combined' : 'tiny', { stream: morganStream }));
  }

  // Uploaded images (random file names). Allowed to be shown by the React app on another port/domain.
  app.use(
    '/uploads',
    express.static(UPLOAD_ROOT, {
      maxAge: '7d',
      index: false,
      dotfiles: 'deny',
      setHeaders: (res) => res.set('Cross-Origin-Resource-Policy', 'cross-origin'),
    })
  );

  app.use('/api', apiLimiter, apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;