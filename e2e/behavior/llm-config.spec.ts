import { expect, test } from '../server/test';
import { ADMIN_URL } from '../urls';
import { startConfigStub } from '../llm/config-stub';

for (const width of [1440, 390]) {
  test(`AI settings ${width}: save, reload, retain masked key, verify and disable`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const stub = await startConfigStub();
    try {
      await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle' });
      await page
        .locator('input[autocomplete=username], input[type=email]')
        .fill('admin@opchub.community');
      await page.locator('input[type=password]').fill('Admin@2026');
      await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      await page.waitForURL((url) => !url.pathname.startsWith('/login'));
      await page.goto(`${ADMIN_URL}/settings?tab=llm`);
      await expect(page.getByRole('heading', { name: 'Cấu hình AI' })).toBeVisible();
      const key = page.getByLabel('Khóa API AI', { exact: true });
      const enabled = page.getByRole('switch', { name: 'Bật AI' });
      const save = page.getByRole('button', { name: 'Lưu cấu hình AI', exact: true });
      await page.getByLabel('Endpoint AI').fill(stub.url);
      await page.getByLabel('Model AI').fill('browser-local-model');
      await key.fill('browser-test-key-0712');
      await page.getByLabel('Số token tối đa').fill('96');
      await page.getByLabel('Thời gian chờ (ms)').fill('2000');
      await enabled.setChecked(true);
      await save.click();
      await expect(page.getByText('AI đã cấu hình', { exact: true })).toBeVisible();
      await expect(key).toHaveValue('');
      await page.reload();
      await expect(key).toHaveValue('');
      await expect(key).toHaveAttribute('placeholder', 'Đã đặt khóa · …0712');
      await expect(page.getByLabel('Endpoint AI')).toHaveValue(stub.url);
      await expect(page.getByLabel('Số token tối đa')).toHaveValue('96');
      await page.getByLabel('Model AI').fill('browser-updated-model');
      await save.click();
      await expect(key).toHaveAttribute('placeholder', 'Đã đặt khóa · …0712');
      await page.getByRole('button', { name: 'Kiểm tra kết nối', exact: true }).click();
      await expect(page.getByText('Kết nối AI thành công', { exact: true })).toBeVisible();
      if (width === 390) {
        const nav = await page.getByRole('navigation', { name: 'Mục cài đặt' }).boundingBox();
        const endpoint = await page.getByLabel('Endpoint AI').boundingBox();
        expect(nav).not.toBeNull();
        expect(endpoint).not.toBeNull();
        expect(nav!.y + nav!.height).toBeLessThan(endpoint!.y);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await testInfo.attach(`ai-config-${width}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });
      await enabled.setChecked(false);
      await save.click();
      await expect(page.getByText('Chưa cấu hình AI', { exact: true })).toBeVisible();
      await page.reload();
      await expect(enabled).not.toBeChecked();
      await expect(key).toHaveValue('');
      await expect(page.getByLabel('Model AI')).toHaveValue('browser-updated-model');
    } finally {
      await stub.close();
    }
  });
}
