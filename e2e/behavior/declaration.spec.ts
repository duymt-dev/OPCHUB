import { loginResponseSchema } from '@opchub/shared/api';
import { expect, test, type Page } from '../server/test';
import { onServer, payFee } from '../server/api';
import { PORTAL_URL } from '../urls';

/** V4-607 (REQ-503/504, UP-02, F01): khai báo sau đăng nhập → Bảng giá */
const personal = (page: Page) =>
  page.getByRole('dialog', { name: 'Hoàn tất thông tin tham gia', exact: true });
const business = (page: Page) =>
  page.getByRole('dialog', { name: 'Khai báo thông tin doanh nghiệp', exact: true });
const pricing = (page: Page) => page.getByRole('dialog', { name: 'Gói dịch vụ', exact: true });
const notice = (page: Page) => page.getByRole('status').filter({ visible: true });
const password = 'User@2026';

async function activate(page: Page) {
  const otp = page.getByRole('dialog', { name: 'Xác thực email', exact: true });
  await expect(otp).toBeVisible();
  const accepted = page.waitForResponse((r) => new URL(r.url()).pathname === '/v1/auth/otp/verify');
  await otp.getByLabel('Mã OTP').fill('123456');
  await otp.getByRole('button', { name: 'Xác nhận & kích hoạt tài khoản' }).click();
  const session = loginResponseSchema.parse(await (await accepted).json());
  expect(session.me.needsDeclaration).toBe(true);
  await expect(page).toHaveURL(/\/community$/);
  // Prototype v4: mail chào mừng (z 81) nằm trên popup khai báo (z 73) — đóng trước
  const welcome = page.getByRole('dialog', { name: 'Đã gửi email chào mừng' });
  await welcome.getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(welcome).toHaveCount(0);
  return session;
}

