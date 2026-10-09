import { Request } from 'express';

import { isAllowedOrigin } from './allowed-origins.util';

export const EMAILS_FROM_SITE_ONLY =
  'Member emails can only be sent from the London Chess website.';

// Links in member emails lead back to the site the admin saved from
export function siteUrlFor(req: Pick<Request, 'header'>): string | null {
  const origin = req.header('origin');
  return origin && isAllowedOrigin(origin) ? origin : null;
}
