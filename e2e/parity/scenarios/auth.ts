import { press, tap, tick, type, waitText } from '../steps';
import type { Scenario, StepCtx } from '../types';

/** Auth A-01 → A-30 — chuỗi thao tác theo coding-packs/reports/ui-parity/screens.md */

const typeEmail = (c: StepCtx, v: string) =>
  c.page.locator('input[type=email]').filter({ visible: true }).first().fill(v);
const typePwd = (c: StepCtx, v: string) =>
  c.page.locator('input[type=password]').filter({ visible: true }).first().fill(v);
const submit = (c: StepCtx) => press(c, 'Đăng nhập');

const toRegister = (c: StepCtx) => tap(c, 'Đăng ký');
const toBiz = async (c: StepCtx) => {
  await toRegister(c);
  await tap(c, 'Doanh nghiệp');
};
const toPer = async (c: StepCtx) => {
  await toRegister(c);
  await tap(c, 'Cá nhân');
};
const lookupTax = async (c: StepCtx, mst: string) => {
  await type(c, 'VD: 0101234567', mst);
  await press(c, 'Tra cứu');
};
/** Đủ thông tin cá nhân để gửi OTP */
const fillPersonal = async (c: StepCtx) => {
  await toPer(c);
  await tap(c, 'Chuyên gia');
  await type(c, 'ban@congty.vn', 'test@x.vn');
  // NR-R02: app bắt buộc đồng ý điều khoản (prototype không chặn) → tick ở cả hai bên
  await c.page
    .getByText(/^Tôi đồng ý với Điều khoản/)
    .filter({ visible: true })
    .first()
    .click();
  await press(c, 'Đăng ký');
  await waitText(c, 'Xác thực email');
};
const toForgot = (c: StepCtx) => tap(c, 'Quên mật khẩu?');

