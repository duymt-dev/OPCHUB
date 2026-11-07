import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { z } from 'zod';
import { pushPayloadSchema } from '@opchub/shared/api-domains';

const port = z.coerce
  .number()
  .int()
  .min(1024)
  .max(65535)
  .parse(process.argv[2] ?? 4811);
const postSchema = z.strictObject({
  payload: pushPayloadSchema,
  options: z.strictObject({ ttl: z.number().int().min(0), urgency: z.enum(['normal', 'high']) }),
});
const modeSchema = z.strictObject({
  path: z.string().startsWith('/push/').max(200),
  statuses: z.array(z.number().int().min(200).max(599)).max(5),
});
const records: (z.infer<typeof postSchema> & { path: string; status: number })[] = [];
const statuses = new Map<string, number[]>();
function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}
function read(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = '',
      size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > 16384) {
        reject(new Error('body limit'));
        req.destroy();
        return;
      }
      raw += chunk.toString('utf8');
    });
    req.on('error', reject);
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw) as unknown);
      } catch {
        reject(new Error('json'));
      }
    });
  });
}
async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
  if (req.method === 'GET' && url.pathname === '/__stub/health')
    return send(res, 200, { ok: true });
  if (req.method === 'GET' && url.pathname === '/__stub/messages') {
    const path = url.searchParams.get('path'),
      tag = url.searchParams.get('tag');
    return send(res, 200, {
      messages: records.filter(
        (r) => (!path || r.path === path) && (!tag || r.payload.tag === tag),
      ),
    });
  }
  if (req.method === 'POST' && url.pathname === '/__stub/mode') {
    const mode = modeSchema.parse(await read(req));
    statuses.set(mode.path, [...mode.statuses]);
    return send(res, 200, { ok: true });
  }
  if (req.method === 'POST' && url.pathname.startsWith('/push/')) {
    const input = postSchema.parse(await read(req));
    const status = statuses.get(url.pathname)?.shift() ?? 201;
    records.push({ ...input, path: url.pathname, status });
    if (records.length > 1000) records.shift();
    return send(res, status, { ok: status >= 200 && status < 300 });
  }
  return send(res, 404, { ok: false });
}
createServer((req, res) => {
  void handle(req, res).catch(() => send(res, 400, { ok: false }));
}).listen(port, '127.0.0.1');
