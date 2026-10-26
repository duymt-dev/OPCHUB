import type { Need, NeedStatus, StoreNeed } from '../../api-domains';
import { NEED_SEED, needSeedDueAt, needSeedUpdatedAt, STORE_SEED } from '../../fixtures';
import { mockDb } from './store';
import type { MockDb } from './store-types';
import { iso, MOCK_NOW } from './util';

/**
 * Chỉ cho MSW/e2e — kho Nhu cầu địa phương (V4-609): 11 nhu cầu mẫu prototype. Tách khỏi `needs.ts`
 * để `stores.ts` đọc được nhu cầu đang mở (khối "Đang cần", badge) mà không import vòng.
 */
export interface MockNeed extends Omit<Need, 'store' | 'isMine' | 'suggestion'> {
  storeId: string;
  ownerId: string;
  hiddenPrev: Exclude<NeedStatus, 'hidden'> | null;
}

const states = new WeakMap<MockDb, MockNeed[]>();

function seedRow(n: (typeof NEED_SEED)[number], i: number): MockNeed {
  const st = STORE_SEED.find((s) => s.id === n.store);
  const at = iso(needSeedUpdatedAt(MOCK_NOW, n.ageDays, i));
  const due = needSeedDueAt(MOCK_NOW, n.dueDays);
  return {
    id: n.id,
    storeId: n.store,
    ownerId: st?.owner ?? '',
    type: n.type,
    title: n.title,
    description: n.description,
    field: n.field,
    fieldCustom: false,
    quantity: n.quantity,
    budgetMin: null,
    budgetMax: null,
    province: st?.province ?? '',
    ward: '',
    dueAt: due === null ? null : iso(due),
    scope: 'province',
    cooperation: [],
    standards: [],
    docUrl: '',
    contactName: '',
    phone: st?.phone ?? '',
    email: st?.email ?? '',
    channel: 'zalo',
    status: 'open',
    hiddenPrev: null,
    createdAt: at,
    updatedAt: at,
  };
}

export function mockNeeds(): MockNeed[] {
  const db = mockDb();
  let rows = states.get(db);
  if (!rows) {
    rows = NEED_SEED.map(seedRow);
    states.set(db, rows);
  }
  return rows;
}

const byNewest = (a: MockNeed, b: MockNeed) =>
  b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id);

/** Nhu cầu đang mở của một gian hàng (khối "Đang cần", tối đa `max`) */
export function openNeedsOfStore(storeId: string, max: number): StoreNeed[] {
  return mockNeeds()
    .filter((n) => n.storeId === storeId && n.status === 'open')
    .sort(byNewest)
    .slice(0, max)
    .map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      quantity: n.quantity,
      dueAt: n.dueAt,
    }));
}

export const storeIsSeeking = (storeId: string): boolean =>
  mockNeeds().some((n) => n.storeId === storeId && n.status === 'open');

export const sortNeedsNewest = byNewest;
