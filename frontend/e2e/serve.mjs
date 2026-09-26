// Serves the built app for the end-to-end suite, answering every unknown path with the
// app itself so deep links route on the client, as the hosted site does
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../dist', import.meta.url));
const PORT = 4200;

const TYPES = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

createServer((request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, 'http://e2e').pathname));
  const file = join(ROOT, path);
  const found = file.startsWith(ROOT) && existsSync(file) && statSync(file).isFile();
  const served = found ? file : join(ROOT, 'index.html');

  response.writeHead(200, {
    'Content-Type': TYPES[extname(served)] ?? 'application/octet-stream',
  });
  createReadStream(served).pipe(response);
}).listen(PORT, () => console.info(`Serving the built app on http://localhost:${PORT}`));
