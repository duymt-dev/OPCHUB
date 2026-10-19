import { beforeEach, describe, expect, it } from 'vitest';
import { campaignCreateSchema, campaignSchema, mailLogRowSchema } from '../../api-domains';
import { auditLog } from './group-admin';
import {
  createCampaign,
  deleteCampaign,
  estimateRecipients,
  isoFromVnDateTime,
  listCampaigns,
  listMailLog,
  listMailTemplates,
  marketingSummary,
  outboxJobs,
  resendMail,
  sendCampaign,
} from './marketing';
import { resetMockDb } from './store';
import { unsubscribeEmail } from './unsubscribe';

beforeEach(() => resetMockDb());

describe('mock Marketing (D-78, D-79)', () => {
  it('seed prototype: 4 chiến dịch, 2 email chào mừng, 5 mẫu; khớp schema', () => {
    expect(listCampaigns().map((c) => c.id)).toEqual(['cp1', 'cp2', 'cp3', 'cp4']);
    listCampaigns().forEach((c) => campaignSchema.parse(c));
    listMailLog().forEach((l) => mailLogRowSchema.parse(l));
    expect(listMailTemplates().map((t) => t.label)).toEqual([
      'Thư mời sự kiện',
      'Bản tin tháng',
      'Giới thiệu dịch vụ',
      'Nhắc hoàn thiện hồ sơ',
      'Kêu gọi đăng dự án',
    ]);
    const cp1 = listCampaigns()[0];
    expect(cp1?.groupIds).toEqual(['c1', 'c8']);
    expect(cp1?.sendAt).toBe('2026-10-12T02:00:00.000Z');
  });

  it('thống kê như prototype: mở TB = trung bình chiến dịch đã gửi', () => {
    expect(marketingSummary()).toEqual({
      campaigns: 4,
      sent30d: 1840 + 2210 + 2,
      avgOpenRate: 42,
      welcomeSent: 2,
    });
  });

  it('D-63 MSW ước tính khớp server: TK active theo loại, trừ đã huỷ nhận', () => {
    // 7 thành viên active (m4 khoá) + admin, ad1 + 2 nhà đầu tư như bảng users seed demo
    expect(estimateRecipients('all')).toBe(11);
    expect(estimateRecipients('business')).toBe(4);
    expect(estimateRecipients('personal')).toBe(7);
    unsubscribeEmail('an.nguyen@mediasoft.vn');
    expect(estimateRecipients('business')).toBe(3);
    expect(estimateRecipients('groups', ['c1', 'c2'])).toBe(1248 + 1532);
    expect(estimateRecipients('groups', [])).toBe(0);
  });

  it('giờ VN → UTC; "—" → null', () => {
    expect(isoFromVnDateTime('20/10/2026 08:00')).toBe('2026-10-20T01:00:00.000Z');
    expect(isoFromVnDateTime('—')).toBeNull();
  });

  it('tạo: nháp không có người nhận; gửi ngay → Đang gửi + job outbox + audit', () => {
    const d = createCampaign('admin', {
      name: 'A',
      subject: 'S',
      audience: 'groups',
      groupIds: [],
      mode: 'draft',
    });
    expect(d).toMatchObject({ status: 'draft', recipients: null, sendAt: null });
    expect(outboxJobs()).toHaveLength(0);

    const s = createCampaign('admin', {
      name: 'B',
      subject: 'S',
      audience: 'groups',
      groupIds: ['c1', 'c1'],
      mode: 'send',
    });
    expect(s).toMatchObject({
      status: 'sending',
      recipients: 1248,
      groupIds: ['c1'],
      audienceLabel: 'Nhóm: OPC Hà Nội',
    });
    expect(outboxJobs()).toEqual([expect.objectContaining({ ref: s.id, recipients: 1248 })]);
    expect(auditLog().map((a) => a.action)).toEqual(['campaign.send', 'campaign.draft']);
    expect(listCampaigns()[0]?.id).toBe(s.id);
  });

  it('kiểm lỗi: thiếu tên/tiêu đề, lên lịch thiếu giờ, theo nhóm chưa chọn nhóm', () => {
    const base = { name: 'A', subject: 'S', audience: 'all' as const, mode: 'draft' as const };
    expect(campaignCreateSchema.safeParse({ ...base, name: ' ' }).success).toBe(false);
    expect(campaignCreateSchema.safeParse({ ...base, subject: '' }).success).toBe(false);
    expect(campaignCreateSchema.safeParse({ ...base, mode: 'schedule' }).success).toBe(false);
    expect(
      campaignCreateSchema.safeParse({ ...base, audience: 'groups', mode: 'send' }).success,
    ).toBe(false);
  });

  it('gửi ngay chỉ từ nháp / đã lên lịch (luật 7)', () => {
    const r = sendCampaign('admin', 'cp4');
    expect(r.ok && r.data.recipients).toBe(7);
    expect(listCampaigns().find((c) => c.id === 'cp4')?.status).toBe('sending');
    const again = sendCampaign('admin', 'cp4');
    expect(!again.ok && again.status).toBe(409);
    const sent = sendCampaign('admin', 'cp1');
    expect(!sent.ok && sent.status).toBe(409);
    expect(sendCampaign('admin', 'zz').ok).toBe(false);
  });

  it('xóa có audit; đang gửi thì 409', () => {
    expect(deleteCampaign('admin', 'cp3').ok).toBe(true);
    expect(listCampaigns().map((c) => c.id)).not.toContain('cp3');
    expect(auditLog()[0]).toMatchObject({ action: 'campaign.delete', target: 'cp3' });
    sendCampaign('admin', 'cp2');
    const r = deleteCampaign('admin', 'cp2');
    expect(!r.ok && r.status).toBe(409);
  });

  it('gửi lại email trong nhật ký → job + audit', () => {
    const r = resendMail('admin', 'w1');
    expect(r.ok && r.data.status).toBe('queued');
    expect(outboxJobs()[0]).toMatchObject({ type: 'mail.resend', ref: 'w1' });
    expect(resendMail('admin', 'nope').ok).toBe(false);
  });
});
