import type { Campaign, MailTemplate } from '@opchub/shared/api-domains';
import { describe, expect, it } from 'vitest';
import {
  applyTemplate,
  campaignCells,
  duplicateForm,
  emptyCampaignForm,
  formToCreate,
  localToIso,
  statValues,
  toggleGroup,
  validateCampaign,
  vnDateTime,
} from './model';

const camp = (p: Partial<Campaign> = {}): Campaign => ({
  id: 'cp1',
  name: 'Mời OPC Day',
  subject: 'S',
  body: '<p>x</p>',
  audience: 'groups',
  groupIds: ['c1'],
  audienceLabel: 'Nhóm: OPC Hà Nội',
  recipients: 1840,
  openRate: 46,
  clickRate: 12,
  status: 'sent',
  sendAt: '2026-10-12T02:00:00.000Z',
  createdAt: '2026-10-12T02:00:00.000Z',
  ...p,
});

describe('marketing model', () => {
  it('giờ VN hiển thị như prototype; datetime-local → UTC', () => {
    expect(vnDateTime('2026-10-12T02:00:00.000Z')).toBe('12/10/2026 09:00');
    expect(vnDateTime(null)).toBe('—');
    expect(localToIso('2026-10-20T08:00')).toBe('2026-10-20T01:00:00.000Z');
    expect(localToIso('')).toBeNull();
  });

  it('ô bảng: đã gửi có % mở/click; nháp "—", được gửi ngay', () => {
    expect(campaignCells(camp())).toMatchObject({
      recipients: '1.840',
      open: '46%',
      click: '12%',
      at: '12/10/2026 09:00',
      canSend: false,
    });
    const d = campaignCells(camp({ status: 'draft', recipients: null, sendAt: null }));
    expect(d).toMatchObject({ recipients: '—', open: '—', at: '—', canSend: true });
    expect(campaignCells(camp({ status: 'sending' })).canDelete).toBe(false);
  });

  it('thống kê', () => {
    expect(statValues(undefined).open).toBe('—');
    expect(statValues({ campaigns: 4, sent30d: 4052, avgOpenRate: 42, welcomeSent: 2 })).toEqual({
      campaigns: '4',
      sent: '4.052',
      open: '42%',
      welcome: '2',
    });
  });

  it('kiểm lỗi theo thứ tự prototype', () => {
    const f = emptyCampaignForm();
    expect(validateCampaign(f, 'draft')).toEqual({ name: 'name', subject: 'subject' });
    expect(validateCampaign({ ...f, name: 'A' }, 'draft')).toEqual({ subject: 'subject' });
    const g = { ...f, name: 'A', subject: 'S', audience: 'groups' as const };
    expect(validateCampaign(g, 'draft')).toEqual({});
    expect(validateCampaign(g, 'send')).toEqual({ groups: 'groups' });
    expect(validateCampaign({ ...g, groupIds: ['c1'] }, 'schedule')).toEqual({ at: 'at' });
    expect(
      validateCampaign({ ...g, groupIds: ['c1'], at: '2026-10-20T08:00' }, 'schedule'),
    ).toEqual({});
  });
  it('BUG-022 validateCampaign trả mọi lỗi cùng lúc', () => {
    const f = { ...emptyCampaignForm(), audience: 'groups' as const };
    const all = validateCampaign(f, 'schedule');
    expect(Object.keys(all)).toEqual(['name', 'subject', 'groups', 'at']);
  });

  it('nhân bản, chọn mẫu, chọn nhóm, thân API', () => {
    expect(duplicateForm(camp())).toMatchObject({
      name: 'Mời OPC Day (bản sao)',
      groupIds: ['c1'],
    });
    const tpl: MailTemplate = {
      id: 'news',
      label: 'L',
      hint: 'H',
      name: 'N',
      subject: 'Su',
      body: 'B',
    };
    const f = applyTemplate(emptyCampaignForm(), tpl);
    expect(f).toMatchObject({ tpl: 'news', name: 'N', subject: 'Su', body: 'B' });
    expect(applyTemplate(f, null)).toMatchObject({ tpl: '', name: '', body: '' });
    expect(toggleGroup(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleGroup(['a', 'b'], 'a')).toEqual(['b']);
    expect(
      formToCreate({ ...f, audience: 'all', groupIds: ['c1'], at: '2026-10-20T08:00' }, 'draft'),
    ).toMatchObject({ groupIds: [], scheduledAt: null, mode: 'draft' });
  });
});
