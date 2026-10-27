import { beforeEach, describe, expect, it } from 'vitest';
import { dashboardLiveSchema, welcomeMailPreviewSchema } from '../../api-domains';
import { dashboardLive } from './dashboard';
import { inboxNotifications, markNotificationsRead, takeWelcomeMail } from './inbox';
import { resetMockDb } from './store';
import { MOCK_NOW } from './util';

describe('dashboard live + hộp thư (G2a)', () => {
  beforeEach(() => resetMockDb());

  it('dashboard live khớp schema, 10 quốc gia, VN 13 tỉnh/thành, không thảo luận seed (D-89)', () => {
    const d = dashboardLiveSchema.parse(dashboardLive(MOCK_NOW));
    expect(d.countries).toHaveLength(10);
    expect(d.countries[0]?.provinces).toHaveLength(13);
    expect(d.stats.totalMembers).toBe(4218);
    expect(d.threads).toEqual([]);
  });

  it('thông báo theo từng người (D-29): TK khác không thấy hộp thư của m1', () => {
    expect(inboxNotifications('m1')).toHaveLength(4);
    expect(inboxNotifications('m2')).toHaveLength(0);
  });

  it('đánh dấu một / tất cả đã đọc', () => {
    expect(markNotificationsRead('m1', ['s1'])).toEqual({ unread: 1 });
    expect(markNotificationsRead('m1')).toEqual({ unread: 0 });
    expect(inboxNotifications('m1').every((n) => n.read)).toBe(true);
  });

  it('mốc giờ dời theo thời điểm gọi', () => {
    const later = MOCK_NOW + 3_600_000;
    const first = inboxNotifications('m1', later)[0];
    expect(Date.parse(first?.createdAt ?? '')).toBe(later - 6e5);
  });

  it('mail chào mừng chỉ cho TK mới, một lần, không mật khẩu tạm (D-30)', () => {
    expect(takeWelcomeMail('m1')).toBeNull();
    const mail = welcomeMailPreviewSchema.parse(takeWelcomeMail('n-test@x.vn'));
    expect(mail.to).toBe('test@x.vn');
    expect(mail).not.toHaveProperty('password');
    expect(takeWelcomeMail('n-test@x.vn')).toBeNull();
  });
});
