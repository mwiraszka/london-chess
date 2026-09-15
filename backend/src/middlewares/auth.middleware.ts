import { verifyToken } from '@clerk/backend';
import { NextFunction, Request, Response } from 'express';

import { ApiErrorResponse } from '../models/api-response.model';
import { clerkClient, clerkSecretKey } from '../services/clerk.service';
import {
  findLinkedMember,
  linkClerkUser,
  toClerkProfile,
} from '../services/member-accounts.service';

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
      secretKey: clerkSecretKey,
    });
    clerkId = payload.sub;
    sessionId = payload.sid;
  } catch {
    res.status(401).json({ message: 'Unable to validate session token.' });
    return;
  }

  let member = await findLinkedMember(clerkId);

  // Webhook race: link the account from its Clerk metadata if not yet synced
  if (!member) {
    try {
      member = await linkClerkUser(
        toClerkProfile(await clerkClient.users.getUser(clerkId)),
      );
    } catch {
      // Linking failed; continue with an unprivileged user
    }
  }

  req.user = { id: clerkId, sessionId, isAdmin: member?.account.isAdmin ?? false };
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
