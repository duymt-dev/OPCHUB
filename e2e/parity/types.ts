import type { Locator, Page } from '@playwright/test';

export type Side = 'proto' | 'app';
export type Viewport = 1440 | 1366 | 390;
export type Start = 'auth' | 'user' | 'admin' | 'unpaid' | 'director';

export interface StepCtx {
  page: Page;
  side: Side;
  vw: Viewport;
}

export interface Scenario {
  /** Explicit dataset precondition, identical native and MSW; never changes assertions. */
  demo?: 'affiliate' | 'bot-history' | 'projects';
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
  /** Re-establish and assert transient UI after settle moves the pointer away; no state injection. */
  beforeCapture?: (c: StepCtx) => Promise<void>;
  /** Chụp riêng một vùng (cùng locator hai bên) thay cho trang/khung nhìn — luôn kèm lý do */
  capture?: { selector: (c: StepCtx) => Locator; reason: string };
  /** Vùng động phải che khi so — luôn kèm lý do */
  mask?: { selector: (c: StepCtx) => Locator[]; reason: string };
  /** Không tái hiện được bằng thao tác trên prototype */
  unreachable?: string;
  /** Prototype chỉ hiện ở viewport này / ghi chú cho người đọc */
  note?: string;
}
