import type {
  Campaign,
  CampaignAudience,
  CampaignCreate,
  CampaignStatus,
  MailJob,
  MailLogRow,
  MailTemplate,
  MarketingSummary,
} from '../../api-domains';
import { campaignCreateSchema, canResendMail } from '../../api-domains';
import { mailTemplates, members, seed } from '../../fixtures';
import { recordAudit } from './group-admin';
import { UNPAID_DEMO } from '../auth';
import { mockDb, nextId, type MockDb } from './store';
import { suppressions } from './unsubscribe';
import { conflict, iso, MOCK_NOW, notFound, ok, type MockResult } from './util';

/**
 * Admin Marketing (D-78, D-79): chiến dịch email, nhật ký gửi, mẫu email. WeakMap theo MockDb
 * nên `resetMockDb()` tự dựng lại. Gửi mail KHÔNG gửi thật: chỉ ghi một job vào `outbox`
 * (luật 8; worker → adapter mail ở `packages/integrations`, luật 11). Mọi thao tác ghi audit.
 */

interface CampSeed {
  id: string;
  name: string;
  subject: string;
  aud: string;
  n: number;
  open: number;
  click: number;
  status: CampaignStatus;
  at: string;
}
interface MailSeed {
  id: string;
  to: string;
  name: string;
  kind: 'welcome' | 'campaign';
  subject: string;
}
export interface OutboxJob {
  jobId: string;
  type: 'mail.campaign.send' | 'mail.resend' | 'mail.welcome.test';
  ref: string;
  recipients: number;
  at: string;
}

interface MarketingState {
  campaigns: Campaign[];
  log: MailLogRow[];
  outbox: OutboxJob[];
}

const CAMP_SEED = seed.CAMP_SEED as CampSeed[];
const MAIL_SEED = seed.MAIL_SEED as MailSeed[];

/** Nhật ký seed của prototype: 1 giờ và 2,5 giờ trước */
const MAIL_AGO = [36e5, 9e6];

/** Đối tượng seed theo nhãn prototype → khóa + nhóm */
const SEED_AUDIENCE: Record<string, { audience: CampaignAudience; groupIds: string[] }> = {
  'Nhóm: OPC Hà Nội, OPC Bắc Ninh': { audience: 'groups', groupIds: ['c1', 'c8'] },
  'Tất cả thành viên': { audience: 'all', groupIds: [] },
  'Doanh nghiệp': { audience: 'business', groupIds: [] },
  'Cá nhân': { audience: 'personal', groupIds: [] },
};

const VN_OFFSET_H = 7;

/** "12/10/2026 09:00" (giờ VN) → ISO UTC; "—" → null */
export function isoFromVnDateTime(s: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const [, dd, mm, yyyy, hh, mi] = m.map(Number);
  return iso(Date.UTC(yyyy ?? 0, (mm ?? 1) - 1, dd ?? 1, (hh ?? 0) - VN_OFFSET_H, mi ?? 0));
}

const AUD_LABEL: Record<Exclude<CampaignAudience, 'groups'>, string> = {
  all: 'Tất cả thành viên',
  business: 'Doanh nghiệp',
  personal: 'Cá nhân',
};

function audienceLabel(audience: CampaignAudience, groupIds: string[]): string {
  if (audience !== 'groups') return AUD_LABEL[audience];
  const names = mockDb()
    .groups.filter((g) => groupIds.includes(g.id))
    .map((g) => g.name);
  return `Nhóm: ${names.join(', ')}`;
}

function seedCampaigns(): Campaign[] {
  return CAMP_SEED.map((c) => {
    const a = SEED_AUDIENCE[c.aud] ?? { audience: 'all' as const, groupIds: [] };
    const sent = c.status === 'sent';
    const sendAt = isoFromVnDateTime(c.at);
    return {
      id: c.id,
      name: c.name,
      subject: c.subject,
      body: '',
      audience: a.audience,
      groupIds: a.groupIds,
      audienceLabel: c.aud,
      recipients: c.n || null,
      openRate: sent ? c.open : null,
      clickRate: sent ? c.click : null,
      status: c.status,
      sendAt,
      createdAt: sendAt ?? iso(MOCK_NOW),
    };
  });
}

