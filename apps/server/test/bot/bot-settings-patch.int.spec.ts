import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { botSettingsSchema } from '@opchub/shared/api-domains';
import { tokenOf } from '../factories/group.factory';
import { createUser } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('REQ-208 native partial settings preserve opted-out generation/replies', () => {
  let t: TestApp;
  let token: string;
  let original: ReturnType<typeof botSettingsSchema.parse>;
  beforeAll(async () => {
    t = await createTestApp();
    original = botSettingsSchema.parse(
      (await t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'bot' } })).value,
    );
    token = await tokenOf(
      t,
      await createUser(t, { adminPermissions: ['bots.view', 'bots.action'] }),
    );
  });
  beforeEach(async () => {
    await t.prisma.db.appSetting.update({
      where: { key: 'bot' },
      data: { value: { ...original, enabled: false, autoGenerate: false, replyToMembers: false } },
    });
  });
  afterAll(async () => {
    await t.prisma.db.appSetting.update({ where: { key: 'bot' }, data: { value: original } });
    await t.close();
  });

  it.each([{ enabled: true }, { topics: ['New topic'] }, { delayMinutes: 2 }])(
    'PATCH %j changes only supplied fields, in HTTP response and persisted settings',
    async (patch) => {
      const response = await t.call('/admin/bot/settings', { method: 'PATCH', token, json: patch });
      expect(response.status).toBe(200);
      const expected = {
        ...original,
        enabled: false,
        autoGenerate: false,
        replyToMembers: false,
        ...patch,
      };
      expect(botSettingsSchema.parse(await response.json())).toEqual(expected);
      const persisted = await t.prisma.db.appSetting.findUniqueOrThrow({ where: { key: 'bot' } });
      expect(botSettingsSchema.parse(persisted.value)).toEqual(expected);
    },
  );
});
