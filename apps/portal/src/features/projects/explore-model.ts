import type { ProjectAudience, ProjectNeed, ProjectStage } from '@opchub/shared';
import type { ProjectCard } from '@opchub/shared/api-domains';
import type { ExploreParams } from './types';

/** Hàm thuần màn Khám phá Dự án v4 (D-89, prototype `projPage`): bộ lọc trái, đếm, huy hiệu */

export const AUDIENCES: ProjectAudience[] = ['student', 'personal', 'organization', 'business'];
export const DEV_STAGES: ProjectStage[] = ['idea', 'developing', 'mvp', 'launched', 'growth'];
export const NEEDS: ProjectNeed[] = ['customers', 'partners', 'investors', 'experts', 'pilot'];
export const PAGE_SIZES = [8, 12, 24] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

/** Màu huy hiệu nhu cầu (`NC` của prototype) */
export const NEED_COLOR: Record<ProjectNeed, string> = {
  customers: '#1677FF',
  partners: '#13A8A8',
  investors: '#722ED1',
  experts: '#D46B08',
  pilot: '#389E0D',
};

/** "Tìm kiếm phổ biến" ở hero */
export const POPULAR_SEARCHES = [
  'Nông nghiệp thông minh',
  'Du lịch cộng đồng',
  'Chuyển đổi số',
  'Truy xuất nguồn gốc',
  'Năng lượng tái tạo',
];

/** Ô nhóm ngành hiện tối đa 15 (kể cả "Tất cả") khi chưa bấm "Xem thêm" */
export const CAT_TILES = 15;

/** Bộ lọc áp ở FE trên danh sách tìm theo từ khoá (`baseP` của prototype) */
export type SideFilter = Pick<ExploreParams, 'cat' | 'who' | 'provs' | 'devs' | 'needs'>;

export function applySide(items: readonly ProjectCard[], f: SideFilter): ProjectCard[] {
  return items.filter(
    (p) =>
      (f.who === 'all' || p.audience === f.who) &&
      (f.cat === 'all' || p.category === f.cat) &&
      (!f.provs.length || f.provs.includes(p.province)) &&
      (!f.devs.length || f.devs.includes(p.stage)) &&
      (!f.needs.length || p.needs.some((n) => f.needs.includes(n))),
  );
}

const countBy = <K extends string>(items: readonly ProjectCard[], key: (p: ProjectCard) => K[]) => {
  const m = new Map<K, number>();
  for (const p of items) for (const k of key(p)) m.set(k, (m.get(k) ?? 0) + 1);
  return m;
};

/** Đếm cho bộ lọc trái: tỉnh xếp theo số dự án giảm dần (ổn định theo thứ tự xuất hiện) */
export function sideCounts(base: readonly ProjectCard[], all: readonly ProjectCard[]) {
  const provs = countBy(base, (p) => (p.province ? [p.province] : []));
  return {
    who: countBy(all, (p) => [p.audience]),
    provs: [...provs.entries()].sort((a, b) => b[1] - a[1]),
    devs: countBy(base, (p) => [p.stage]),
    needs: countBy(base, (p) => p.needs),
  };
}

/** "Địa phương tiêu biểu": 4 tỉnh nhiều dự án nhất */
export const topProvinces = (all: readonly ProjectCard[]) =>
  sideCounts(all, all)
    .provs.slice(0, 4)
    .map(([name]) => name);

/** Huy hiệu góc thẻ: 2 thẻ đầu "Nổi bật" khi trang 1, Mới nhất, chưa lọc; còn lại nhu cầu đầu tiên */
export function badgeOf(
  p: ProjectCard,
  index: number,
  plain: boolean,
): { kind: 'hot' } | { kind: 'need'; need: ProjectNeed } | null {
  if (index < 2 && plain) return { kind: 'hot' };
  const need = p.needs[0];
  return need ? { kind: 'need', need } : null;
}

/** Chữ cái avatar chủ dự án: chữ đầu của từ cuối (prototype `ownerIni`) */
export const ownerInitial = (name: string) =>
  (name.trim().split(/\s+/).at(-1) ?? '?').slice(0, 1).toUpperCase();

