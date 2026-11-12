import { adminLoginResponseSchema } from '@opchub/shared/api';
import { test, expect, openEnglish } from './admin-i18n/fixtures';
import { chatGroups, chatRooms, chatMessages, rawMessages } from './admin-i18n/chat';
import { selectLocale, assertViewport } from './admin-i18n/navigation';
import { englishChrome } from './admin-i18n/chrome';
import { waitApi } from './admin-i18n-values/api';
import en from '../../apps/admin/messages/en/groups.json' with { type: 'json' };
import vi from '../../apps/admin/messages/vi/groups.json' with { type: 'json' };
import enMeta from '../../apps/admin/messages/en/meta.json' with { type: 'json' };
import viMeta from '../../apps/admin/messages/vi/meta.json' with { type: 'json' };
import { ADMIN_URL } from '../urls';

for (const width of [1440, 390]) {
  test(`D-141 AC824-06/11/12/15 read-only raw group chat populated and empty ${width}`, async ({
    page,
    guard,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const login = waitApi(page, 'auth/login');
    await openEnglish(page, '/groups');
    const session = adminLoginResponseSchema.parse(await (await login).json());
    const groups = await chatGroups(page, session.accessToken);
    for (const state of ['populated', 'empty'] as const) {
      const group = groups[state];
      const rooms = await chatRooms(page, session.accessToken, group.id);
      expect(rooms.length).toBeGreaterThan(0);
      await guard.settle();
      await page.goto(`${ADMIN_URL}/groups/${encodeURIComponent(group.id)}/chat?i18n=raw#rooms`, {
        waitUntil: 'networkidle',
      });
      let seen = 0;
      for (const room of rooms) {
        const messages = await chatMessages(page, session.accessToken, room.id);
        expect(messages.every((m) => m.roomId === room.id)).toBe(true);
        seen += messages.length;
        const nav = page.getByRole('navigation', { name: en.chat.rooms, exact: true });
        await expect(nav.getByRole('button')).toHaveCount(rooms.length);
        const button = nav.getByRole('button', { name: `# ${room.name}`, exact: true });
        await button.click();
        await expect(button).toHaveAttribute('aria-current', 'true');
        await page.waitForLoadState('networkidle');
        await rawMessages(page, messages, en.chat.empty);
        for (const [locale, labels, meta] of [
          ['vi', vi, viMeta],
          ['en', en, enMeta],
        ] as const) {
          await selectLocale(page, locale);
          await expect(page).toHaveTitle(`${meta.chat} · OPC Hub Admin`);
          await expect(
            page.getByRole('heading', {
              level: 1,
              name: labels.chat.title.replace('{name}', group.name),
              exact: true,
            }),
          ).toBeVisible();
          await expect(page.getByText(labels.chat.readonly, { exact: true })).toBeVisible();
          const current = page.getByRole('navigation', { name: labels.chat.rooms, exact: true });
          await expect(current.getByRole('button')).toHaveCount(rooms.length);
          await expect(
            current.getByRole('button', { name: `# ${room.name}`, exact: true }),
          ).toHaveAttribute('aria-current', 'true');
          await expect(
            current.locator('..').locator('input,textarea,[contenteditable=true]'),
          ).toHaveCount(0);
          await rawMessages(page, messages, labels.chat.empty);
          await guard.settle();
          if (locale === 'en') await englishChrome(page, guard);
          await assertViewport(page);
        }
      }
      if (state === 'populated')
        expect(seen, 'Loaded state must contain actual messages').toBeGreaterThan(0);
      else
        expect(seen, 'Empty-state seed prerequisite is real, never an intercepted response').toBe(
          0,
        );
      await page.getByRole('link', { name: en.chat.back, exact: true }).click();
      await expect(page).toHaveURL(`${ADMIN_URL}/groups`);
      process.stdout.write(
        `Read-only chat receipt: ${JSON.stringify({ width, state, groupId: group.id, rooms: rooms.length, messages: seen })}\n`,
      );
    }
  });
}
