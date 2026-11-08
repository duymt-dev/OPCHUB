import { expect, test } from '../server/test';
import { ADMIN_URL } from '../urls';
import { settingsLogin } from '../llm/settings-session';
import { startConfigStub } from '../llm/config-stub';
import { aiOpsFixture } from '../llm/ai-ops-fixture';

for (const width of [1440, 390]) {
  test(`D-138 AI operations ${width}: model per purpose, explicit suggestion, view filter and export AI call log`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const stub = await startConfigStub('<p>Khám phá các hoạt động cộng đồng OPC Hub.</p>');
    let restore: (() => Promise<void>) | undefined;
    try {
      const token = await settingsLogin(page);
      restore = await aiOpsFixture(page, token, stub.url);
      await page.goto(`${ADMIN_URL}/settings?tab=llm`);
      await expect(
        page.locator('select').filter({ has: page.locator('option[value="ai-ops-817-stub"]') }),
      ).toHaveValue('ai-ops-817-stub');
      const model = page.getByRole('combobox', { name: 'Mô hình (content)', exact: true });
      await model.fill('ai-ops-content-817');
      await page.getByRole('button', { name: 'Lưu cấu hình', exact: true }).click();
      await expect(page.getByText('Đã lưu cấu hình AI Provider', { exact: true })).toBeVisible();
      await page.reload();
      await expect(model).toHaveValue('ai-ops-content-817');
      await page.screenshot({ path: info.outputPath('ai-settings.png'), fullPage: true });
      await page.goto(`${ADMIN_URL}/marketing`);
      await page.getByRole('button', { name: '+ Tạo chiến dịch', exact: true }).click();
      const form = page.getByRole('dialog', { name: 'Tạo chiến dịch email' });
      const editor = form.locator('[contenteditable=true]');
      await editor.fill('Bản nháp đang soạn');
      await form.getByRole('button', { name: 'Gợi ý bằng AI', exact: true }).click();
      await expect(
        page.getByText('<p>Khám phá các hoạt động cộng đồng OPC Hub.</p>', { exact: true }),
      ).toBeVisible();
      await expect(editor).toHaveText('Bản nháp đang soạn');
      await page.screenshot({ path: info.outputPath('ai-suggestion.png'), fullPage: false });
      await page.getByRole('button', { name: 'Dùng gợi ý', exact: true }).click();
      await expect(editor).toHaveText('Khám phá các hoạt động cộng đồng OPC Hub.');
      await page.goto(`${ADMIN_URL}/settings?tab=llm`);
      await page.getByRole('button', { name: 'Xem nhật ký', exact: true }).click();
      const log = page.getByRole('dialog', { name: 'Nhật ký gọi AI' });
      await expect
        .poll(() => log.evaluate((el) => el.scrollWidth <= el.clientWidth + 1))
        .toBe(true);
      await log.getByRole('combobox', { name: 'Chức năng AI', exact: true }).click();
      await page.getByRole('option', { name: 'Soạn nội dung', exact: true }).click();
      await expect(
        log.getByRole('cell', { name: 'Soạn nội dung', exact: true }).first(),
      ).toBeVisible();
      await log.getByRole('combobox', { name: 'Trạng thái lời gọi', exact: true }).click();
      await page.getByRole('option', { name: 'Thành công', exact: true }).click();
      const download = page.waitForEvent('download');
      await log.getByRole('button', { name: 'Xuất CSV', exact: true }).click();
      expect((await download).suggestedFilename()).toContain('.csv');
      await page.screenshot({ path: info.outputPath('ai-log.png'), fullPage: false });
      await info.attach(`ai-ops-${width}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });
    } finally {
      try {
        await restore?.();
      } finally {
        await stub.close();
      }
    }
  });
}
