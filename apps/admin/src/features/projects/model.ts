import { compactMoney } from '@/i18n/compact-money';
import { formatDate } from '@/i18n/format';
import type { ProjectStatus } from '@opchub/shared';
import type { ProjectFunding } from '@opchub/shared/api-domains';
import {
  REVIEW_TABS,
  TAB_STATUS,
  type AdminProject,
  type InfoKey,
  type InfoRow,
  type ReviewTab,
} from './types';

/** Logic thuần của màn kiểm duyệt dự án (không React) — test ở model.spec.ts */

export const tabOf = (s: ProjectStatus): ReviewTab =>
  REVIEW_TABS.find((t) => TAB_STATUS[t] === s) ?? 'draft';

/** Dự án đang hiển thị có bản sửa Chờ duyệt (REQ-106, D-18) — dòng "Bản sửa" ở tab Chờ duyệt */
export const hasPendingRevision = (p: AdminProject) => p.revision?.status === 'pending_review';

/** Tab Chờ duyệt = dự án Chờ duyệt ∪ dự án có bản sửa Chờ duyệt (như `counts` server) */
export const inTab = (p: AdminProject, tab: ReviewTab) =>
  tabOf(p.status) === tab || (tab === 'pending' && hasPendingRevision(p));

export function tabCounts(all: AdminProject[]): Record<ReviewTab, number> {
  const out = Object.fromEntries(REVIEW_TABS.map((t) => [t, 0])) as Record<ReviewTab, number>;
  for (const p of all) {
    out[tabOf(p.status)] += 1;
    if (hasPendingRevision(p) && tabOf(p.status) !== 'pending') out.pending += 1;
  }
  return out;
}

/**
 * Nội dung hiển thị trong drawer: bản sửa Chờ duyệt đè lên bản đang hiển thị (chỉ xem nội dung,
 * không diff — SKIP TIP-V2-113). Ghi chú duyệt lấy của bản sửa.
 */
export function reviewView(p: AdminProject): AdminProject {
  const r = p.revision;
  if (!r || r.status !== 'pending_review') return p;
  return {
    ...p,
    name: r.name,
    category: r.category,
    summary: r.summary,
    stage: r.stage,
    tags: r.tags,
    website: r.website,
    coverUrl: r.coverUrl,
    description: r.description,
    testUrl: r.testUrl,
    repo: r.repo,
    visibility: r.visibility,
    team: r.team,
    funding: r.funding,
    reviewNote: r.reviewNote,
  };
}

export function pageSlice<T>(list: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(list.length / size));
  const p = Math.min(Math.max(1, page), pages);
  return { page: p, items: list.slice((p - 1) * size, p * size) };
}

/**
 * Hành động khả dụng trong drawer — chỉ chuyển hợp lệ theo SRS §9. Bản sửa Chờ duyệt (REQ-106):
 * Duyệt / Yêu cầu chỉnh sửa / Từ chối áp lên bản sửa, dự án vẫn Đang hiển thị.
 */
export function drawerActions(s: ProjectStatus, pendingRevision = false) {
  return {
    canReview: s === 'pending_review' || pendingRevision,
    canHide: s === 'published',
    canRepublish: s === 'hidden',
  };
}

/** dd/mm/yyyy theo giờ Việt Nam */
export const vnDate = (isoStr: string, locale = 'vi') => formatDate(isoStr, locale);

/** Số tiền gọi vốn rút gọn như prototype ($150K, 2 tỷ ₫, 300 triệu ₫) */
export const formatMoney = (n: number, cur: ProjectFunding['currency'], locale = 'vi') =>
  compactMoney(n, cur, locale);

/** Bỏ thẻ HTML của ô soạn thảo → văn bản thuần */
export function plainText(html: string): string {
  return html
    .replace(/<\/(p|li|h3)>/g, ' ')
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Ghi chú gửi chủ dự án: "Lý do – lời nhắn" */
export const reviewNote = (reason: string, html: string) =>
  [reason, plainText(html)].filter(Boolean).join(' – ');

export interface InfoLabels {
  stage: Record<AdminProject['stage'], string>;
  none: string;
  noRepo: string;
  repoPublic: string;
  repoPrivate: string;
  visPublic: string;
  visPrivate: string;
  noFunding: string;
  funding: (amount: string, equity: number) => string;
}

/** Bảng thông tin trong drawer (thứ tự prototype) */
export function infoRows(p: AdminProject, l: InfoLabels, locale = 'vi'): InfoRow[] {
  const repo = p.repo
    ? `${p.repo.provider === 'gitlab' ? 'GitLab' : 'GitHub'} · ${
        p.repo.visibility === 'private' ? l.repoPrivate : l.repoPublic
      } · ${p.repo.url}`
    : l.noRepo;
  const team = p.team.length
    ? p.team.map((m) => (m.role ? `${m.name} (${m.role})` : m.name)).join(', ')
    : p.ownerName;
  const rows: [InfoKey, string][] = [
    ['owner', p.ownerName],
    ['country', p.country],
    ['category', p.category],
    ['stage', l.stage[p.stage]],
    ['website', p.website ?? l.none],
    ['testUrl', p.testUrl ?? l.none],
    ['repo', repo],
    ['visibility', p.visibility === 'private' ? l.visPrivate : l.visPublic],
    [
      'funding',
      p.funding
        ? l.funding(
            formatMoney(p.funding.amount, p.funding.currency, locale),
            p.funding.equityPercent,
          )
        : l.noFunding,
    ],
    ['team', team],
    ['groups', p.groupNames.join(', ') || l.none],
    ['date', vnDate(p.createdAt, locale)],
  ];
  return rows.map(([key, value]) => ({ key, value: value || l.none }));
}
