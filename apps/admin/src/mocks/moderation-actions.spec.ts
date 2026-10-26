import { setupServer } from 'msw/node';
import type { Message } from '@opchub/shared/api-domains';
import {
  auditLog,
  listSettingsLog,
  mockDb,
  processMockKeywordHit,
  reportMessage,
  resetMockDb,
} from '@opchub/shared/mock-domains';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;
const request = (path: string, method = 'GET', body?: unknown, actor = 'admin') =>
  fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(actor ? { Authorization: `Bearer mock.${actor}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T05:00:00Z'));
  resetMockDb();
  mockDb().reports = [];
  mockDb().messages.clear();
});
afterEach(() => vi.useRealTimers());
afterAll(() => server.close());

function cases() {
  const message: Message = {
    id: 'moderation-source',
    roomId: 'c1-general',
    sender: { name: 'Persona', avatarUrl: null },
    body: 'Cần VAY NÓNG',
    attachment: null,
    reactions: [],
    pinned: false,
    isSimulated: true,
    createdAt: new Date().toISOString(),
  };
  mockDb().messages.set(message.roomId, [message]);
  const auto = processMockKeywordHit({ messageId: message.id, hit: 'VAY NÓNG' });
  const manual = reportMessage(message.id, { reason: 'scam' });
  if (!auto || !manual.ok) throw new Error('Missing cases');
  return { message, auto, manual: manual.data };
}

describe('P5-MSW-02 NA-07 moderation action contract', () => {
  it('hide changes the original message, resolves all open cases for that message and audits the exact action/actor', async () => {
    const { message, auto, manual } = cases();
    const response = await request(`/admin/reports/${auto.id}/action`, 'POST', { action: 'hide' });
    expect(response.status).toBe(200);
    expect(message.hiddenAt).toBe(new Date().toISOString());
    expect(mockDb().reports.find((r) => r.id === manual.id)?.status).toBe('resolved');
    expect(
      auditLog().filter((r) => r.action === 'moderation.hide' && r.target === auto.id),
    ).toHaveLength(1);
    expect(auditLog()[0]?.actorId).toBe('admin');
    expect(listSettingsLog()[0]?.tag).toBe('moderation');
    expect(await response.json()).not.toHaveProperty('action');
  });

  it.each(['/admin/reports', '/admin/moderation/keywords'])(
    'rejects unauthenticated reads: %s',
    async (path) => {
      expect((await request(path, 'GET', undefined, '')).status).toBe(401);
    },
  );

  it('view-only may inspect cases but cannot mutate cases or keyword configuration', async () => {
    const { message, auto } = cases();
    expect(
      (await request(`/admin/reports/${auto.id}/action`, 'GET', undefined, 'adm-hang')).status,
    ).toBe(200);
    expect(
      (await request(`/admin/reports/${auto.id}/action`, 'POST', { action: 'hide' }, 'adm-hang'))
        .status,
    ).toBe(403);
    expect(
      (await request('/admin/moderation/keywords', 'POST', { word: 'blocked' }, 'adm-hang')).status,
    ).toBe(403);
    // V4-612 (D-77): trúng từ khoá đã ẩn ngay lúc tạo ca; view-only không đổi gì thêm
    expect(message.hiddenAt).toBe(new Date().toISOString());
    expect(auto.status).toBe('open');
    expect(auditLog()).toHaveLength(0);
  });

  it('keyword creation follows native citext duplicate detection, not case-sensitive insertion', async () => {
    expect((await request('/admin/moderation/keywords', 'POST', { word: 'VAY NÓNG' })).status).toBe(
      409,
    );
    expect(auditLog()).toHaveLength(0);
  });

  // V4-612 (D-77): tin đã ẩn ngay khi tạo ca; bỏ qua = khôi phục tin → hiện lại + đóng mọi ca của tin
  it('dismiss restores the auto-hidden message and closes every open case of that message', async () => {
    const { message, auto, manual } = cases();
    expect(message.hiddenAt).toBe(new Date().toISOString());
    expect(
      (await request(`/admin/reports/${auto.id}/action`, 'POST', { action: 'dismiss' })).status,
    ).toBe(200);
    expect(message.hiddenAt).toBeUndefined();
    expect(mockDb().reports.find((r) => r.id === manual.id)?.status).toBe('resolved');
    expect(
      (await request(`/admin/reports/${manual.id}/action`, 'POST', { action: 'restore' })).status,
    ).toBe(409);
    expect(auditLog()[0]).toMatchObject({
      actorId: 'admin',
      action: 'moderation.dismiss',
      target: auto.id,
    });
  });

  it('resolved/sibling replay returns409 without a second audit or timestamp rewrite', async () => {
    const { message, auto, manual } = cases();
    await request(`/admin/reports/${auto.id}/action`, 'POST', { action: 'hide' });
    const at = message.hiddenAt;
    vi.setSystemTime(new Date('2026-10-21T05:01:00Z'));
    expect(
      (await request(`/admin/reports/${auto.id}/action`, 'POST', { action: 'hide' })).status,
    ).toBe(409);
    expect(
      (await request(`/admin/reports/${manual.id}/action`, 'POST', { action: 'dismiss' })).status,
    ).toBe(409);
    expect(auditLog()).toHaveLength(1);
    expect(message.hiddenAt).toBe(at);
  });

  it('same-body cases for another message are not hidden or resolved', async () => {
    const { message, auto } = cases();
    const other = { ...message, id: 'another-message' };
    mockDb().messages.get(message.roomId)?.push(other);
    const separate = processMockKeywordHit({ messageId: other.id, hit: 'VAY NÓNG' });
    if (!separate) throw new Error('Missing separate case');
    await request(`/admin/reports/${auto.id}/action`, 'POST', { action: 'restore' });
    // Khôi phục tin chỉ áp cho đúng tin của ca — tin khác cùng nội dung vẫn ẩn, ca vẫn mở
    expect(message.hiddenAt).toBeUndefined();
    expect(other.hiddenAt).toBe(new Date().toISOString());
    expect(separate.status).toBe('open');
  });

  it('unknown IDs and invalid actions return404/400 without audit or mutation', async () => {
    const { message, auto } = cases();
    expect((await request('/admin/reports/unknown/action')).status).toBe(404);
    expect(
      (await request('/admin/reports/unknown/action', 'POST', { action: 'hide' })).status,
    ).toBe(404);
    const bad = await request(`/admin/reports/${auto.id}/action`, 'POST', { action: 'invalid' });
    expect(bad.status).toBe(400);
    const body = (await bad.json()) as { error: { fields: { path: string }[] } };
    expect(body.error.fields[0]?.path).toBe('action');
    expect(message.hiddenAt).toBe(new Date().toISOString());
    expect(auto.status).toBe('open');
    expect(auditLog()).toHaveLength(0);
  });

  it.each(['/admin/reports', '/admin/moderation/keywords', '/admin/reports/unknown/action'])(
    'groups.view is required even for authenticated Admin reads: %s',
    async (path) => {
      expect((await request(path, 'GET', undefined, 'adm-mai')).status).toBe(403);
    },
  );

  it('case-insensitive/literal-percent keyword removal is audited once and appears in the visible log', async () => {
    expect(
      (await request(`/admin/moderation/keywords/${encodeURIComponent('VaY NóNg')}`, 'DELETE'))
        .status,
    ).toBe(200);
    expect(auditLog()[0]?.action).toBe('moderation.keyword.remove');
    expect(listSettingsLog()[0]?.summary).toContain('Xóa từ khóa');
    expect(
      (await request('/admin/moderation/keywords', 'POST', { word: 'literal% keyword' })).status,
    ).toBe(201);
    expect(
      (
        await request(
          `/admin/moderation/keywords/${encodeURIComponent('literal% keyword')}`,
          'DELETE',
        )
      ).status,
    ).toBe(200);
    expect(auditLog()).toHaveLength(3);
  });
});
