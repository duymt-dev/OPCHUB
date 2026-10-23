import { press, tap, tick, type, waitText } from '../steps';
import type { Scenario, StepCtx } from '../types';

/**
 * V4-607 P-100 → P-102: popup khai báo sau đăng nhập (prototype v4 `Popup · Thông tin cá nhân`,
 * `Popup · Khai báo doanh nghiệp`). Prototype: đăng ký → về form đăng nhập → (đăng nhập TK demo để
 * đọc mật khẩu tạm trong mail chào mừng) → đăng xuất → đăng nhập TK mới → popup.
 * App (D-30): kích hoạt OTP vào thẳng phiên → đóng mail chào mừng → popup.
 */
const DIALOG = (label: string) => (c: StepCtx) =>
  c.page.locator(`[data-screen-label="${label}"]`).filter({ visible: true }).first();
const PERSONAL = 'Popup · Thông tin cá nhân';
const BUSINESS = 'Popup · Khai báo doanh nghiệp';
const OPC_SEARCH = 'Nhập tên tỉnh/thành, VD: Đà Nẵng, Hà Nội...';

const agree = (c: StepCtx) =>
  c.page
    .getByText(/^Tôi xác nhận là người đại diện hợp pháp/)
    .filter({ visible: true })
    .first()
    .click();
const fillLogin = async (c: StepCtx, email: string, pwd: string) => {
  await c.page
    .getByPlaceholder('Nhập email hoặc số điện thoại')
    .filter({ visible: true })
    .first()
    .fill(email);
  await c.page.locator('input[type=password]').filter({ visible: true }).first().fill(pwd);
  await press(c, 'Đăng nhập');
  await tick(c, 2_300);
};

/** OTP đúng → app: đóng mail chào mừng; prototype: lấy mật khẩu tạm rồi đăng nhập TK mới */
const activate = async (c: StepCtx, email: string) => {
  await c.page.locator('input[inputmode=numeric]').filter({ visible: true }).first().fill('123456');
  await press(c, 'Xác nhận & kích hoạt tài khoản');
  await tick(c, 2_300);
  if (c.side === 'app') {
    await waitText(c, 'Đã gửi email chào mừng');
    await c.page.getByRole('button', { name: 'Đóng' }).filter({ visible: true }).first().click();
    await tick(c, 2_300);
    return;
  }
  // Prototype chỉ hiện mail (kèm mật khẩu tạm) sau khi có phiên — xem qua TK demo
  await fillLogin(c, 'an.nguyen@mediasoft.vn', 'User@2026');
  const pw = await c.page
    .getByText(/^OPC-[A-Z0-9]{4}[0-9]{2}$/)
    .first()
    .textContent();
  await c.page.getByText('×', { exact: true }).filter({ visible: true }).first().click();
  await c.page.locator('[data-m="me"]').filter({ visible: true }).first().click();
  await tap(c, 'Đăng xuất');
  await tick(c, 500);
  await fillLogin(c, email, pw ?? '');
};

/** Bỏ mọi OPC đã chọn (app điền sẵn từ đăng ký; prototype gợi ý theo vai trò) */
const clearOpc = async (c: StepCtx) => {
  const box = DIALOG(PERSONAL)(c);
  const removes =
    c.side === 'app'
      ? box.getByRole('button', { name: /^Bỏ OPC/ })
      : box.getByText('×', { exact: true });
  for (let n = await removes.count(); n > 0; n--) await removes.first().click();
};

const toPersonal = async (c: StepCtx) => {
  await tap(c, 'Đăng ký');
  await tap(c, 'Cá nhân');
  await type(c, 'Nguyễn Văn An', 'Trần Minh Khoa');
  await type(c, 'ban@congty.vn', 'khoa.tran@x.vn');
  if (c.side === 'app') {
    // Q-V4-607-1: form app vẫn thu vai trò + mật khẩu; prototype v4 đã chuyển vai trò sang popup
    await tap(c, 'Chuyên gia');
    await c.page
      .locator('input[type=password]')
      .filter({ visible: true })
      .first()
      .fill('User@2026');
  }
  await agree(c);
  await press(c, 'Đăng ký');
  await activate(c, 'khoa.tran@x.vn');
  await waitText(c, 'Hoàn tất thông tin tham gia');
};

const toBusiness = async (c: StepCtx) => {
  await tap(c, 'Đăng ký');
  await tap(c, 'Doanh nghiệp');
  if (c.side === 'app') {
    // Q-V4-607-1: form app vẫn thu MST + nhóm + mật khẩu
    await type(c, 'VD: 0101234567', '0101234567');
    // Đồng hồ parity đứng yên → không có tự tra sau 400ms; bấm "Tra cứu" như người dùng
    await press(c, 'Tra cứu');
    await waitText(c, /Đã tìm thấy doanh nghiệp/);
    await c.page
      .getByRole('button', { name: /OPC Hà Nội/ })
      .first()
      .click();
    await c.page
      .locator('input[type=password]')
      .filter({ visible: true })
      .first()
      .fill('User@2026');
  }
  await c.page.getByLabel('Họ và tên *').filter({ visible: true }).first().fill('Lê Thu Hà');
  await type(c, 'lienhe@congty.vn', 'ha.le@x.vn');
  await agree(c);
  await press(c, 'Đăng ký doanh nghiệp');
  await activate(c, 'ha.le@x.vn');
  await waitText(c, 'Khai báo thông tin doanh nghiệp');
};

/** Chọn một dòng trong danh sách OPC (cả hai bên chọn bằng mousedown thật) */
const pickOpc = async (c: StepCtx, label: string, name: string) => {
  await DIALOG(label)(c).getByText(name, { exact: true }).first().click();
};

const capture = (label: string) => ({
  selector: DIALOG(label),
  reason:
    'Chỉ so popup khai báo (màn TIP); Dashboard v4 phía sau thuộc V4-611 (prototype mở popup trên Dashboard, app trên /community)',
});

export const PORTAL_DECLARATION: Scenario[] = [
  {
    id: 'P-100',
    name: 'Popup khai báo · Cá nhân · chọn vai trò + OPC',
    start: 'auth',
    steps: async (c) => {
      await toPersonal(c);
      if (c.side === 'proto') await tap(c, 'Chuyên gia');
      await clearOpc(c);
      await type(c, OPC_SEARCH, 'Hà Nội');
      await pickOpc(c, PERSONAL, 'OPC Hà Nội');
      await tick(c, 2_300);
    },
    capture: capture(PERSONAL),
  },
  {
    id: 'P-101',
    name: 'Popup khai báo · Cá nhân · danh sách OPC theo tỉnh',
    start: 'auth',
    steps: async (c) => {
      await toPersonal(c);
      if (c.side === 'proto') await tap(c, 'Chuyên gia');
      await clearOpc(c);
      await type(c, OPC_SEARCH, 'Đà');
      await tick(c, 2_300);
    },
    capture: capture(PERSONAL),
  },
  {
    id: 'P-102',
    name: 'Popup khai báo · Doanh nghiệp · MST đã tra + OPC',
    start: 'auth',
    steps: async (c) => {
      await toBusiness(c);
      if (c.side === 'proto') {
        await type(c, 'VD: 0101234567', '0101234567');
        await press(c, 'Tra cứu');
        await type(c, OPC_SEARCH, 'Hà Nội');
        await pickOpc(c, BUSINESS, 'OPC Hà Nội');
      }
      await tick(c, 2_300);
    },
    capture: capture(BUSINESS),
  },
];
