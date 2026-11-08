import { createHash } from 'node:crypto';
import {
  botThreadListSchema,
  chatMessagePageSchema,
  type BotThread,
} from '@opchub/shared/api-domains';
import { expect, test } from '../server/test';
import { PORTAL_URL } from '../urls';
import { botCard, botTab } from '../behavior/helpers/bot-ui';
import { prepareRealParticipants } from './participants';

test.use({ botManual: true });
const digest = (body: string) => createHash('sha256').update(body.trim()).digest('hex');
const generated = (body: string | undefined): string => {
  expect(body?.trim().length).toBeGreaterThan(0);
  expect(body).not.toMatch(/^Mình chia sẻ thêm về chủ đề:/);
  if (!body) throw new Error('No real-provider completion persisted');
  return body;
};

test('REQ-208 actual LocalLlm worker publishes one automatic opening without manual script/run', async ({
  page,
  context,
}) => {
  const prepared = await prepareRealParticipants(page);
  const topic = `P5 ${crypto.randomUUID()}: Gợi ý một cách sắp xếp công việc cá nhân. Trả lời thật ngắn.`;
  const topics = page.getByRole('textbox', {
    name: 'Chủ đề để AI tự sinh hội thoại (cách nhau bằng dấu phẩy)',
  });
  await topics.fill(topic);
  await topics.press('Enter');
  await prepared.toggle('Tự sinh kịch bản từ chủ đề', true);
  await prepared.toggle('Chế độ tự động', true);
  await botTab(page, 'Hội thoại');
  let execution: BotThread | undefined;
  await expect
    .poll(
      async () => {
        const response = await page.waitForResponse(
          (r) => new URL(r.url()).pathname === '/v1/admin/bot/threads' && r.status() === 200,
        );
        execution = botThreadListSchema
          .parse(await response.json())
          .items.find((t) => t.kind === 'auto' && t.topic === topic);
        return execution?.cursor;
      },
      { timeout: 150000 },
    )
    .toBe(1);
  await prepared.toggle('Tự sinh kịch bản từ chủ đề', false);
  expect(execution).toMatchObject({ scriptId: null, groupIds: ['c1'], cursor: 1, total: 3 });
  const body = generated(execution?.lines[0]?.body);
  expect(execution?.lines.slice(1).every((line) => line.body === '')).toBe(true);
  await botCard(page, topic, 'Dừng').getByRole('button', { name: 'Dừng', exact: true }).click();
  const member = await context.newPage();
  await member.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await member
    .locator('input[autocomplete=username], input[type=email]')
    .fill('an.nguyen@mediasoft.vn');
  await member.locator('input[type=password]').fill('User@2026');
  await member.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await member.waitForURL(/\/dashboard$/);
  // D-89 removed the Dashboard LIVE feed; published openings belong to the real group chat.
  await member.goto(`${PORTAL_URL}/chat/c1`);
  await expect
    .poll(() => member.getByText(body, { exact: true }).count(), { timeout: 20000 })
    .toBe(1);
  expect(await member.getByText(body, { exact: true }).isVisible()).toBe(true);
  await test.info().attach('real-opening-receipt', {
    body: JSON.stringify({ kind: 'auto', bodyDigest: digest(body), characters: body.length }),
    contentType: 'application/json',
  });
});

test('UAT-14 REQ-207 actual LocalLlm reply reaches the open member chat and survives F5', async ({
  page,
  context,
}) => {
  const prepared = await prepareRealParticipants(page);
  await prepared.toggle('Tự trả lời thành viên thật', true);
  await prepared.toggle('Chế độ tự động', true);
  await botTab(page, 'Hội thoại');
  const member = await context.newPage();
  await member.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await member
    .locator('input[autocomplete=username], input[type=email]')
    .fill('an.nguyen@mediasoft.vn');
  await member.locator('input[type=password]').fill('User@2026');
  await member.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await member.waitForURL(/\/dashboard$/);
  await member.goto(`${PORTAL_URL}/chat/c1`);
  const question = `P5 ${crypto.randomUUID()}: Cho tôi một mẹo quản lý thời gian ngắn gọn?`;
  await member.getByPlaceholder(/^Nhắn tin trong #/).fill(question);
  await member.getByPlaceholder(/^Nhắn tin trong #/).press('Enter');
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
          .items.find((t) => t.kind === 'reply' && t.topic === question);
        return execution?.status;
      },
      { timeout: 390000 },
    )
    .toBe('done');
  const body = generated(execution?.lines[0]?.body);
  await expect(member.getByText(body, { exact: true })).toBeVisible({ timeout: 20000 });
  await prepared.toggle('Tự trả lời thành viên thật', false);
  const history = member.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/rooms/c1-general/messages' && r.status() === 200,
  );
  await member.reload();
  const raw: unknown = await (await history).json();
  const message = chatMessagePageSchema.parse(raw).items.find((row) => row.body === body);
  expect(message?.replyTo?.text).toBe(question);
  expect(message?.senderId).toBeNull();
  expect(JSON.stringify(raw)).not.toContain('"isSimulated"');
  await expect(member.getByText(body, { exact: true })).toBeVisible();
  await test.info().attach('real-reply-receipt', {
    body: JSON.stringify({
      kind: 'reply',
      bodyDigest: digest(body),
      characters: body.length,
      messageId: message?.id,
    }),
    contentType: 'application/json',
  });
});
