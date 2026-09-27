import { S3Client } from '@aws-sdk/client-s3';
import { createServer } from 'node:http';

interface StoredObject {
  body: Buffer;
  contentType: string;
}

interface HttpRequestLike {
  protocol: string;
  hostname: string;
  port?: number;
  path: string;
  headers: Record<string, string>;
}

const objects = new Map<string, StoredObject>();

function stringField(input: object, name: 'Bucket' | 'Key'): string | undefined {
  const value: unknown = name in input ? Reflect.get(input, name) : undefined;
  return typeof value === 'string' ? value : undefined;
}

function isHttpRequest(request: unknown): request is HttpRequestLike {
  return (
    typeof request === 'object' &&
    request !== null &&
    'hostname' in request &&
    'path' in request &&
    'headers' in request
  );
}

function objectPath(bucket: string, key: string): string {
  return `/${bucket}/${key}`;
}

export function putObject(
  bucket: string,
  key: string,
  body: Buffer,
  contentType: string,
): void {
  objects.set(objectPath(bucket, key), { body, contentType });
}

// Serves the objects over plain HTTP, so presigned URLs load in the browser like R2's do
export function startFakeStorage(port: number): Promise<void> {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://storage').pathname);
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'PUT') {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        objects.set(path, {
          body: Buffer.concat(chunks),
          contentType: req.headers['content-type'] ?? 'application/octet-stream',
        });
        res.writeHead(200, { ETag: '"e2e"' }).end();
      });
      return;
    }

    if (req.method === 'DELETE') {
      objects.delete(path);
      res.writeHead(204).end();
      return;
    }

    const object = objects.get(path);
    if ((req.method === 'GET' || req.method === 'HEAD') && object) {
      res.writeHead(200, {
        'Content-Type': object.contentType,
        'Content-Length': object.body.length,
        'Cache-Control': 'private, max-age=3600',
      });
      res.end(req.method === 'GET' ? object.body : undefined);
      return;
    }

    res
      .writeHead(404, { 'Content-Type': 'application/xml' })
      .end('<Error><Code>NoSuchKey</Code></Error>');
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, 'localhost', () => resolve());
  });
}

/**
 * Sends every request the storage client makes, presigning included, to the fake
 * storage instead of R2. Keys listed as unavailable fail as R2 would when unreachable.
 */
export function redirectStorageClient(
  client: S3Client,
  port: number,
  unavailableKeys: ReadonlySet<string>,
): void {
  client.middlewareStack.add(
    next => async args => {
      const bucket = stringField(args.input, 'Bucket');
      const objectKey = stringField(args.input, 'Key');
      if (objectKey && unavailableKeys.has(objectKey)) {
        throw new Error(`Storage is unavailable for [${objectKey}].`);
      }

      const { request } = args;
      if (!isHttpRequest(request)) {
        return next(args);
      }
      const key = request.path.replace(/^\//, '');
      request.protocol = 'http:';
      request.hostname = 'localhost';
      request.port = port;
      request.headers['host'] = `localhost:${port}`;
      request.path =
        bucket && !key.startsWith(`${bucket}/`) ? `/${bucket}/${key}` : `/${key}`;

      return next(args);
    },
    { step: 'build', priority: 'low', name: 'e2eFakeStorage' },
  );
}
