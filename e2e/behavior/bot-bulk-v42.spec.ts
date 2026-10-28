import { botBulkBatchSchema, botBulkSavedSchema } from '@opchub/shared/api-domains';
import { expect, test } from '../server/test';
import { bulkDialog, createBulkScene } from './helpers/bot-bulk-scene';
import { botCard } from './helpers/bot-ui';

test.use({ botManual: true });
for (const width of [1440, 390]) {
  test(`D-112 bulk type/generate/reload/select/save at ${width}px`, async ({ page }, info) => {
    const { batch, type, topic } = await createBulkScene(page, width);
    await page.reload();
    await page.getByRole('button', { name: 'AI tạo hàng loạt', exact: true }).click();
    const dialog = bulkDialog(page);
    await expect(dialog.getByText('Đã tạo xong · 2/2')).toBeVisible({ timeout: 40_000 });
    await expect(dialog.getByRole('checkbox')).toHaveCount(2);
    await expect(dialog.getByRole('button', { name: type.name, exact: true })).toBeVisible();
    const first = dialog.getByRole('checkbox', { name: `Chọn kịch bản 1: ${topic}`, exact: true });
    // Controlled checkbox reflects the persisted response, not an optimistic local toggle.
    const selecting = page.waitForResponse(
      (r) =>
        r.url().endsWith(`/bulk-scripts/${batch.id}/selection`) && r.request().method() === 'PATCH',
    );
    await first.click();
    const selectionResponse = await selecting;
    expect(selectionResponse.status()).toBe(200);
    expect(botBulkBatchSchema.parse(await selectionResponse.json()).selectedCount).toBe(1);
    await expect(first).not.toBeChecked();
    await expect(dialog.getByRole('button', { name: 'Lưu 1 kịch bản' })).toBeEnabled();
    await page.reload();
    await page.getByRole('button', { name: 'AI tạo hàng loạt', exact: true }).click();
    await expect(first).not.toBeChecked();
    const saving = page.waitForResponse(
      (r) => r.url().endsWith(`/bulk-scripts/${batch.id}/save`) && r.request().method() === 'POST',
    );
    await dialog.getByRole('button', { name: 'Lưu 1 kịch bản' }).click();
    const response = await saving;
    expect(response.status()).toBe(200);
    expect(botBulkSavedSchema.parse(await response.json()).saved).toBe(1);
    await expect(dialog.getByText('Đã lưu', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Lưu 0 kịch bản' })).toBeDisabled();
    const second = dialog.getByRole('checkbox', { name: `Chọn kịch bản 2: ${topic}`, exact: true });
    await expect(second).toBeChecked();
    await expect(second).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await dialog.getByText('Đã lưu', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`bulk-saved-${width}.png`) });
    await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
    await expect(botCard(page, topic, 'Sửa')).toContainText(type.name);
    await page.reload();
    await page.getByRole('button', { name: 'AI tạo hàng loạt', exact: true }).click();
    await expect(second).toBeDisabled();
    await expect(dialog.getByRole('button', { name: 'Lưu 0 kịch bản' })).toBeDisabled();
  });
}
