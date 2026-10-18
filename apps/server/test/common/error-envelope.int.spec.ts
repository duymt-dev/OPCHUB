import { Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { apiErrorSchema } from '@opchub/shared/api';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Public } from '@/common/auth';
import { AppError } from '@/common/errors';
import { ZodBody } from '@/common/http/zod';
import { flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

const bodySchema = z.object({ phone: z.string().min(6) });

@Public()
@Controller('test-errors')
class ErrorTestController {
  @Get('conflict')
  conflict(): never {
    throw new AppError('CONFLICT', 'Email đã được sử dụng');
  }

  @Get('boom')
  boom(): never {
    throw new Error('connection string postgresql://secret');
  }

  @Post('validate')
  validate(@ZodBody(bodySchema) body: z.infer<typeof bodySchema>): { ok: true; phone: string } {
    return { ok: true, phone: body.phone };
  }

  @Throttle({ default: { limit: 2, ttl: 60_000 } })
  @Get('limited')
  limited(): { ok: true } {
    return { ok: true };
  }
}

describe('envelope lỗi + request id + throttle (TIP-B04)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp({ controllers: [ErrorTestController] });
    await flushAuthState(t);
  });
  afterAll(async () => {
    await t.close();
  });

  it('AppError → 409, body khớp apiErrorSchema, requestId trùng header', async () => {
    const res = await t.call('/test-errors/conflict', {
      headers: { 'X-Request-Id': 'req-12345678' },
    });
    expect(res.status).toBe(409);
    const body = apiErrorSchema.parse(await res.json());
    expect(body.error.code).toBe('CONFLICT');
    expect(res.headers.get('x-request-id')).toBe('req-12345678');
    expect(body.error.requestId).toBe('req-12345678');
  });

  it('body sai zod → 400 VALIDATION_ERROR có fields', async () => {
    const res = await t.call('/test-errors/validate', { method: 'POST', json: { phone: '1' } });
    expect(res.status).toBe(400);
    const body = apiErrorSchema.parse(await res.json());
    expect(body.error.fields?.[0]?.path).toBe('phone');
  });

  it('BUG-003 JSON hỏng → 400 VALIDATION_ERROR; body quá giới hạn → 413 PAYLOAD_TOO_LARGE', async () => {
    const post = (body: string) =>
      t.call('/test-errors/validate', {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
      });
    const bad = await post('{"phone":');
    expect(bad.status).toBe(400);
    const badBody = apiErrorSchema.parse(await bad.json());
    expect(badBody.error.code).toBe('VALIDATION_ERROR');
    expect(badBody.error.fields).toBeUndefined();
    const big = await post(JSON.stringify({ phone: '0'.repeat(800 * 1024) }));
    expect(big.status).toBe(413);
    expect(apiErrorSchema.parse(await big.json()).error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('lỗi lạ → 500 INTERNAL, không lộ chi tiết', async () => {
    const res = await t.call('/test-errors/boom');
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain('secret');
    expect(apiErrorSchema.parse(JSON.parse(text)).error.code).toBe('INTERNAL');
  });

  it('vượt giới hạn → 429 RATE_LIMITED + Retry-After', async () => {
    await t.call('/test-errors/limited');
    await t.call('/test-errors/limited');
    const res = await t.call('/test-errors/limited');
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBeTruthy();
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('RATE_LIMITED');
  });

  it('helmet + health', async () => {
    const res = await t.call('/health');
    expect(res.status).toBe(200);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-powered-by')).toBeNull();
  });
});
