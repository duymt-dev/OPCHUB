import { pageSchema } from '@opchub/shared/api';
import {
  adminInvestorSchema,
  eventRegistrationResultSchema,
  investorInterestSchema,
  projectCardSchema,
  projectDetailSchema,
  projectStatsSchema,
} from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createEvent, removeTestEvents } from '../factories/event.factory';
import { tokenOf } from '../factories/group.factory';
import { projectBody, removeTestProjects, activateFundraising } from '../factories/project.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

/**
 * Cổng pha B4: đăng ký sự kiện → đăng dự án gọi vốn → Admin duyệt + nổi bật → người khác thấy
 * trên Khám phá → Nhà đầu tư quan tâm (Idempotency-Key) → chủ dự án thấy → Admin gom theo người.
 */
describe('Cổng B4: sự kiện + dự án + nhà đầu tư', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
  });
  afterAll(async () => {
    await t.redis.client.del('dashboard:live');
    await removeTestProjects(t);
    await removeTestEvents(t);
    await t.close();
  });

  it('đầu-cuối', async () => {
    const owner = await tokenOf(t, await createUser(t, { fee: 'active' }));
    const admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    const inv = await tokenOf(t, await createUser(t, { accountType: 'investor' }));

    // 1. Sự kiện
    const ev = await createEvent(t, { seats: 2 });
    const reg = eventRegistrationResultSchema.parse(
      await (
        await t.call(`/events/${ev.id}/registration`, { method: 'POST', token: owner })
      ).json(),
    );
    expect(reg).toMatchObject({ registered: 1, registeredByMe: true });

    // 2. Đăng dự án gọi vốn → hiện ngay (D-108, TIP-V42-711), nhà đầu tư thấy ngay, không chờ duyệt
    const card = projectCardSchema.parse(
      await (
        await t.call('/projects', {
          method: 'POST',
          token: owner,
          json: projectBody({
            funding: {
              amount: 1_500_000_000,
              currency: 'VND',
              equityPercent: 12,
              minTicket: 50_000_000,
            },
          }),
        })
      ).json(),
    );
    expect(card.status).toBe('published');
    expect((await t.call(`/projects/${card.id}`, { token: inv })).status).toBe(200);

    // 3. Admin đặt nổi bật (hậu kiểm — không cần duyệt trước nữa)
    await t.call('/admin/projects/featured', {
      method: 'PUT',
      token: admin,
      json: { projectId: card.id },
    });
    const stats = projectStatsSchema.parse(
      await (await t.call('/projects/stats', { token: inv })).json(),
    );
    expect(stats.featured?.id).toBe(card.id);

    // 4. V4-610 (F05): Gói Gọi vốn được duyệt → Nhà đầu tư quan tâm (gửi lại cùng key → cùng bản ghi)
    await activateFundraising(t, card.id);
    const key = randomUUID();
    const send = () =>
      t.call(`/projects/${card.id}/interest`, {
        method: 'POST',
        token: inv,
        headers: { 'Idempotency-Key': key },
        json: {
          kind: 'individual',
          contactName: 'Somchai Prasert',
          phone: '+66 81 234 5678',
          amount: 200_000_000,
          message: '',
        },
      });
    const i1 = investorInterestSchema.parse(await (await send()).json());
    const i2 = investorInterestSchema.parse(await (await send()).json());
    expect(i2.id).toBe(i1.id);
    const d = projectDetailSchema.parse(
      await (await t.call(`/projects/${card.id}`, { token: inv })).json(),
    );
    expect(d.myInterest).toMatchObject({ amount: 200_000_000, currency: 'VND' });

    // 5. Chủ dự án thấy quan tâm; Admin thấy nhà đầu tư đã gom
    const mine = (await (
      await t.call(`/projects/${card.id}/interests`, { token: owner })
    ).json()) as {
      items: unknown[];
    };
    expect(mine.items).toHaveLength(1);
    const admins = pageSchema(adminInvestorSchema).parse(
      await (await t.call('/admin/investors?kind=individual&size=100', { token: admin })).json(),
    );
    expect(admins.items.find((r) => r.key === i1.id)?.totalAmount).toBe(200_000_000);

    // dọn: bỏ nổi bật để không ảnh hưởng test khác
    await t.call('/admin/projects/featured', {
      method: 'PUT',
      token: admin,
      json: { projectId: null },
    });
  });
});
