import type { ProjectAudience, ProjectNeed, ProjectStage, ProjectStatus } from '@opchub/shared';
import type { COMMENT_TYPES, ProjectSort } from '@opchub/shared/api-domains';

export type CommentType = (typeof COMMENT_TYPES)[number];

/** Khám phá: trạng thái lọc trên URL (data-state.md) */
export interface ExploreParams {
  q: string;
  cat: string;
  sort: ProjectSort;
  view: 'grid' | 'table';
  page: number;
  /** D-89 (v4): cỡ trang 8 / 12 / 24 */
  size: 8 | 12 | 24;
  /** D-89 (v4) bộ lọc trái: đối tượng (một), tỉnh / giai đoạn / nhu cầu (nhiều) */
  who: ProjectAudience | 'all';
  provs: string[];
  devs: ProjectStage[];
  needs: ProjectNeed[];
}

/** V4-610 (prototype v4): "Gọi vốn đầu tư" chỉ khi Gói Gọi vốn đang hiệu lực; "Dự án liên quan" thành tab */
export const DETAIL_TABS = ['overview', 'updates', 'team', 'feedback', 'fund', 'related'] as const;
export type DetailTab = (typeof DETAIL_TABS)[number];

/** Chi tiết: tab + sắp xếp/lọc góp ý trên URL */
export interface DetailParams {
  tab: DetailTab;
  csort: 'new' | 'top';
  ctype: CommentType | 'all';
}

export type StageKey = ProjectStage;
export type { ProjectStatus };

/** Dữ liệu form đăng / sửa dự án (drawer) */
export interface TeamRow {
  name: string;
  role: string;
  avatarUrl: string | null;
  isOwner: boolean;
}

export interface ProjectFormState {
  storeId: string | null;
  province: string;
  coverUrl: string | null;
  name: string;
  category: string;
  stage: ProjectStage;
  /** D-89 (v4): "Đối tượng tham gia" */
  audience: ProjectAudience;
  summary: string;
  description: string;
  website: string;
  tags: string;
  testUrl: string;
  repoProvider: '' | 'github' | 'gitlab';
  repoUrl: string;
  repoVisibility: 'public' | 'private';
  fundOn: boolean;
  fundAmount: string;
  fundCurrency: 'VND' | 'USD';
  fundEquity: string;
  fundMin: string;
  fundDeck: string;
  fundUse: string;
  team: TeamRow[];
  visibility: 'public' | 'private';
  groupIds: string[];
  /** Liên hệ công khai (BUG-016): rỗng = không công khai */
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
}

/** QT-ST-PJ: dữ liệu gợi ý từ gian hàng; không dùng query string do người xem tự nhập. */
export interface ProjectStoreSource {
  id: string;
  name: string;
  province: string;
  field: string;
  audience: ProjectAudience;
}

/** Setter từng trường của form (truyền xuống các phần của drawer) */
export type FormSet = <K extends keyof ProjectFormState>(k: K, v: ProjectFormState[K]) => void;