export const AUTH_SCENARIOS: Scenario[] = [
  { id: 'A-01', name: 'Đăng nhập', start: 'auth', fullPage: true },
  {
    id: 'A-02',
    name: 'Đăng nhập · bỏ trống',
    start: 'auth',
    fullPage: true,
    steps: async (c) => {
      await submit(c);
      await waitText(c, 'Vui lòng nhập email và mật khẩu');
    },
  },
  {
    id: 'A-03',
    name: 'Đăng nhập · sai thông tin',
    start: 'auth',
    fullPage: true,
    steps: async (c) => {
      await typeEmail(c, 'a@b.c');
      await typePwd(c, 'x');
      await submit(c);
      await waitText(c, 'Email hoặc mật khẩu không đúng');
    },
  },
  {
    id: 'A-04',
    name: 'Đăng nhập · hiện mật khẩu',
    start: 'auth',
    fullPage: true,
    steps: async (c) => {
      await typePwd(c, 'User@2026');
      await tap(c, 'Hiện');
    },
  },
  {
    id: 'A-05',
    name: 'Đăng nhập · điền TK dùng thử',
    start: 'auth',
    unreachable:
      'Ver2 bỏ khối "Tài khoản dùng thử – bấm để điền" khỏi màn đăng nhập prototype (app ẩn qua NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS)',
  },
  {
    id: 'A-06',
    name: 'Popover ngôn ngữ',
    start: 'auth',
    steps: async (c) => {
      await tap(c, 'Tiếng Việt');
      await waitText(c, 'CHỌN QUỐC GIA & NGÔN NGỮ');
    },
  },
  {
    id: 'A-07',
    name: 'Giao diện tiếng Anh',
    start: 'auth',
    fullPage: true,
    steps: async (c) => {
      await tap(c, 'Tiếng Việt');
      await tap(c, 'English');
      await waitText(c, 'Remember me');
    },
  },
  {
    id: 'A-08',
    name: 'SSO Google · đang chuyển hướng',
    start: 'auth',
    fullPage: true,
    steps: async (c) => {
      await press(c, /Google/);
      await waitText(c, /Đang chuyển hướng tới Google/);
    },
  },
  {
    id: 'A-09',
    name: 'SSO ChatGPT · qua Google',
    start: 'auth',
    fullPage: true,
    steps: async (c) => {
      await press(c, /ChatGPT/);
      await waitText(c, /Đăng nhập ChatGPT qua tài khoản Google/);
    },
  },
  {
    id: 'A-10',
    name: 'Đăng ký · chọn loại TK',
    start: 'auth',
    fullPage: true,
    steps: async (c) => {
      await toRegister(c);
      await waitText(c, 'BẠN ĐĂNG KÝ VỚI TƯ CÁCH');
    },
  },
  {
    id: 'A-11',
    name: 'Đăng ký đang tạm đóng',
    start: 'auth',
    unreachable:
      'Cần admin tắt "Cho phép tự đăng ký" rồi đăng xuất; state không giữ qua hai app tách (D-26). Kiểm bằng test hành vi.',
  },
  {
    id: 'A-12',
    name: 'Đăng ký DN · trống',
    start: 'auth',
    fullPage: true,
    steps: toBiz,
  },
  {
    id: 'A-13',
    name: 'Đăng ký DN · MST sai',
    start: 'auth',
    fullPage: true,
    steps: async (c) => {
      await toBiz(c);
      await lookupTax(c, '123');
      await waitText(c, 'Mã số thuế gồm 10 hoặc 13 chữ số');
    },
  },
  {
    id: 'A-14',
    name: 'Đăng ký DN · tra MST thấy',
    start: 'auth',
    fullPage: true,
    steps: async (c) => {
      await toBiz(c);
      await lookupTax(c, '0101234567');
      await tick(c, 1_000);
      await waitText(c, /Đã tìm thấy doanh nghiệp/);
    },
  },
  {
    id: 'A-15',
    name: 'Đăng ký DN · bỏ ngành phụ',
    start: 'auth',
    fullPage: true,
    steps: async (c) => {
      await toBiz(c);
      await lookupTax(c, '0101234567');
      await tick(c, 1_000);
      await waitText(c, /Đã tìm thấy doanh nghiệp/);
      await tick(c, 2_300);
      await c.page.getByText('×', { exact: true }).filter({ visible: true }).first().click();
    },
  },
  {
    id: 'A-16',
    name: 'Đăng ký · chọn mã quốc gia SĐT',
    start: 'auth',
    steps: async (c) => {
      await toPer(c);
      await tap(c, '+84');
    },
  },
  {
    id: 'A-17',
    name: 'Đăng ký DN · báo thiếu MST',
    start: 'auth',
    fullPage: true,
    steps: async (c) => {
      await toBiz(c);
      await press(c, 'Đăng ký doanh nghiệp');
      await waitText(c, 'Vui lòng nhập mã số thuế');
    },
  },
  {
    id: 'A-18',
    name: 'Đăng ký cá nhân · trống',
    start: 'auth',
    fullPage: true,
    steps: toPer,
  },
  {
    id: 'A-19',
    name: 'Đăng ký cá nhân · chọn vai trò',
    start: 'auth',
    fullPage: true,
    steps: async (c) => {
      await toPer(c);
      await tap(c, 'Chuyên gia');
    },
  },
  {
    id: 'A-20',
    name: 'Đăng ký cá nhân · báo thiếu vai trò',
    start: 'auth',
    fullPage: true,
    steps: async (c) => {
      await toPer(c);
      await press(c, 'Đăng ký');
      await waitText(c, 'Vui lòng chọn vai trò khi tham gia');
    },
  },
  { id: 'A-21', name: 'OTP', start: 'auth', steps: fillPersonal },
  {
    id: 'A-22',
    name: 'OTP · thiếu số',
    start: 'auth',
    steps: async (c) => {
      await fillPersonal(c);
      await tick(c, 2_300);
      await c.page
        .locator('input[inputmode=numeric]')
        .filter({ visible: true })
        .first()
        .fill('123');
      await press(c, 'Xác nhận & kích hoạt tài khoản');
      await waitText(c, 'Vui lòng nhập đủ 6 chữ số');
    },
  },
  {
    id: 'A-23',
    name: 'OTP · gửi lại',
    start: 'auth',
    steps: async (c) => {
      await fillPersonal(c);
      await tick(c, 2_300);
      await tap(c, 'Gửi lại');
      await waitText(c, /Đã gửi lại mã OTP/);
    },
  },
  {
    id: 'A-24',
    name: 'OTP · kích hoạt xong',
    start: 'auth',
    unreachable:
      'Prototype quay về màn đăng nhập; app mới vào thẳng /community theo D-30 — kiểm bằng test hành vi.',
  },
  {
    id: 'A-25',
    name: 'Đăng ký · đổi loại',
    start: 'auth',
    fullPage: true,
    steps: async (c) => {
      await toPer(c);
      await tap(c, 'Đổi loại');
      await waitText(c, 'BẠN ĐĂNG KÝ VỚI TƯ CÁCH');
    },
  },
  { id: 'A-26', name: 'Quên mật khẩu', start: 'auth', fullPage: true, steps: toForgot },
  {
    id: 'A-27',
    name: 'Quên mật khẩu · đã gửi',
    start: 'auth',
    fullPage: true,
    steps: async (c) => {
      await toForgot(c);
      await press(c, 'Gửi liên kết đặt lại');
      await waitText(c, 'Đã gửi email');
    },
  },
  {
    id: 'A-28',
    name: 'Quên mật khẩu · về đăng nhập',
    start: 'auth',
    fullPage: true,
    steps: async (c) => {
      await toForgot(c);
      await tap(c, '← Quay lại đăng nhập');
      await waitText(c, 'Chào mừng trở lại');
    },
  },
  {
    id: 'A-29',
    name: 'Đăng xuất',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      // Ver2: Đăng xuất nằm trong menu người dùng ở topbar (bỏ nút ở cuối sidebar)
      await c.page.locator('[data-m="me"]').filter({ visible: true }).first().click();
      await tap(c, 'Đăng xuất');
      await waitText(c, 'Đã đăng xuất');
      // chờ form đăng nhập dựng xong (khi máy bận, toast hiện trước form)
      await c.page.locator('input[type=email]').filter({ visible: true }).first().waitFor();
    },
  },
  {
    id: 'A-30',
    name: 'Đăng nhập · không bật SSO',
    start: 'auth',
    unreachable: 'Panel SSO của admin không có lối vào trên prototype (C-05).',
  },
  {
    id: 'A-31',
    name: 'Đăng ký · mã giới thiệu hợp lệ (✓ Được giới thiệu bởi …)',
    start: 'auth',
    unreachable: 'Ô Mã giới thiệu thuộc Affiliate §20 (TIP-V2-402/403, pha 4) — TIP-V2-503 bật lại',
  },
  {
    id: 'A-32',
    name: 'Đăng ký · mã giới thiệu không tồn tại',
    start: 'auth',
    unreachable: 'Ô Mã giới thiệu thuộc Affiliate §20 (TIP-V2-402/403, pha 4) — TIP-V2-503 bật lại',
  },
];
