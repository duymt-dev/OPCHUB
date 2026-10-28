import {
  isStockCover,
  STORE_INTRO_MIN,
  STORE_SOCIAL_KEYS,
  STORE_STOCK_COVERS,
  type StoreAudience,
  type StoreDetail,
  type StoreItemInput,
  type StoreUpsert,
} from '@opchub/shared/api-domains';

/** Logic thuần của màn Gian hàng (không phụ thuộc React) */

export const STORE_AUDIENCE_ORDER: readonly StoreAudience[] = [
  'student',
  'personal',
  'organization',
  'business',
];

/** Ảnh bìa có sẵn của prototype (`COVERS`) khi chưa có ảnh */
export const HERO_IMAGE =
  'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1800&h=560&fit=crop&auto=format';

/** Gợi ý tìm nhanh (prototype `sugs`) */
export const STORE_SUGGESTIONS = [
  'Cà phê',
  'Nông sản',
  'Máy móc',
  'Du lịch',
  'Logistics',
  'OCOP',
  'Thủ công',
] as const;

/** Số ô danh mục khi thu gọn (prototype `slice(0,15)` gồm ô "Tất cả") */
export const CATEGORY_COLLAPSED = 15;

const LEGAL_WORDS =
  /(^|\s)(Công ty|CTCP|TNHH|Cổ phần|CP|Tập đoàn|Giải pháp|Hộ kinh doanh|MTV|HTX)(?=\s|$)/gi;

/** Chữ viết tắt trên logo (prototype `ini`) */
export function storeInitials(name: string): string {
  const w = (name || '?').replace(LEGAL_WORDS, ' ').split(/\s+/).filter(Boolean);
  if (w.length === 1) {
    const word = w[0] ?? '?';
    const caps = word.match(/[A-ZÀ-Ỹ]/g) ?? [];
    return (caps.length >= 2 ? caps.slice(0, 2).join('') : word.slice(0, 2)).toUpperCase();
  }
  return w
    .slice(0, 2)
    .map((x) => x[0] ?? '')
    .join('')
    .toUpperCase();
}

/** Tên ngắn dưới chữ viết tắt (prototype `shortName`) */
export const storeShortName = (name: string) => name.replace(LEGAL_WORDS, ' ').trim();

export const formatPrice = (price: number | null): string | null =>
  price ? `${price.toLocaleString('vi-VN')}đ` : null;

export const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  });

/** Zalo theo số điện thoại: chỉ giữ chữ số, đầu 84 → 0 (zalo.me nhận số nội địa) */
export function zaloLink(phone: string): string | null {
  const d = phone.replace(/\D/g, '');
  if (d.length < 8) return null;
  return `https://zalo.me/${d.startsWith('84') ? `0${d.slice(2)}` : d}`;
}

export const telLink = (phone: string) => {
  const d = phone.replace(/[^\d+]/g, '');
  return d.replace(/\D/g, '').length >= 8 ? `tel:${d}` : null;
};

export const webLink = (web: string) =>
  web ? (/^https?:\/\//i.test(web) ? web : `https://${web}`) : null;

export type CheckKey = 'nameSlogan' | 'intro' | 'cover' | 'contact' | 'items';

/** "Mức độ hoàn thiện" 5 mục (prototype `chk`) */
export function completeness(s: StoreUpsert): { checks: [CheckKey, boolean][]; pct: number } {
  const checks: [CheckKey, boolean][] = [
    ['nameSlogan', !!(s.name.trim() && s.slogan.trim())],
    ['intro', s.intro.trim().length >= STORE_INTRO_MIN],
    ['cover', !!s.coverUrl],
    ['contact', !!(s.phone.trim() && s.address.trim())],
    ['items', s.items.length > 0],
  ];
  const pct = Math.round((checks.filter(([, ok]) => ok).length / checks.length) * 100);
  return { checks, pct };
}

/** Gian hàng (server) → bản sửa của trình tạo (D-97: media + liên hệ mở rộng) */
export const toDraft = (s: StoreDetail): StoreUpsert => ({
  ward: s.ward,
  logoUrl: s.logoUrl,
  logos: s.logos,
  covers: s.covers,
  hiddenCovers: s.hiddenCovers,
  vision: s.vision,
  mission: s.mission,
  gallery: s.gallery,
  videos: s.videos,
  team: s.team,
  certs: s.certs,
  docs: s.docs,
  phones: s.phones,
  emails: s.emails,
  addresses: s.addresses,
  socials: s.socials,
  name: s.name,
  slogan: s.slogan,
  audience: s.audience,
  field: s.field,
  province: s.province,
  intro: s.intro,
  coverUrl: s.coverUrl,
  phone: s.phone,
  email: s.email,
  website: s.website,
  address: s.address,
  items: s.items.map(({ kind, name, price, description, imageUrl }) => ({
    kind,
    name,
    price,
    description,
    imageUrl,
  })),
});

/** Prototype `pv.loc` / `locVN`: "{phường}, {tỉnh}" */
export const storeLocation = (s: { ward: string; province: string }) =>
  [s.ward, s.province].filter(Boolean).join(', ');

/** Mạng xã hội có giá trị theo thứ tự prototype (website ở cột riêng) — link thật mở tab mới */
export function storeSocialLinks(s: Pick<StoreUpsert, 'socials' | 'website'>) {
  return STORE_SOCIAL_KEYS.map((k) => ({ k, v: (k === 'web' ? s.website : s.socials[k]).trim() }))
    .filter((x) => x.v)
    .map((x) => ({ ...x, href: webLink(x.v) ?? '' }));
}

type CoverDraft = Pick<StoreUpsert, 'covers' | 'hiddenCovers' | 'coverUrl'>;

/** Ảnh bìa chọn được: ảnh đã tải + ảnh mẫu chưa ẩn (prototype `[...upCov, ...COVERS - hidCovers]`) */
export const coverChoices = (d: CoverDraft): string[] => [
  ...d.covers,
  ...STORE_STOCK_COVERS.filter((c) => !d.hiddenCovers.includes(c)),
];

/** × ảnh bìa: ảnh mẫu → ẩn, ảnh tải lên → bỏ; đang dùng → ảnh còn lại đầu tiên */
export function removeCover(d: CoverDraft, src: string): CoverDraft {
  const next = {
    covers: d.covers.filter((x) => x !== src),
    hiddenCovers: isStockCover(src) ? [...d.hiddenCovers, src] : d.hiddenCovers,
    coverUrl: d.coverUrl,
  };
  if (d.coverUrl === src) next.coverUrl = coverChoices(next)[0] ?? null;
  return next;
}

/** ✎ thay ảnh bìa: ảnh tải lên thay tại chỗ; ảnh mẫu → ẩn + ảnh mới lên đầu; giữ lựa chọn */
export function replaceCover(d: CoverDraft, src: string, url: string): CoverDraft {
  const stock = isStockCover(src);
  return {
    covers: stock ? [url, ...d.covers] : d.covers.map((x) => (x === src ? url : x)),
    hiddenCovers: stock ? [...d.hiddenCovers, src] : d.hiddenCovers,
    coverUrl: d.coverUrl === src ? url : d.coverUrl,
  };
}

/** Ô giá: chỉ chữ số; trống / 0 → `null` = "Liên hệ báo giá" */
export function parsePrice(v: string): number | null {
  const n = Number(v.replace(/\D/g, ''));
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export const emptyItem = (): StoreItemInput => ({
  kind: 'product',
  name: '',
  price: null,
  description: '',
  imageUrl: null,
});
