import { categories, communities, projects as rawProjects, seed } from '@opchub/shared/fixtures';
import {
  avatarUrl,
  buildComments,
  buildProjects,
  contactOf,
  PROJECT_EXTRAS,
  SEED_GALLERY,
  SEED_MILESTONES,
  seedHighlights,
} from '@opchub/shared/mock-domains';
import type { ProjectItem } from '@opchub/shared/api-domains';
import type { DbTx } from '../../src/client';
import { requireUserId } from './people';

/**
 * Domain project: p1–p10 (trạng thái, gọi vốn, repo, chia sẻ nhóm, đội ngũ), theo dõi của TK demo
 * (p2), góp ý + trả lời. `followers_count` / `comment_count` khớp dữ liệu hiển thị của mock.
 */

interface RepoSeed {
  testUrl: string;
  repoProv: '' | 'github' | 'gitlab';
  repoUrl: string;
  repoVis: 'public' | 'private';
}
const REPO = seed.REPO_SEED as Record<string, RepoSeed>;
const DECK = seed.FUND_SEED as Record<string, { deck?: string }>;

/** Đội ngũ mẫu khi seed không khai báo (project-store DEFAULT_TEAM) */
const DEFAULT_TEAM: [string, string, string][] = [
  ['Ngô Thành Đạt', 'Kỹ sư phần mềm', 'men/41'],
  ['Phạm Thu Hà', 'Thiết kế sản phẩm', 'women/65'],
  ['Hoàng Gia Linh', 'Marketing', 'men/52'],
];
/** Prototype: TK demo đang theo dõi LeadPilot (pjFollow = { p2: 1 }) */
const DEMO_FOLLOWS: readonly string[] = ['p2'];

const categoryId = new Map(categories.map((c) => [c.name, c.id]));
const groupId = new Map(communities.map((c) => [c.name, c.id]));
const raw = new Map(rawProjects.map((p) => [p.id, p]));

function sharesOf(p: ProjectItem): string[] {
  const r = raw.get(p.id);
  const names = Array.isArray(r?.shareTo) ? (r.shareTo as string[]) : [p.groupName];
  return names.map((n) => groupId.get(n)).filter((x): x is string => !!x);
}

function teamOf(p: ProjectItem) {
  if (raw.get(p.id)?.team) return p.team;
  const ownerPh = PROJECT_EXTRAS[p.id]?.ph ?? null;
  return [
    { name: p.ownerName, role: 'Founder · CEO', avatarUrl: avatarUrl(ownerPh), isOwner: true },
    ...DEFAULT_TEAM.map(([name, role, ph]) => ({
      name,
      role,
      avatarUrl: avatarUrl(ph),
      isOwner: false,
    })),
  ];
}

