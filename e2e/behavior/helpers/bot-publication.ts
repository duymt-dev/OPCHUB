import { scriptRunSchema, scriptSchema } from '@opchub/shared/api-domains';
import { expect, type Page } from '../../server/test';
import { botCard, botTab, observedThread, prepareManualRun } from './bot-ui';

/** Actual UI publication, same worker/API assertions on both lanes, no synthetic feed row. */
export async function publishDashboardOpening(admin: Page) {
  const topic = 'Thuế cho người mới lập OPC';
  const script = await prepareManualRun(admin, topic);
  const body = `P5 Dashboard opening ${crypto.randomUUID()}`;
  await botCard(admin, topic, 'Sửa').getByRole('button', { name: 'Sửa' }).click();
  const drawer = admin.getByRole('dialog', { name: 'Kịch bản hội thoại', exact: true });
  await drawer.getByLabel('Nội dung lượt 1').fill(body);
  const updated = admin.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === `/v1/admin/scripts/${script.id}` &&
      r.request().method() === 'PATCH',
  );
  await drawer.getByRole('button', { name: 'Lưu kịch bản' }).click();
  const saved = await updated;
  expect(saved.status()).toBe(200);
  expect(scriptSchema.parse(await saved.json()).lines[0]?.body).toBe(body);
  await expect(drawer).toHaveCount(0);
  const admitted = admin.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === `/v1/admin/scripts/${script.id}/run` &&
      r.request().method() === 'POST',
  );
  await botCard(admin, topic, 'Chạy ngay').getByRole('button', { name: 'Chạy ngay' }).click();
  const response = await admitted;
  expect(response.status()).toBe(202);
  const run = scriptRunSchema.parse(await response.json());
  await botTab(admin, 'Hội thoại');
  await expect
    .poll(async () => (await observedThread(admin, run.threadId))?.cursor, { timeout: 35000 })
    .toBe(1);
  const thread = await observedThread(admin, run.threadId);
  expect(thread).toMatchObject({
    scriptId: script.id,
    kind: 'script',
    status: 'running',
    cursor: 1,
  });
  expect(thread?.lines[0]?.body).toBe(body);
  const stopping = admin.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === `/v1/admin/bot/threads/${run.threadId}/stop` &&
      r.request().method() === 'POST',
  );
  await botCard(admin, topic, 'Dừng').getByRole('button', { name: 'Dừng', exact: true }).click();
  expect((await stopping).status()).toBe(200);
  if (!thread) throw new Error('Missing actual publication execution');
  return { body, admittedAt: thread.createdAt, groupId: 'c1' };
}
