import type { Prisma } from '@opchub/db';
import {
  type AdminStore,
  EMPTY_SOCIALS,
  type StoreCard,
  storeCertSchema,
  type StoreDetail,
  storeDocSchema,
  type StoreItem,
  type StoreNeed,
  storeSocialsSchema,
  storeTeamSchema,
  storeVideoSchema,
} from '@opchub/shared/api-domains';
import { z } from 'zod';

export const STORE_CARD_SELECT = {
  id: true,
  name: true,
  slogan: true,
  field: true,
  province: true,
  audience: true,
  legalForm: true,
  coverUrl: true,
  itemCount: true,
  updatedAt: true,
  viewCount: true,
  featuredAt: true,
} as const satisfies Prisma.StoreSelect;

export const STORE_DETAIL_SELECT = {
  ...STORE_CARD_SELECT,
  ownerId: true,
  slug: true,
  intro: true,
  website: true,
  phone: true,
  email: true,
  address: true,
  status: true,
  ward: true,
  logoUrl: true,
  logos: true,
  covers: true,
  hiddenCovers: true,
  vision: true,
  mission: true,
  gallery: true,
  videos: true,
  team: true,
  certs: true,
  docs: true,
  phones: true,
  emails: true,
  addresses: true,
  socials: true,
  autoCreated: true,
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

/**
 * `seeking` (V4-609): gian hàng có nhu cầu đang mở; `fav` (D-89): người xem đã thích —
 * cả hai tính hàng loạt ở repository cho cả trang
 */
export const toStoreCard = (r: StoreCardRow, seeking = false, fav = false): StoreCard => ({
  id: r.id,
  name: r.name,
  slogan: r.slogan,
  field: r.field,
  province: r.province,
  audience: r.audience,
  legalForm: r.legalForm,
  coverUrl: r.coverUrl,
  itemCount: r.itemCount,
  updatedAt: r.updatedAt.toISOString(),
  seeking,
  views: r.viewCount,
  featured: r.featuredAt !== null,
  fav,
});

const toItem = (i: StoreDetailRow['items'][number]): StoreItem => ({ ...i });

/** jsonb do chính server ghi (đã parse zod khi lưu) — đọc lại an toàn: bản hỏng → rỗng */
const json = <T>(schema: z.ZodType<T>, v: unknown, empty: T): T => {
  const r = schema.safeParse(v);
  return r.success ? r.data : empty;
};

/** D-97: media + liên hệ mở rộng (TIP-V42-710) */
export const toStoreBuilder = (r: StoreDetailRow) => ({
  ward: r.ward,
  logoUrl: r.logoUrl,
  logos: r.logos,
  covers: r.covers,
  hiddenCovers: r.hiddenCovers,
  vision: r.vision,
  mission: r.mission,
  gallery: r.gallery,
  videos: json(z.array(storeVideoSchema), r.videos, []),
  team: json(z.array(storeTeamSchema), r.team, []),
  certs: json(z.array(storeCertSchema), r.certs, []),
  docs: json(z.array(storeDocSchema), r.docs, []),
  phones: r.phones,
  emails: r.emails,
  addresses: r.addresses,
  socials: json(storeSocialsSchema, r.socials, EMPTY_SOCIALS),
  autoCreated: r.autoCreated,
});

export const toAdminStore = (r: StoreDetailRow): AdminStore => ({
  ...toStoreBuilder(r),
  id: r.id,
  slug: r.slug,
  name: r.name,
  slogan: r.slogan,
  field: r.field,
  province: r.province,
  audience: r.audience,
  legalForm: r.legalForm,
  coverUrl: r.coverUrl,
  itemCount: r.itemCount,
  updatedAt: r.updatedAt.toISOString(),
  views: r.viewCount,
  featured: r.featuredAt !== null,
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
  fav = false,
): StoreDetail => ({
  ...toAdminStore(r),
  fav,
  isMine: r.ownerId === viewerId,
  seeking: openNeeds.length > 0,
  openNeeds,
});
