import type { Prisma } from '@opchub/db';
import { PROJECT_NEEDS, type ProjectNeed } from '@opchub/shared';
import {
  projectHighlightsSchema,
  type AdminProject,
  type ProjectCard,
  type ProjectDetail,
  type ProjectItem,
} from '@opchub/shared/api-domains';

/** Cột cho thẻ/DTO — không lấy `description_html` (rộng) trừ khi cần */
export const PROJECT_CARD_SELECT = {
  id: true,
  name: true,
  summary: true,
  tone: true,
  status: true,
  stage: true,
  audience: true,
  needs: true,
  viewCount: true,
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
  group: { select: { name: true, province: true } },
  owner: { select: { fullName: true, avatarUrl: true } },
  members: {
    select: { name: true, role: true, avatarUrl: true, isOwner: true },
    orderBy: { sort: 'asc' },
  },
  funding: true,
  /** V4-610: Gói Gọi vốn đang hiệu lực — một query lồng cho cả trang (Prisma gộp) */
  fundraisings: {
    where: { status: 'active' },
    select: { endsAt: true },
    orderBy: { endsAt: 'desc' },
    take: 1,
  },
  shares: { select: { groupId: true, group: { select: { name: true } } } },
} as const satisfies Prisma.ProjectSelect;

export type ProjectRow = Prisma.ProjectGetPayload<{ select: typeof PROJECT_CARD_SELECT }>;

/** Ảnh bìa mẫu (prototype) khi chưa tải ảnh — Q-B32-2 */
const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=450&fit=crop&auto=format';
export const displayCover = (url: string | null) => url ?? DEFAULT_COVER;

/** Cột JSONB `highlights` → mảng hợp lệ (dữ liệu hỏng → rỗng, khối bị ẩn) */
export const highlightsOf = (v: Prisma.JsonValue): ProjectDetail['highlights'] => {
  const r = projectHighlightsSchema.safeParse(v);
  return r.success ? r.data.filter((h) => h.title && h.body) : [];
};

const isNeed = (n: string): n is ProjectNeed => (PROJECT_NEEDS as readonly string[]).includes(n);

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
    audience: r.audience,
    needs: r.needs.filter(isNeed),
    views: r.viewCount,
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

/** NA-21: `hideUrl` = người xem không phải chủ → repo private trả `url: null` */
export const repoOf = (r: ProjectRow, hideUrl = false) => {
  if (!r.repoProvider || !r.repoUrl) return null;
  const visibility = r.repoVisibility ?? 'public';
  const url = hideUrl && visibility === 'private' ? null : r.repoUrl;
  return { provider: r.repoProvider, url, visibility };
};

/** V4-610 (UP-11): Gói Gọi vốn Admin đã duyệt, còn hạn */
export const fundraisingActive = (r: ProjectRow, now = new Date()) =>
  r.fundraisings.some((f) => f.endsAt !== null && f.endsAt > now);

/**
 * Thẻ Khám phá: ảnh bìa luôn có (mẫu khi chưa tải). V4-610: khai báo gọi vốn chỉ hiện với người
 * khác khi Gói Gọi vốn đang hiệu lực; chủ dự án (`viewerId`) luôn thấy để sửa / mua gói.
 */
export function toProjectCard(
  r: ProjectRow,
  followedByMe: boolean,
  rawCover = false,
  viewerId?: string,
): ProjectCard {
  const item = toProjectItem(r);
  const active = fundraisingActive(r);
  return {
    ...item,
    // D-89 (v4): "Tìm nhà đầu tư" đứng đầu khi Gói Gọi vốn hiệu lực (prototype `fundOn`)
    needs: active && !item.needs.includes('investors') ? ['investors', ...item.needs] : item.needs,
    funding: active || r.ownerId === viewerId ? item.funding : null,
    fundraisingActive: active,
    fundraising: null,
    coverUrl: rawCover ? r.coverUrl : displayCover(r.coverUrl),
    ownerAvatarUrl: r.owner.avatarUrl,
    commentCount: r.commentCount,
    followedByMe,
    province: r.group?.province ?? r.country,
    visibility: r.visibility,
    updatedAt: r.updatedAt.toISOString(),
    // Bản sửa chỉ gắn ở "Dự án của tôi" / form sửa / Admin (ProjectRevisionService)
    revision: null,
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
    revision: null,
    fundraising: null,
  };
}

/** Mô tả hiển thị: đã soạn, không có thì đoạn sinh từ thông tin dự án (prototype) */
export function describe(r: ProjectRow, html: string): string {
  if (html) return html;
  const item = toProjectItem(r);
  return `${item.summary} Dự án được xây dựng bởi ${item.ownerName} – thành viên cộng đồng ${item.groupName}. Sản phẩm đã có người dùng thực tế tại ${item.country} và đang tìm kiếm phản hồi, cộng tác viên cũng như đối tác phân phối trong khu vực ASEAN.`;
}
