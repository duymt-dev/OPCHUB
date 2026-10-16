import type {
  ProjectCard,
  ProjectDetail,
  ProjectItem,
  ProjectSaveData,
  ProjectStageFilter,
  ProjectSort,
  ProjectStats,
} from '../../api-domains';
import { categories, members, seed } from '../../fixtures';
import { sendChatMessage } from './chat-messages';
import { avatarOf, roomIdOf } from './community';
import { mockDb, nextId } from './store';
import {
  canSee,
  displayCover,
  extOf,
  groupsOfUser,
  isFollowing,
  nameOfUser,
  projectState,
  seedDescription,
  unsplash,
} from './project-store';
import { PROJECT_EXTRAS } from './extras';
import {
  avatarUrl,
  conflict,
  includesText,
  iso,
  MOCK_NOW,
  notFound,
  ok,
  type MockResult,
} from './util';

/** Nghiệp vụ mock màn Dự án Portal: Khám phá, Chi tiết, Dự án của tôi, đăng/sửa (QT-09) */

export interface ProjectListFilter {
  q?: string | undefined;
  cat?: string | undefined;
  stage?: ProjectStageFilter | undefined;
  sort: ProjectSort;
}

function commentCount(id: string) {
  return mockDb().comments.filter((c) => c.projectId === id).length;
}

export function toCard(userId: string, p: ProjectItem): ProjectCard {
  const e = extOf(p);
  return {
    ...p,
    coverUrl: displayCover(p.id, e.coverUrl),
    ownerAvatarUrl: avatarUrl(PROJECT_EXTRAS[p.id]?.ph ?? 'men/11'),
    commentCount: commentCount(p.id),
    followedByMe: isFollowing(userId, p.id),
    visibility: e.visibility,
    updatedAt: e.updatedAt,
  };
}

/** Dự án đang hiển thị mà người gọi được xem (BR-08) */
export const visibleProjects = (userId: string) =>
  mockDb().projects.filter((p) => p.status === 'published' && canSee(userId, p));

