import type { ProjectAudience, ProjectNeed, ProjectStage } from '../../enums';
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
} from './project-store';
import { PROJECT_EXTRAS } from './extras';
import { withFundNeed } from './project-v4-seed';
import { isFundraisingActive, latestFundraising, toMockFundraising } from './fundraising';
import { approvedDates, openRevision, revisionRef, saveRevision } from './project-revision';
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
  /** D-89 (v4): bộ lọc bên trái */
  audience?: ProjectAudience | undefined;
  provinces?: string[] | undefined;
  stages?: ProjectStage[] | undefined;
  needs?: ProjectNeed[] | undefined;
}

/** Tỉnh của dự án = tỉnh của nhóm (prototype `p.prov`); chưa có nhóm → quốc gia */
export const provinceOf = (p: ProjectItem) =>
  mockDb().groups.find((g) => g.name === p.groupName)?.province ?? p.country;

function commentCount(id: string) {
  return mockDb().comments.filter((c) => c.projectId === id).length;
}

export function toCard(userId: string, p: ProjectItem): ProjectCard {
  const e = extOf(p);
  // V4-610: khai báo gọi vốn chỉ hiện với người khác khi Gói Gọi vốn đang hiệu lực
  const active = isFundraisingActive(p.id);
  const own = p.ownerName === nameOfUser(userId);
  const latest = own ? latestFundraising(p.id) : null;
  return {
    ...p,
    needs: withFundNeed(p.needs, active),
    funding: active || own ? p.funding : null,
    fundraisingActive: active,
    fundraising: latest ? toMockFundraising(latest) : null,
    coverUrl: displayCover(p.id, e.coverUrl),
    ownerAvatarUrl: avatarUrl(PROJECT_EXTRAS[p.id]?.ph ?? 'men/11'),
    commentCount: commentCount(p.id),
    followedByMe: isFollowing(userId, p.id),
    province: provinceOf(p),
    visibility: e.visibility,
    updatedAt: e.updatedAt,
    revision: null,
  };
}

/** Dự án đang hiển thị mà người gọi được xem (BR-08) */
export const visibleProjects = (userId: string) =>
  mockDb().projects.filter((p) => p.status === 'published' && canSee(userId, p));

export function listPortalProjects(userId: string, f: ProjectListFilter): ProjectCard[] {
  const cards = visibleProjects(userId)
    .filter(
      (p) =>
        (!f.cat || p.category === f.cat) &&
        (!f.stage ||
          (f.stage === 'fund' ? !!p.funding && isFundraisingActive(p.id) : p.stage === f.stage)) &&
        (!f.audience || p.audience === f.audience) &&
        (!f.provinces?.length || f.provinces.includes(provinceOf(p))) &&
        (!f.stages?.length || f.stages.includes(p.stage)) &&
        includesText(`${p.name} ${p.summary} ${p.ownerName} ${provinceOf(p)} ${p.category}`, f.q),
    )
    .map((p) => toCard(userId, p))
    .filter((c) => !f.needs?.length || c.needs.some((n) => f.needs?.includes(n)));
  if (f.sort === 'name') cards.sort((a, b) => a.name.localeCompare(b.name));
  if (f.sort === 'follow') cards.sort((a, b) => b.followers - a.followers);
  if (f.sort === 'view') cards.sort((a, b) => b.views - a.views);
  return cards;
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
    owners: new Set(all.map((p) => p.ownerName)).size,
    // Prototype hero "Kết nối thành công": tổng góp ý + 3 × số dự án
    connections: all.reduce((a, p) => a + commentCount(p.id), 0) + all.length * 3,
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
    // BUG-038: khối là dữ liệu của dự án (seed demo theo prototype v4); rỗng thì FE ẩn
    highlights: e.highlights,
    gallery: e.gallery.length ? e.gallery : e.coverUrl ? [e.coverUrl] : [],
    updates: [
      ...approvedDates(id).map((d) => ({
        date: vnDate(d),
        title: 'Cập nhật được duyệt',
        body: 'Nội dung dự án được cập nhật sau khi quản trị viên duyệt.',
        tone: 'blue' as const,
      })),
      ...[...e.milestones]
        .sort((a, b) => b.at.localeCompare(a.at))
        .map((m) => ({ date: vnDate(m.at), title: m.title, body: m.body, tone: m.tone })),
      // như server: mốc xuất bản ở cuối; chưa xuất bản thì "Tạo dự án"
      p.status === 'published'
        ? {
            date: vnDate(p.createdAt),
            title: 'Xuất bản trên OPC Hub',
            body: 'Dự án được công khai trong cộng đồng.',
            tone: 'gray' as const,
          }
        : {
            date: vnDate(p.createdAt),
            title: 'Tạo dự án',
            body: 'Chủ dự án tạo hồ sơ dự án trên OPC Hub.',
            tone: 'gray' as const,
          },
    ],
    testUrl: e.testUrl,
    // NA-21: repo private ẩn URL với người không phải chủ (giống server)
    repo:
      e.repo && e.repo.visibility === 'private' && p.ownerName !== me
        ? { ...e.repo, url: null }
        : e.repo,
    repoAccessRequested: !!projectState().repoRequests.get(userId)?.has(id),
    isOwner: p.ownerName === me,
    contact: { email: e.contactEmail, phone: e.contactPhone, address: e.contactAddress },
    pledged: (p.funding?.raised ?? 0) + interests.reduce((a, i) => a + i.amount, 0),
    interestCount: interests.length,
    deckUrl: e.deckUrl,
    myInterest: mine ? { amount: mine.amount, currency: mine.currency } : null,
    groupIds: e.groupIds,
    related: visibleProjects(userId)
      .filter((x) => x.id !== id)
      .slice(0, 6)
      .map((x) => ({ id: x.id, name: x.name, category: x.category, tone: x.tone })),
  };
}

