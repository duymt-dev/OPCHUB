import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { ApiErrorBody } from '@opchub/shared/api';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError, codeForStatus, type FieldError } from '../errors';
import { requestIdOf } from '../logger/request-id';
import { redactMailQrPath } from '../logger/redact-mail-qr';

interface Normalized {
  status: number;
  body: ApiErrorBody['error'];
  retryAfterSec?: number | undefined;
  /** Lỗi body-parser (413 / JSON hỏng) — log warn, không error (BUG-003) */
  bodyParser?: boolean;
}

export const zodFields = (e: ZodError): FieldError[] =>
  e.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));

/** Lỗi do body-parser ném (không phải HttpException) — `type` theo thư viện `body-parser` */
function bodyParserError(err: unknown): Normalized | null {
  if (typeof err !== 'object' || err === null) return null;
  const e = err as { type?: unknown; status?: unknown; statusCode?: unknown };
  if (e.type === 'entity.too.large' || e.status === 413 || e.statusCode === 413) {
    return { status: 413, body: { code: 'PAYLOAD_TOO_LARGE', message: 'Dữ liệu gửi lên quá lớn' } };
  }
  if (e.type === 'entity.parse.failed') {
    return {
      status: 400,
      body: { code: 'VALIDATION_ERROR', message: 'Dữ liệu gửi lên không đúng định dạng JSON' },
    };
  }
  return null;
}

/** Mọi lỗi → envelope `{ error: { code, message, fields?, requestId } }` (api-conventions.md) */
export function normalizeError(err: unknown): Normalized {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) },
      retryAfterSec: err.retryAfterSec,
    };
  }
  // Lỗi body-parser (`keepBodyParserErrorType` giữ `type`) — trước HttpException
  const parser = bodyParserError(err);
  if (parser) return { ...parser, bodyParser: true };
  if (err instanceof ZodError) {
    return {
      status: 400,
      body: { code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ', fields: zodFields(err) },
    };
  }
  if (err instanceof HttpException) {
    const status = err.getStatus();
    const code = codeForStatus(status);
    const message = status === 429 ? 'Bạn thao tác quá nhanh, vui lòng thử lại sau' : err.message;
    return { status, body: { code, message: status >= 500 ? 'Lỗi hệ thống' : message } };
  }
  return { status: 500, body: { code: 'INTERNAL', message: 'Lỗi hệ thống, vui lòng thử lại' } };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpError');

  catch(err: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const n = normalizeError(err);
    if (n.bodyParser) {
      this.logger.warn(
        { path: redactMailQrPath(req.path), status: n.status },
        'Thân request bị từ chối',
      );
    } else if (n.status >= 500) {
      this.logger.error({ err, path: redactMailQrPath(req.path) }, 'Lỗi không xử lý');
    }
    const requestId = requestIdOf(req);
    if (n.retryAfterSec !== undefined) res.setHeader('Retry-After', String(n.retryAfterSec));
    else if (n.status === 429 && !res.getHeader('Retry-After')) res.setHeader('Retry-After', '60');
    res.status(n.status).json({ error: { ...n.body, ...(requestId ? { requestId } : {}) } });
  }
}
