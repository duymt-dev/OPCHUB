import {
  type AdminNeed,
  type AdminNeedList,
  ADMIN_NEED_PAGE_SIZE,
  NEED_FIELD_OTHER,
  NEED_MESSAGES,
  NEED_PAGE_SIZE,
  type MyNeeds,
  type Need,
  type NeedCreate,
  type NeedFacets,
  type NeedList,
  type NeedListQuery,
  type NeedStatus,
  STORE_MESSAGES,
} from '../../api-domains';
import { members } from '../../fixtures';
import { recordAudit } from './audit-store';
import { type MockNeed, mockNeeds, sortNeedsNewest } from './needs-store';
import { nextId } from './store';
import { type MockStore, mockStores, visibleMockStores } from './stores';
import { iso, notFound, ok, type MockResult } from './util';

/**
 * Chỉ cho MSW/e2e — Nhu cầu địa phương (V4-609) như server: danh sách nhu cầu đang mở của gian hàng
 * hiển thị, gợi ý gian hàng cùng ngành (ưu tiên cùng tỉnh), chủ đăng / đóng / mở lại / xoá, Admin ẩn / hiện.
 */

const fail = (status: 400 | 403 | 409, message: string): MockResult<never> => ({
  ok: false,
  status,
  code: status === 400 ? 'VALIDATION_ERROR' : status === 403 ? 'FORBIDDEN' : 'CONFLICT',
  message,
});

const storeOf = (id: string) => mockStores().find((s) => s.id === id);

function suggestion(n: MockNeed, pubs: MockStore[]) {
  const same = pubs.filter((s) => s.field === n.field && s.id !== n.storeId);
  if (!same.length) return null;
  const local = same.filter((s) => s.province === n.province).length;
  return local ? { count: local, sameProvince: true } : { count: same.length, sameProvince: false };
}

function toNeed(n: MockNeed, viewerId: string, pubs: MockStore[]): Need {
  const s = storeOf(n.storeId);
  return {
    ...needBody(n),
    store: { id: n.storeId, name: s?.name ?? '', coverUrl: s?.coverUrl ?? null },
    isMine: n.ownerId === viewerId,
    suggestion: suggestion(n, pubs),
  };
}

/** Các trường công khai của nhu cầu (bỏ `storeId` / `ownerId` / `hiddenPrev` nội bộ) */
function needBody(n: MockNeed): Omit<AdminNeed, 'store'> {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    description: n.description,
    field: n.field,
    fieldCustom: n.fieldCustom,
    quantity: n.quantity,
    budgetMin: n.budgetMin,
    budgetMax: n.budgetMax,
    province: n.province,
    ward: n.ward,
    dueAt: n.dueAt,
    scope: n.scope,
    cooperation: n.cooperation,
    standards: n.standards,
    docUrl: n.docUrl,
    contactName: n.contactName,
    phone: n.phone,
    email: n.email,
    channel: n.channel,
    status: n.status,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };
}

const visibleNeeds = (now: number) => {
  const ids = new Set(visibleMockStores(now).map((s) => s.id));
  return mockNeeds().filter((n) => n.status === 'open' && ids.has(n.storeId));
};

function hit(n: MockNeed, q: string | undefined): boolean {
  if (!q) return true;
  const t = q.toLowerCase();
  return [n.title, n.description, n.field, n.province, n.ward, storeOf(n.storeId)?.name ?? '']
    .join(' ')
    .toLowerCase()
    .includes(t);
}

function facets(rows: MockNeed[]): NeedFacets {
  const by = (k: 'type' | 'province' | 'field') => {
    const m = new Map<string, number>();
    for (const r of rows) if (r[k]) m.set(r[k], (m.get(r[k]) ?? 0) + 1);
    return [...m]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value, 'vi'));
  };
  return { total: rows.length, type: by('type'), province: by('province'), field: by('field') };
}

export function listMockNeeds(f: NeedListQuery, viewerId: string, now = Date.now()): NeedList {
  const open = visibleNeeds(now);
  const pubs = visibleMockStores(now);
  const rows = open
    .filter(
      (n) =>
        (!f.type || n.type === f.type) &&
        (!f.province || n.province === f.province) &&
        (!f.field || n.field === f.field) &&
        hit(n, f.q),
    )
    .sort(sortNeedsNewest);
  const start = (f.page - 1) * NEED_PAGE_SIZE;
  return {
    items: rows.slice(start, start + NEED_PAGE_SIZE).map((n) => toNeed(n, viewerId, pubs)),
    page: f.page,
    size: NEED_PAGE_SIZE,
    total: rows.length,
    facets: facets(open),
  };
}

const isBusiness = (userId: string) => members.find((m) => m.id === userId)?.type === 'biz';
const myStore = (userId: string) => mockStores().find((s) => s.ownerId === userId);

