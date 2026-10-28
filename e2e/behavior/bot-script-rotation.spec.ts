import { botThreadListSchema, type BotThread } from '@opchub/shared/api-domains';
import { expect, test, type Page } from '../server/test';
import { prepareRotation } from './helpers/bot-rotation-scene';

test.use({ botManual: true });

/** Observe real UI polling; no request interception, synthetic clock or direct API calls. */
async function threads(page: Page): Promise<BotThread[]> {
  const response = await page.waitForResponse(
    (r) => r.url().endsWith('/bot/threads') && r.request().method() === 'GET' && r.status() === 200,
  );
  return botThreadListSchema.parse(await response.json()).items;
}

test('D-112 null-date scripts rotate A → B → A with persisted cursor after reload', async ({
  page,
}) => {
  // Two real 60-second turn intervals plus setup, polling and reload.
  test.setTimeout(240_000);
  const prepared = await prepareRotation(page);
  const [first, second] = prepared.scripts;
  if (!first || !second) throw new Error('Missing rotation scripts');
  await prepared.toggle('Chế độ tự động', true);
  let rows: BotThread[] = [];
  await expect
    .poll(
      async () => {
        rows = await threads(page);
        return rows.find((r) => r.scriptId === first.id)?.cursor;
      },
      { timeout: 30_000 },
    )
    .toBe(1);
  const original = rows.find((r) => r.scriptId === first.id);
  if (!original) throw new Error('Missing initial execution');
  expect(original).toMatchObject({ kind: 'script', status: 'running', total: 2, groupIds: ['c1'] });
  await page.reload();
  await expect
    .poll(
      async () => {
        rows = await threads(page);
        return rows.find((r) => r.scriptId === second.id)?.cursor;
      },
      { timeout: 90_000 },
    )
    .toBe(1);
  expect(rows.find((r) => r.id === original.id)).toMatchObject({ status: 'done', cursor: 2 });
  const following = rows.find((r) => r.scriptId === second.id);
  if (!following) throw new Error('Missing second execution');
  expect(Date.parse(following.createdAt) - Date.parse(original.createdAt)).toBeGreaterThanOrEqual(
    60_000,
  );
  await page.reload();
  await expect
    .poll(
      async () => {
        rows = await threads(page);
        return rows.find((r) => r.scriptId === first.id && r.id !== original.id)?.cursor;
      },
      { timeout: 90_000 },
    )
    .toBe(1);
  expect(rows.find((r) => r.id === following.id)).toMatchObject({ status: 'done', cursor: 2 });
  expect(rows.filter((r) => r.status !== 'done' && r.groupIds.includes('c1'))).toHaveLength(1);
  await prepared.toggle('Chế độ tự động', false);
});
