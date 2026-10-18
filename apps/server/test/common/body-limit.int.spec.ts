import { Logger } from '@nestjs/common';
import { apiErrorSchema } from '@opchub/shared/api';
import { adminEventSchema, campaignSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE } from '@/common/integrations';
import { MarketingCoreModule } from '@/modules/marketing';
import { removeTestEvents, TEST_EVENT_PREFIX } from '../factories/event.factory';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import { type TempStorage, tempStorage, uploadPng } from '../uploads/storage.helper';

const CAMPAIGN_PREFIX = 'CD thử body';

/** TD-015 / BUG-002 / BUG-003 / BUG-037: giới hạn body thống nhất (`common/http/body-limits.ts`) */
describe('Giới hạn body + lỗi body-parser (TIP-V2-102)', () => {
  let t: TestApp;
  let store: TempStorage;
  let admin: string;
  beforeAll(async () => {
    store = await tempStorage();
    t = await createTestApp({
      imports: [MarketingCoreModule],
      overrides: [[STORAGE, store.provider]],
    });
  });
  beforeEach(async () => {
    await flushAuthState(t);
    admin = await tokenOf(t, await createUser(t, { systemRole: 'admin' }));
  });
  afterAll(async () => {
    await t.prisma.db.campaign.deleteMany({ where: { name: { startsWith: CAMPAIGN_PREFIX } } });
    await removeTestEvents(t);
    await t.close();
    await store.dispose();
  });

  const raw = (path: string, body: string) =>
    t.call(path, {
      method: 'POST',
      token: admin,
      body,
      headers: { 'Content-Type': 'application/json' },
    });

  it('BUG-003 body 1,5MB → 413 PAYLOAD_TOO_LARGE, log không có mức error', async () => {
    const errorSpy = vi.spyOn(Logger.prototype, 'error');
    try {
      const big = JSON.stringify({ name: 'x', blob: 'a'.repeat(1_500_000) });
      const r = await raw('/admin/campaigns', big);
      expect(r.status).toBe(413);
      const body = apiErrorSchema.parse(await r.json());
      expect(body.error.code).toBe('PAYLOAD_TOO_LARGE');
      expect(body.error.message).toBe('Dữ liệu gửi lên quá lớn');
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('BUG-003 JSON hỏng → 400 VALIDATION_ERROR (không 500)', async () => {
    const r = await raw('/admin/campaigns', '{"name": "x",');
    expect(r.status).toBe(400);
    const body = apiErrorSchema.parse(await r.json());
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Dữ liệu gửi lên không đúng định dạng JSON');
  });

  it('BUG-037 REQ-226 chiến dịch 100.000 ký tự tiếng Việt → 201', async () => {
    const text = 'ệ'.repeat(100_000);
    expect(Buffer.byteLength(JSON.stringify({ body: text }))).toBeGreaterThan(250 * 1024);
    const r = await t.call('/admin/campaigns', {
      method: 'POST',
      token: admin,
      json: {
        name: `${CAMPAIGN_PREFIX} dài`,
        subject: 'Tin dài',
        body: text,
        audience: 'all',
        mode: 'draft',
      },
    });
    expect(r.status).toBe(201);
    expect(campaignSchema.parse(await r.json()).body.length).toBeGreaterThanOrEqual(100_000);
  });

  it('BUG-002 sự kiện coverUrl storage 300KB ảnh → 201, DB lưu URL storage', async () => {
    const coverUrl = await uploadPng(t, admin, 'event-cover', 300 * 1024);
    const r = await t.call('/admin/events', {
      method: 'POST',
      token: admin,
      json: {
        title: `${TEST_EVENT_PREFIX} có ảnh bìa`,
        mode: 'online',
        startsAt: '2030-11-20T12:00:00.000Z',
        place: 'https://zoom.us/j/1',
        seats: 50,
        description: 'Mô tả',
        coverUrl,
      },
    });
    expect(r.status).toBe(201);
    const ev = adminEventSchema.parse(await r.json());
    expect(ev.coverUrl).toBe(coverUrl);
    const row = await t.prisma.db.event.findUniqueOrThrow({
      where: { id: ev.id },
      select: { coverUrl: true },
    });
    expect(row.coverUrl?.startsWith('data:')).toBe(false);
    expect(row.coverUrl).toBe(coverUrl);
  });
});
