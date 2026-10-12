import { dangerouslyDeleteByTag } from '@vercel/functions';
import { NextFunction, Request, Response } from 'express';

const PUBLIC_DATA_TAG = 'public-data';
const PUBLIC_DATA_CACHE_SECONDS = 24 * 3600;
const READ_METHODS = ['GET', 'HEAD'];

// Preview serves a database that a sync replaces outside the API, so only production caches
const cachesOnCdn = (): boolean => process.env['VERCEL_ENV'] === 'production';

function storeOnCdn(res: Response, seconds: number): void {
  if (!cachesOnCdn()) {
    return;
  }

  res.setHeader(
    'Vercel-CDN-Cache-Control',
    `s-maxage=${Math.max(1, Math.floor(seconds))}`,
  );
  res.setHeader('Vercel-Cache-Tag', PUBLIC_DATA_TAG);
}

export function publicCache(req: Request, res: Response, next: NextFunction): void {
  if (READ_METHODS.includes(req.method)) {
    storeOnCdn(res, PUBLIC_DATA_CACHE_SECONDS);
  }
  next();
}

// For an answer that goes out of date on its own, before any write would clear it
export function limitCdnCache(res: Response, seconds: number): void {
  storeOnCdn(res, Math.min(seconds, PUBLIC_DATA_CACHE_SECONDS));
}

// The purge only reaches the CDN from inside the request, so a successful write's response
// waits for it. Deleting rather than invalidating means no visitor gets the old answer again
export function clearCacheAfterWrite(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (READ_METHODS.includes(req.method) || !cachesOnCdn()) {
    next();
    return;
  }

  const json = res.json.bind(res);
  res.json = body => {
    if (res.statusCode >= 300) {
      return json(body);
    }

    dangerouslyDeleteByTag(PUBLIC_DATA_TAG)
      .catch(error => console.error(`[LCC] Unable to clear the CDN cache: ${error}`))
      .then(() => json(body))
      .catch(next);
    return res;
  };
  next();
}
