import { Router, raw } from 'express';

import { handleClerkWebhook } from '../controllers/webhooks.controller';

export const webhooksRouter = Router().post(
  '/clerk',
  raw({ type: 'application/json' }),
  handleClerkWebhook,
);