const states = new WeakMap<MockDb, MarketingState>();

export function marketingState(): MarketingState {
  const db = mockDb();
  let s = states.get(db);
  if (!s) {
    s = {
      campaigns: seedCampaigns(),
      log: MAIL_SEED.map((m, i) => ({
        id: m.id,
        kind: m.kind,
        to: m.to,
        name: m.name,
        subject: m.subject,
        sentAt: iso(MOCK_NOW - (MAIL_AGO[i] ?? 0)),
        status: 'sent' as const,
        attempts: 0,
        error: null,
      })),
      outbox: [],
    };
    states.set(db, s);
  }
  return s;
}

/**
 * Tài khoản ngoài 8 thành viên mà bảng `users` của seed demo có (D-63: MSW đếm như server):
 * 2 nhà đầu tư (`packages/db/seed/demo/people.ts`). TK quản trị ở `admin_users` (D-52, TIP-V2-202)
 * không là người nhận chiến dịch thành viên.
 */
const NON_MEMBER_USERS: readonly { email: string; type: 'business' | 'personal' | 'investor' }[] = [
  { email: 'nam.nguyen@vinacapital.vn', type: 'investor' },
  { email: 'mai.tran@saomai.vn', type: 'investor' },
];

const AUD_TYPES: Record<Exclude<CampaignAudience, 'groups'>, string[] | null> = {
  all: null,
  business: ['business'],
  personal: ['personal', 'investor'],
};

/**
 * Ước tính người nhận — khớp `AudienceRepository.estimate` của server (D-63, TD-033): theo nhóm =
 * tổng `member_count`; còn lại đếm tài khoản `active` theo loại, trừ email đã huỷ nhận (BUG-036).
 */
export function estimateRecipients(audience: CampaignAudience, groupIds: string[] = []): number {
  const db = mockDb();
  if (audience === 'groups') {
    const ids = new Set(groupIds);
    return db.groups.filter((g) => ids.has(g.id)).reduce((a, g) => a + g.memberCount, 0);
  }
  const types = AUD_TYPES[audience];
  const off = suppressions();
  const users = [
    ...members
      .filter((m) => (db.userStatus.get(m.id) ?? 'active') === 'active')
      .map((m) => ({
        email: m.id === UNPAID_DEMO.meId ? UNPAID_DEMO.email : m.email,
        type: m.type === 'biz' ? 'business' : 'personal',
      })),
    ...NON_MEMBER_USERS,
  ];
  return users.filter((u) => (!types || types.includes(u.type)) && !off.has(u.email.toLowerCase()))
    .length;
}

export const listCampaigns = (): Campaign[] => marketingState().campaigns;
export const listMailLog = (): MailLogRow[] => marketingState().log;
export const outboxJobs = (): OutboxJob[] => marketingState().outbox;

export const listMailTemplates = (): MailTemplate[] => mailTemplates();

export function marketingSummary(): MarketingSummary {
  const { campaigns, log } = marketingState();
  const sent = campaigns.filter((c) => c.status === 'sent');
  const avg = sent.length
    ? Math.round(sent.reduce((a, c) => a + (c.openRate ?? 0), 0) / sent.length)
    : null;
  return {
    campaigns: campaigns.length,
    sent30d: sent.reduce((a, c) => a + (c.recipients ?? 0), 0) + log.length,
    avgOpenRate: avg,
    welcomeSent: log.filter((l) => l.kind === 'welcome').length,
  };
}

/** Ghi job vào outbox (cùng "transaction" với thay đổi trạng thái) */
function enqueue(type: OutboxJob['type'], ref: string, recipients: number): MailJob {
  const jobId = nextId('job');
  marketingState().outbox.push({ jobId, type, ref, recipients, at: iso(MOCK_NOW) });
  return { jobId, status: 'queued', recipients };
}

