import {
  type AdminStore,
  type AdminStoreList,
  ADMIN_STORE_PAGE_SIZE,
  canPublishStore,
  NEED_STORE_MAX,
  STORE_MESSAGES,
  STORE_PAGE_SIZE,
  type StoreCard,
  type StoreDetail,
  type StoreFacets,
  type StoreList,
  type StoreListQuery,
  type StoreStatus,
  type StoreUpsert,
} from '../../api-domains';
import {
  members,
  STORE_SEED,
  STORE_SEED_FEATURED,
  storeImageUrl,
  storeSeedUpdatedAt,
  storeSeedViews,
} from '../../fixtures';
import { recordAudit } from './audit-store';
import { openNeedsOfStore, storeIsSeeking } from './needs-store';
import { mockDb, nextId } from './store';
import type { MockDb } from './store-types';
import { iso, MOCK_NOW, notFound, ok, type MockResult } from './util';

/**
 * Chỉ cho MSW/e2e — Gian hàng địa phương (V4-608) như server: 17 gian hàng mẫu đã xuất bản
 * (`st1` của M1), chủ sửa / xuất bản không duyệt, Admin ẩn / hiện (nhớ trạng thái trước).
 * Chủ x2…x17 là DN mẫu ngoài 8 thành viên, coi như còn hạn phí. Portal ↔ Admin chung trạng thái
 * qua cookie `opchub-mock-st` (stores-bridge.ts).
 */
export interface MockStore extends AdminStore {
  ownerId: string;
  hiddenPrev: Exclude<StoreStatus, 'hidden'> | null;
  /** D-89: người đã bấm tim */
  favBy: Set<string>;
}

const states = new WeakMap<MockDb, MockStore[]>();

function seedRow(s: (typeof STORE_SEED)[number], index: number): MockStore {
  return {
    id: s.id,
    ownerId: s.owner,
    ownerName: members.find((m) => m.id === s.owner)?.name ?? s.name,
    name: s.name,
    slogan: s.slogan,
    field: s.field,
    province: s.province,
    audience: s.audience,
    legalForm: s.kind,
    coverUrl: storeImageUrl(s.cover),
    intro: s.intro,
    website: s.website,
    phone: s.phone,
    email: s.email,
    address: s.address,
    status: 'published',
    hiddenPrev: null,
    favBy: new Set(),
    views: storeSeedViews(s.id),
    featured: STORE_SEED_FEATURED.includes(s.id),
    itemCount: s.items.length,
    updatedAt: iso(storeSeedUpdatedAt(MOCK_NOW, s.ageDays, index)),
    items: s.items.map((it, i) => ({
      id: `${s.id}-i${i + 1}`,
      kind: it.kind,
      name: it.name,
      price: it.price,
      description: it.description,
      imageUrl: storeImageUrl(it.image, 600, 400),
    })),
  };
}

export function mockStores(): MockStore[] {
  const db = mockDb();
  let rows = states.get(db);
  if (!rows) {
    rows = STORE_SEED.map(seedRow);
    states.set(db, rows);
  }
  return rows;
}

const card = (r: MockStore, viewerId: string): StoreCard => ({
  id: r.id,
  name: r.name,
  slogan: r.slogan,
  field: r.field,
  province: r.province,
  audience: r.audience,
  legalForm: r.legalForm,
  coverUrl: r.coverUrl,
  itemCount: r.itemCount,
  updatedAt: r.updatedAt,
  seeking: storeIsSeeking(r.id),
  views: r.views,
  featured: r.featured,
  fav: r.favBy.has(viewerId),
});

const toAdmin = (r: MockStore): AdminStore => ({
  id: r.id,
  name: r.name,
  slogan: r.slogan,
  field: r.field,
  province: r.province,
  audience: r.audience,
  legalForm: r.legalForm,
  coverUrl: r.coverUrl,
  itemCount: r.itemCount,
  updatedAt: r.updatedAt,
  views: r.views,
  featured: r.featured,
  intro: r.intro,
  website: r.website,
  phone: r.phone,
  email: r.email,
  address: r.address,
  status: r.status,
  ownerName: r.ownerName,
  items: r.items,
});
const toDetail = (r: MockStore, viewerId: string): StoreDetail => ({
  ...toAdmin(r),
  fav: r.favBy.has(viewerId),
  isMine: r.ownerId === viewerId,
  seeking: storeIsSeeking(r.id),
  openNeeds: openNeedsOfStore(r.id, NEED_STORE_MAX),
});

