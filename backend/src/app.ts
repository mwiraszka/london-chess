import * as Sentry from '@sentry/node';
import cors, { CorsOptions } from 'cors';
import express, { NextFunction, Request, Response, Router } from 'express';

import { helloWorld } from './middlewares/hello-world.middleware';
import { logger } from './middlewares/logger.middleware';
import { version } from './middlewares/version.middleware';
import { articlesRouter } from './routers/articles.router';
import { eventsRouter } from './routers/events.router';
import { gamesRouter } from './routers/games.router';
import { imagesRouter } from './routers/images.router';
import { adminMembersRouter, publicMembersRouter } from './routers/members.router';
import { usersRouter } from './routers/users.router';
import { webhooksRouter } from './routers/webhooks.router';
import { connectToDatabase } from './services/mongo-db.service';
import { isAllowedOrigin } from './util/allowed-origins.util';

Sentry.init({
  dsn: process.env['SENTRY_DSN'],
  // Vercel injects VERCEL_ENV (production/preview); local runs report development
  environment: process.env['VERCEL_ENV'] ?? 'development',
  enabled: !!process.env['SENTRY_DSN'],
  tracesSampleRate: 0,
});

const router = Router()
  .use('/v1/test', helloWorld)
  .use('/v1/version', version)
  .use('/v1/articles', articlesRouter)
  .use('/v1/events', eventsRouter)
  .use('/v1/games', gamesRouter)
  .use('/v1/images', imagesRouter)
  .use('/v1/public/members', publicMembersRouter)
  .use('/v1/admin/members', adminMembersRouter)
  .use('/v1/users', usersRouter);

const corsOptions: CorsOptions = {
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires'],
  /**
   * Provides a status code to use for successful OPTIONS requests,
   * since some legacy browsers (IE11, various SmartTVs) choke on 204.
   */
  optionsSuccessStatus: 200,
  origin: (origin, callback) => {
    // Allow same-origin/non-browser requests (no Origin header) and Vercel previews.
    // Withholding the header rather than throwing keeps scanner probes out of the error log
    callback(null, !origin || isAllowedOrigin(origin));
  },
};

// Ensure a (cached) database connection before any route handler runs. In a
// long-running server this connects once; in serverless it reuses the warm pool.
const ensureDatabaseConnection = async (
  _req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    next(error);
  }
};

export const app = express();

app
  .use(cors(corsOptions))
  .use(logger)
  // Svix signature verification needs the raw request body, so this mounts before the JSON parser
  .use('/v1/webhooks', ensureDatabaseConnection, webhooksRouter)
  .use(express.json({ limit: '50MB' }))
  .use(express.urlencoded({ extended: true, limit: '50MB' }))
  .use(ensureDatabaseConnection)
  .use(router);

Sentry.setupExpressErrorHandler(app);
