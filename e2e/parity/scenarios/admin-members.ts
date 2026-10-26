import type { Locator } from '@playwright/test';
import { nav, pager, tap, tapLast, tapTitle, waitText } from '../steps';
import type { Scenario, StepCtx } from '../types';
import { OVERVIEW_CHART_MASK } from './overview-mask';

/** Admin D-02 → D-22: topbar, sidebar, Thành viên, Phí thành viên */

/** Dòng bảng (khung `data-m="tbl"`) chứa chữ `text` */
export const row = (c: StepCtx, text: string): Locator =>
  c.page
    .locator('[data-m="tbl"] > div > div')
    .filter({ hasText: text })
    .filter({ visible: true })
    .first();
/** Ô tick ở cột đầu của dòng */
export const tickRow = (c: StepCtx, text: string) =>
  row(c, text).locator(':scope > div').first().click();
/**
 * Nút "⋯" ở cột cuối của dòng. Ở 390, drawer điều hướng của prototype đóng bằng transition CSS
 * 0,25 s chạy theo giờ thật (đồng hồ giả không dừng được) — bấm sớm thì bị drawer chặn và
 * Playwright cuộn lại theo kiểu khác, ảnh lệch ngẫu nhiên. Chờ hết transition rồi cuộn nút
 * sát đáy (`block: 'end'`) ở cả hai bên.
 */
const rowMenu = async (c: StepCtx, text: string) => {
  const btn = row(c, text).locator(':scope > div').last().locator(':scope > div').first();
  if (c.vw === 390) await c.page.waitForTimeout(400);
  await btn.evaluate((e) => e.scrollIntoView({ block: 'end' }));
  await btn.click();
};

/** D-32 (DV-G4a-2): app hỏi xác nhận trước khi khoá tài khoản, prototype khoá ngay */
const confirmLock = async (c: StepCtx) => {
  if (c.side === 'app')
    await c.page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Khóa', exact: true })
      .click();
};

const openMe = (c: StepCtx) =>
  c.page.locator('[data-m="me"]').filter({ visible: true }).first().click();
const toMembers = async (c: StepCtx) => {
  await nav(c, 'Thành viên');
  await waitText(c, /tài khoản$/);
};
const pickTwo = async (c: StepCtx) => {
  await toMembers(c);
  await tickRow(c, 'Lê Minh Anh');
  await tickRow(c, 'Trần Quốc Bảo');
  await waitText(c, 'Đã chọn 2 mục');
};
const toFees = async (c: StepCtx) => {
  await nav(c, 'Phí thành viên');
  await waitText(c, 'Phí thành viên hệ thống');
};

