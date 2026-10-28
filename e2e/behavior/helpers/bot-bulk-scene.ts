import { botBulkBatchSchema, botConversationTypeSchema } from '@opchub/shared/api-domains';
import { expect, type Page } from '../../server/test';
import { botTab, openBots } from './bot-ui';

export const bulkDialog = (page: Page) =>
  page.getByRole('dialog', { name: /AI tạo kịch bản hội thoại hàng loạt/ });
export async function openBulk(page: Page) {
  await page.getByRole('button', { name: 'AI tạo hàng loạt', exact: true }).click();
  const dialog = bulkDialog(page);
  await expect(dialog.getByRole('button', { name: 'Tạo bằng AI' })).toBeEnabled();
  return dialog;
}
export async function createBulkScene(page: Page, width: number) {
  await openBots(page);
  await page.setViewportSize({ width, height: 900 });
  await botTab(page, 'Kịch bản hội thoại');
  const dialog = await openBulk(page);
  const typeName = `Kết nối ${width}`;
  await dialog.getByRole('button', { name: '+ Thêm loại hội thoại' }).click();
  await dialog.getByLabel('Tên loại hội thoại').fill(typeName);
  await dialog
    .getByLabel('Định nghĩa hội thoại')
    .fill('Một persona hỏi kinh nghiệm; persona khác trao đổi và khép lại.');
  const creatingType = page.waitForResponse(
    (r) => r.url().endsWith('/bot/conversation-types') && r.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: 'Thêm', exact: true }).click();
  const typeResponse = await creatingType;
  expect(typeResponse.status()).toBe(201);
  const type = botConversationTypeSchema.parse(await typeResponse.json());
  await expect(dialog.getByRole('button', { name: typeName, exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const topic = `Hội thoại AI ${width}`;
  await dialog.getByLabel('Danh sách chủ đề (mỗi dòng 1 chủ đề)').fill(topic);
  await dialog.getByRole('button', { name: 'OPC Hà Nội', exact: true }).click();
  const admission = page.waitForResponse(
    (r) => r.url().endsWith('/bot/bulk-scripts') && r.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: 'Tạo bằng AI' }).click();
  const response = await admission;
  expect(response.status()).toBe(202);
  const batch = botBulkBatchSchema.parse(await response.json());
  expect(batch).toMatchObject({ total: 2, perTopic: 2, turns: 4, typeName, savedCount: 0 });
  return { batch, type, topic };
}
