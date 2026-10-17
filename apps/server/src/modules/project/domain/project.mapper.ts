import type { Prisma } from '@opchub/db';
import type { AdminProject, ProjectCard, ProjectItem } from '@opchub/shared/api-domains';

/** Cột cho thẻ/DTO — không lấy `description_html` (rộng) trừ khi cần */
export const PROJECT_CARD_SELECT = {
  id: true,
  name: true,
  summary: true,
  tone: true,
  status: true,
  stage: true,
  country: true,
  tags: true,
  website: true,
  followersCount: true,
  commentCount: true,
  reviewNote: true,
  visibility: true,
  coverUrl: true,
  testUrl: true,
  repoProvider: true,
  repoUrl: true,
  repoVisibility: true,
  deckUrl: true,
  featuredAt: true,
  publishedAt: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { name: true } },
  group: { select: { name: true } },
  owner: { select: { fullName: true, avatarUrl: true } },
  members: {
    select: { name: true, role: true, avatarUrl: true, isOwner: true },
    orderBy: { sort: 'asc' },
  },
  funding: true,
  shares: { select: { groupId: true, group: { select: { name: true } } } },
} as const satisfies Prisma.ProjectSelect;

export type ProjectRow = Prisma.ProjectGetPayload<{ select: typeof PROJECT_CARD_SELECT }>;

/** Ảnh bìa mẫu (prototype) khi chưa tải ảnh — Q-B32-2 */
const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=450&fit=crop&auto=format';
export const displayCover = (url: string | null) => url ?? DEFAULT_COVER;

/** BigInt tiền → number (≤ 2^53, đã chặn ở zod đầu vào) */
const num = (v: bigint) => Number(v);

export function toProjectItem(r: ProjectRow): ProjectItem {
  const f = r.funding;
  return {
    id: r.id,
    name: r.name,
    category: r.category?.name ?? '',
    ownerName: r.owner.fullName,
    groupName: r.group?.name ?? r.shares[0]?.group.name ?? '',
    summary: r.summary,
    tone: r.tone,
    status: r.status,
    stage: r.stage,
    country: r.country,
    tags: r.tags,
    website: r.website,
    followers: r.followersCount,
    reviewNote: r.reviewNote,
    createdAt: r.createdAt.toISOString(),
    team: r.members.map((m) => ({
      name: m.name,
      role: m.role,
      avatarUrl: m.avatarUrl,
      isOwner: m.isOwner,
    })),
    funding: f
      ? {
          amount: num(f.amount),
          currency: f.currency === 'USD' ? 'USD' : 'VND',
          equityPercent: Number(f.equityPct),
          round: f.round,
          instrument: f.instrument,
          endsAt: (f.endsAt ?? f.updatedAt).toISOString(),
          minTicket: num(f.minTicket),
          raised: num(f.raised),
          useOfFunds: f.useOfFunds,
        }
      : null,
  };
}

export const repoOf = (r: ProjectRow) =>
  r.repoProvider && r.repoUrl
    ? { provider: r.repoProvider, url: r.repoUrl, visibility: r.repoVisibility ?? 'public' }
    : null;

/** Thẻ Khám phá: ảnh bìa luôn có (mẫu khi chưa tải) */
export function toProjectCard(r: ProjectRow, followedByMe: boolean, rawCover = false): ProjectCard {
  return {
    ...toProjectItem(r),
    coverUrl: rawCover ? r.coverUrl : displayCover(r.coverUrl),
    ownerAvatarUrl: r.owner.avatarUrl,
    commentCount: r.commentCount,
    followedByMe,
    visibility: r.visibility,
    updatedAt: r.updatedAt.toISOString(),
  };
}

export function toAdminProject(r: ProjectRow, description: string): AdminProject {
  const names = r.shares.map((s) => s.group.name);
  return {
    ...toProjectItem(r),
    coverUrl: displayCover(r.coverUrl),
    description,
    testUrl: r.testUrl,
    repo: repoOf(r),
    visibility: r.visibility,
    groupNames: names.length ? names : r.group ? [r.group.name] : [],
    featured: r.featuredAt !== null,
  };
}

/** Mô tả hiển thị: đã soạn, không có thì đoạn sinh từ thông tin dự án (prototype) */
export function describe(r: ProjectRow, html: string): string {
  if (html) return html;
  const item = toProjectItem(r);
  return `${item.summary} Dự án được xây dựng bởi ${item.ownerName} – thành viên cộng đồng ${item.groupName}. Sản phẩm đã có người dùng thực tế tại ${item.country} và đang tìm kiếm phản hồi, cộng tác viên cũng như đối tác phân phối trong khu vực ASEAN.`;
}
