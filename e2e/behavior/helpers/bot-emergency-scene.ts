import { randomUUID } from 'node:crypto';
import { botThreadListSchema, type BotThread } from '@opchub/shared/api-domains';
import type { BrowserContext } from '@playwright/test';
import { expect, type Page } from '../../server/test';
import { PORTAL_URL } from '../../urls';
import { prepareReplyParticipants } from './bot-participants';
import { botTab } from './bot-ui';

export async function emergencyScene(admin: Page, context: BrowserContext) {
  const prepared = await prepareReplyParticipants(admin);
  const topic = `P5 emergency ${randomUUID()}`;
  const input = admin.getByRole('textbox', {
    name: 'Chủ đề để AI tự sinh hội thoại (cách nhau bằng dấu phẩy)',
  });
  await input.fill(topic);
  await input.press('Enter');
  await prepared.toggle('Tự sinh kịch bản từ chủ đề', true);
  await prepared.toggle('Chế độ tự động', true);
  await botTab(admin, 'Hội thoại');
  let first: BotThread | undefined;
  await expect
    .poll(
      async () => {
        const response = await admin.waitForResponse(
          (r) => new URL(r.url()).pathname === '/v1/admin/bot/threads' && r.status() === 200,
        );
        first = botThreadListSchema
          .parse(await response.json())
          .items.find((row) => row.kind === 'auto' && row.topic === topic);
        return first?.cursor;
      },
      { timeout: 60000 },
    )
    .toBe(1);
  if (!first?.nextAt) throw new Error('Missing running thread deadline');
  expect(first).toMatchObject({ status: 'running', groupIds: ['c1'], total: 3 });
  await prepared.toggle('Tự sinh kịch bản từ chủ đề', false);
  const member = await context.newPage();
  await member.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await member
    .locator('input[autocomplete=username], input[type=email]')
    .fill('an.nguyen@mediasoft.vn');
  await member.locator('input[type=password]').fill('User@2026');
  await member.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await member.waitForURL(/\/dashboard$/);
  const body = `Mình chia sẻ thêm về chủ đề: ${topic}`;
  // D-89 Dashboard v4 không còn khối tin LIVE (V4-618) → kiểm tin bot trong chat nhóm
  await member.goto(`${PORTAL_URL}/chat/c1`);
  await expect(member.getByText(body, { exact: true })).toHaveCount(1, { timeout: 20000 });
  const human = `P5 keep human ${randomUUID()}`;
  const composer = member.getByPlaceholder(/^Nhắn tin trong #/);
  await composer.fill(human);
  await composer.press('Enter');
  await expect(member.getByText(human, { exact: true })).toBeVisible();
  return { first, body, human, member };
}
