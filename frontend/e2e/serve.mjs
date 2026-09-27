// Serves the built app for the end-to-end suite on its own port, answering every unknown
// path with the app so deep links route on the client, and passing API calls on to the
// seeded API so the browser only ever talks to this origin
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, request as forward } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../dist', import.meta.url));
const PORT = 4300;
const API_PORT = 3300;

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

function passToApi(request, response) {
  const upstream = forward(
    {
      host: 'localhost',
      port: API_PORT,
      method: request.method,
      path: request.url,
      headers: request.headers,
    },
    apiResponse => {
      response.writeHead(apiResponse.statusCode ?? 502, apiResponse.headers);
      apiResponse.pipe(response);
    },
  );
  upstream.on('error', () => {
    response.writeHead(502);
    response.end();
  });
  request.pipe(upstream);
}

createServer((request, response) => {
  if (request.url.startsWith('/v1/')) {
    passToApi(request, response);
    return;
  }

  const path = normalize(decodeURIComponent(new URL(request.url, 'http://e2e').pathname));
  const file = join(ROOT, path);
  const found = file.startsWith(ROOT) && existsSync(file) && statSync(file).isFile();
  const served = found ? file : join(ROOT, 'index.html');

  response.writeHead(200, {
    'Content-Type': TYPES[extname(served)] ?? 'application/octet-stream',
  });
  createReadStream(served).pipe(response);
}).listen(PORT, () => console.info(`Serving the built app on http://localhost:${PORT}`));
