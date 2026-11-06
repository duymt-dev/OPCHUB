import { beforeEach, describe, expect, it } from 'vitest';
import { mockDb, resetMockDb } from './store';
import { DEFAULT_RENEWAL } from '../../api-domains';
import {
  mockRenewalConfig,
  mockRenewalList,
  mockRenewalMailLog,
  patchMockRenewal,
  seedMockRenewalDemo,
  sendMockRenewal,
} from './renewal';
describe('REQ-620 MSW parity with renewal server contracts', () => {
  beforeEach(() => {
    resetMockDb();
    seedMockRenewalDemo();
  });
  it('manual creates mail + member notification + last sent and permits repeated same day', () => {
    const now = new Date();
    expect(sendMockRenewal('admin', { userIds: ['m1'] }, now)).toEqual({
      sent: 1,
      channels: ['email', 'app'],
    });
    expect(
      mockRenewalList({ limit: 20 }, now).items.find((r) => r.userId === 'm1')?.lastSentAt,
    ).toBe(now.toISOString());
    expect(mockRenewalMailLog()).toHaveLength(1);
    expect(mockDb().notifications.get('m1')?.[0]).toMatchObject({
      title: 'Gói thành viên sắp hết hạn',
      link: '/membership/pay',
    });
    sendMockRenewal('admin', { userIds: ['m1'] }, new Date(now.getTime() + 1000));
    expect(mockRenewalMailLog()).toHaveLength(2);
  });
  it('saved channels all off block side effects, while all milestones off allow manual', () => {
    patchMockRenewal('admin', { channels: { email: false, app: false } });
    expect(sendMockRenewal('admin', { all: true })).toBeNull();
    expect(mockRenewalMailLog()).toHaveLength(0);
    patchMockRenewal('admin', {
      channels: DEFAULT_RENEWAL.channels,
      milestones: { d30: false, d7: false, d1: false },
    });
    expect(mockRenewalConfig().milestones.d7).toBe(false);
    expect(sendMockRenewal('admin', { userIds: ['m1'] })?.sent).toBe(1);
  });
  it('excludes director and investor, filters outside window', () => {
    const f = mockDb().fees.find((r) => r.userId === 'm1');
    if (!f) throw Error('missing fixture');
    f.status = 'regional_director';
    expect(sendMockRenewal('admin', { userIds: ['m1'] })?.sent).toBe(0);
    f.status = 'active';
    f.accountType = 'investor';
    expect(sendMockRenewal('admin', { userIds: ['m1'] })?.sent).toBe(0);
  });
});
