import { randomUUID } from 'node:crypto';
import {
  botThreadListSchema,
  chatMessagePageSchema,
  type BotThread,
} from '@opchub/shared/api-domains';
import { expect, test } from '../server/test';
import { PORTAL_URL } from '../urls';
import { botTab } from './helpers/bot-ui';
import { prepareReplyParticipants } from './helpers/bot-participants';

test.use({ botManual: true });

test('UAT-14 REQ-060 REQ-411 FakeLlm reply reaches the open member chat with its quote and survives F5', async ({
  page,
  context,
}) => {
  test.setTimeout(420000);
  const prepared = await prepareReplyParticipants(page);
  await prepared.toggle('Tự trả lời thành viên thật', true);
  await prepared.toggle('Chế độ tự động', true);
  await botTab(page, 'Hội thoại');
  const member = await context.newPage();
  await member.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await member.locator('input[type=email]').fill('an.nguyen@mediasoft.vn');
  await member.locator('input[type=password]').fill('User@2026');
  await member.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await member.waitForURL(/\/dashboard$/);
  await member.goto(`${PORTAL_URL}/chat/c1`);
  const question = `P5 member reply ${randomUUID()}`;
  const composer = member.getByPlaceholder(/^Nhắn tin trong #/);
  await composer.fill(question);
  await composer.press('Enter');
  await expect(member.getByText(question, { exact: true })).toBeVisible();
  let execution: BotThread | undefined;
  await expect
    .poll(
      async () => {
        const response = await page.waitForResponse(
          (r) => new URL(r.url()).pathname === '/v1/admin/bot/threads' && r.status() === 200,
        );
        execution = botThreadListSchema
          .parse(await response.json())
          .items.find((row) => row.kind === 'reply' && row.topic === question);
        return execution?.status;
      },
      { timeout: 390000 },
    )
    .toBe('done');
  const body = `Mình chia sẻ thêm về chủ đề: ${question}`;
  expect(execution).toMatchObject({ groupIds: ['c1'], cursor: 1, total: 1 });
  expect(execution?.lines[0]?.body).toBe(body);
  // Must arrive before any F5/history request triggered by this test.
  await expect(member.getByText(body, { exact: true })).toBeVisible({ timeout: 20000 });
  await prepared.toggle('Tự trả lời thành viên thật', false);
  const history = member.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/rooms/c1-general/messages' && r.status() === 200,
  );
  await member.reload();
  const raw: unknown = await (await history).json();
  const replies = chatMessagePageSchema.parse(raw).items.filter((row) => row.body === body);
  expect(replies).toHaveLength(1);
  expect(replies[0]?.replyTo?.text).toBe(question);
  expect(replies[0]?.senderId).toBeNull();
  expect(JSON.stringify(raw)).not.toContain('"isSimulated"');
  expect(JSON.stringify(raw)).not.toContain('"personaId"');
  await expect(member.getByText(body, { exact: true })).toBeVisible();
});