export function listPortalProjects(userId: string, f: ProjectListFilter): ProjectCard[] {
  const list = visibleProjects(userId).filter(
    (p) =>
      (!f.cat || p.category === f.cat) &&
      (!f.stage || (f.stage === 'fund' ? !!p.funding : p.stage === f.stage)) &&
      includesText(`${p.name} ${p.summary} ${p.ownerName}`, f.q),
  );
  if (f.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
  if (f.sort === 'follow') list.sort((a, b) => b.followers - a.followers);
  return list.map((p) => toCard(userId, p));
}

/** Thống kê đầu màn + đếm theo lĩnh vực (danh mục bật cho dự án, theo thứ tự cấu hình) */
export function projectStats(userId: string): ProjectStats {
  const all = visibleProjects(userId);
  const cats = mockDb().categories.filter((c) => c.enabled && c.scope.includes('project'));
  const extra = [...new Set(all.map((p) => p.category))].filter(
    (c) => !cats.some((x) => x.name === c),
  );
  const featured = [...all].sort((a, b) => b.followers - a.followers)[0];
  return {
    total: all.length,
    growing: all.filter((p) => p.stage === 'growth' || p.stage === 'launched').length,
    countries: new Set(all.map((p) => p.country)).size,
    following: projectState().follows.get(userId)?.size ?? 0,
    categories: [
      ...cats.map((c) => ({ name: c.name, color: c.color })),
      ...extra.map((name) => ({ name, color: '#8C8C8C' })),
    ].map((c) => ({ ...c, count: all.filter((p) => p.category === c.name).length })),
    featured: featured
      ? {
          ...toCard(userId, featured),
          description: extOf(featured).description || seedDescription(featured),
        }
      : null,
  };
}

const ADDRESSES = [
  'Tầng 5, 123 Nguyễn Huệ, P. Bến Nghé, Q.1, TP.HCM',
  'Số 18 Láng Hạ, P. Thành Công, Q. Ba Đình, Hà Nội',
  '45 Bạch Đằng, Q. Hải Châu, Đà Nẵng',
  'Lô B2, KCN Quang Minh, Mê Linh, Hà Nội',
  '72 Trần Phú, P. Lộc Thọ, Nha Trang, Khánh Hòa',
  '210 Nguyễn Văn Linh, Q. Ninh Kiều, Cần Thơ',
];

/** Liên hệ mẫu sinh từ tên chủ dự án như prototype; API thật lấy từ hồ sơ chủ dự án */
function contactOf(owner: string) {
  const n = [...owner].reduce((a, c) => a + c.charCodeAt(0), 0);
  const slug = owner
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .split(' ')
    .filter(Boolean);
  const email = `${slug.at(-1) ?? 'opc'}.${slug
    .slice(0, -1)
    .map((w) => w[0])
    .join('')}@opchub.vn`;
  const phone = `09${String(10000000 + ((n * 7919) % 89999999)).slice(0, 8)}`;
  return { email, phone, address: ADDRESSES[n % ADDRESSES.length] ?? '' };
}

const GALLERY = [
  '1551288049-bebda4e38f71',
  '1460925895917-afdab827c52f',
  '1504868584819-f8e8b4b6d7e3',
];

function vnDate(isoStr: string) {
  const d = new Date(Date.parse(isoStr) + 7 * 36e5);
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

export function projectDetail(userId: string, id: string): MockResult<ProjectDetail> {
  const p = mockDb().projects.find((x) => x.id === id);
  // 404 cả khi chưa hiển thị / không có quyền — không lộ sự tồn tại (BR-08)
  if (!p || p.status !== 'published' || !canSee(userId, p)) return notFound('Không tìm thấy dự án');
  return ok(buildDetail(userId, p));
}

function buildDetail(userId: string, p: ProjectItem): ProjectDetail {
  const db = mockDb();
  const id = p.id;
  const e = extOf(p);
  const me = nameOfUser(userId);
  const interests = db.interests.filter((i) => i.projectId === id);
  const mine = interests.find((i) => i.investorName === me);
  return {
    ...toCard(userId, p),
    description: e.description || seedDescription(p),
    highlights: [
      {
        title: 'Vấn đề',
        body: 'Doanh nghiệp một người mất nhiều thời gian cho việc vận hành thủ công.',
      },
      { title: 'Giải pháp', body: p.summary },
      { title: 'Thị trường', body: 'Hơn 2 triệu doanh nghiệp siêu nhỏ tại ASEAN.' },
    ],
    gallery: GALLERY.map((g) => unsplash(g, 500, 300)),
    updates: [
      {
        date: '15/10/2026',
        title: 'Ra mắt phiên bản 2.0',
        body: 'Bổ sung báo cáo tự động và tích hợp thanh toán QR.',
        tone: 'blue',
      },
      {
        date: '28/09/2026',
        title: 'Đạt 1.000 người dùng',
        body: 'Mốc quan trọng sau 6 tháng ra mắt.',
        tone: 'green',
      },
      {
        date: '02/09/2026',
        title: 'Tham gia Demo Day Q3',
        body: 'Nhận phản hồi từ 12 mentor và 3 quỹ đầu tư.',
        tone: 'amber',
      },
      {
        date: vnDate(p.createdAt),
        title: 'Xuất bản trên OPC Hub',
        body: 'Dự án được công khai trong cộng đồng.',
        tone: 'gray',
      },
    ],
    testUrl: e.testUrl,
    repo: e.repo,
    repoAccessRequested: !!projectState().repoRequests.get(userId)?.has(id),
    isOwner: p.ownerName === me,
    contact: contactOf(p.ownerName),
    pledged: (p.funding?.raised ?? 0) + interests.reduce((a, i) => a + i.amount, 0),
    interestCount: interests.length,
    deckUrl: e.deckUrl,
    myInterest: mine ? { amount: mine.amount, currency: mine.currency, threadKey: mine.id } : null,
    groupIds: e.groupIds,
    related: visibleProjects(userId)
      .filter((x) => x.id !== id)
      .slice(0, 3)
      .map((x) => ({ id: x.id, name: x.name, category: x.category, tone: x.tone })),
  };
}

/** Dự án của tôi: mọi trạng thái, mới → cũ */
export const myPortalProjects = (userId: string) =>
  mockDb()
    .projects.filter((p) => p.ownerName === nameOfUser(userId))
    .map((p) => toCard(userId, p));

/** Đọc để sửa: chỉ chủ dự án, mọi trạng thái */
export function ownProject(userId: string, id: string): MockResult<ProjectDetail> {
  const p = mockDb().projects.find((x) => x.id === id);
  if (!p || p.ownerName !== nameOfUser(userId)) return notFound('Không tìm thấy dự án');
  // Form sửa: mô tả chi tiết đúng như chủ dự án đã soạn (không dùng đoạn giới thiệu sinh sẵn)
  return ok({
    ...buildDetail(userId, p),
    description: extOf(p).description,
    coverUrl: extOf(p).coverUrl,
  });
}

export function followProject(userId: string, id: string, follow: boolean) {
  const p = visibleProjects(userId).find((x) => x.id === id);
  if (!p) return notFound('Không tìm thấy dự án');
  const s = projectState();
  const set = s.follows.get(userId) ?? new Set<string>();
  s.follows.set(userId, set);
  if (follow !== set.has(id)) {
    if (follow) set.add(id);
    else set.delete(id);
    p.followers += follow ? 1 : -1;
  }
  return ok({ followers: p.followers, followedByMe: follow });
}

export function requestRepoAccess(userId: string, id: string): MockResult<{ requested: true }> {
  const p = visibleProjects(userId).find((x) => x.id === id);
  const e = p && extOf(p);
  if (!p || e?.repo?.visibility !== 'private')
    return notFound('Không tìm thấy repository riêng tư');
  const s = projectState();
  const set = s.repoRequests.get(userId) ?? new Set<string>();
  if (set.has(id)) return conflict('Bạn đã gửi yêu cầu truy cập');
  set.add(id);
  s.repoRequests.set(userId, set);
  return ok({ requested: true });
}

const STATUS_FROM_EDIT = new Set([
  'draft',
  'needs_changes',
  'pending_review',
  'published',
  'rejected',
]);

/**
 * Luật 7: chuyển trạng thái chỉ qua đây. Lưu nháp → draft; gửi → pending_review.
 * Sửa dự án đang hiển thị rồi gửi lại cũng về pending_review (cần duyệt lại).
 */
export function saveProject(
  userId: string,
  input: ProjectSaveData,
  id?: string,
): MockResult<ProjectCard> {
  const db = mockDb();
  const owner = nameOfUser(userId);
  const next = input.submit ? 'pending_review' : 'draft';
  const team = input.team.length
    ? input.team
    : [{ name: owner, role: 'Founder · CEO', avatarUrl: null, isOwner: true }];
  const fields = {
    name: input.name || 'Dự án chưa đặt tên',
    category: input.category,
    summary: input.summary,
    stage: input.stage,
    tags: input.tags,
    website: input.website || null,
    team: team.map((m) => ({
      ...m,
      avatarUrl: m.avatarUrl ?? (m.isOwner ? null : avatarOf(m.name)),
    })),
    funding: input.funding
      ? { ...input.funding, round: 'Seed', instrument: 'Cổ phần', endsAt: iso(MOCK_NOW), raised: 0 }
      : null,
  };
  const groupName = seed.COMMS.find((c) => input.groupIds.includes(c.id))?.name ?? 'OPC Hà Nội';
  let p = id ? db.projects.find((x) => x.id === id) : undefined;
  if (id && (!p || p.ownerName !== owner)) return notFound('Không tìm thấy dự án');
  if (p && !STATUS_FROM_EDIT.has(p.status)) return conflict('Trạng thái dự án không cho phép sửa');
  const now = iso(Date.now());
  if (p) {
    Object.assign(p, fields, { status: next, groupName });
  } else {
    p = {
      id: nextId('p'),
      ownerName: owner,
      groupName,
      tone: 'blue',
      country: members.find((m) => m.id === userId)?.bizCountry ?? 'Việt Nam',
      followers: 0,
      reviewNote: null,
      createdAt: now,
      status: next,
      ...fields,
    };
    db.projects.unshift(p);
  }
  const e = extOf(p);
  Object.assign(e, {
    coverUrl: input.coverUrl,
    description: input.description,
    visibility: input.visibility,
    testUrl: input.testUrl || null,
    repo: input.repo?.url ? input.repo : null,
    deckUrl: input.funding?.deckUrl || null,
    groupIds: input.groupIds,
    updatedAt: now,
  });
  return ok(toCard(userId, p));
}

/** Gợi ý thêm thành viên đội ngũ (form đăng dự án) */
export function suggestMembers(q: string) {
  const term = q.trim().toLowerCase();
  if (!term) return [];
  return members
    .filter((m) => m.name.toLowerCase().includes(term))
    .slice(0, 6)
    .map((m) => ({
      name: m.name,
      subtitle: [m.persona, m.org].filter(Boolean).join(' · '),
      avatarUrl: avatarOf(m.name),
    }));
}

/** Chia sẻ dự án vào phòng Chung các nhóm đã tham gia */
export function shareProject(userId: string, id: string, groupIds: string[], message: string) {
  const p = mockDb().projects.find((x) => x.id === id && x.ownerName === nameOfUser(userId));
  if (!p) return notFound('Không tìm thấy dự án');
  const mine = new Set(groupsOfUser(userId));
  const targets = groupIds.filter((g) => mine.has(g));
  if (!targets.length) return conflict('Chọn ít nhất 1 nhóm để chia sẻ');
  for (const g of targets)
    sendChatMessage(userId, roomIdOf(g, 'general'), {
      clientMsgId: `share-${id}-${g}-${nextId('s')}`,
      kind: 'text',
      body: `${message} → ${p.name}`.trim(),
      mentions: [],
    });
  return ok({ groupCount: targets.length });
}

export const projectCategoryNames = () =>
  categories.filter((c) => c.on && c.scope.includes('project')).map((c) => c.name);
