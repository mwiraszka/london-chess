import { Request } from 'express';

import { MemberRecord } from '../models/member.model';
import { isAllowedOrigin } from './allowed-origins.util';

export const EMAILS_FROM_SITE_ONLY =
  'Member emails can only be sent from the London Chess website.';

// Links in member emails lead back to the site the change was saved from
export function siteUrlFor(req: Pick<Request, 'header'>): string | null {
  const origin = req.header('origin');
  return origin && isAllowedOrigin(origin) ? origin : null;
}

export function profileUrlFor(
  siteUrl: string,
  record: Pick<MemberRecord, 'number'>,
): string {
  if (typeof record.number !== 'number') {
    throw new Error('The member has no member number.');
  }
  return `${siteUrl}/members/${record.number}`;
}