export function myMockNeeds(userId: string, now = Date.now()): MockResult<MyNeeds> {
  if (!isBusiness(userId)) return fail(403, STORE_MESSAGES.businessOnly);
  const s = myStore(userId);
  const pubs = visibleMockStores(now);
  return ok({
    store: s ? { id: s.id, name: s.name, province: s.province } : null,
    items: mockNeeds()
      .filter((n) => n.ownerId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
      .map((n) => toNeed(n, userId, pubs)),
  });
}

/** Hạn yyyy-mm-dd → 00:00 giờ VN (UTC+7) */
const dueIso = (d: string | null) => (d ? iso(Date.parse(`${d}T00:00:00+07:00`)) : null);

export function createMockNeed(userId: string, v: NeedCreate): MockResult<Need> {
  if (!isBusiness(userId)) return fail(403, STORE_MESSAGES.businessOnly);
  const s = myStore(userId);
  if (!s) return fail(409, NEED_MESSAGES.noStore);
  const at = iso(Date.now());
  const custom = v.field === NEED_FIELD_OTHER;
  const n: MockNeed = {
    id: nextId('need'),
    storeId: s.id,
    ownerId: userId,
    type: v.type,
    title: v.title,
    description: v.description,
    field: custom ? v.fieldCustom : v.field,
    fieldCustom: custom,
    quantity: v.quantity,
    budgetMin: v.budgetMin,
    budgetMax: v.budgetMax,
    province: v.province,
    ward: v.ward,
    dueAt: dueIso(v.dueDate),
    scope: v.scope,
    cooperation: v.cooperation,
    standards: v.standards,
    docUrl: v.docUrl,
    contactName: v.contactName,
    phone: v.phone,
    email: v.email,
    channel: v.channel,
    status: 'open',
    hiddenPrev: null,
    createdAt: at,
    updatedAt: at,
  };
  mockNeeds().unshift(n);
  return ok(toNeed(n, userId, visibleMockStores(Date.now())));
}

const owned = (userId: string, id: string) =>
  mockNeeds().find((n) => n.id === id && n.ownerId === userId);

/** Chủ: Đóng nhu cầu / Mở lại (làm mới `updatedAt` như prototype) */
export function stepMockNeed(userId: string, id: string, action: 'close' | 'reopen') {
  const n = owned(userId, id);
  if (!n) return notFound('Không tìm thấy nhu cầu');
  if (n.status === 'hidden') return fail(409, NEED_MESSAGES.hidden);
  const [from, to]: [NeedStatus, NeedStatus] =
    action === 'close' ? ['open', 'closed'] : ['closed', 'open'];
  if (n.status !== from) return fail(409, 'Nhu cầu đã thay đổi, vui lòng tải lại');
  Object.assign(n, { status: to, updatedAt: iso(Date.now()) });
  return ok(toNeed(n, userId, visibleMockStores(Date.now())));
}

export function deleteMockNeed(userId: string, id: string): MockResult<null> {
  const n = owned(userId, id);
  if (!n) return notFound('Không tìm thấy nhu cầu');
  if (n.status === 'hidden') return fail(409, NEED_MESSAGES.hidden);
  const rows = mockNeeds();
  rows.splice(rows.indexOf(n), 1);
  return ok(null);
}

/* ── Admin (AD-07) ── */

const toAdmin = (n: MockNeed): AdminNeed => {
  const s = storeOf(n.storeId);
  return {
    ...needBody(n),
    store: { id: n.storeId, name: s?.name ?? '', coverUrl: s?.coverUrl ?? null },
  };
};

export function adminMockNeeds(f: {
  status: 'all' | NeedStatus;
  q?: string | undefined;
  page: number;
}): AdminNeedList {
  const all = mockNeeds();
  const q = f.q?.toLowerCase();
  const rows = all
    .filter(
      (n) =>
        (f.status === 'all' || n.status === f.status) &&
        (!q ||
          `${n.title} ${n.field} ${n.province} ${storeOf(n.storeId)?.name ?? ''}`
            .toLowerCase()
            .includes(q)),
    )
    .sort(sortNeedsNewest);
  const c = (s: NeedStatus) => all.filter((n) => n.status === s).length;
  const start = (f.page - 1) * ADMIN_NEED_PAGE_SIZE;
  return {
    items: rows.slice(start, start + ADMIN_NEED_PAGE_SIZE).map(toAdmin),
    page: f.page,
    size: ADMIN_NEED_PAGE_SIZE,
    total: rows.length,
    summary: { total: all.length, open: c('open'), closed: c('closed'), hidden: c('hidden') },
  };
}

/** Ẩn nhớ trạng thái trước; hiện trả về trạng thái đó. Mỗi nhu cầu đổi = 1 dòng audit */
export function moderateMockNeeds(
  actorId: string,
  ids: readonly string[],
  action: 'hide' | 'show',
): { changed: number } {
  let changed = 0;
  for (const n of mockNeeds().filter((x) => ids.includes(x.id))) {
    if (action === 'hide' && n.status !== 'hidden') {
      n.hiddenPrev = n.status;
      n.status = 'hidden';
    } else if (action === 'show' && n.status === 'hidden') {
      n.status = n.hiddenPrev ?? 'open';
      n.hiddenPrev = null;
    } else continue;
    changed += 1;
    recordAudit(actorId, `need.${action}`, n.id, n.title);
  }
  return { changed };
}
