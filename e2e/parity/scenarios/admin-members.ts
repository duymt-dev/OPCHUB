import type { Locator } from '@playwright/test';
import { nav, pager, tap, tapLast, tapTitle, waitText } from '../steps';
import type { Scenario, StepCtx } from '../types';

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
/** Nút "⋯" ở cột cuối của dòng */
const rowMenu = (c: StepCtx, text: string) =>
  row(c, text).locator(':scope > div').last().locator(':scope > div').first().click();

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
  { id: 'D-02', name: 'Admin · menu người dùng', start: 'admin', steps: openMe },
  {
    id: 'D-03',
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
    name: 'Admin · thông báo',
    start: 'admin',
    steps: async (c) => {
      await tapTitle(c, 'Thông báo');
      await waitText(c, 'Đánh dấu tất cả đã đọc');
    },
  },
  {
    id: 'D-05',
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
    },
  },
  {
    id: 'D-15',
    name: 'Thành viên · đổi quyền hệ thống',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await toMembers(c);
      await row(c, 'Lê Minh Anh').locator('select').selectOption({ label: 'Quản trị viên' });
      await waitText(c, /Đã cập nhật vai trò/);
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
      await c.page
        .locator('select')
        .filter({ visible: true })
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
      await waitText(c, /Đã ghi nhận thu 600\.000đ/);
    },
  },
  {
    id: 'D-22',
    name: 'Phí · 6/trang, trang 2',
    start: 'admin',
    fullPage: true,
    steps: async (c) => {
      await toFees(c);
      await c.page
        .locator('select')
        .filter({ visible: true })
        .last()
        .selectOption({ label: '6 / trang' });
      await pager(c, 2);
      await waitText(c, /Hiển thị 7–8 \/ 8/);
    },
  },
];
