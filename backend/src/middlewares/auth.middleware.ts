import { createClerkClient, verifyToken } from '@clerk/backend';
import { NextFunction, Request, Response } from 'express';

import { ApiErrorResponse } from '../models/api-response.model';
import { User, UserModel } from '../models/user.model';
import { ensureUser } from '../services/users.service';

const { CLERK_SECRET_KEY } = process.env;
if (!CLERK_SECRET_KEY) {
  throw new Error('Unable to parse Clerk environment variables.');
}

export const clerkClient = createClerkClient({ secretKey: CLERK_SECRET_KEY });

export function isClerkAdmin(publicMetadata: Readonly<Record<string, unknown>>): boolean {
  return publicMetadata['isAdmin'] === true;
}

export const authenticate = async (
  req: Request,
  res: Response<ApiErrorResponse>,
  next: NextFunction,
) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized.' });
    return;
  }

  let clerkId: string;
  let sessionId: string;
  try {
    const payload = await verifyToken(authorization.slice('Bearer '.length), {
      secretKey: CLERK_SECRET_KEY,
    });
    clerkId = payload.sub;
    sessionId = payload.sid;
  } catch {
    res.status(401).json({ message: 'Unable to validate session token.' });
    return;
  }

  let user: User | null = (await UserModel.findOne({ id: clerkId }))?.toObject() ?? null;

  // Webhook race: lazy-create if not yet synced
  if (!user) {
    try {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      user = await ensureUser({
        id: clerkId,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
        firstName: clerkUser.firstName ?? '',
        lastName: clerkUser.lastName ?? '',
        imageUrl: clerkUser.imageUrl,
        hasImage: clerkUser.hasImage,
        isAdmin: isClerkAdmin(clerkUser.publicMetadata),
      });
    } catch {
      // Lazy-create failed; continue with an unprivileged user
    }
  }

  req.user = { id: clerkId, sessionId, isAdmin: user?.isAdmin ?? false };
  next();
};

export const requireAdmin = (
  req: Request,
  res: Response<ApiErrorResponse>,
  next: NextFunction,
) => {
  if (!req.user.isAdmin) {
    res.status(403).json({ message: 'Forbidden.' });
    return;
  }
  next();
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: { id: string; sessionId: string; isAdmin: boolean };
    }
  }
}
