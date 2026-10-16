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

export function tabCounts(all: AdminProject[]): Record<ReviewTab, number> {
  const out = Object.fromEntries(REVIEW_TABS.map((t) => [t, 0])) as Record<ReviewTab, number>;
  for (const p of all) out[tabOf(p.status)] += 1;
  return out;
}

export function pageSlice<T>(list: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(list.length / size));
  const p = Math.min(Math.max(1, page), pages);
  return { page: p, items: list.slice((p - 1) * size, p * size) };
}

/** Hành động khả dụng trong drawer — chỉ chuyển hợp lệ theo SRS §8 */
export function drawerActions(s: ProjectStatus) {
  return {
    canReview: s === 'pending_review',
    canHide: s === 'published',
    canRepublish: s === 'hidden',
  };
}

/** dd/mm/yyyy theo giờ Việt Nam */
export function vnDate(isoStr: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(isoStr));
}

/** Số tiền gọi vốn rút gọn như prototype ($150K, 2 tỷ ₫, 300 triệu ₫) */
export function formatMoney(n: number, cur: ProjectFunding['currency']): string {
  if (cur === 'USD') {
    if (n >= 1e6) return `$${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M`;
    return n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${n}`;
  }
  if (n >= 1e9) return `${(n / 1e9).toFixed(n % 1e9 ? 1 : 0).replace('.', ',')} tỷ ₫`;
  return n >= 1e6 ? `${Math.round(n / 1e6)} triệu ₫` : `${n.toLocaleString('vi-VN')} ₫`;
}

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
export function infoRows(p: AdminProject, l: InfoLabels): InfoRow[] {
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
        ? l.funding(formatMoney(p.funding.amount, p.funding.currency), p.funding.equityPercent)
        : l.noFunding,
    ],
    ['team', team],
    ['groups', p.groupNames.join(', ') || l.none],
    ['date', vnDate(p.createdAt)],
  ];
  return rows.map(([key, value]) => ({ key, value: value || l.none }));
}
