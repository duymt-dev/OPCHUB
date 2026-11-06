import { botThreadListSchema } from '@opchub/shared/api-domains';
import { expect, test } from '../llm/auto-test';
import { botTab, observedThread, prepareManualRun } from './helpers/bot-ui';

test.use({ botManual: true });

test('REQ-208 P5-PLAN-01 enabling topic generation admits a real opener-closes auto conversation', async ({
  page,
}) => {
  const manualRuns: string[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (request.method() === 'POST' && /\/admin\/scripts\/[^/]+\/run$/.test(path))
      manualRuns.push(path);
  });
  // Reuse actual participant form setup only; never issue a manual run command.
  await prepareManualRun(page, 'Tìm khách hàng đầu tiên');
  const topic = 'P5 automatic acceptance topic';
  const topics = page.getByRole('textbox', {
    name: 'Chủ đề để AI tự sinh hội thoại (cách nhau bằng dấu phẩy)',
  });
  await topics.fill(topic);
  await topics.press('Enter');
  const generation = page.getByRole('switch', { name: 'Tự sinh kịch bản từ chủ đề', exact: true });
  await expect(generation).toHaveAttribute('aria-checked', 'false');
  await expect(generation).toBeEnabled();
  await generation.click();
  await expect(generation).toHaveAttribute('aria-checked', 'true');
  await expect(generation).toBeEnabled();
  await botTab(page, 'Hội thoại');
  const observed = async () => {
    const response = await page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === '/v1/admin/bot/threads' &&
        r.request().method() === 'GET' &&
        r.status() === 200,
    );
    return botThreadListSchema
      .parse(await response.json())
      .items.find(
        (row) => row.kind === 'auto' && row.topic === topic && row.groupIds.includes('c3'),
      );
  };
  await expect.poll(async () => (await observed())?.cursor, { timeout: 35000 }).toBe(1);
  const thread = await observed();
  expect(thread).toMatchObject({
    scriptId: null,
    kind: 'auto',
    isAuto: true,
    status: 'running',
    cursor: 1,
    groupIds: ['c3'],
  });
  expect([3, 4]).toContain(thread?.total);
  const lines = thread?.lines ?? [];
  expect(lines[0]?.personaId).toBe(lines.at(-1)?.personaId);
  expect(lines[0]?.personaId).not.toBe(lines[1]?.personaId);
  expect(lines[0]?.body).toBe(`Mình chia sẻ thêm về chủ đề: ${topic}`);
  expect(lines.slice(1).every((line) => line.body === '')).toBe(true);
  expect(manualRuns).toEqual([]);
  const card = page
    .locator('div')
    .filter({ hasText: topic })
    .filter({ hasText: 'OPC Đà Nẵng' })
    .filter({ has: page.getByRole('button', { name: 'Dừng', exact: true }) })
    .last();
  await expect(
    card.getByText(`Đang chạy · lượt 1/${thread?.total}`, { exact: true }),
  ).toBeVisible();
  await card.getByRole('button', { name: 'Dừng', exact: true }).click();
  if (!thread) throw new Error('Missing automatic conversation');
  await expect.poll(async () => (await observedThread(page, thread.id))?.status).toBe('done');
});
