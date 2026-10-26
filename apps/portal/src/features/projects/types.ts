import type { ProjectStage, ProjectStatus } from '@opchub/shared';
import type { COMMENT_TYPES, ProjectStageFilter, ProjectSort } from '@opchub/shared/api-domains';

export type CommentType = (typeof COMMENT_TYPES)[number];

/** Khám phá: trạng thái lọc trên URL (data-state.md) */
export interface ExploreParams {
  q: string;
  cat: string;
  stage: ProjectStageFilter | 'all';
  sort: ProjectSort;
  view: 'grid' | 'table';
  page: number;
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

/** Cỡ trang Khám phá */
export const EXPLORE_PAGE_SIZE = 9;

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
  coverUrl: string | null;
  name: string;
  category: string;
  stage: ProjectStage;
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
}

/** Setter từng trường của form (truyền xuống các phần của drawer) */
export type FormSet = <K extends keyof ProjectFormState>(k: K, v: ProjectFormState[K]) => void;