/** Dự án của tôi: mọi trạng thái, mới → cũ */
export const myPortalProjects = (userId: string) =>
  mockDb()
    .projects.filter((p) => p.ownerName === nameOfUser(userId))
    .map((p) => ({ ...toCard(userId, p), revision: revisionRef(p.id) }));

/** Đọc để sửa: chỉ chủ dự án, mọi trạng thái */
export function ownProject(userId: string, id: string): MockResult<ProjectDetail> {
  const p = mockDb().projects.find((x) => x.id === id);
  if (!p || p.ownerName !== nameOfUser(userId)) return notFound('Không tìm thấy dự án');
  // Form sửa: mô tả chi tiết đúng như chủ dự án đã soạn (không dùng đoạn giới thiệu sinh sẵn)
  const base = {
    ...buildDetail(userId, p),
    description: extOf(p).description,
    coverUrl: extOf(p).coverUrl,
    revision: revisionRef(p.id),
  };
  // D-18: có bản sửa mở → form sửa tiếp nội dung bản sửa
  const rev = openRevision(p.id);
  if (!rev) return ok(base);
  return ok({
    ...base,
    ...rev.fields,
    description: rev.ext.description,
    coverUrl: rev.ext.coverUrl,
    visibility: rev.ext.visibility,
    testUrl: rev.ext.testUrl,
    repo: rev.ext.repo,
    deckUrl: rev.ext.deckUrl,
    groupIds: rev.ext.groupIds,
    contact: {
      email: rev.ext.contactEmail,
      phone: rev.ext.contactPhone,
      address: rev.ext.contactAddress,
    },
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

/** BUG-033 §9: Bị từ chối là trạng thái cuối; Đã ẩn chờ Admin (như `OWNER_EDITABLE` server) */
const STATUS_FROM_EDIT = new Set(['draft', 'needs_changes', 'pending_review', 'published']);

/**
 * Luật 7: chuyển trạng thái chỉ qua đây (như `ownerSaveStatus` server). Nháp / Cần chỉnh sửa →
 * gửi ? Chờ duyệt : giữ; Chờ duyệt giữ nguyên; Đang hiển thị → bản sửa (D-18, REQ-106), bản công
 * khai không đổi tới khi Admin duyệt.
 */
export function saveProject(
  userId: string,
  input: ProjectSaveData,
  id?: string,
): MockResult<ProjectCard> {
  const db = mockDb();
  const owner = nameOfUser(userId);
  const submitted = input.submit ? 'pending_review' : 'draft';
  const team = input.team.length
    ? input.team
    : [{ name: owner, role: 'Founder · CEO', avatarUrl: null, isOwner: true }];
  const fields = {
    name: input.name || 'Dự án chưa đặt tên',
    category: input.category,
    summary: input.summary,
    stage: input.stage,
    audience: input.audience,
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
  const ext = {
    coverUrl: input.coverUrl,
    description: input.description,
    visibility: input.visibility,
    testUrl: input.testUrl || null,
    repo: input.repo?.url ? input.repo : null,
    deckUrl: input.funding?.deckUrl || null,
    groupIds: input.groupIds,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    contactAddress: input.contactAddress,
    // chưa có ô nhập (Q-V4-620-2) → giữ dữ liệu đang có
    highlights: p ? extOf(p).highlights : [],
    gallery: p ? extOf(p).gallery : [],
    milestones: p ? extOf(p).milestones : [],
  };
  if (p?.status === 'published') {
    saveRevision(p.id, input.submit, { fields, ext, groupName });
    return ok({ ...toCard(userId, p), revision: revisionRef(p.id) });
  }
  if (p) {
    const status =
      p.status === 'pending_review' ? p.status : input.submit ? 'pending_review' : p.status;
    Object.assign(p, fields, { status, groupName });
  } else {
    p = {
      id: nextId('p'),
      ownerName: owner,
      groupName,
      tone: 'blue',
      country: members.find((m) => m.id === userId)?.bizCountry ?? 'Việt Nam',
      followers: 0,
      needs: [],
      views: 0,
      reviewNote: null,
      createdAt: now,
      status: submitted,
      ...fields,
    };
    db.projects.unshift(p);
  }
  Object.assign(extOf(p), ext, { updatedAt: now });
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
