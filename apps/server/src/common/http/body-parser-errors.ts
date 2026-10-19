import type { NextFunction, Request, Response } from 'express';

/**
 * BUG-003: body-parser ném `SyntaxError` (JSON hỏng) — Nest đổi mọi `SyntaxError` thành
 * `BadRequestException(message thô)` và làm mất `type`. Middleware lỗi này đứng ngay sau parser,
 * bọc lại thành `Error` thường giữ `type`/`status` để `HttpExceptionFilter` phân loại
 * (`entity.parse.failed` → 400, `entity.too.large` → 413), log warn thay vì error.
 */
export function keepBodyParserErrorType(
  err: unknown,
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (err instanceof SyntaxError && (err as { type?: unknown }).type === 'entity.parse.failed') {
    next(Object.assign(new Error(err.message), { type: 'entity.parse.failed', status: 400 }));
    return;
  }
  next(err);
}