export function createCampaign(actorId: string, input: CampaignCreate): Campaign {
  const c = campaignCreateSchema.parse(input);
  const groupIds = c.audience === 'groups' ? [...new Set(c.groupIds)] : [];
  const n = estimateRecipients(c.audience, groupIds);
  const status: CampaignStatus =
    c.mode === 'send' ? 'sending' : c.mode === 'schedule' ? 'scheduled' : 'draft';
  const camp: Campaign = {
    id: nextId('cp'),
    name: c.name,
    subject: c.subject,
    body: c.body,
    audience: c.audience,
    groupIds,
    audienceLabel: audienceLabel(c.audience, groupIds),
    recipients: status === 'draft' ? null : n,
    openRate: null,
    clickRate: null,
    status,
    sendAt: status === 'sending' ? iso(MOCK_NOW) : status === 'scheduled' ? c.scheduledAt : null,
    createdAt: iso(MOCK_NOW),
  };
  marketingState().campaigns.unshift(camp);
  recordAudit(actorId, `campaign.${c.mode}`, camp.id, camp.name);
  if (status === 'sending') enqueue('mail.campaign.send', camp.id, n);
  return camp;
}

/** "Gửi ngay": chỉ từ Bản nháp / Đã lên lịch → Đang gửi (luật 7), job vào outbox (202) */
export function sendCampaign(actorId: string, id: string): MockResult<MailJob> {
  const c = marketingState().campaigns.find((x) => x.id === id);
  if (!c) return notFound('Không tìm thấy chiến dịch');
  if (c.status !== 'draft' && c.status !== 'scheduled')
    return conflict('Chiến dịch đã gửi hoặc đang gửi');
  const n = c.recipients ?? estimateRecipients(c.audience, c.groupIds);
  Object.assign(c, { status: 'sending', recipients: n, sendAt: iso(MOCK_NOW) });
  recordAudit(actorId, 'campaign.send', id, c.name);
  return ok(enqueue('mail.campaign.send', id, n));
}

/** Xóa chiến dịch (đang gửi thì không xóa được — job đã vào hàng đợi) */
export function deleteCampaign(actorId: string, id: string): MockResult<{ id: string }> {
  const s = marketingState();
  const c = s.campaigns.find((x) => x.id === id);
  if (!c) return notFound('Không tìm thấy chiến dịch');
  if (c.status === 'sending') return conflict('Chiến dịch đang gửi, không thể xóa');
  s.campaigns = s.campaigns.filter((x) => x.id !== id);
  recordAudit(actorId, 'campaign.delete', id, c.name);
  return ok({ id });
}

/**
 * BUG-036 "Dừng gửi": chỉ `sending | scheduled` → `cancelled` (luật 7); server huỷ thư còn chờ và
 * chốt `recipients` = số thư đã gửi — mock chưa gửi thư nào của lô đang chạy → giữ số đã có.
 */
export function cancelCampaign(actorId: string, id: string): MockResult<Campaign> {
  const c = marketingState().campaigns.find((x) => x.id === id);
  if (!c) return notFound('Không tìm thấy chiến dịch');
  if (c.status !== 'sending' && c.status !== 'scheduled')
    return conflict('Chiến dịch đã gửi xong hoặc đã dừng');
  c.status = 'cancelled';
  recordAudit(actorId, 'campaign.cancel', id, c.name);
  return ok(c);
}

export function resendMail(actorId: string, id: string): MockResult<MailJob> {
  const row = marketingState().log.find((x) => x.id === id);
  if (!row || !canResendMail(row)) return notFound('Không tìm thấy email');
  recordAudit(actorId, 'mail.resend', id, row.to);
  return ok(enqueue('mail.resend', id, 1));
}

export function testWelcomeMail(actorId: string, to: string): MailJob {
  recordAudit(actorId, 'mail.welcome.test', 'welcome', to);
  return enqueue('mail.welcome.test', to, 1);
}
