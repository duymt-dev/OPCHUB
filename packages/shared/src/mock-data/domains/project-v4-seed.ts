import type { ProjectAudience, ProjectNeed, ProjectStage } from '../../enums';

/**
 * D-89 (prototype v4, `projPage`): dữ liệu trang Dự án mà seed không ghi sẵn — đối tượng, giai đoạn
 * 5 mức, nhu cầu kết nối, lượt xem. Prototype suy từ mã băm id (`h = Σ charCode(id)`); chép đúng
 * công thức để dữ liệu demo / MSW khớp ảnh chuẩn. Dữ liệu thật do chủ dự án khai báo.
 */

export const AUDIENCE_OF: Record<string, ProjectAudience> = {
  'Sinh viên': 'student',
  'Cá nhân': 'personal',
  'Tổ chức': 'organization',
  'Doanh nghiệp': 'business',
};

/** `SMAP` của prototype: giai đoạn seed cũ → 5 giai đoạn v4 */
export const STAGE_OF: Record<string, ProjectStage> = {
  'Ý tưởng': 'idea',
  'Đang phát triển': 'developing',
  MVP: 'mvp',
  'Có mô hình thử nghiệm': 'mvp',
  'Đã ra mắt': 'launched',
  'Đang triển khai': 'launched',
  'Tăng trưởng': 'growth',
  'Đã thương mại hóa': 'growth',
};

/** Thứ tự `NEEDS` của prototype */
const NEEDS: ProjectNeed[] = ['customers', 'partners', 'investors', 'experts', 'pilot'];

const hashOf = (id: string) => [...id].reduce((a, c) => a + c.charCodeAt(0), 0);

/** Nhu cầu kết nối seed: `[NEEDS[h%5], …(h%3===0 ? [NEEDS[(h+2)%5]] : [])]` */
export function seedNeeds(id: string): ProjectNeed[] {
  const h = hashOf(id);
  const first = NEEDS[h % 5] ?? 'customers';
  const second = h % 3 === 0 ? NEEDS[(h + 2) % 5] : undefined;
  return second ? [first, second] : [first];
}

/** Lượt xem seed: `h*29 % 2300 + 180` */
export const seedViews = (id: string) => ((hashOf(id) * 29) % 2300) + 180;

/** Chi tiết v4 (`pj.highlights`): dữ liệu mẫu của prototype cho dự án demo */
export const seedHighlights = (summary: string) => [
  {
    title: 'Vấn đề',
    body: 'Doanh nghiệp một người mất nhiều thời gian cho việc vận hành thủ công.',
  },
  { title: 'Giải pháp', body: summary },
  { title: 'Thị trường', body: 'Hơn 2 triệu doanh nghiệp siêu nhỏ tại ASEAN.' },
];

/** Chi tiết v4 (`pj.galleryEl`): 3 ảnh mẫu của prototype */
export const SEED_GALLERY = [
  '1551288049-bebda4e38f71',
  '1460925895917-afdab827c52f',
  '1504868584819-f8e8b4b6d7e3',
].map((id) => `https://images.unsplash.com/photo-${id}?w=500&h=300&fit=crop&auto=format`);

/** "Tìm nhà đầu tư" đứng đầu khi Gói Gọi vốn đang hiệu lực (prototype `fundOn`) */
export const withFundNeed = (needs: readonly ProjectNeed[], fundOn: boolean): ProjectNeed[] =>
  fundOn && !needs.includes('investors') ? ['investors', ...needs] : [...needs];
