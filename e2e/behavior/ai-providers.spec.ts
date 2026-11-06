import { expect, test } from '../server/test';
import { ADMIN_URL } from '../urls';
import { startConfigStub } from '../llm/config-stub';
import { aiBrowserFixture, settingsFixture, settingsLogin } from '../llm/settings-session';
for (const width of [1440, 390]) {
  test(`REQ-628 AI providers ${width}: draft/save/reload, retain masked key, verify and disable`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const stub = await startConfigStub();
    try {
      const token = await settingsLogin(page);
      await settingsFixture(page, token, 'ai', aiBrowserFixture(stub.url), 'PUT');
      await page.goto(`${ADMIN_URL}/settings?tab=llm`);
      await expect(
        page.getByRole('heading', { name: 'Nhà cung cấp AI', exact: true }),
      ).toBeVisible();
      const choose = () =>
        page.getByRole('button', { name: /Tùy chỉnh \(OpenAI-compatible\)/ }).click();
      await choose();
      const key = page.getByLabel('API key', { exact: true });
      const enabled = page.getByRole('switch', { name: 'Bật kết nối' });
      const save = page.getByRole('button', { name: 'Lưu cấu hình', exact: true });
      await expect(key).toHaveValue('');
      await key.fill('browser-test-key-0712');
      await page.getByLabel('Max tokens / phản hồi').fill('96');
      await save.click();
      await expect(page.getByText('Đã lưu cấu hình AI Provider', { exact: true })).toBeVisible();
      await expect(key).toHaveValue('');
      await page.reload();
      await choose();
      await expect(key).toHaveValue('');
      await expect(page.getByText('Khóa đã lưu: ••••0712')).toBeVisible();
      await expect(page.getByLabel('Base URL (endpoint)')).toHaveValue(stub.url);
      await expect(page.getByLabel('Max tokens / phản hồi')).toHaveValue('96');
      await page.getByLabel('Mô hình mặc định').fill('browser-updated-model');
      await save.click();
      await expect(page.getByText('Khóa đã lưu: ••••0712')).toBeVisible();
      await page.getByRole('button', { name: 'Kiểm tra kết nối', exact: true }).click();
      await expect(
        page.getByText(
          'Tùy chỉnh (OpenAI-compatible) · kết nối thành công (browser-updated-model)',
          { exact: true },
        ),
      ).toBeVisible();
      await expect(page.getByText('Kết nối tốt', { exact: false }).first()).toBeVisible();
      await expect(page.getByText('Trợ lý OPC Hub (widget)', { exact: true })).toHaveCount(0);
      await expect(page.getByRole('combobox', { name: 'Bot tương tác tự động' })).toHaveValue(
        'custom',
      );
      if (width === 390) {
        const nav = await page.getByRole('navigation', { name: 'Mục cài đặt' }).boundingBox();
        const endpoint = await page.getByLabel('Base URL (endpoint)').boundingBox();
        expect(nav).not.toBeNull();
        expect(endpoint).not.toBeNull();
        expect(nav!.y + nav!.height).toBeLessThan(endpoint!.y);
      }
      await enabled.setChecked(false);
      await expect(page.getByRole('combobox', { name: 'Bot tương tác tự động' })).toHaveValue('');
      await save.click();
      await expect(
        page.getByText('Cần bật ít nhất 1 nhà cung cấp AI', { exact: true }),
      ).toBeVisible();
      await page.reload();
      await choose();
      await expect(enabled).toBeChecked();
      await expect(page.getByLabel('Mô hình mặc định')).toHaveValue('browser-updated-model');
      await testInfo.attach(`ai-providers-${width}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });
    } finally {
      await stub.close();
    }
  });
}
