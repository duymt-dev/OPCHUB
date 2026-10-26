import { adminMemberPageSchema, onboardingMailSchema } from '@opchub/shared/api-domains';
import { resetMockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;
const as = (uid: string) => ({
  Authorization: `Bearer mock.${uid}`,
  'Content-Type': 'application/json',
});

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => resetMockDb());
afterAll(() => server.close());

const page = async (qs = '') =>
  adminMemberPageSchema.parse(
    await (await fetch(`${BASE}/admin/users?page=1&size=10${qs}`, { headers: as('admin') })).json(),
  );
const remind = (id: string) =>
  fetch(`${BASE}/admin/users/${id}/onboarding-remind`, { method: 'POST', headers: as('admin') });

/** V4-611 (AD-02, D-88) MSW: cột Khởi đầu, lọc, Nhắc 204 / 429, mẫu email nhắc */
describe('MSW Admin › Thành viên · Khởi đầu (V4-611)', () => {
  it('x/8 mỗi dòng; lọc Chưa hoàn tất = 8, Đã hoàn tất = 0', async () => {
    const all = await page();
    expect(all.items.find((m) => m.id === 'm1')?.onboarding).toMatchObject({ done: 6 });
    expect((await page('&onboarding=todo')).total).toBe(8);
    expect((await page('&onboarding=done')).total).toBe(0);
  });

  it('Nhắc → 204 + "Đã nhắc"; lần hai trong 24 giờ → 429 với thông điệp server', async () => {
    expect((await remind('m1')).status).toBe(204);
    expect((await page()).items.find((m) => m.id === 'm1')?.onboarding.reminded).toBe(true);
    const again = await remind('m1');
    expect(again.status).toBe(429);
    expect(JSON.stringify(await again.json())).toContain('Đã nhắc thành viên này trong 24 giờ qua');
  });

  it('mẫu email nhắc: GET mặc định, PUT lưu, body rỗng → 400', async () => {
    const get = async () =>
      onboardingMailSchema.parse(
        await (await fetch(`${BASE}/admin/mail/onboarding`, { headers: as('admin') })).json(),
      );
    expect((await get()).subject).toBe('Hoàn tất hướng dẫn bắt đầu trên OPC Hub');
    const put = (body: unknown) =>
      fetch(`${BASE}/admin/mail/onboarding`, {
        method: 'PUT',
        headers: as('admin'),
        body: JSON.stringify(body),
      });
    expect((await put({ subject: 'Nhắc', body: 'Chào {{ten}}' })).status).toBe(200);
    expect(await get()).toEqual({ subject: 'Nhắc', body: 'Chào {{ten}}' });
    expect((await put({ subject: '', body: '' })).status).toBe(400);
  });
});
