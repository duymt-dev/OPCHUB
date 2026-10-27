import { PRICE_DEFAULTS } from '@opchub/shared/fixtures';
import {
  STORE_SEED,
  STORE_SEED_FEATURED,
  type StoreSeed,
  storeImageUrl,
  storeSeedUpdatedAt,
  storeSeedViews,
} from '@opchub/shared/fixtures';
import { DAY_MS, MOCK_NOW } from '@opchub/shared/mock-domains';
import type { DbTx } from '../../src/client';

/**
 * V4-608 (REQ-510): gian hàng mẫu của prototype. `st1` thuộc M1 (TK DN demo, đã đóng phí) luôn seed.
 * 16 gian hàng còn lại thuộc chủ DN NGOÀI 8 thành viên → chỉ seed khi bật `--stores`, để số đếm
 * thành viên / phí của e2e chế độ server giữ đúng như MSW (Q-V4-608-7).
 */
const YEAR_MS = 365 * DAY_MS;
const OWNER_SINCE = new Date(MOCK_NOW - 120 * DAY_MS);

export const storeOwnerId = (s: StoreSeed) => (s.owner === 'm1' ? 'm1' : `st-owner-${s.owner}`);

async function seedOwners(tx: DbTx, rows: StoreSeed[]): Promise<void> {
  const owners = rows.filter((s) => s.owner !== 'm1');
  if (!owners.length) return;
  await tx.user.createMany({
    data: owners.map((s, i) => ({
      id: storeOwnerId(s),
      memberCode: `TV${String(800000 + i + 2).padStart(6, '0')}`,
      accountType: 'business' as const,
      fullName: s.name,
      email: s.email,
      phone: null,
      passwordHash: null,
      country: 'vn',
      systemRole: 'member' as const,
      status: 'active' as const,
      emailVerifiedAt: OWNER_SINCE,
      declaredAt: OWNER_SINCE,
      createdAt: OWNER_SINCE,
      updatedAt: OWNER_SINCE,
    })),
  });
  const paidAt = new Date(MOCK_NOW - 60 * DAY_MS);
  await tx.membershipFee.createMany({
    data: owners.map((s) => ({
      userId: storeOwnerId(s),
      status: 'active' as const,
      paidAt,
      validUntil: new Date(paidAt.getTime() + YEAR_MS),
      amount: PRICE_DEFAULTS.biz.y,
      plan: 'business' as const,
      createdAt: OWNER_SINCE,
      updatedAt: OWNER_SINCE,
    })),
  });
}

export async function seedStores(tx: DbTx, all = false): Promise<void> {
  const rows = all ? STORE_SEED : STORE_SEED.filter((s) => s.owner === 'm1');
  await seedOwners(tx, rows);
  await tx.store.createMany({
    data: rows.map((s) => {
      const at = new Date(storeSeedUpdatedAt(MOCK_NOW, s.ageDays, STORE_SEED.indexOf(s)));
      return {
        id: s.id,
        ownerId: storeOwnerId(s),
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
        status: 'published' as const,
        itemCount: s.items.length,
        // D-89 (P-105): lượt xem / "Nổi bật" khởi tạo như prototype
        viewCount: storeSeedViews(s.id),
        featuredAt: STORE_SEED_FEATURED.includes(s.id) ? at : null,
        hasProduct: s.items.some((i) => i.kind === 'product'),
        hasService: s.items.some((i) => i.kind === 'service'),
        publishedAt: at,
        // Thứ tự tạo = thứ tự seed (bảng Admin xếp `created_at`, như prototype `aAll`)
        createdAt: new Date(OWNER_SINCE.getTime() + STORE_SEED.indexOf(s) * 60_000),
        updatedAt: at,
      };
    }),
  });
  await tx.storeItem.createMany({
    data: rows.flatMap((s) =>
      s.items.map((it, i) => ({
        id: `${s.id}-i${i + 1}`,
        storeId: s.id,
        kind: it.kind,
        name: it.name,
        price: it.price,
        description: it.description,
        imageUrl: storeImageUrl(it.image, 600, 400),
        sort: i,
      })),
    ),
  });
}
