import { beforeEach, expect, it } from 'vitest';
import {
  captureMockAffiliateSnapshot,
  restoreMockAffiliateSnapshot,
} from './affiliate-persistence/snapshot';
import { mockRegionalDirectors, mockRegionalRevoke } from './regional-directors';
import { mockDb, resetMockDb } from './store';

beforeEach(() => resetMockDb());
it('keeps revoked slots, history and restored fees coherent after a browser reload', () => {
  expect(mockRegionalRevoke('south', 'Super Admin').ok).toBe(true);
  const status = mockDb().fees.find((f) => f.userId === 'm10')?.status;
  const snapshot = captureMockAffiliateSnapshot();
  resetMockDb();
  restoreMockAffiliateSnapshot(snapshot);
  const data = mockRegionalDirectors(false);
  expect(data.items.find((s) => s.region === 'south')?.member).toBeNull();
  expect(data.history[0]).toMatchObject({ action: 'revoke', userId: 'm10' });
  expect(mockDb().fees.find((f) => f.userId === 'm10')?.status).toBe(status);
});

it('TC-462 retains dated revocation notice across repeated restores without dropping other notices', () => {
  const previous = mockDb().notifications.get('m1');
  expect(mockRegionalRevoke('north', 'Super Admin').ok).toBe(true);
  const fee = mockDb().fees.find((f) => f.userId === 'm3');
  const date = new Date(fee?.validUntil ?? '').toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
  });
  const snapshot = captureMockAffiliateSnapshot();
  resetMockDb();
  restoreMockAffiliateSnapshot(snapshot);
  restoreMockAffiliateSnapshot(snapshot);
  const notices = mockDb().notifications.get('m3');
  expect(notices).toHaveLength(1);
  expect(notices?.[0]).toMatchObject({
    type: 'system',
    title: 'Kết thúc vai trò GĐ Vùng Miền Bắc',
    link: '/affiliate',
  });
  expect(notices?.[0]?.body).toContain(`Phí thành viên cũ còn hiệu lực đến ${date}`);
  expect(mockDb().notifications.get('m1')).toEqual(previous);
});