/** Ảnh bìa mẫu theo nhóm ngành khi dự án chưa tải ảnh (`_ci` của prototype) */
const CAT_IMG: Record<string, string> = {
  'Nông nghiệp & Nông sản': '1464226184884-fa280b87c399',
  'Chế biến thực phẩm': '1511537190424-bbbab87ac5eb',
  'Thủ công & Làng nghề': '1565193566173-7a0ee3dbe261',
  'Du lịch & Dịch vụ': '1520250497591-112f2f40a3f4',
  'Thương mại & Bán lẻ': '1542838132-92c53300491e',
  'Sản xuất & Cơ khí': '1581091226825-a6a2a5aee158',
  'Thủy sản': '1559737558-2f5a35f4523b',
  'Logistics & Chuỗi cung ứng': '1586528116311-ad8dd3c8310d',
  'Giáo dục & Đào tạo': '1522071820081-009f0129c71c',
  'Y tế & Sức khỏe': '1610832958506-aa56368176cf',
  'Môi trường & Năng lượng': '1500937386664-56d1dfef3854',
  'Chuyển đổi số & AI': '1460925895917-afdab827c52f',
};
const unsplash = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format`;
export const categoryCover = (cat: string) =>
  unsplash(CAT_IMG[cat] ?? '1556761175-5973dc0f32e7', 600, 340);

/** Ảnh tỉnh ở "Địa phương tiêu biểu" (`PROVIMG`) */
const PROV_IMG: Record<string, string> = {
  'Lâm Đồng': '1506905925346-21bda4d32df4',
  'Đà Nẵng': '1559592413-7cec4d0cae2b',
  'Hà Nội': '1557750255-c76072a7aad1',
  'Đắk Lắk': '1447933601403-0c6688de566e',
  'Cà Mau': '1583417319070-4a69db38a482',
  'Khánh Hòa': '1520250497591-112f2f40a3f4',
};
export const provinceImage = (p: string) =>
  unsplash(PROV_IMG[p] ?? '1528127269322-539801943592', 300, 180);

export const HERO_IMAGE = unsplash('1528127269322-539801943592', 1800, 560);

/** Icon nhóm ngành (`_ic` của prototype, viewBox 24) */
const CAT_ICON: Record<string, string> = {
  all: 'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z',
  'Nông nghiệp & Nông sản':
    'M12 22V12M12 12C12 7 8 4 3 4c0 5 4 8 9 8zM12 12c0-4 3-7 8-7 0 4-3 7-8 7',
  'Chế biến thực phẩm':
    'M3 11h18M5 11v8a2 2 0 002 2h10a2 2 0 002-2v-8M8 7c0-2 1-3 2-4M12 7c0-2 1-3 2-4M16 7c0-2 1-3 2-4',
  'Thủ công & Làng nghề': 'M6 3h12l-1 6a5 5 0 01-10 0zM9 21h6M12 14v7',
  'Du lịch & Dịch vụ': 'M12 22V10M5 10c0-4 3-7 7-7s7 3 7 7M5 10h14M2 22h20',
  'Thương mại & Bán lẻ':
    'M3 3h2l2.4 12.4A2 2 0 009.4 17h8.2a2 2 0 002-1.6L21 8H6M10 21a1 1 0 100-2 1 1 0 000 2zM18 21a1 1 0 100-2 1 1 0 000 2z',
  'Sản xuất & Cơ khí': 'M2 20h20M4 20V9l5 3V9l5 3V5h6v15',
  'Thủy sản': 'M2 12c3-5 8-6 12-4 2 1 4 2 6 0v8c-2-2-4-1-6 0-4 2-9 1-12-4zM15 11h.01',
  'Logistics & Chuỗi cung ứng':
    'M1 6h13v10H1zM14 10h4l3 3v3h-7M5 19a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z',
  'Giáo dục & Đào tạo': 'M22 10L12 5 2 10l10 5 10-5zM6 12v5c3 2 9 2 12 0v-5',
  'Y tế & Sức khỏe':
    'M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 000-7.8zM12 9v6M9 12h6',
  'Môi trường & Năng lượng': 'M13 2L4 14h7l-1 8 9-12h-7z',
  'Chuyển đổi số & AI': 'M4 4h16v12H4zM8 20h8M12 16v4M9 9h.01M15 9h.01M9 12.5c1.5 1 4.5 1 6 0',
  'Dịch vụ doanh nghiệp': 'M3 7h18v13H3zM8 7V4h8v3M3 12h18',
  'Mỹ phẩm & Làm đẹp': 'M9 3h6v4H9zM8 7h8v14H8zM8 12h8',
};
export const categoryIcon = (cat: string) => CAT_ICON[cat] ?? 'M5 12h.01M12 12h.01M19 12h.01';

/** Bật/tắt một giá trị trong danh sách chọn nhiều */
export const toggle = <T>(list: readonly T[], v: T): T[] =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
