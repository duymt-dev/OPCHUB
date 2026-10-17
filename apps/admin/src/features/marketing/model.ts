import type {
  Campaign,
  CampaignCreate,
  CampaignSaveMode,
  CampaignStatus,
  MailTemplate,
  MarketingSummary,
} from '@opchub/shared/api-domains';
import type { CampaignFormError, CampaignFormState } from './types';

/** Hiển thị: số kiểu Việt Nam, thời gian theo giờ VN (luật 9) */

export const fmtN = (n: number) => n.toLocaleString('vi-VN');

const PARTS = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Asia/Ho_Chi_Minh',
});

/** ISO UTC → "12/10/2026 09:00" (giờ VN) như prototype; null → "—" */
export function vnDateTime(isoStr: string | null): string {
  if (!isoStr) return '—';
  const p = Object.fromEntries(
    PARTS.formatToParts(new Date(isoStr)).map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

const VN_OFFSET_H = 7;

/** Giá trị ô datetime-local "2026-10-20T08:00" (giờ VN) → ISO UTC; rỗng/sai → null */
export function localToIso(v: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
  return new Date(Date.UTC(y, mo - 1, d, h - VN_OFFSET_H, mi)).toISOString();
}

/** Màu nhãn trạng thái (lớp CSS cùng tên) */
export const STATUS_TONE: Record<CampaignStatus, 'green' | 'blue' | 'orange' | 'gray'> = {
  sent: 'green',
  scheduled: 'blue',
  sending: 'orange',
  draft: 'gray',
};

/** Dòng bảng như prototype: chỉ chiến dịch đã gửi có % mở / click */
export function campaignCells(c: Campaign) {
  const sent = c.status === 'sent';
  return {
    recipients: c.recipients ? fmtN(c.recipients) : '—',
    open: sent && c.openRate !== null ? `${c.openRate}%` : '—',
    click: sent && c.clickRate !== null ? `${c.clickRate}%` : '—',
    at: vnDateTime(c.sendAt),
    canSend: c.status === 'draft' || c.status === 'scheduled',
    canDelete: c.status !== 'sending',
  };
}

/** 4 thẻ thống kê */
export function statValues(s: MarketingSummary | undefined) {
  if (!s) return { campaigns: '—', sent: '—', open: '—', welcome: '—' };
  return {
    campaigns: String(s.campaigns),
    sent: fmtN(s.sent30d),
    open: s.avgOpenRate === null ? '—' : `${s.avgOpenRate}%`,
    welcome: String(s.welcomeSent),
  };
}

export const emptyCampaignForm = (): CampaignFormState => ({
  tpl: '',
  name: '',
  subject: '',
  body: '',
  audience: 'all',
  groupIds: [],
  at: '',
});

/** "Nhân bản": điền sẵn tên + " (bản sao)", tiêu đề, nội dung, đối tượng */
export const duplicateForm = (c: Campaign): CampaignFormState => ({
  ...emptyCampaignForm(),
  name: `${c.name} (bản sao)`,
  subject: c.subject,
  body: c.body,
  audience: c.audience,
  groupIds: c.groupIds,
});

/** Chọn mẫu: điền sẵn tên, tiêu đề, nội dung; "Trống" xoá ba ô này */
export function applyTemplate(f: CampaignFormState, t: MailTemplate | null): CampaignFormState {
  return t
    ? { ...f, tpl: t.id, name: t.name, subject: t.subject, body: t.body }
    : { ...f, tpl: '', name: '', subject: '', body: '' };
}

export function toggleGroup(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

/** Kiểm lỗi theo thứ tự của prototype; nháp không cần nhóm */
export function validateCampaign(
  f: CampaignFormState,
  mode: CampaignSaveMode,
): CampaignFormError | null {
  if (!f.name.trim()) return 'name';
  if (!f.subject.trim()) return 'subject';
  if (mode !== 'draft' && f.audience === 'groups' && f.groupIds.length === 0) return 'groups';
  if (mode === 'schedule' && !localToIso(f.at)) return 'at';
  return null;
}

export function formToCreate(f: CampaignFormState, mode: CampaignSaveMode): CampaignCreate {
  return {
    name: f.name.trim(),
    subject: f.subject.trim(),
    body: f.body,
    audience: f.audience,
    groupIds: f.audience === 'groups' ? f.groupIds : [],
    mode,
    scheduledAt: mode === 'schedule' ? localToIso(f.at) : null,
  };
}
