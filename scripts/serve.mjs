import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

const publicDir = path.resolve('public');
const port = Number(process.env.PORT ?? process.argv[2] ?? 4173);
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.resolve(publicDir, `.${pathname}`);

  if (!filePath.startsWith(`${publicDir}${path.sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    if (!statSync(filePath).isFile()) throw new Error('not a file');
    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not Found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Three Kingdoms H5 running at http://127.0.0.1:${port}`);
});