export async function seedProjects(tx: DbTx): Promise<void> {
  const items = buildProjects();
  const comments = buildComments();
  await tx.project.createMany({
    data: items.map((p) => {
      const r = REPO[p.id];
      const at = new Date(p.createdAt);
      return {
        id: p.id,
        ownerId: requireUserId(p.ownerName),
        name: p.name,
        categoryId: categoryId.get(p.category) ?? null,
        groupId: groupId.get(p.groupName) ?? null,
        summary: p.summary,
        stage: p.stage,
        audience: p.audience,
        needs: p.needs,
        viewCount: p.views,
        status: p.status,
        visibility: raw.get(p.id)?.vis === 'comm' ? ('private' as const) : ('public' as const),
        tone: p.tone,
        reviewNote: p.reviewNote,
        country: p.country,
        tags: p.tags,
        website: p.website,
        // BUG-038: như MSW — chưa tải ảnh bìa (thẻ vẫn hiện ảnh mẫu qua displayCover lúc đọc)
        coverUrl: null,
        testUrl: r?.testUrl || null,
        repoProvider: r?.repoProv || null,
        repoUrl: r?.repoUrl || null,
        repoVisibility: r?.repoProv ? r.repoVis : null,
        deckUrl: DECK[p.id]?.deck || null,
        // BUG-016 (V2Q-81): dự án demo coi như chủ dự án đã công khai email + SĐT mẫu (như mock)
        contactEmail: contactOf(p.ownerName).email,
        contactPhone: contactOf(p.ownerName).phone,
        contactAddress: contactOf(p.ownerName).address,
        // D-89 (v4): khối chi tiết của prototype cho dự án demo (như MSW)
        highlights: seedHighlights(p.summary),
        gallery: [...SEED_GALLERY],
        milestones: [...SEED_MILESTONES],
        followersCount: p.followers + (DEMO_FOLLOWS.includes(p.id) ? 1 : 0),
        commentCount: comments.filter((c) => c.projectId === p.id).length,
        publishedAt: p.status === 'published' ? at : null,
        createdAt: at,
        updatedAt: at,
      };
    }),
  });
  await tx.projectMember.createMany({
    data: items.flatMap((p) =>
      teamOf(p).map((t, i) => ({
        projectId: p.id,
        userId: t.isOwner ? requireUserId(p.ownerName) : null,
        name: t.name,
        role: t.role,
        avatarUrl: t.avatarUrl,
        isOwner: t.isOwner,
        sort: i,
      })),
    ),
  });
  await tx.projectShare.createMany({
    data: items.flatMap((p) => sharesOf(p).map((g) => ({ projectId: p.id, groupId: g }))),
  });
  await seedFunding(tx, items);
  await tx.projectFollow.createMany({
    data: DEMO_FOLLOWS.map((projectId) => ({ projectId, userId: 'm1' })),
  });
  await seedComments(tx);
}

async function seedFunding(tx: DbTx, items: ProjectItem[]): Promise<void> {
  await tx.projectFunding.createMany({
    data: items.flatMap((p) => {
      const f = p.funding;
      if (!f) return [];
      return [
        {
          projectId: p.id,
          amount: BigInt(f.amount),
          currency: f.currency,
          equityPct: f.equityPercent,
          round: f.round,
          instrument: f.instrument,
          endsAt: new Date(f.endsAt),
          minTicket: BigInt(f.minTicket),
          raised: BigInt(f.raised),
          useOfFunds: f.useOfFunds,
        },
      ];
    }),
  });
  // V4-610 (Q-V4-610-2): khai báo gọi vốn có từ trước = Gói Gọi vốn đang hiệu lực (legacy, không thu)
  const now = Date.now();
  await tx.projectFundraising.createMany({
    data: items.flatMap((p) =>
      p.funding
        ? [
            {
              projectId: p.id,
              ownerId: requireUserId(p.ownerName),
              amount: 0,
              status: 'active' as const,
              legacy: true,
              startsAt: new Date(now),
              endsAt: new Date(now + LEGACY_FUNDRAISING_MS),
            },
          ]
        : [],
    ),
  });
}

/** 6 tháng ≈ 182 ngày (prototype `fundUntil`) */
const LEGACY_FUNDRAISING_MS = 182 * 86_400_000;

/** Góp ý gốc (id k1…k7 như mock) + trả lời (`<id>-r<n>`) */
async function seedComments(tx: DbTx): Promise<void> {
  const comments = buildComments();
  const roots = comments.map((c) => ({
    id: c.id,
    projectId: c.projectId,
    authorId: requireUserId(c.author.name),
    type: c.type,
    body: c.body,
    likeCount: c.likes,
    resolvedAt: c.resolved ? new Date(c.createdAt) : null,
    createdAt: new Date(c.createdAt),
  }));
  const replies = comments.flatMap((c) =>
    c.replies.map((r, n) => ({
      id: `${c.id}-r${n + 1}`,
      projectId: c.projectId,
      authorId: requireUserId(r.author.name),
      parentId: c.id,
      type: c.type,
      body: r.body,
      createdAt: new Date(r.createdAt),
    })),
  );
  await tx.projectComment.createMany({ data: roots });
  await tx.projectComment.createMany({ data: replies });
}