/** Chủ thuộc 8 thành viên: còn hạn phí theo `fees`; DN mẫu ngoài danh sách: coi như còn hạn */
function ownerPaid(ownerId: string, now: number): boolean {
  const f = mockDb().fees.find((x) => x.userId === ownerId);
  if (!f) return !members.some((m) => m.id === ownerId);
  return (
    (f.status === 'active' || f.status === 'expiring') &&
    !!f.validUntil &&
    Date.parse(f.validUntil) > now
  );
}

/** Gian hàng đang hiển thị ở Khám phá (dùng cả cho Nhu cầu V4-609) */
export const visibleMockStores = (now: number) =>
  mockStores().filter((r) => r.status === 'published' && ownerPaid(r.ownerId, now));

function hit(r: MockStore, q: string | undefined): boolean {
  if (!q) return true;
  const n = q.toLowerCase();
  return [r.name, r.slogan, r.intro, r.field, ...r.items.map((i) => i.name)].some((v) =>
    v.toLowerCase().includes(n),
  );
}

function facets(rows: MockStore[]): StoreFacets {
  const by = (k: 'audience' | 'field' | 'province') => {
    const m = new Map<string, number>();
    for (const r of rows) if (r[k]) m.set(r[k], (m.get(r[k]) ?? 0) + 1);
    return [...m]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value, 'vi'));
  };
  const has = (k: 'product' | 'service') =>
    rows.filter((r) => r.items.some((i) => i.kind === k)).length;
  return {
    total: rows.length,
    kind: { product: has('product'), service: has('service') },
    audience: by('audience'),
    field: by('field'),
    province: by('province'),
  };
}

const SORTS: Record<StoreListQuery['sort'], (a: MockStore, b: MockStore) => number> = {
  newest: (a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id),
  name: (a, b) => a.name.localeCompare(b.name, 'vi'),
  items: (a, b) => b.itemCount - a.itemCount || b.updatedAt.localeCompare(a.updatedAt),
  view: (a, b) => b.views - a.views || b.id.localeCompare(a.id),
};

export function listMockStores(f: StoreListQuery, viewerId = '', now = Date.now()): StoreList {
  const pubs = visibleMockStores(now);
  const rows = pubs
    .filter(
      (r) =>
        (!f.kind || r.items.some((i) => i.kind === f.kind)) &&
        (!f.audience.length || f.audience.includes(r.audience)) &&
        (!f.field.length || f.field.includes(r.field)) &&
        (!f.province.length || f.province.includes(r.province)) &&
        hit(r, f.q),
    )
    .sort(SORTS[f.sort]);
  const start = (f.page - 1) * STORE_PAGE_SIZE;
  return {
    items: rows.slice(start, start + STORE_PAGE_SIZE).map((r) => card(r, viewerId)),
    page: f.page,
    size: STORE_PAGE_SIZE,
    total: rows.length,
    facets: facets(pubs),
  };
}

export function mockStoreDetail(
  id: string,
  viewerId: string,
  now = Date.now(),
): MockResult<StoreDetail> {
  const r = mockStores().find((x) => x.id === id);
  if (!r || (r.ownerId !== viewerId && !visibleMockStores(now).includes(r)))
    return notFound('Không tìm thấy gian hàng');
  // D-89: lượt xem chỉ tính người khác chủ (như server)
  if (r.ownerId !== viewerId) r.views += 1;
  return ok(toDetail(r, viewerId));
}

/** D-89: nạp lại tim đã lưu của người xem (MSW giữ qua F5 bằng sessionStorage ở handler) */
export function restoreMockStoreFavs(viewerId: string, ids: readonly string[]): void {
  for (const r of mockStores()) if (ids.includes(r.id)) r.favBy.add(viewerId);
}

/** D-89 (P-105): tim yêu thích — chỉ gian hàng đang hiển thị */
export function favoriteMockStore(
  id: string,
  viewerId: string,
  on: boolean,
  now = Date.now(),
): MockResult<{ fav: boolean }> {
  const r = visibleMockStores(now).find((x) => x.id === id);
  if (!r) return notFound('Không tìm thấy gian hàng');
  if (on) r.favBy.add(viewerId);
  else r.favBy.delete(viewerId);
  return ok({ fav: on });
}

/** D-89: Admin gắn / gỡ "Nổi bật" */
export function featureMockStore(id: string, featured: boolean): MockResult<AdminStore> {
  const r = mockStores().find((x) => x.id === id);
  if (!r) return notFound('Không tìm thấy gian hàng');
  r.featured = featured;
  return ok(toAdmin(r));
}

