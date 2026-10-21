import { botThreadStoppedSchema, scriptRunSchema } from '@opchub/shared/api-domains';
import { expect, test } from '../server/test';
import { botCard, botTab, observedThread, prepareManualRun } from './helpers/bot-ui';

test('UAT-15 REQ-208 D-50 manual schedule posts without approval; Stop prevents next turn', async ({
  page,
}) => {
  test.setTimeout(180_000);
  const topic = 'Tìm khách hàng đầu tiên';
  const script = await prepareManualRun(page, topic);
  const admission = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === `/v1/admin/scripts/${script.id}/run` &&
      response.request().method() === 'POST',
  );
  await botCard(page, topic, 'Chạy ngay').getByRole('button', { name: 'Chạy ngay' }).click();
  const response = await admission;
  expect(response.status()).toBe(202);
  const run = scriptRunSchema.parse(await response.json());
  expect(['scheduled', 'running']).toContain(run.status);
  await expect(
    botCard(page, topic, 'Chạy ngay').getByText('2 lần chạy', { exact: true }),
  ).toBeVisible();
  await botTab(page, 'Hội thoại');
  await expect(page.getByRole('button', { name: 'Duyệt & đăng' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Bỏ', exact: true })).toHaveCount(0);
  await expect
    .poll(async () => (await observedThread(page, run.threadId))?.cursor, { timeout: 35_000 })
    .toBe(1);
  const running = await observedThread(page, run.threadId);
  expect(running).toMatchObject({
    id: run.threadId,
    scriptId: script.id,
    status: 'running',
    cursor: 1,
    total: script.lines.length,
    kind: 'script',
  });
  expect(running?.lines.map(({ personaId, body }) => ({ personaId, body }))).toEqual(script.lines);
  expect(running?.groupNames).toEqual(['OPC Đà Nẵng']);
  const thread = botCard(page, topic, 'Dừng');
  await expect(
    thread.getByText(`Đang chạy · lượt 1/${script.lines.length}`, { exact: true }),
  ).toBeVisible();
  const stopping = page.waitForResponse(
    (reply) =>
      new URL(reply.url()).pathname === `/v1/admin/bot/threads/${run.threadId}/stop` &&
      reply.request().method() === 'POST',
  );
  await thread.getByRole('button', { name: 'Dừng', exact: true }).click();
  const stopped = await stopping;
  expect(stopped.status()).toBe(200);
  expect(botThreadStoppedSchema.parse(await stopped.json())).toEqual({
    id: run.threadId,
    status: 'done',
  });
  await expect.poll(async () => (await observedThread(page, run.threadId))?.status).toBe('done');
  // Past the one-minute next-turn deadline, using wall time in BOTH lanes.
  await page.waitForTimeout(65_000);
  expect(await observedThread(page, run.threadId)).toMatchObject({
    status: 'done',
    cursor: 1,
    nextAt: null,
  });
  await expect(
    page.getByText(`Hoàn tất · lượt 1/${script.lines.length}`, { exact: true }),
  ).toBeVisible();
  await botTab(page, 'Nhật ký tự động');
  await expect(
    page.getByText(`Đã đăng lượt 1/${script.lines.length}: ${topic}`, { exact: true }),
  ).toBeVisible();
});
