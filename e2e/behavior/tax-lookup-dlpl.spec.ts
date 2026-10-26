import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { env } from '../env';
import { PORTAL_URL } from '../urls';
import { onServer } from '../server/api';
import { completeDeclaration } from './helpers/declaration';

/**
 * TIP-V2-118 (D-65): tra MST qua DLPL API khi khai báo doanh nghiệp (D-89: popup sau đăng ký). Nguồn ngoài chỉ có ở server
 * (bản MSW đã có test MST trong auth-flows). Server dev chạy `TAX_LOOKUP_PROVIDER=dlpl` trỏ stub
 * `server/dlpl-stub.ts`; nhóm `@live` chạy với key thật khi `E2E_TAX_LIVE=1` (server `chain`).
 */

const STUB = `http://127.0.0.1:${env.DLPL_STUB_PORT}`;
const live = env.E2E_TAX_LIVE === '1';
/** MST công khai (Tập đoàn Điện lực Việt Nam) cho lượt live — 1 lượt gọi */
const LIVE_TAX = '0100100079';

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });

const stubMode = (mode: 'ok' | 'normal') =>
  fetch(`${STUB}/__stub/mode`, { method: 'POST', body: JSON.stringify({ mode }) });

/** MST ngẫu nhiên đuôi cố định → không trùng cache Redis giữa các lượt chạy */
const taxEndingWith = (tail: string) =>
  `01${String(Date.now()).slice(-5)}${tail}`.padEnd(10, '0').slice(0, 10);

/**
 * D-89 (prototype v4): form đăng ký DN chỉ còn người đại diện; MST tra ở popup khai báo sau
 * khi kích hoạt. Trả popup "Khai báo thông tin doanh nghiệp".
 */
async function openBizDeclaration(page: Page, tag: string) {
  await page.goto(`${PORTAL_URL}/register?type=biz`, { waitUntil: 'networkidle' });
  await page.getByLabel('Họ và tên *').fill('Người Đại Diện DLPL');
  await page.getByPlaceholder('lienhe@congty.vn').fill(`${tag}-${Date.now()}@vd.vn`);
  await page.getByText(/^Tôi xác nhận là người đại diện hợp pháp/).click();
  await page.getByRole('button', { name: 'Đăng ký doanh nghiệp' }).click();
  const otp = page.getByRole('dialog', { name: 'Xác thực email' });
  await otp.getByLabel('Mã OTP').fill('123456');
  await otp.getByRole('button', { name: 'Xác nhận & kích hoạt tài khoản' }).click();
  await expect(page).toHaveURL(/\/community$/);
  const welcome = page.getByRole('dialog', { name: 'Đã gửi email chào mừng', exact: true });
  await welcome.getByRole('button', { name: 'Đóng', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Khai báo thông tin doanh nghiệp', exact: true });
  await expect(d).toBeVisible();
  return d;
}

test.describe('D-65 tra MST qua DLPL (stub)', () => {
  test.skip(!onServer || live, 'Nguồn DLPL chỉ có ở server; lượt live chạy nhóm @live');
  test.afterEach(async () => {
    await stubMode('normal');
  });

  test('D-65 khai báo DN: tra MST qua DLPL → tự điền tên + ngành, lưu → hồ sơ DN', async ({
    page,
  }) => {
    const d = await openBizDeclaration(page, 'dlpl');
    await d.getByPlaceholder('VD: 0101234567').fill(taxEndingWith('567'));
    await expect(d.getByText(/Đã tìm thấy doanh nghiệp/)).toBeVisible();
    await expect(d.getByPlaceholder('Công ty TNHH ...')).toHaveValue(
      'Công ty TNHH Giải pháp MediaSoft',
    );
    await expect(d.getByPlaceholder('Ngành nghề theo đăng ký kinh doanh')).toHaveValue(
      '6201 – Lập trình máy vi tính',
    );
    await completeDeclaration(page);
  });

  test('D-65 DLPL hết lượt (MST …429) → báo không tra cứu được, nhập tay vẫn lưu được', async ({
    page,
  }) => {
    const d = await openBizDeclaration(page, 'dlpl-quota');
    await d.getByPlaceholder('VD: 0101234567').fill(taxEndingWith('429'));
    await expect(toast(page)).toHaveText(
      'Không tra cứu được mã số thuế, vui lòng nhập thông tin doanh nghiệp',
    );
    await expect(d.getByText(/Đã tìm thấy doanh nghiệp/)).toHaveCount(0);
    await d.getByPlaceholder('Công ty TNHH ...').fill('Công ty TNHH Hết Lượt');
    await d.getByPlaceholder('Ngành nghề theo đăng ký kinh doanh').fill('Tư vấn quản lý');
    await completeDeclaration(page);
  });

  test('D-65 tra lại MST lỗi không bị cache "không thấy"', async ({ page }) => {
    const tax = taxEndingWith('429');
    const d = await openBizDeclaration(page, 'dlpl-retry');
    const input = d.getByPlaceholder('VD: 0101234567');
    await input.fill(tax);
    await expect(toast(page)).toHaveText(
      'Không tra cứu được mã số thuế, vui lòng nhập thông tin doanh nghiệp',
    );
    expect((await stubMode('ok')).ok).toBe(true);
    await input.fill('');
    await input.fill(tax);
    await expect(d.getByText(/Đã tìm thấy doanh nghiệp/)).toBeVisible();
    await expect(d.getByPlaceholder('Công ty TNHH ...')).toHaveValue(
      'Công ty TNHH Giải pháp MediaSoft',
    );
  });
});

test.describe('D-65 tra MST thật qua DLPL @live', () => {
  test.skip(!onServer || !live, 'Chỉ chạy khi E2E_TAX_LIVE=1 với key DLPL thật');

  test('D-65 @live tra 1 MST công khai → có tên DN', async ({ page }) => {
    const d = await openBizDeclaration(page, 'dlpl-live');
    await d.getByPlaceholder('VD: 0101234567').fill(LIVE_TAX);
    await expect(d.getByText(/Đã tìm thấy doanh nghiệp/)).toBeVisible({ timeout: 15_000 });
    await expect(d.getByPlaceholder('Công ty TNHH ...')).not.toHaveValue('');
  });
});
