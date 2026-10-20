import { pageSchema } from '@opchub/shared/api';
import {
  adminUpcomingSchema,
  adminEventSchema,
  eventItemSchema,
  eventRegistrantSchema,
  eventRegistrantsExportSchema,
  eventRegistrationResultSchema,
  idResultSchema,
} from '@opchub/shared/api-domains';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { z } from 'zod';
import { removeTestEvents, TEST_EVENT_PREFIX } from '../factories/event.factory';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { ep } from './harness';

/** Contract `event` (10) — schema đúng như apps/{portal,admin}/src/features/events/api.ts */
describe('Contract: event', () => {
  let t: TestApp;
  let admin: string;
  let member: { id: string; token: string };
  let other: string;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
    const u = await createUser(t, { fee: 'active' });
    member = { id: u.id, token: await tokenOf(t, u) };
    other = await tokenOf(t, await createUser(t, { fee: 'active' }));
  });
  afterAll(async () => {
    await removeTestEvents(t);
    await t.close();
  });

  const body = {
    title: `${TEST_EVENT_PREFIX} hợp đồng`,
    mode: 'offline' as const,
    startsAt: '2030-11-20T12:00:00.000Z',
    place: 'Hà Nội',
    address: '18 Tam Trinh',
    seats: 50,
    description: 'Mô tả',
    registrationOpen: true,
  };

  it('admin + portal: tạo → sửa → đăng ký → check-in → xuất → huỷ → xoá', async () => {
    const created = await ep(t, 'POST', '/admin/events', '/admin/events', adminEventSchema, {
      token: admin,
      json: body,
    });
    const id = created.data.id;
    await ep(
      t,
      'GET',
      '/admin/events',
      '/admin/events?page=1&size=100',
      pageSchema(adminEventSchema),
      {
        token: admin,
      },
    );
    await ep(t, 'GET', '/admin/events/upcoming', '/admin/events/upcoming', adminUpcomingSchema, {
      token: admin,
    });
    await ep(t, 'PATCH', '/admin/events/:id', `/admin/events/${id}`, adminEventSchema, {
      token: admin,
      json: { ...body, seats: 60 },
    });

    await ep(t, 'GET', '/events', '/events?page=1&size=100', pageSchema(eventItemSchema), {
      token: member.token,
    });
    await ep(
      t,
      'POST',
      '/events/:id/registration',
      `/events/${id}/registration`,
      eventRegistrationResultSchema,
      { token: member.token },
    );
    await t.call(`/events/${id}/registration`, { method: 'POST', token: other });
    await ep(
      t,
      'GET',
      '/admin/events/:id/registrations',
      `/admin/events/${id}/registrations?page=1&size=100`,
      pageSchema(eventRegistrantSchema),
      { token: admin },
    );
    await ep(
      t,
      'POST',
      '/admin/events/:id/registrations/check-in',
      `/admin/events/${id}/registrations/check-in`,
      z.object({ items: z.array(eventRegistrantSchema) }),
      { token: admin, json: { userIds: [member.id], attended: true } },
    );
    await ep(
      t,
      'POST',
      '/admin/events/:id/registrations/export',
      `/admin/events/${id}/registrations/export`,
      eventRegistrantsExportSchema,
      { token: admin },
    );
    await ep(
      t,
      'DELETE',
      '/events/:id/registration',
      `/events/${id}/registration`,
      eventRegistrationResultSchema,
      { token: other },
    );
    await ep(t, 'DELETE', '/admin/events/:id', `/admin/events/${id}`, idResultSchema, {
      token: admin,
    });
  });
});
