import { randomUUID } from 'node:crypto';
import {
  botSettingsSchema,
  botThreadListSchema,
  chatMessagePageSchema,
  dashboardLiveSchema,
  type BotThread,
} from '@opchub/shared/api-domains';
import { expect, test, type Page } from '../server/test';
import { PORTAL_URL } from '../urls';
import { botTab } from './helpers/bot-ui';
import { prepareReplyParticipants } from './helpers/bot-participants';

test.use({ botManual: true });
const threads = async (page: Page) => {
  const response = await page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/admin/bot/threads' && r.status() === 200,
  );
  return botThreadListSchema.parse(await response.json()).items;
};
const dueAt = (thread: BotThread) => {
  if (!thread.nextAt) throw new Error('Missing next-turn deadline');
  return Date.parse(thread.nextAt);
};
const history = (page: Page) =>
  page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/rooms/c1-general/messages' && r.status() === 200,
  );

test('UAT-15 REQ-208 REQ-411 P5-PLAN-01 full automatic three-turn conversation closes with its opener and persists on Dashboard', async ({
  page,
  context,
}) => {
  test.setTimeout(900000);
  const manualRuns: string[] = [];
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      /\/admin\/scripts\/[^/]+\/run$/.test(new URL(request.url()).pathname)
    )
      manualRuns.push(request.url());
  });
  const settings = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/admin/bot/settings' && r.status() === 200,
  );
  const prepared = await prepareReplyParticipants(page);
  expect(botSettingsSchema.parse(await (await settings).json()).delayMinutes).toBe(5);
  const topic = `P5 automatic lifecycle ${randomUUID()}`;
  const input = page.getByRole('textbox', {
    name: 'Chủ đề để AI tự sinh hội thoại (cách nhau bằng dấu phẩy)',
  });
  await input.fill(topic);
  await input.press('Enter');
  await prepared.toggle('Tự sinh kịch bản từ chủ đề', true);
  await prepared.toggle('Chế độ tự động', true);
  await botTab(page, 'Hội thoại');
  let first: BotThread | undefined;
  await expect
    .poll(
      async () => {
        first = (await threads(page)).find((row) => row.kind === 'auto' && row.topic === topic);
        return first?.cursor;
      },
      { timeout: 60000 },
    )
    .toBe(1);
  if (!first) throw new Error('Missing actual automatic conversation');
  const id = first.id;
  expect(first).toMatchObject({ scriptId: null, groupIds: ['c1'], status: 'running', total: 3 });
  expect(first.lines[0]?.personaId).toBe(first.lines[2]?.personaId);
  expect(first.lines[0]?.personaId).not.toBe(first.lines[1]?.personaId);
  const body = `Mình chia sẻ thêm về chủ đề: ${topic}`;
  expect(first.lines[0]?.body).toBe(body);
  expect(first.lines.slice(1).every((line) => line.body === '')).toBe(true);
  const firstDue = dueAt(first);
  // Stop new admission, not the execution being accepted.
  await prepared.toggle('Tự sinh kịch bản từ chủ đề', false);

  const member = await context.newPage();
  await member.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await member.locator('input[type=email]').fill('an.nguyen@mediasoft.vn');
  await member.locator('input[type=password]').fill('User@2026');
  await member.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await member.waitForURL(/\/dashboard$/);
  const card = member.getByRole('article').filter({ hasText: body });
  await expect(card).toHaveCount(1, { timeout: 20000 });
  await expect(card.getByText(body, { exact: true })).toBeVisible();
  const openingHistory = history(member);
  await card.getByRole('button', { name: 'Tham gia thảo luận →' }).click();
  await expect(member).toHaveURL(/\/chat\/c1$/);
  const opening = chatMessagePageSchema
    .parse(await (await openingHistory).json())
    .items.filter((row) => row.body === body);
  expect(opening).toHaveLength(1);
  expect(firstDue - Date.parse(opening[0]?.createdAt ?? '')).toBe(300000);
  await expect(member.getByText(body, { exact: true })).toHaveCount(1);

  let second: BotThread | undefined;
  await expect
    .poll(
      async () => {
        second = (await threads(page)).find((row) => row.id === id);
        return second?.cursor;
      },
      { timeout: 350000 },
    )
    .toBe(2);
  if (!second) throw new Error('Missing second turn');
  expect(second.status).toBe('running');
  expect(second.lines[1]?.body).toBe(body);
  expect(second.lines[2]?.body).toBe('');
  const secondDue = dueAt(second);
  await expect(member.getByText(body, { exact: true })).toHaveCount(2, { timeout: 20000 });

  let finished: BotThread | undefined;
  await expect
    .poll(
      async () => {
        finished = (await threads(page)).find((row) => row.id === id);
        return finished?.status;
      },
      { timeout: 350000 },
    )
    .toBe('done');
  expect(finished).toMatchObject({ cursor: 3, total: 3, nextAt: null });
  expect(finished?.lines.map((line) => line.body)).toEqual([body, body, body]);
  await expect(member.getByText(body, { exact: true })).toHaveCount(3, { timeout: 20000 });
  const refreshed = history(member);
  await member.reload();
  const raw: unknown = await (await refreshed).json();
  const messages = chatMessagePageSchema
    .parse(raw)
    .items.filter((row) => row.body === body)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  expect(messages).toHaveLength(3);
  expect(new Set(messages.map((row) => row.id)).size).toBe(3);
  expect(messages.every((row) => row.senderId === null && row.roomId === 'c1-general')).toBe(true);
  expect(messages.map((row) => row.sender.name)).toEqual(finished?.lines.map((line) => line.name));
  expect(messages[0]?.id).toBe(opening[0]?.id);
  expect(Date.parse(messages[1]?.createdAt ?? '')).toBeGreaterThanOrEqual(firstDue);
  expect(secondDue - Date.parse(messages[1]?.createdAt ?? '')).toBe(300000);
  expect(Date.parse(messages[2]?.createdAt ?? '')).toBeGreaterThanOrEqual(secondDue);
  expect(JSON.stringify(raw)).not.toContain('"isSimulated"');
  expect(JSON.stringify(raw)).not.toContain('"personaId"');
  await expect(member.getByText(body, { exact: true })).toHaveCount(3);
  await member.locator('aside').getByText('Dashboard', { exact: true }).click();
  await expect(card).toHaveCount(1, { timeout: 20000 });
  const feed = member.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/dashboard/live' && r.status() === 200,
  );
  await member.reload();
  const actual = dashboardLiveSchema
    .parse(await (await feed).json())
    .threads.find((row) => row.id === messages[0]?.id);
  expect(actual).toMatchObject({ groupId: 'c1', body, replyCount: 2 });
  // Dashboard preview is the first response; closing speaker is checked in the complete chat above.
  expect(actual?.reply?.name).toBe(finished?.lines[1]?.name);
  expect(actual?.reply?.body).toBe(body);
  await expect(card).toHaveCount(1);
  await expect(card.getByText(body, { exact: true }).first()).toBeVisible();
  expect(manualRuns).toEqual([]);
});