const isBusiness = (userId: string) => members.find((m) => m.id === userId)?.type === 'biz';
const fail = (status: 400 | 403 | 409, message: string, path?: string): MockResult<never> => ({
  ok: false,
  status,
  code: status === 400 ? 'VALIDATION_ERROR' : status === 403 ? 'FORBIDDEN' : 'CONFLICT',
  message,
  ...(path ? { fields: [{ path, message }] } : {}),
});

function own(userId: string): MockResult<MockStore> {
  if (!isBusiness(userId)) return fail(403, STORE_MESSAGES.businessOnly);
  const r = mockStores().find((x) => x.ownerId === userId);
  return r ? ok(r) : notFound(STORE_MESSAGES.noStoreYet);
}

export function myMockStore(userId: string): MockResult<StoreDetail> {
  const r = own(userId);
  return r.ok ? ok(toDetail(r.data, userId)) : r;
}

export function saveMockStore(userId: string, input: StoreUpsert): MockResult<StoreDetail> {
  const r = own(userId);
  if (!r.ok) return r;
  Object.assign(r.data, {
    ...input,
    itemCount: input.items.length,
    updatedAt: iso(Date.now()),
    items: input.items.map((it) => ({ ...it, id: nextId('sti') })),
  });
  return ok(toDetail(r.data, userId));
}

/** Chủ: Xuất bản (đủ điều kiện, không duyệt) / Về nháp; bị Admin ẩn → 409 */
export function stepMockStore(userId: string, to: 'published' | 'draft'): MockResult<StoreDetail> {
  const r = own(userId);
  if (!r.ok) return r;
  const s = r.data;
  if (s.status === 'hidden') return fail(409, STORE_MESSAGES.hiddenByAdmin);
  if (to === 'published' && !canPublishStore(s))
    return fail(400, STORE_MESSAGES.publishRequired, 'status');
  if (s.status !== to) Object.assign(s, { status: to, updatedAt: iso(Date.now()) });
  return ok(toDetail(s, userId));
}

/* ── Admin (AD-07) ── */

/** Thứ tự tạo = thứ tự seed (server: `created_at` seed lùi theo vị trí, xem seed demo stores) */
const seedOrder = (id: string) => {
  const i = STORE_SEED.findIndex((s) => s.id === id);
  return i < 0 ? STORE_SEED.length : i;
};

export function adminMockStores(f: {
  status: 'all' | StoreStatus;
  q?: string | undefined;
  page: number;
}): AdminStoreList {
  const all = mockStores();
  const q = f.q?.toLowerCase();
  const rows = all
    .filter(
      (r) =>
        (f.status === 'all' || r.status === f.status) &&
        (!q || `${r.name} ${r.field} ${r.province}`.toLowerCase().includes(q)),
    )
    // Prototype `aAll` (D-89): bảng Admin theo thứ tự tạo (gian hàng mới nối cuối), như server
    .sort((a, b) => seedOrder(a.id) - seedOrder(b.id) || a.id.localeCompare(b.id));
  const n = (s: StoreStatus) => all.filter((r) => r.status === s).length;
  const start = (f.page - 1) * ADMIN_STORE_PAGE_SIZE;
  return {
    items: rows.slice(start, start + ADMIN_STORE_PAGE_SIZE).map(toAdmin),
    page: f.page,
    size: ADMIN_STORE_PAGE_SIZE,
    total: rows.length,
    summary: {
      total: all.length,
      published: n('published'),
      draft: n('draft'),
      hidden: n('hidden'),
    },
  };
}

export function adminMockStore(id: string): MockResult<AdminStore> {
  const r = mockStores().find((x) => x.id === id);
  return r ? ok(toAdmin(r)) : notFound('Không tìm thấy gian hàng');
}

/** Ẩn nhớ trạng thái trước; hiện trả về trạng thái đó. Mỗi gian hàng đổi = 1 dòng audit */
export function moderateMockStores(
  actorId: string,
  ids: readonly string[],
  action: 'hide' | 'show',
): { changed: number } {
  let changed = 0;
  for (const r of mockStores().filter((x) => ids.includes(x.id))) {
    if (action === 'hide' && r.status !== 'hidden') {
      r.hiddenPrev = r.status;
      r.status = 'hidden';
    } else if (action === 'show' && r.status === 'hidden') {
      r.status = r.hiddenPrev ?? 'draft';
      r.hiddenPrev = null;
    } else continue;
    r.updatedAt = iso(Date.now());
    changed += 1;
    recordAudit(actorId, `store.${action}`, r.id, r.name);
  }
  return { changed };
}
