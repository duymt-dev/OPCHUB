import { z } from 'zod';
import { pageSchema } from '@opchub/shared/api';
import {
  cursorPageSchema,
  groupItemSchema,
  messageSchema,
  roomSchema,
} from '@opchub/shared/api-domains';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** Existing authenticated GET only; actual typed payload is the independent display oracle. */
export async function getChat(page: Page, token: string, path: string) {
  const result = await page.evaluate(
    async ({ token, path }) => {
      const r = await fetch(`/v1/${path}`, { headers: { Authorization: `Bearer ${token}` } });
      return { status: r.status, body: (await r.json()) as unknown };
    },
    { token, path },
  );
  expect(result.status, `Actual read-only prerequisite ${path}`).toBe(200);
  return result.body;
}

export async function chatGroups(page: Page, token: string) {
  const groups = pageSchema(groupItemSchema).parse(
    await getChat(page, token, 'admin/groups?page=1&size=100'),
  );
  const populated = groups.items.find((g) => g.kind === 'province' && g.province === 'Hà Nội');
  const empty = groups.items.find(
    (g) => g.kind === 'industry' && g.name === 'OPC Hà Nội – Công nghệ & AI',
  );
  if (!populated || !empty)
    throw new Error('Original seeded province/industry chat prerequisites absent');
  return { populated, empty };
}

export const chatRooms = async (page: Page, token: string, id: string) =>
  z
    .object({ items: z.array(roomSchema) })
    .parse(await getChat(page, token, `groups/${encodeURIComponent(id)}/rooms`)).items;

export const chatMessages = async (page: Page, token: string, id: string) =>
  cursorPageSchema(messageSchema).parse(
    await getChat(page, token, `rooms/${encodeURIComponent(id)}/messages?size=50`),
  ).items;

export async function rawMessages(
  page: Page,
  messages: z.infer<typeof messageSchema>[],
  emptyLabel: string,
) {
  const rows = page.locator('ol > li');
  await expect(rows).toHaveCount(messages.length);
  if (!messages.length) await expect(page.getByText(emptyLabel, { exact: true })).toBeVisible();
  for (const [index, message] of [...messages].reverse().entries()) {
    const row = rows.nth(index);
    await expect(row.locator('b')).toHaveText(message.sender.name);
    if (message.body) await expect(row.locator(':scope > div').nth(1)).toHaveText(message.body);
    if (message.attachment)
      await expect(row).toContainText(`📎 ${message.attachment.name} · ${message.attachment.size}`);
  }
}
