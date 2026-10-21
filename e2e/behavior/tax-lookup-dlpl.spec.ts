import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { env } from '../env';
import { PORTAL_URL } from '../urls';
import { onServer } from '../server/api';

/**
 * TIP-V2-118 (D-65): tra MST qua DLPL API khi đăng ký doanh nghiệp. Nguồn ngoài chỉ có ở server
 * (bản MSW đã có test MST trong auth-flows). Server dev chạy `TAX_LOOKUP_PROVIDER=dlpl` trỏ stub
 * `server/dlpl-stub.ts`; nhóm `@live` chạy với key thật khi `E2E_TAX_LIVE=1` (server `chain`).
 */

const STUB = `http://127.0.0.1:${env.DLPL_STUB_PORT}`;
const live = env.E2E_TAX_LIVE === '1';
/** MST công khai (Tập đoàn Điện lực Việt Nam) cho lượt live — 1 lượt gọi */
const LIVE_TAX = '0100100079';

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });

async function openBizRegister(page: Page) {
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Đăng ký' }).click();
  await page.getByRole('button', { name: /^Doanh nghiệp/ }).click();
}

const stubMode = (mode: 'ok' | 'normal') =>
  fetch(`${STUB}/__stub/mode`, { method: 'POST', body: JSON.stringify({ mode }) });

/** MST ngẫu nhiên đuôi cố định → không trùng cache Redis giữa các lượt chạy */
const taxEndingWith = (tail: string) =>
  `01${String(Date.now()).slice(-5)}${tail}`.padEnd(10, '0').slice(0, 10);

const representative = (page: Page) => page.getByLabel('Họ và tên *');

async function finishRegistration(page: Page, emailTag: string) {
  await page.getByRole('button', { name: /OPC Hà Nội/ }).click();
  await page.getByPlaceholder('lienhe@congty.vn').fill(`${emailTag}-${Date.now()}@vd.vn`);
  await page.getByText(/không hoàn lại sau khi thanh toán/).click();
  await page.getByRole('button', { name: 'Đăng ký doanh nghiệp' }).click();
  await expect(page.getByRole('dialog', { name: 'Xác thực email' })).toBeVisible();
}

test.describe('D-65 tra MST qua DLPL (stub)', () => {
  test.skip(!onServer || live, 'Nguồn DLPL chỉ có ở server; lượt live chạy nhóm @live');
  test.afterEach(async () => {
    await stubMode('normal');
  });

  test('D-65 đăng ký DN: tra MST qua DLPL → tự điền tên + ngành, người đại diện để trống và sửa được, đăng ký tới bước Xác thực email', async ({
    page,
  }) => {
    await openBizRegister(page);
    await page.getByPlaceholder('VD: 0101234567').fill(taxEndingWith('567'));
    await expect(page.getByText(/Đã tìm thấy doanh nghiệp/)).toBeVisible();
    await expect(page.getByPlaceholder('Công ty TNHH ...')).toHaveValue(
      'Công ty TNHH Giải pháp MediaSoft',
    );
    await expect(page.getByLabel('Ngành nghề kinh doanh chính')).toHaveValue(
      '6201 – Lập trình máy vi tính',
    );
    await expect(page.getByText('Ngành nghề đăng ký khác (4)')).toBeVisible();
    await expect(representative(page)).toHaveValue('');
    await representative(page).fill('Người Đại Diện DLPL');
    await expect(representative(page)).toHaveValue('Người Đại Diện DLPL');
    await finishRegistration(page, 'dlpl');
  });

  test('D-65 DLPL hết lượt (MST …429) → báo không tra cứu được, nhập tay vẫn đăng ký được', async ({
    page,
  }) => {
    await openBizRegister(page);
    await page.getByPlaceholder('VD: 0101234567').fill(taxEndingWith('429'));
    await expect(toast(page)).toHaveText(
      'Không tra cứu được mã số thuế, vui lòng nhập thông tin doanh nghiệp',
    );
    await expect(page.getByText(/Đã tìm thấy doanh nghiệp/)).toHaveCount(0);
    await page.getByPlaceholder('Công ty TNHH ...').fill('Công ty TNHH Hết Lượt');
    await page.getByLabel('Ngành nghề kinh doanh chính').fill('Tư vấn quản lý');
    await representative(page).fill('Người Nhập Tay');
    await finishRegistration(page, 'dlpl-quota');
  });

  test('D-65 tra lại MST lỗi không bị cache "không thấy"', async ({ page }) => {
    const tax = taxEndingWith('429');
    await openBizRegister(page);
    const input = page.getByPlaceholder('VD: 0101234567');
    await input.fill(tax);
    await expect(toast(page)).toHaveText(
      'Không tra cứu được mã số thuế, vui lòng nhập thông tin doanh nghiệp',
    );
    expect((await stubMode('ok')).ok).toBe(true);
    await input.fill('');
    await input.fill(tax);
    await expect(page.getByText(/Đã tìm thấy doanh nghiệp/)).toBeVisible();
    await expect(page.getByPlaceholder('Công ty TNHH ...')).toHaveValue(
      'Công ty TNHH Giải pháp MediaSoft',
    );
  });
});

test.describe('D-65 tra MST thật qua DLPL @live', () => {
  test.skip(!onServer || !live, 'Chỉ chạy khi E2E_TAX_LIVE=1 với key DLPL thật');

  test('D-65 @live tra 1 MST công khai → có tên DN, người đại diện để trống', async ({ page }) => {
    await openBizRegister(page);
    await page.getByPlaceholder('VD: 0101234567').fill(LIVE_TAX);
    await expect(page.getByText(/Đã tìm thấy doanh nghiệp/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByPlaceholder('Công ty TNHH ...')).not.toHaveValue('');
    await expect(representative(page)).toHaveValue('');
  });
});
