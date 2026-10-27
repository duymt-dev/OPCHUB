import { loginResponseSchema } from '@opchub/shared/api';
import { myFeePeriodsSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('GET /me/membership/periods — Hồ sơ › Gói & thanh toán (D-89)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.close();
  });
  beforeEach(async () => {
    await flushAuthState(t);
  });

  const tokenOf = async (email: string, password: string) =>
    loginResponseSchema.parse(
      await (
        await t.call('/auth/login', { method: 'POST', json: { identifier: email, password } })
      ).json(),
    ).accessToken;

  it('chỉ trả kỳ phí của chính mình, mới nhất trước; mở được khi chưa đóng phí', async () => {
    const me = await createUser(t, { fee: 'pending_payment' });
    const other = await createUser(t, { fee: 'pending_payment' });
    const at = (iso: string) => new Date(iso);
    await t.prisma.db.membershipFeePeriod.createMany({
      data: [
        {
          userId: me.id,
          startsAt: at('2025-03-02T00:00:00Z'),
          endsAt: at('2026-03-02T00:00:00Z'),
          amount: 600_000,
          source: 'transfer',
          createdAt: at('2025-03-02T00:00:00Z'),
        },
        {
          userId: me.id,
          startsAt: at('2026-03-02T00:00:00Z'),
          endsAt: at('2027-03-02T00:00:00Z'),
          amount: 1_200_000,
          source: 'manual',
          reason: 'Thu tiền mặt',
          createdAt: at('2026-03-01T00:00:00Z'),
        },
        {
          userId: other.id,
          startsAt: at('2026-01-01T00:00:00Z'),
          endsAt: at('2027-01-01T00:00:00Z'),
          amount: 1_200_000,
          source: 'transfer',
        },
      ],
    });
    const res = await t.call('/me/membership/periods', {
      token: await tokenOf(me.email, me.password),
    });
    expect(res.status).toBe(200);
    const body = myFeePeriodsSchema.parse(await res.json());
    expect(body.items.map((p) => [p.endsAt, p.amount, p.source])).toEqual([
      ['2027-03-02T00:00:00.000Z', 1_200_000, 'manual'],
      ['2026-03-02T00:00:00.000Z', 600_000, 'transfer'],
    ]);
    expect(body.items[0]?.paidAt).toBe('2026-03-01T00:00:00.000Z');
  });

  it('chưa đăng nhập → 401', async () => {
    expect((await t.call('/me/membership/periods')).status).toBe(401);
  });
});
