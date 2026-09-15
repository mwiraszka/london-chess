import { type WebhookEvent, verifyWebhook } from '@clerk/backend/webhooks';
import { Request, Response } from 'express';

import { ApiResponse } from '../models/api-response.model';
import {
  ClerkProfile,
  linkClerkUser,
  syncClerkUser,
  unlinkClerkUser,
} from '../services/member-accounts.service';

const { CLERK_WEBHOOK_SECRET } = process.env;
if (!CLERK_WEBHOOK_SECRET) {
  throw new Error('Unable to parse Clerk webhook environment variables.');
}

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

export interface ClerkUserEventData {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email_addresses?: ClerkEmailAddress[];
  primary_email_address_id?: string | null;
  image_url?: string;
  has_image?: boolean;
  public_metadata?: Record<string, unknown>;
}

export function toProfile(data: ClerkUserEventData): ClerkProfile {
  const primaryEmail =
    data.email_addresses?.find(address => address.id === data.primary_email_address_id) ??
    data.email_addresses?.[0];
  const memberId = data.public_metadata?.['memberId'];

  return {
    id: data.id,
    email: primaryEmail?.email_address ?? '',
    firstName: data.first_name ?? '',
    lastName: data.last_name ?? '',
    imageUrl: data.image_url ?? '',
    hasImage: data.has_image ?? false,
    isAdmin: data.public_metadata?.['isAdmin'] === true,
    memberId: typeof memberId === 'string' ? memberId : null,
  };
}

export async function handleClerkWebhook(
  req: Request,
  res: Response<ApiResponse<'success'>>,
): Promise<void> {
  const event = await verifyClerkWebhook(req);
  if (!event) {
    res.status(400).json({ message: 'Invalid webhook signature.' });
    return;
  }

  try {
    if (event.type === 'user.created') {
      await linkClerkUser(toProfile(event.data));
    } else if (event.type === 'user.updated') {
      await syncClerkUser(toProfile(event.data));
    } else if (event.type === 'user.deleted' && event.data.id) {
      await unlinkClerkUser(event.data.id);
    }

    res.status(200).json({ data: 'success' });
  } catch (error) {
    res.status(500).json({ message: `Unable to process webhook event: ${error}` });
  }
}

// Clerk's verifier takes a Fetch API request, so the raw body Express kept is passed on
// untouched, since any change to it would break the signature
export async function verifyClerkWebhook(
  req: Pick<Request, 'headers' | 'originalUrl' | 'body'>,
): Promise<WebhookEvent | null> {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    for (const item of [value].flat()) {
      if (item !== undefined) {
        headers.append(name, item);
      }
    }
  }

  try {
    return await verifyWebhook(
      new globalThis.Request(`http://localhost${req.originalUrl}`, {
        method: 'POST',
        headers,
        body: req.body as Buffer,
      }),
      { signingSecret: CLERK_WEBHOOK_SECRET },
    );
  } catch {
    return null;
  }
}
