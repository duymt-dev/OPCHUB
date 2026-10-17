import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const HEADER = 'x-request-id';
const VALID = /^[A-Za-z0-9._-]{8,64}$/;

/** Nhận `X-Request-Id` từ client nếu hợp lệ, nếu không sinh mới; luôn trả lại header */
export function assignRequestId(req: IncomingMessage, res: ServerResponse): string {
  const incoming = req.headers[HEADER];
  const id = typeof incoming === 'string' && VALID.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', id);
  return id;
}

/** pino-http gắn `req.id` */
export function requestIdOf(req: unknown): string | undefined {
  if (typeof req === 'object' && req !== null && 'id' in req) {
    const id = req.id;
    return typeof id === 'string' ? id : undefined;
  }
  return undefined;
}
