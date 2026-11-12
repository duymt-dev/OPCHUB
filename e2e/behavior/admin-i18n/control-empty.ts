import { aiCallsPageSchema } from '@opchub/shared/api-domains';
import { expect, openLocalized, type Page } from './fixtures';
import type { ControlLabels, ControlLocale } from './control-labels';

const day = (offset: number) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() + offset * 86400000));
export async function emptyControl(page: Page, locale: ControlLocale, labels: ControlLabels) {
  await openLocalized(page, '/settings?tab=llm#native-empty-control', locale);
  // Existing AI configuration card's call-log button opens the real AntD table drawer.
  const initial = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/v1/admin/settings/ai/calls' && r.ok(),
  );
  void initial.catch(() => undefined);
  await page.getByRole('button', { name: labels.ai.aiCalls.view, exact: true }).click();
  aiCallsPageSchema.parse(await (await initial).json());
  const drawer = page.getByRole('dialog', { name: labels.ai.aiCalls.title, exact: true });
  await expect(drawer).toBeVisible();
  const wait = () =>
    page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/v1/admin/settings/ai/calls' && r.ok(),
    );
  const to = day(14),
    from = day(1);
  const endResponse = wait();
  void endResponse.catch(() => undefined);
  await drawer.getByLabel(labels.ai.aiCalls.to, { exact: true }).fill(to);
  aiCallsPageSchema.parse(await (await endResponse).json());
  const startResponse = wait();
  void startResponse.catch(() => undefined);
  await drawer.getByLabel(labels.ai.aiCalls.from, { exact: true }).fill(from);
  const final = await startResponse;
  const data = aiCallsPageSchema.parse(await final.json());
  expect(data.items).toHaveLength(0);
  const query = new URL(final.url()).searchParams;
  expect(query.get('from')).toBe(new Date(`${from}T00:00:00+07:00`).toISOString());
  expect(query.get('to')).toBe(new Date(`${to}T23:59:59.999+07:00`).toISOString());
  await expect(drawer.locator('.ant-empty-description')).toHaveText(labels.calendar[3]);
  const close = drawer.getByRole('button', { name: labels.ui.close, exact: true });
  await close.focus();
  await page.keyboard.press('Enter');
  await expect(drawer).toBeHidden();
  expect(new URL(page.url()).hash).toBe('#native-empty-control');
}
