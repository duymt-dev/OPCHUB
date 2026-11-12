import { formatDate, formatNumber, formatPercentPoints } from '@/i18n/format';
import type {
  Campaign,
  CampaignCreate,
  CampaignSaveMode,
  CampaignStatus,
  MailLogStatus,
  MailTemplate,
  MarketingSummary,
} from '@opchub/shared/api-domains';
import type { CampaignFormErrors, CampaignFormState } from './types';

/** Hiển thị: số kiểu Việt Nam, thời gian theo giờ VN (luật 9) */

export const fmtN = (n: number, locale = 'vi') => formatNumber(n, locale);

/** ISO UTC → "12/10/2026 09:00" (giờ VN) như prototype; null → "—" */
export function vnDateTime(isoStr: string | null, locale = 'vi'): string {
  const options = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } as const;
  if (locale === 'vi') {
    const date = formatDate(isoStr, locale);
    return date === '—' ? date : date + ' ' + formatDate(isoStr, locale, options);
  }
  return formatDate(isoStr, locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options,
  });
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
export const STATUS_TONE: Record<CampaignStatus, 'green' | 'blue' | 'orange' | 'gray' | 'red'> = {
  sent: 'green',
  scheduled: 'blue',
  sending: 'orange',
  draft: 'gray',
  cancelled: 'red',
};

/** Dòng bảng như prototype: chỉ chiến dịch đã gửi có % mở / click */
export function campaignCells(c: Campaign, locale = 'vi') {
  const sent = c.status === 'sent';
  return {
    recipients: c.recipients ? fmtN(c.recipients, locale) : '—',
    open:
      sent && c.openRate !== null
        ? locale === 'vi'
          ? `${c.openRate}%`
          : formatPercentPoints(c.openRate, locale, 20)
        : '—',
    click:
      sent && c.clickRate !== null
        ? locale === 'vi'
          ? `${c.clickRate}%`
          : formatPercentPoints(c.clickRate, locale, 20)
        : '—',
    at: vnDateTime(c.sendAt, locale),
    canSend: c.status === 'draft' || c.status === 'scheduled',
    canDelete: c.status !== 'sending',
    /** BUG-036: "Dừng gửi" khi đang gửi / đã lên lịch */
    canCancel: c.status === 'sending' || c.status === 'scheduled',
  };
}

/** NA-05: màu nhãn trạng thái thư trong nhật ký */
export const MAIL_STATUS_TONE: Record<MailLogStatus, 'ok' | 'pending' | 'fail' | 'muted'> = {
  sent: 'ok',
  queued: 'pending',
  failed: 'fail',
  cancelled: 'muted',
};

/** 4 thẻ thống kê */
export function statValues(s: MarketingSummary | undefined, locale = 'vi') {
  if (!s) return { campaigns: '—', sent: '—', open: '—', welcome: '—' };
  return {
    campaigns: fmtN(s.campaigns, locale),
    sent: fmtN(s.sent30d, locale),
    open:
      s.avgOpenRate === null
        ? '—'
        : locale === 'vi'
          ? `${s.avgOpenRate}%`
          : formatPercentPoints(s.avgOpenRate, locale, 20),
    welcome: fmtN(s.welcomeSent, locale),
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

/** Kiểm MỌI ô (BUG-022), thứ tự khoá theo prototype; nháp không cần nhóm. Rỗng = hợp lệ */
export function validateCampaign(f: CampaignFormState, mode: CampaignSaveMode): CampaignFormErrors {
  const e: CampaignFormErrors = {};
  if (!f.name.trim()) e.name = 'name';
  if (!f.subject.trim()) e.subject = 'subject';
  if (mode !== 'draft' && f.audience === 'groups' && f.groupIds.length === 0) e.groups = 'groups';
  if (mode === 'schedule' && !localToIso(f.at)) e.at = 'at';
  return e;
}

/** path lỗi server (POST /admin/campaigns) → ô form */
export const CAMPAIGN_FIELD_MAP = {
  name: 'name',
  subject: 'subject',
  groupIds: 'groups',
  scheduledAt: 'at',
} as const;

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
