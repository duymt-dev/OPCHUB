import type { ProjectItem, ProjectMilestone } from '../../api-domains';
import { members, projects as seedProjects, seed } from '../../fixtures';
import { buildComments } from './content';
import { SEED_GALLERY, SEED_MILESTONES, seedHighlights } from './project-v4-seed';
import { mockDb, type MockDb } from './store';
import { avatarUrl, MOCK_NOW } from './util';
import { isFeeUsable } from '../../membership/fee-access';

/**
 * Phần mở rộng CSDL giả cho màn Dự án của Portal (G3b): ảnh bìa, mô tả, repo, quyền hiển thị,
 * theo dõi, thích góp ý, xin quyền repo, khoá idempotency. WeakMap theo MockDb nên
 * `resetMockDb()` tự dựng lại.
 */

export interface ProjectExt {
  storeId: string | null;
  province: string;
  /** Ảnh bìa chủ dự án đã tải lên; null = dùng ảnh mẫu theo dự án */
  coverUrl: string | null;
  description: string;
  visibility: 'public' | 'private';
  testUrl: string | null;
  repo: { provider: 'github' | 'gitlab'; url: string; visibility: 'public' | 'private' } | null;
  deckUrl: string | null;
  groupIds: string[];
  /** Liên hệ chủ dự án tự công khai (BUG-016); null = không công khai */
  contactEmail: string | null;
  contactPhone: string | null;
  /** D-89 (v4): địa chỉ liên hệ công khai */
  contactAddress: string | null;
  /** D-89 (v4) chi tiết: "Vấn đề / Giải pháp / Thị trường" + "Hình ảnh sản phẩm" (chỉ seed demo) */
  highlights: { title: string; body: string }[];
  gallery: string[];
  /** Tab "Cập nhật": mốc dự án công bố (như cột `milestones`) */
  milestones: ProjectMilestone[];
  updatedAt: string;
}

export interface ProjectState {
  ext: Map<string, ProjectExt>;
  /** userId → dự án đang theo dõi */
  follows: Map<string, Set<string>>;
  /** commentId → userId đã bấm Hữu ích */
  likes: Map<string, Set<string>>;
  /** userId → dự án đã xin quyền xem repo riêng tư */
  repoRequests: Map<string, Set<string>>;
  /** interestId → tên người liên hệ (form quan tâm đầu tư) */
  contactNames: Map<string, string>;
  /** Idempotency-Key → interestId */
  idempotency: Map<string, string>;
  /** Góp ý seed: mốc thời gian dời theo "bây giờ" như prototype */
  seededComments: Set<string>;
}

/** Mốc "bây giờ" lúc trích seed góp ý/quan tâm từ prototype (t = Date.now() - offset) */
export const SEED_T0 = 1792142378557;

interface RepoSeed {
  testUrl: string;
  repoProv: '' | 'github' | 'gitlab';
  repoUrl: string;
  repoVis: 'public' | 'private';
}
const REPO = seed.REPO_SEED as Record<string, RepoSeed>;
const FUND = seed.FUND_SEED as Record<string, { deck?: string }>;

/** Ảnh bìa mẫu (D-36: tự host trước go-live) */
const COVER_IDS: Record<string, string> = {
  p1: '1554224155-6726b3ff858f',
  p2: '1677442136019-21780ecad995',
  p3: '1521737604893-d14cc237f11d',
  p4: '1561070791-2526d30994b5',
  p5: '1589829545856-d10d557cf95f',
  p6: '1460925895917-afdab827c52f',
};
/** Ảnh bìa hiển thị: ảnh đã tải lên, không có thì ảnh mẫu (prototype) */
export const displayCover = (id: string, custom: string | null) =>
  custom ?? unsplash(COVER_IDS[id] ?? DEFAULT_COVER_ID, 800, 450);
