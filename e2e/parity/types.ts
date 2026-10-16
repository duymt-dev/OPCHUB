import type { Locator, Page } from '@playwright/test';

export type Side = 'proto' | 'app';
export type Viewport = 1440 | 390;
export type Start = 'auth' | 'user' | 'admin' | 'unpaid';

export interface StepCtx {
  page: Page;
  side: Side;
  vw: Viewport;
}

export interface Scenario {
  id: string;
  name: string;
  /** Mặc định cả 1440 và 390 */
  viewports?: Viewport[];
  /** Chụp cả trang (mặc định: chỉ khung nhìn) */
  fullPage?: boolean;
  /** Điểm xuất phát: chưa đăng nhập / đã đăng nhập user / admin / user chưa đóng phí */
  start: Start;
  /** Route app mới ứng với điểm bắt đầu (mặc định theo start) */
  appPath?: string;
  /** Chuỗi thao tác — chạy giống nhau ở hai bên trừ khi kiểm `side` */
  steps?: (c: StepCtx) => Promise<void>;
  /** Vùng động phải che khi so — luôn kèm lý do */
  mask?: { selector: (c: StepCtx) => Locator[]; reason: string };
  /** Không tái hiện được bằng thao tác trên prototype */
  unreachable?: string;
  /** Prototype chỉ hiện ở viewport này / ghi chú cho người đọc */
  note?: string;
}
