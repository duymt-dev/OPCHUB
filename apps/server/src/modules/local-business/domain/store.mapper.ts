import type { Prisma } from '@opchub/db';
import type { AdminStore, StoreCard, StoreDetail, StoreItem } from '@opchub/shared/api-domains';

export const STORE_CARD_SELECT = {
  id: true,
  name: true,
  slogan: true,
  field: true,
  province: true,
  audience: true,
  coverUrl: true,
  itemCount: true,
  updatedAt: true,
} as const satisfies Prisma.StoreSelect;

export const STORE_DETAIL_SELECT = {
  ...STORE_CARD_SELECT,
  ownerId: true,
  intro: true,
  website: true,
  phone: true,
  email: true,
  address: true,
  status: true,
  owner: { select: { fullName: true } },
  items: {
    orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      kind: true,
      name: true,
      price: true,
      description: true,
      imageUrl: true,
    },
  },
} as const satisfies Prisma.StoreSelect;

export type StoreCardRow = Prisma.StoreGetPayload<{ select: typeof STORE_CARD_SELECT }>;
export type StoreDetailRow = Prisma.StoreGetPayload<{ select: typeof STORE_DETAIL_SELECT }>;

export const toStoreCard = (r: StoreCardRow): StoreCard => ({
  id: r.id,
  name: r.name,
  slogan: r.slogan,
  field: r.field,
  province: r.province,
  audience: r.audience,
  coverUrl: r.coverUrl,
  itemCount: r.itemCount,
  updatedAt: r.updatedAt.toISOString(),
});

const toItem = (i: StoreDetailRow['items'][number]): StoreItem => ({ ...i });

export const toAdminStore = (r: StoreDetailRow): AdminStore => ({
  ...toStoreCard(r),
  intro: r.intro,
  website: r.website,
  phone: r.phone,
  email: r.email,
  address: r.address,
  status: r.status,
  ownerName: r.owner.fullName,
  items: r.items.map(toItem),
});

export const toStoreDetail = (r: StoreDetailRow, viewerId: string): StoreDetail => ({
  ...toAdminStore(r),
  isMine: r.ownerId === viewerId,
});