export const DEFAULT_COVER_ID = '1522071820081-009f0129c71c';
export const unsplash = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format`;

/** Đội ngũ mẫu khi seed không khai báo (prototype) */
const DEFAULT_TEAM: [string, string, string][] = [
  ['Ngô Thành Đạt', 'Kỹ sư phần mềm', 'men/41'],
  ['Phạm Thu Hà', 'Thiết kế sản phẩm', 'women/65'],
  ['Hoàng Gia Linh', 'Marketing', 'men/52'],
];

const groupIdByName = new Map(seed.COMMS.map((c) => [c.name, c.id]));

export function seedDescription(p: ProjectItem): string {
  return `${p.summary} Dự án được xây dựng bởi ${p.ownerName} – thành viên cộng đồng ${p.groupName}. Sản phẩm đã có người dùng thực tế tại ${p.country} và đang tìm kiếm phản hồi, cộng tác viên cũng như đối tác phân phối trong khu vực ASEAN.`;
}

const ADDRESSES = [
  'Tầng 5, 123 Nguyễn Huệ, P. Bến Nghé, Q.1, TP.HCM',
  'Số 18 Láng Hạ, P. Thành Công, Q. Ba Đình, Hà Nội',
  '45 Bạch Đằng, Q. Hải Châu, Đà Nẵng',
  'Lô B2, KCN Quang Minh, Mê Linh, Hà Nội',
  '72 Trần Phú, P. Lộc Thọ, Nha Trang, Khánh Hòa',
  '210 Nguyễn Văn Linh, Q. Ninh Kiều, Cần Thơ',
];

/**
 * Liên hệ mẫu sinh từ tên chủ dự án như prototype. Dự án seed coi như chủ dự án đã công khai
 * email + SĐT này (BUG-016, V2Q-81); địa chỉ chỉ còn dùng cho hồ sơ DN demo.
 */
export function contactOf(owner: string) {
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

function buildExt(p: ProjectItem): ProjectExt {
  const r = REPO[p.id];
  const c = contactOf(p.ownerName);
  const raw = seedProjects.find((x) => x.id === p.id);
  return {
    // Prototype v4.2: MediaSoft hiển thị OPC Hub Mobile trong khối Dự án OPC.
    storeId: p.id === 'p10' ? 'st1' : null,
    province: p.id === 'p10' ? 'Hà Nội' : '',
    coverUrl: null,
    description: '',
    visibility: raw?.vis === 'comm' ? 'private' : 'public',
    testUrl: r?.testUrl || null,
    repo:
      r?.repoProv && r.repoUrl
        ? { provider: r.repoProv, url: r.repoUrl, visibility: r.repoVis }
        : null,
    deckUrl: FUND[p.id]?.deck || null,
    groupIds: [groupIdByName.get(p.groupName)].filter((x): x is string => !!x),
    contactEmail: c.email,
    contactPhone: c.phone,
    contactAddress: c.address || null,
    highlights: seedHighlights(p.summary),
    gallery: [...SEED_GALLERY],
    milestones: [...SEED_MILESTONES],
    updatedAt: p.createdAt,
  };
}

function build(db: MockDb): ProjectState {
  const ext = new Map<string, ProjectExt>();
  for (const p of db.projects) {
    ext.set(p.id, buildExt(p));
    const raw = seedProjects.find((x) => x.id === p.id);
    if (raw && !raw.team) {
      const owner = p.team[0];
      p.team = [
        {
          name: p.ownerName,
          role: 'Founder · CEO',
          avatarUrl: owner?.avatarUrl ?? null,
          isOwner: true,
        },
        ...DEFAULT_TEAM.map(([name, role, ph]) => ({
          name,
          role,
          avatarUrl: avatarUrl(ph),
          isOwner: false,
        })),
      ];
    }
  }
  // Prototype: TK demo đang theo dõi LeadPilot (pjFollow = { p2: 1 })
  const follows = new Map([['m1', new Set(['p2'])]]);
  for (const set of follows.values())
    for (const id of set) {
      const p = db.projects.find((x) => x.id === id);
      if (p) p.followers += 1;
    }
  return {
    ext,
    follows,
    likes: new Map(),
    repoRequests: new Map(),
    contactNames: new Map(),
    idempotency: new Map(),
    seededComments: new Set(buildComments().map((c) => c.id)),
  };
}

const states = new WeakMap<MockDb, ProjectState>();

export function projectState(): ProjectState {
  const db = mockDb();
  let s = states.get(db);
  if (!s) {
    s = build(db);
    states.set(db, s);
  }
  return s;
}

export function extOf(p: ProjectItem): ProjectExt {
  const s = projectState();
  let e = s.ext.get(p.id);
  if (!e) {
    e = buildExt(p);
    s.ext.set(p.id, e);
  }
  return e;
}

export const nameOfUser = (userId: string) =>
  members.find((m) => m.id === userId)?.name ?? 'Thành viên';

export const groupsOfUser = (userId: string) =>
  [...(mockDb().groupMembers.get(userId) ?? new Map<string, string>()).entries()]
    .filter(([, st]) => st === 'member')
    .map(([g]) => g);

/** BR-08: công khai, hoặc chủ dự án / đội ngũ / thành viên nhóm được chia sẻ */
export function canSee(userId: string, p: ProjectItem, now = MOCK_NOW): boolean {
  const e = extOf(p);
  const owner = members.find((m) => m.name === p.ownerName);
  const db = mockDb();
  const fee = db.fees.find((f) => f.userId === owner?.id);
  const usable = !owner || (!!fee && isFeeUsable(fee, new Date(now)));
  const name = nameOfUser(userId);
  if (p.ownerName === name) return true;
  if (!usable) return false;
  if (e.visibility === 'public' && db.userStatus.get(owner?.id ?? '') !== 'locked') return true;
  if (p.team.some((m) => m.name === name)) return true;
  const mine = new Set(groupsOfUser(userId));
  return e.groupIds.some((g) => mine.has(g));
}

export const isFollowing = (userId: string, projectId: string) =>
  !!projectState().follows.get(userId)?.has(projectId);
