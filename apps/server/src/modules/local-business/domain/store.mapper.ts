import type { Prisma } from '@opchub/db';
import type {
  AdminStore,
  StoreCard,
  StoreDetail,
  StoreItem,
  StoreNeed,
} from '@opchub/shared/api-domains';

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

/** `seeking` (V4-609): gian hàng có nhu cầu đang mở — tính hàng loạt ở repository */
export const toStoreCard = (r: StoreCardRow, seeking = false): StoreCard => ({
  id: r.id,
  name: r.name,
  slogan: r.slogan,
  field: r.field,
  province: r.province,
  audience: r.audience,
  coverUrl: r.coverUrl,
  itemCount: r.itemCount,
  updatedAt: r.updatedAt.toISOString(),
  seeking,
});

const toItem = (i: StoreDetailRow['items'][number]): StoreItem => ({ ...i });

export const toAdminStore = (r: StoreDetailRow): AdminStore => ({
  id: r.id,
  name: r.name,
  slogan: r.slogan,
  field: r.field,
  province: r.province,
  audience: r.audience,
  coverUrl: r.coverUrl,
  itemCount: r.itemCount,
  updatedAt: r.updatedAt.toISOString(),
  intro: r.intro,
  website: r.website,
  phone: r.phone,
  email: r.email,
  address: r.address,
  status: r.status,
  ownerName: r.owner.fullName,
  items: r.items.map(toItem),
});

/** `openNeeds` (V4-609 khối "Đang cần") đọc riêng một truy vấn theo `(store_id, status)` */
export const toStoreDetail = (
  r: StoreDetailRow,
  viewerId: string,
  openNeeds: StoreNeed[] = [],
): StoreDetail => ({
  ...toAdminStore(r),
  isMine: r.ownerId === viewerId,
  seeking: openNeeds.length > 0,
  openNeeds,
});
