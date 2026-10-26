import type { Prisma } from '@opchub/db';
import type { AdminNeed, Need, NeedSuggestion, StoreNeed } from '@opchub/shared/api-domains';

export const NEED_SELECT = {
  id: true,
  storeId: true,
  ownerId: true,
  type: true,
  title: true,
  description: true,
  field: true,
  fieldCustom: true,
  quantity: true,
  budgetMin: true,
  budgetMax: true,
  province: true,
  ward: true,
  dueAt: true,
  scope: true,
  cooperation: true,
  standards: true,
  docUrl: true,
  contactName: true,
  phone: true,
  email: true,
  channel: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  store: { select: { id: true, name: true, coverUrl: true } },
} as const satisfies Prisma.NeedSelect;

export const STORE_NEED_SELECT = {
  id: true,
  type: true,
  title: true,
  quantity: true,
  dueAt: true,
} as const satisfies Prisma.NeedSelect;

export type NeedRow = Prisma.NeedGetPayload<{ select: typeof NEED_SELECT }>;
type StoreNeedRow = Prisma.NeedGetPayload<{ select: typeof STORE_NEED_SELECT }>;

const money = (v: bigint | null) => (v === null ? null : Number(v));

export const toAdminNeed = (r: NeedRow): AdminNeed => ({
  id: r.id,
  type: r.type,
  title: r.title,
  description: r.description,
  field: r.field,
  fieldCustom: r.fieldCustom,
  quantity: r.quantity,
  budgetMin: money(r.budgetMin),
  budgetMax: money(r.budgetMax),
  province: r.province,
  ward: r.ward,
  dueAt: r.dueAt?.toISOString() ?? null,
  scope: r.scope,
  cooperation: r.cooperation,
  standards: r.standards,
  docUrl: r.docUrl,
  contactName: r.contactName,
  phone: r.phone,
  email: r.email,
  channel: r.channel,
  status: r.status,
  store: r.store,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

export const toNeed = (r: NeedRow, viewerId: string, suggestion: NeedSuggestion | null): Need => ({
  ...toAdminNeed(r),
  isMine: r.ownerId === viewerId,
  suggestion,
});

export const toStoreNeed = (r: StoreNeedRow): StoreNeed => ({
  id: r.id,
  type: r.type,
  title: r.title,
  quantity: r.quantity,
  dueAt: r.dueAt?.toISOString() ?? null,
});
