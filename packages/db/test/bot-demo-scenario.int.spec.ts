import { afterAll, describe, expect, it } from 'vitest';
import { botSettingsSchema } from '@opchub/shared/api-domains';
import { createPrismaClient } from '../src/client';
import { assertDemoDatabase } from '../seed/demo/guard';
import { seedDemo } from '../seed/demo/index';
import { testEnv } from './env';

if (!['opchub_test', 'opchub_v46_801_test'].includes(assertDemoDatabase(testEnv.TEST_DATABASE_URL)))
  throw new Error('Bot fixture integration requires opchub_test');
const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 2 });

afterAll(async () => {
  await seedDemo(db);
  await db.$disconnect();
});

const settings = async () =>
  botSettingsSchema.parse(
    (await db.appSetting.findUniqueOrThrow({ where: { key: 'bot' }, select: { value: true } }))
      .value,
  );

describe('REQ-208 explicit native manual-only demo scenario', () => {
  it('commits the disabled generation precondition with the ordinary catalogs and thread history', async () => {
    await seedDemo(db);
    const normal = await settings();
    expect(normal.autoGenerate).toBe(true);
    await seedDemo(db, { botManual: true });
    expect(await settings()).toEqual({ ...normal, autoGenerate: false });
    expect(await db.persona.count()).toBe(6);
    expect(await db.botScript.count()).toBe(3);
    expect(await db.botThread.count()).toBe(3);
    await seedDemo(db, { botManual: true });
    expect((await settings()).autoGenerate).toBe(false);
    expect(await db.botThread.count()).toBe(3);
  });

  it('ordinary demo restores automatic generation instead of globally hiding runtime work', async () => {
    await seedDemo(db, { botManual: true });
    await seedDemo(db);
    expect((await settings()).autoGenerate).toBe(true);
    expect(await db.botThread.count({ where: { kind: 'auto' } })).toBe(0);
  });
});
