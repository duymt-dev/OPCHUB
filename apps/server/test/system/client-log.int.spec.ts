import { Logger } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../setup/test-app';
import { createUser, flushAuthState } from '../factories/user.factory';
import { tokenOf } from '../factories/group.factory';

describe('TIP-V46-821 public first-party client logger', () => {
  let t: TestApp;
  const body = {
    app: 'portal',
    scope: 'affiliate.my-region',
    message: 'private@example.com',
    name: 'TypeError',
    path: '/affiliate',
    at: new Date().toISOString(),
  };
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
  });
  afterAll(async () => {
    if (t) await t.close();
  });
  it('SPEC15 anonymous beacon returns204 and emits only sanitized client-labelled warning', async () => {
    const spy = vi.spyOn(Logger.prototype, 'warn');
    try {
      expect((await t.call('/client-logs', { method: 'POST', json: body })).status).toBe(204);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'client',
          scope: 'affiliate.my-region',
          message: 'GET /me/gdv failed',
          path: '/affiliate',
        }),
      );
      expect(JSON.stringify(spy.mock.calls)).not.toContain('private@example.com');
    } finally {
      spy.mockRestore();
    }
  });
  it('SPEC15 adds a verified current session only, never trusts payload identity', async () => {
    const user = await createUser(t, { fee: 'active' });
    const token = await tokenOf(t, user);
    const spy = vi.spyOn(Logger.prototype, 'warn');
    try {
      expect((await t.call('/client-logs', { method: 'POST', token, json: body })).status).toBe(
        204,
      );
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'client', userId: user.id }),
      );
      expect(
        (await t.call('/client-logs', { method: 'POST', json: { ...body, userId: user.id } }))
          .status,
      ).toBe(400);
      expect(
        (await t.call('/client-logs', { method: 'POST', json: { ...body, stack: 'raw' } })).status,
      ).toBe(400);
      expect(
        (
          await t.call('/client-logs', {
            method: 'POST',
            json: { ...body, path: '/affiliate?email=raw' },
          })
        ).status,
      ).toBe(400);
    } finally {
      spy.mockRestore();
    }
  });
  it('SPEC15 enforces20 requests per minute per IP without a database sink', async () => {
    let limited = false;
    for (let i = 0; i < 21; i++) {
      const status = (await t.call('/client-logs', { method: 'POST', json: body })).status;
      expect([204, 429]).toContain(status);
      if (status === 429) limited = true;
    }
    expect(limited).toBe(true);
  });
});
