import { choose, nav, press, tap, tapNth, tapTitle, type, waitText } from '../steps';
import type { Scenario, StepCtx } from '../types';

/** Portal P-79 → P-95: Gói dịch vụ, thanh toán phí, Hồ sơ */

const AI_COURSE_IDX = 2; // "Khóa học Vận hành OPC bằng AI – 30 ngày" là dịch vụ thứ 3
const toServices = async (c: StepCtx) => {
  await nav(c, 'Gói dịch vụ');
  await waitText(c, 'Chương trình & dịch vụ khác');
};
const toConsult = async (c: StepCtx) => {
  await toServices(c);
  await tapNth(c, 'Tư vấn', AI_COURSE_IDX);
  await waitText(c, 'Đăng ký tư vấn dịch vụ');
};
const toPay = async (c: StepCtx) => {
  await toServices(c);
  await press(c, /Đăng ký ngay · 600\.000đ\/năm/);
  await waitText(c, 'Tôi đã chuyển khoản');
};
const toProfile = async (c: StepCtx) => {
  if (c.vw === 390) await tapTitle(c, 'Menu');
  await tap(c, 'Hồ sơ cá nhân →');
  await waitText(c, 'Lưu thay đổi');
};
const profileTab = async (c: StepCtx, tab: string) => {
  await toProfile(c);
  await tap(c, tab);
};
/** Ô nhập "Họ và tên" của tab Thông tin cá nhân */
const nameInput = (c: StepCtx) =>
  c.page.getByPlaceholder('Nguyễn Văn An', { exact: true }).filter({ visible: true }).first();

export const PORTAL_ACCOUNT: Scenario[] = [
  { id: 'P-79', name: 'Popup Gói dịch vụ', start: 'user', steps: toServices },
  {
    id: 'P-80',
    name: 'Form tư vấn · cá nhân',
    start: 'user',
    fullPage: true,
    note: 'User demo là DN nên form mở sẵn biến thể Doanh nghiệp (P-81); chuyển sang Cá nhân',
    steps: async (c) => {
      await toConsult(c);
      await c.page.getByText('Cá nhân', { exact: true }).filter({ visible: true }).last().click();
      await waitText(c, 'THÔNG TIN CÁ NHÂN');
    },
  },
  {
    id: 'P-81',
    name: 'Form tư vấn · doanh nghiệp (mặc định)',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await toConsult(c);
      await waitText(c, 'THÔNG TIN TỔ CHỨC');
    },
  },
  {
    id: 'P-82',
    name: 'Form tư vấn · báo thiếu',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await toConsult(c);
      await press(c, 'Gửi yêu cầu');
      await waitText(c, 'Vui lòng chọn loại hình tổ chức');
    },
  },
  {
    id: 'P-83',
    name: 'Đã gửi yêu cầu tư vấn',
    start: 'user',
    steps: async (c) => {
      await toConsult(c);
      await c.page
        .locator('select')
        .filter({ visible: true })
        .filter({ has: c.page.locator('option', { hasText: 'Hộ kinh doanh' }) })
        .first()
        .selectOption({ label: 'Doanh nghiệp' });
      // QT-11 (TIP-V2-110): DN bắt buộc quy mô + chức vụ
      await choose(c, '1 – 10 người');
      await type(c, 'Chức vụ', 'Giám đốc');
      await choose(c, 'Hà Nội');
      await c.page
        .locator('[contenteditable=true]')
        .filter({ visible: true })
        .first()
        .fill('Cần tư vấn khóa học cho đội ngũ');
      await press(c, 'Gửi yêu cầu');
      await waitText(c, 'Đã gửi yêu cầu tư vấn');
    },
  },
  { id: 'P-84', name: 'Thông tin chuyển khoản', start: 'user', steps: toPay },
  {
    id: 'P-85',
    name: 'Chuyển khoản · đã sao chép',
    start: 'user',
    steps: async (c) => {
      await toPay(c);
      await tap(c, 'Sao chép');
      await waitText(c, 'Đã sao chép số tài khoản');
    },
  },
  {
    id: 'P-86',
    name: 'Chuyển khoản · đang đối soát',
    start: 'user',
    steps: async (c) => {
      await toPay(c);
      await press(c, 'Tôi đã chuyển khoản');
      await waitText(c, /Đang đối soát giao dịch/);
    },
  },
  {
    id: 'P-87',
    name: 'Popup bắt đóng phí',
    start: 'unpaid',
    unreachable:
      'Prototype chỉ có TK m1 và luôn tính lại phí m1 = còn hiệu lực mỗi lần render (FEE.m1); không có TK chưa đóng phí (C-01).',
  },
  {
    id: 'P-88',
    name: 'Banner chờ thanh toán',
    start: 'unpaid',
    unreachable: 'Mã chết trên prototype: payBanner:false gán cứng (C-01).',
  },
  {
    id: 'P-89',
    name: 'Hồ sơ · thông tin cá nhân',
    start: 'user',
    fullPage: true,
    steps: toProfile,
  },
  {
    id: 'P-90',
    name: 'Hồ sơ · báo thiếu họ tên',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await toProfile(c);
      await nameInput(c).fill('');
      await press(c, 'Lưu thay đổi');
      await waitText(c, 'Họ và tên không được để trống');
    },
  },
  {
    id: 'P-91',
    name: 'Hồ sơ · thông tin doanh nghiệp',
    start: 'user',
    fullPage: true,
    steps: (c) => profileTab(c, 'Thông tin doanh nghiệp'),
  },
  {
    id: 'P-92',
    name: 'Hồ sơ · nhóm & hoạt động',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await profileTab(c, 'Nhóm & hoạt động');
      await waitText(c, 'Nhóm đã tham gia');
    },
  },
  {
    id: 'P-93',
    name: 'Hồ sơ · bảo mật',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await profileTab(c, 'Bảo mật');
      await waitText(c, 'Tài khoản liên kết');
    },
  },
  {
    id: 'P-94',
    name: 'Đổi mật khẩu · báo thiếu',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await profileTab(c, 'Bảo mật');
      await press(c, 'Cập nhật mật khẩu');
      await waitText(c, 'Nhập mật khẩu hiện tại');
    },
  },
  {
    id: 'P-95',
    name: 'Hồ sơ · số Dự án → Dự án của tôi',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await toProfile(c);
      // prototype: thẻ thống kê là div có onClick; app: button (truy cập bàn phím)
      await c.page
        .locator('div, button')
        .filter({ has: c.page.getByText('Dự án', { exact: true }) })
        .filter({ hasText: /^\d+\s*Dự án$/ })
        .filter({ visible: true })
        .last()
        .click();
      await waitText(c, 'Chỉnh sửa');
    },
  },
];
