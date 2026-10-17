import { HttpException, NotFoundException } from '@nestjs/common';
import { apiErrorSchema } from '@opchub/shared/api';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppError } from '../errors';
import { normalizeError } from './http-exception.filter';

const envelope = (n: ReturnType<typeof normalizeError>) => apiErrorSchema.parse({ error: n.body });

describe('normalizeError', () => {
  it('AppError giữ code, message, fields', () => {
    const n = normalizeError(
      new AppError('CONFLICT', 'Email đã tồn tại', [{ path: 'email', message: 'x' }]),
    );
    expect(n.status).toBe(409);
    expect(envelope(n).error.fields?.[0]?.path).toBe('email');
  });

  it('ZodError → 400 VALIDATION_ERROR có fields', () => {
    const r = z.object({ phone: z.string() }).safeParse({});
    if (r.success) throw new Error('unreachable');
    const n = normalizeError(r.error);
    expect(n.status).toBe(400);
    expect(n.body.fields?.[0]?.path).toBe('phone');
  });

  it('HttpException Nest → mã theo status', () => {
    expect(normalizeError(new NotFoundException()).body.code).toBe('NOT_FOUND');
    expect(normalizeError(new HttpException('x', 429)).body.code).toBe('RATE_LIMITED');
  });

  it('lỗi lạ → 500 INTERNAL, không lộ message gốc', () => {
    const n = normalizeError(new Error('db password leaked'));
    expect(n.status).toBe(500);
    expect(n.body.message).not.toContain('password');
  });

  it('429 AppError mang Retry-After', () => {
    expect(normalizeError(new AppError('RATE_LIMITED', 'x', undefined, 900)).retryAfterSec).toBe(
      900,
    );
  });
});