async function registerPersonal(page: Page) {
  const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const email = `v4-607-${tag}@example.test`;
  await page.goto(`${PORTAL_URL}/register?type=per`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('Nguyễn Văn An').fill(`Khai Báo ${tag}`);
  await page.getByPlaceholder('912 345 678').fill(`09${String(Date.now()).slice(-8)}`);
  await page.getByPlaceholder('ban@congty.vn').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('radio', { name: /Chuyên gia/ }).click();
  await page.getByText(/^Tôi xác nhận là người đại diện hợp pháp/).click();
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  return { email, session: await activate(page) };
}

test('UP-02 REQ-504 TK cá nhân mới: popup khai báo không đóng được, chặn Bảng giá; lưu → vào nhóm, Bảng giá, F5 không hiện lại', async ({
  page,
}) => {
  const { session } = await registerPersonal(page);
  const d = personal(page);
  await expect(d).toBeVisible();
  await expect(d).toContainText(`Xin chào ${session.me.fullName}.`);
  await expect(d).toContainText('✓Tài khoản2Thông tin tham gia3Phí thành viên');
  await expect(pricing(page)).toHaveCount(0);
  await expect(d.getByRole('button', { name: 'Đóng' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.mouse.click(2, 2);
  await expect(d).toBeVisible();
  // Điền sẵn từ đăng ký: vai trò + nhóm đã chọn
  await expect(d.getByRole('radio', { name: /Chuyên gia/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  // Bỏ hết OPC → báo đúng thông điệp, không gọi API
  let puts = 0;
  page.on('request', (r) => {
    if (new URL(r.url()).pathname === '/v1/me/declaration' && r.method() === 'PUT') puts++;
  });
  // Đổi sang "Kỹ sư" khi đã có OPC → giữ nguyên OPC (prototype chỉ gợi ý khi chưa chọn)
  await d.getByRole('radio', { name: /Kỹ sư/ }).click();
  const removes = d.getByRole('button', { name: /^Bỏ / });
  await expect(removes).not.toHaveCount(0);
  for (let n = await removes.count(); n > 0; n--) await removes.first().click();
  await expect(d.getByText('Đã chọn 0 OPC', { exact: true })).toBeVisible();
  await d.getByRole('button', { name: 'Lưu & tiếp tục', exact: true }).click();
  await expect(d.getByText('Vui lòng chọn OPC bạn muốn tham gia', { exact: true })).toBeVisible();
  await expect(notice(page)).toContainText('Vui lòng chọn OPC bạn muốn tham gia');
  expect(puts).toBe(0);
  // OPC Hà Nội qua ô tìm tỉnh/thành
  const search = d.getByPlaceholder('Nhập tên tỉnh/thành, VD: Đà Nẵng, Hà Nội...');
  await search.fill('ha noi');
  await d.getByRole('option', { name: /OPC Hà Nội/ }).click();
  await expect(d.getByText('Đã chọn 1 OPC', { exact: true })).toBeVisible();
  await search.fill('xyz');
  await expect(d.getByText('Không tìm thấy tỉnh/thành phù hợp', { exact: true })).toBeVisible();
  await search.fill('');
  await search.press('Escape');
  await expect(d.getByRole('listbox')).toHaveCount(0);
  const saved = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/me/declaration' && r.request().method() === 'PUT',
  );
  await d.getByRole('button', { name: 'Lưu & tiếp tục', exact: true }).click();
  const res = await saved;
  expect(res.status()).toBe(200);
  expect(JSON.parse(res.request().postData() ?? '{}')).toEqual({
    accountType: 'personal',
    persona: 'engineer',
    groupIds: ['c1'],
  });
  await expect(d).toHaveCount(0);
  await expect(notice(page)).toContainText('Đã lưu thông tin · tiếp tục thanh toán phí thành viên');
  await expect(pricing(page)).toBeVisible();
  await page.reload({ waitUntil: 'networkidle' });
  await expect(pricing(page)).toBeVisible();
  await expect(personal(page)).toHaveCount(0);
  // Server thật: /groups cần phí (BR-03, int `groups` → 402) — đóng phí qua ngân hàng giả trước
  if (onServer) await payFee(page);
  await page.locator('aside').getByText('Cộng đồng', { exact: true }).dispatchEvent('click');
  await expect(page.getByText('OPC Hà Nội').first()).toBeAttached();
});

test('UP-02 T10 REQ-504 TK DN mới: khai báo MST tra cứu + tỉnh ĐKKD + OPC → Bảng giá', async ({
  page,
}) => {
  const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const email = `v4-607-biz-${tag}@example.test`;
  await page.goto(`${PORTAL_URL}/register?type=biz`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('VD: 0101234567').fill('0101234567');
  await expect(page.getByText(/Đã tìm thấy doanh nghiệp/)).toBeVisible();
  await page.getByLabel('Họ và tên *').fill(`Đại Diện ${tag}`);
  await page.getByPlaceholder('lienhe@congty.vn').fill(email);
  await page.getByRole('button', { name: /OPC Hà Nội/ }).click();
  await page.getByText(/^Tôi xác nhận là người đại diện hợp pháp/).click();
  await page.getByRole('button', { name: 'Đăng ký doanh nghiệp', exact: true }).click();
  await activate(page);
  const d = business(page);
  await expect(d).toBeVisible();
  await expect(d).toContainText('✓Người đại diện2Thông tin doanh nghiệp3Phí thành viên');
  await expect(pricing(page)).toHaveCount(0);
  // MST đã nhập lúc đăng ký → đã tra, tên + ngành điền sẵn
  await expect(d.getByPlaceholder('VD: 0101234567')).toHaveValue('0101234567');
  await expect(d.getByText('Tự động từ MST', { exact: true })).toBeVisible();
  // Tỉnh/thành ĐKKD bắt buộc, phải chọn trong danh sách
  const prov = d.getByPlaceholder('Gõ để tìm hoặc chọn tỉnh/thành');
  await prov.fill('Tỉnh lạ');
  await d.getByRole('button', { name: 'Lưu & tiếp tục', exact: true }).click();
  await expect(
    d.getByText('Vui lòng chọn tỉnh/thành đăng ký kinh doanh trong danh sách', { exact: true }),
  ).toBeVisible();
  await prov.fill('đà nẵ');
  await d.getByRole('option', { name: /^Đà Nẵng/ }).click();
  await expect(prov).toHaveValue('Đà Nẵng');
  await d.getByRole('radio', { name: '2 – 10 người', exact: true }).click();
  const saved = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/me/declaration' && r.request().method() === 'PUT',
  );
  await d.getByRole('button', { name: 'Lưu & tiếp tục', exact: true }).click();
  const res = await saved;
  expect(res.status()).toBe(200);
  expect(JSON.parse(res.request().postData() ?? '{}')).toMatchObject({
    accountType: 'business',
    taxCode: '0101234567',
    size: '10',
    province: 'Đà Nẵng',
    groupIds: ['c1'],
  });
  await expect(d).toHaveCount(0);
  await expect(notice(page)).toContainText(
    'Đã lưu thông tin doanh nghiệp · tiếp tục thanh toán phí thành viên',
  );
  await expect(pricing(page)).toBeVisible();
  await page.reload({ waitUntil: 'networkidle' });
  await expect(business(page)).toHaveCount(0);
});

test('UP-02 popup khai báo chỉ thoát bằng "Đăng xuất"; đăng nhập lại vẫn phải khai báo', async ({
  page,
}) => {
  const { email } = await registerPersonal(page);
  await personal(page).getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(personal(page)).toBeVisible();
  await expect(pricing(page)).toHaveCount(0);
});

test('UP-02 user cũ (seed, đã khai báo) không thấy popup khai báo', async ({ page }) => {
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill(password);
  const logged = page.waitForResponse((r) => new URL(r.url()).pathname === '/v1/auth/login');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  const session = loginResponseSchema.parse(await (await logged).json());
  expect(session.me.needsDeclaration).toBe(false);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(personal(page)).toHaveCount(0);
  await expect(business(page)).toHaveCount(0);
});
