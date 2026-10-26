import type { ProjectCard, ProjectDetail, ProjectSave } from '@opchub/shared/api-domains';
import type { ProjectStage, ProjectStatus } from '@opchub/shared';
import { validateContact } from './contact-model';
import type { CommentType, ProjectFormState, TeamRow } from './types';
import { fmtCompact, fmtInt } from '@/i18n/format';

/** Hàm thuần của màn Dự án: định dạng tiền, nhãn giai đoạn/trạng thái, form ↔ API */

/** Như MONEY() của prototype: tỷ/triệu ₫ (tiếng Việt) hoặc dạng gọn theo ngôn ngữ (D-65), $K/$M */
export function money(n: number, cur: 'VND' | 'USD' = 'VND'): string {
  const v = Number.isFinite(n) ? n : 0;
  if (cur === 'USD') {
    if (v >= 1e6) return `$${(v / 1e6).toFixed(v % 1e6 ? 1 : 0)}M`;
    if (v >= 1e3) return `$${Math.round(v / 1e3)}K`;
    return `$${v}`;
  }
  if (v >= 1e6) return `${fmtCompact(v)} ₫`;
  return `${fmtInt(v)} ₫`;
}

export const fmtNumber = fmtInt;

/** Ngày dd/mm/yyyy theo giờ Việt Nam */
export function vnDate(iso: string): string {
  const d = new Date(Date.parse(iso) + 7 * 36e5);
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

export const STAGES: ProjectStage[] = ['idea', 'mvp', 'launched', 'growth'];

/** Tag màu giai đoạn (ST của prototype) */
export const STAGE_TONE: Record<ProjectStage, string> = {
  idea: 'violet',
  mvp: 'amber',
  launched: 'blue',
  growth: 'green',
};

/** Trạng thái dự án → tông nhãn ở "Dự án của tôi" (§8: máy trạng thái Dự án) */
export const STATUS_TONE: Record<ProjectStatus, string> = {
  published: 'green',
  pending_review: 'amber',
  needs_changes: 'orange',
  rejected: 'red',
  draft: 'gray',
  hidden: 'gray',
};

/** Trạng thái chủ dự án còn sửa được (BUG-033, §9 — như `OWNER_EDITABLE` server) */
const OWNER_EDITABLE: readonly ProjectStatus[] = [
  'draft',
  'needs_changes',
  'pending_review',
  'published',
];

/**
 * Dòng "Dự án của tôi" (REQ-106, D-18): nhãn bản sửa khi dự án đang hiển thị có bản sửa chưa áp;
 * ghi chú duyệt của dự án hoặc của bản sửa; Bị từ chối / Đã ẩn không có nút Sửa.
 */
export function mineView(p: ProjectCard) {
  const rev = p.revision && p.revision.status !== 'approved' ? p.revision : null;
  const ownNote =
    (p.status === 'needs_changes' || p.status === 'rejected') && p.reviewNote
      ? { html: p.reviewNote, rejected: p.status === 'rejected' }
      : null;
  const revNote =
    rev && (rev.status === 'needs_changes' || rev.status === 'rejected') && rev.reviewNote
      ? { html: rev.reviewNote, rejected: rev.status === 'rejected' }
      : null;
  return {
    revision: rev?.status ?? null,
    note: revNote ?? ownNote,
    editable: OWNER_EDITABLE.includes(p.status),
  };
}

export const COMMENT_TONE: Record<CommentType, string> = {
  feedback: 'blue',
  question: 'orange',
  partnership: 'violet',
};

/** Hai chữ cái đầu tên (prototype ini) — dùng cho avatar chữ */
export const monogram = (name: string) => name.slice(0, 1);

/** "x phút / giờ / ngày trước" của góp ý */
export function agoKey(
  iso: string,
  now: number,
): { key: 'now' | 'minutes' | 'hours' | 'days'; n: number } {
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (s < 60) return { key: 'now', n: 0 };
  if (s < 3600) return { key: 'minutes', n: Math.floor(s / 60) };
  if (s < 86400) return { key: 'hours', n: Math.floor(s / 3600) };
  return { key: 'days', n: Math.floor(s / 86400) };
}

/** Tên repo hiển thị: bỏ host GitHub/GitLab */
export const repoName = (url: string) =>
  url.replace(/^https?:\/\/(www\.)?(github|gitlab)\.com\//, '');

/** Kênh liên hệ điền sẵn khi tạo dự án mới (từ hồ sơ chủ dự án, chủ dự án xoá được) */
export interface OwnerContact {
  email: string;
  phone: string;
}

export function emptyForm(
  owner: string,
  contact: OwnerContact = { email: '', phone: '' },
): ProjectFormState {
  return {
    coverUrl: null,
    name: '',
    category: '',
    stage: 'idea',
    summary: '',
    description: '',
    website: '',
    tags: '',
    testUrl: '',
    repoProvider: '',
    repoUrl: '',
    repoVisibility: 'public',
    fundOn: false,
    fundAmount: '',
    fundCurrency: 'VND',
    fundEquity: '',
    fundMin: '',
    fundDeck: '',
    fundUse: '',
    team: [{ name: owner, role: 'Founder · CEO', avatarUrl: null, isOwner: true }],
    visibility: 'public',
    groupIds: [],
    contactEmail: contact.email,
    contactPhone: contact.phone,
  };
}

export function formFromProject(p: ProjectDetail): ProjectFormState {
  const f = p.funding;
  return {
    coverUrl: p.coverUrl,
    name: p.name,
    category: p.category,
    stage: p.stage,
    summary: p.summary,
    description: p.description,
    website: p.website ?? '',
    tags: p.tags.join(', '),
    testUrl: p.testUrl ?? '',
    repoProvider: p.repo?.provider ?? '',
    repoUrl: p.repo?.url ?? '',
    repoVisibility: p.repo?.visibility ?? 'public',
    fundOn: !!f,
    fundAmount: f ? String(f.amount) : '',
    fundCurrency: f?.currency ?? 'VND',
    fundEquity: f ? String(f.equityPercent) : '',
    fundMin: f?.minTicket ? String(f.minTicket) : '',
    fundDeck: p.deckUrl ?? '',
    fundUse: f?.useOfFunds ?? '',
    team: p.team.map((m): TeamRow => ({ ...m })),
    visibility: p.visibility,
    groupIds: p.groupIds,
    contactEmail: p.contact.email ?? '',
    contactPhone: p.contact.phone ?? '',
  };
}

const num = (v: string) => (v.trim() === '' ? 0 : Number(v));

export function formToSave(f: ProjectFormState, submit: boolean): ProjectSave {
  return {
    name: f.name.trim(),
    category: f.category,
    stage: f.stage,
    summary: f.summary.trim(),
    description: f.description,
    website: f.website.trim(),
    tags: f.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10),
    coverUrl: f.coverUrl,
    testUrl: f.testUrl.trim(),
    repo: f.repoProvider
      ? { provider: f.repoProvider, url: f.repoUrl.trim(), visibility: f.repoVisibility }
      : null,
    funding: f.fundOn
      ? {
          amount: Math.round(num(f.fundAmount)) || 0,
          currency: f.fundCurrency,
          equityPercent: num(f.fundEquity) || 0,
          minTicket: Math.round(num(f.fundMin)) || 0,
          deckUrl: f.fundDeck.trim(),
          useOfFunds: f.fundUse.trim(),
        }
      : null,
    team: f.team.filter((m) => m.name.trim()).map((m) => ({ ...m, name: m.name.trim() })),
    visibility: f.visibility,
    groupIds: f.groupIds,
    contactEmail: f.contactEmail.trim(),
    contactPhone: f.contactPhone.trim(),
    submit,
  };
}

const HTTP_URL = /^https?:\/\/\S+\.\S+/;
const repoOk = (prov: string, url: string) =>
  new RegExp(`^https?://(www\\.)?${prov}\\.com/[^/]+/[^/]+`).test(url);

/** Kiểm như prototype trước khi "Gửi đăng dự án" — trả khoá message lỗi đầu tiên */
export type SubmitError =
  | 'needName'
  | 'needCategory'
  | 'needSummary'
  | 'needFundAmount'
  | 'badEquity'
  | 'badTestUrl'
  | 'badRepoGithub'
  | 'badRepoGitlab'
  | 'badContactEmail'
  | 'badContactPhone';

/** Ô form dự án có thể báo lỗi (thứ tự = thứ tự kiểm của prototype) */
export type SubmitField =
  | 'name'
  | 'category'
  | 'summary'
  | 'fundAmount'
  | 'fundEquity'
  | 'testUrl'
  | 'repoUrl'
  | 'contactEmail'
  | 'contactPhone';
export type SubmitErrors = Partial<Record<SubmitField, SubmitError>>;

/** Kiểm MỌI ô (BUG-022) trước khi "Gửi đăng dự án"; thứ tự khoá như prototype. Rỗng = hợp lệ */
export function validateSubmit(f: ProjectFormState): SubmitErrors {
  const e: SubmitErrors = {};
  if (!f.name.trim()) e.name = 'needName';
  if (!f.category) e.category = 'needCategory';
  if (!f.summary.trim()) e.summary = 'needSummary';
  if (f.fundOn && !(num(f.fundAmount) > 0)) e.fundAmount = 'needFundAmount';
  if (f.fundOn && !(num(f.fundEquity) > 0 && num(f.fundEquity) <= 100)) e.fundEquity = 'badEquity';
  if (!HTTP_URL.test(f.testUrl.trim())) e.testUrl = 'badTestUrl';
  if (f.repoProvider && f.repoUrl.trim() && !repoOk(f.repoProvider, f.repoUrl.trim()))
    e.repoUrl = f.repoProvider === 'github' ? 'badRepoGithub' : 'badRepoGitlab';
  return { ...e, ...validateContact(f) };
}

/** path lỗi server (POST/PUT dự án) → ô form */
export const PROJECT_FIELD_MAP = {
  name: 'name',
  category: 'category',
  summary: 'summary',
  'funding.amount': 'fundAmount',
  'funding.equityPercent': 'fundEquity',
  testUrl: 'testUrl',
  'repo.url': 'repoUrl',
  contactEmail: 'contactEmail',
  contactPhone: 'contactPhone',
} as const satisfies Record<string, SubmitField>;

export const repoUrlWarn = (f: ProjectFormState) =>
  !!f.repoProvider && !!f.repoUrl.trim() && !repoOk(f.repoProvider, f.repoUrl.trim());

export type InterestError =
  'needName' | 'badPhone' | 'needFund' | 'needBiz' | 'needAmount' | 'belowMin';

export type InterestField = 'name' | 'phone' | 'org' | 'amount';
export type InterestErrors = Partial<Record<InterestField, InterestError>>;

/** Kiểm form quan tâm đầu tư (BR-09) — MỌI ô (BUG-022), thứ tự prototype. Rỗng = hợp lệ */
export function validateInterest(v: {
  name: string;
  phone: string;
  kind: 'individual' | 'business' | 'fund';
  org: string;
  amount: string;
  min: number;
}): InterestErrors {
  const e: InterestErrors = {};
  if (!v.name.trim()) e.name = 'needName';
  if (!/^[+0-9 ().-]{9,}$/.test(v.phone.trim())) e.phone = 'badPhone';
  if (v.kind !== 'individual' && !v.org.trim()) e.org = v.kind === 'fund' ? 'needFund' : 'needBiz';
  const a = Number(v.amount);
  if (!(a > 0)) e.amount = 'needAmount';
  else if (v.min > 0 && a < v.min) e.amount = 'belowMin';
  return e;
}

/** path lỗi server (POST quan tâm đầu tư) → ô form */
export const INTEREST_FIELD_MAP = {
  contactName: 'name',
  phone: 'phone',
  organization: 'org',
  amount: 'amount',
} as const satisfies Record<string, InterestField>;

/**
 * V4-610 (prototype `fundSt`): sau khi gửi dự án có gọi vốn, mở popup thanh toán trừ khi khoản
 * gần nhất đang chờ thẩm định / đang gọi vốn có phí (legacy không tính).
 */
export const needsFundraising = (card: Pick<ProjectCard, 'fundraising'>): boolean =>
  !card.fundraising || !['pending_review', 'active'].includes(card.fundraising.status);