export const ADMIN_MEMBERS: Scenario[] = [
  {
    id: 'D-02',
    name: 'Admin · menu người dùng',
    start: 'admin',
    steps: openMe,
    mask: OVERVIEW_CHART_MASK,
  },
  {
    id: 'D-03',
    mask: OVERVIEW_CHART_MASK,
    name: 'Admin · Hồ sơ cá nhân (không đổi màn)',
    start: 'admin',
    fullPage: true,
    note: 'Prototype đặt screen=portal rồi guard trả về admin → vẫn ở Tổng quan',
    steps: async (c) => {
      await openMe(c);
      await tapLast(c, 'Hồ sơ cá nhân');
    },
  },
  {
    id: 'D-04',
    mask: OVERVIEW_CHART_MASK,
    name: 'Admin · thông báo',
    start: 'admin',
    steps: async (c) => {
      await tapTitle(c, 'Thông báo');
      await waitText(c, 'Đánh dấu tất cả đã đọc');
    },
  },
  {
    id: 'D-05',
    mask: OVERVIEW_CHART_MASK,
    name: 'Admin · sidebar thu gọn',
    start: 'admin',
    viewports: [1440],
    fullPage: true,
    steps: (c) => tapTitle(c, 'Thu gọn sidebar'),
  },
  {
    id: 'D-06',
    name: 'Admin · drawer điều hướng',
    start: 'admin',
    viewports: [390],
    steps: (c) => tapTitle(c, 'Menu'),
  },
  { id: 'D-07', name: 'Thành viên · danh sách', start: 'admin', fullPage: true, steps: toMembers },
  {
    id: 'D-08',
    name: 'Thành viên · lưới',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await toMembers(c);
      await tapTitle(c, 'Dạng lưới');
    },
  },
  {
    id: 'D-09',
    name: 'Thành viên · lọc Doanh nghiệp',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await toMembers(c);
      await tap(c, /^Doanh nghiệp\s*4$/);
    },
  },
  { id: 'D-10', name: 'Thành viên · chọn nhiều', start: 'admin', fullPage: true, steps: pickTwo },
  {
    id: 'D-11',
    name: 'Thành viên · khóa hàng loạt',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await pickTwo(c);
      await tap(c, 'Khóa tài khoản');
      await confirmLock(c);
      await waitText(c, /Đã khóa 2 tài khoản/);
    },
  },
  {
    id: 'D-12',
    name: 'Modal gán vào nhóm',
    start: 'admin',
    steps: async (c) => {
      await pickTwo(c);
      await tap(c, '+ Gán vào nhóm');
      await c.page
        .getByPlaceholder('Tìm nhóm theo tên hoặc tỉnh/thành...')
        .filter({ visible: true })
        .first()
        .waitFor();
    },
  },
  {
    id: 'D-89',
    name: 'Gán vào nhóm · vai trò Giảng viên (GR-R01)',
    start: 'admin',
    steps: async (c) => {
      await pickTwo(c);
      await tap(c, '+ Gán vào nhóm');
      await c.page
        .locator('select')
        .filter({ has: c.page.locator('option', { hasText: 'Giảng viên' }) })
        .filter({ visible: true })
        .first()
        .selectOption({ label: 'Giảng viên' });
    },
  },
  {
    id: 'D-13',
    name: 'Thành viên · menu dòng',
    start: 'admin',
    steps: async (c) => {
      await toMembers(c);
      await rowMenu(c, 'Lê Minh Anh');
      await waitText(c, 'Đổi trạng thái');
    },
  },
  {
    id: 'D-14',
    name: 'Thành viên · đã khóa 1 dòng',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await toMembers(c);
      await rowMenu(c, 'Lê Minh Anh');
      await tap(c, 'Khóa tài khoản');
      await confirmLock(c);
    },
  },
  {
    id: 'D-16',
    name: 'Drawer hồ sơ đăng ký',
    start: 'admin',
    steps: async (c) => {
      await toMembers(c);
      await tap(c, 'Nguyễn Văn An');
      await waitText(c, 'Hồ sơ đăng ký');
    },
  },
  {
    id: 'D-17',
    name: 'Thành viên · 6/trang, trang 2',
    start: 'admin',
    fullPage: true,
    note: 'Seed chỉ 8 thành viên; đổi 6 / trang để có trang 2',
    steps: async (c) => {
      await toMembers(c);
      // Prototype v4 thêm 7 ô chọn lọc: chọn đúng ô cỡ trang theo option
      await c.page
        .locator('select')
        .filter({ visible: true })
        .filter({ has: c.page.locator('option', { hasText: '6 / trang' }) })
        .last()
        .selectOption({ label: '6 / trang' });
      await pager(c, 2);
      await waitText(c, /Hiển thị 7–8 \/ 8/);
    },
  },
  { id: 'D-18', name: 'Phí thành viên', start: 'admin', fullPage: true, steps: toFees },
  {
    id: 'D-19',
    name: 'Phí · chờ thanh toán',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await toFees(c);
      await c.page
        .getByText(/^Chờ thanh toán\s*1$/)
        .filter({ visible: true })
        .last()
        .click();
    },
  },
  {
    id: 'D-20',
    name: 'Phí · chọn nhiều',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await toFees(c);
      await tickRow(c, 'Ngô Thành Đạt');
      await tickRow(c, 'Đỗ Hải Yến');
      await waitText(c, /Đã chọn 2 thành viên/);
    },
  },
  {
    id: 'D-21',
    name: 'Phí · ghi nhận đã thu',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await toFees(c);
      await row(c, 'Đỗ Hải Yến').getByText('Ghi nhận đã thu', { exact: true }).click();
      // D-68: Yến là TK Cá nhân → phí gói Cá nhân
      await waitText(c, /Đã ghi nhận thu 1\.200\.000đ/);
    },
  },
  {
    id: 'D-22',
    name: 'Phí · 6/trang, trang 2',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await toFees(c);
      // Prototype v4 thêm 7 ô chọn lọc: chọn đúng ô cỡ trang theo option
      await c.page
        .locator('select')
        .filter({ visible: true })
        .filter({ has: c.page.locator('option', { hasText: '6 / trang' }) })
        .last()
        .selectOption({ label: '6 / trang' });
      await pager(c, 2);
      await waitText(c, /Hiển thị 7–8 \/ 8/);
    },
  },
];
