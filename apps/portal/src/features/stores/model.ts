import {
  STORE_INTRO_MIN,
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

/** Gian hàng (server) → bản sửa của form */
export const toDraft = (s: StoreDetail): StoreUpsert => ({
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
