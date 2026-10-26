import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../src/client';
import { testEnv } from './env';

/**
 * TIP-V4-611 (REQ-505, D-85, D-88): bảng onboarding sau migration `v4_onboarding` trên opchub_test —
 * cờ một lần / người / khoá, tiến độ 0..8, xoá thành viên xoá theo; index `messages(sender_id)`.
 */
const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 1 });
const U = 'mig-onb-user';

describe('migration Onboarding (TIP-V4-611)', () => {
  beforeAll(async () => {
    await db.$executeRawUnsafe(`DELETE FROM users WHERE id = '${U}'`);
    await db.$executeRawUnsafe(
      `INSERT INTO users (id, member_code, account_type, full_name, email, updated_at)
       VALUES ('${U}', 'TVMIG611', 'personal', 'Mig', 'mig611@test.opchub.vn', now())`,
    );
  });
  afterAll(async () => {
    await db.$executeRawUnsafe(`DELETE FROM users WHERE id = '${U}'`);
    await db.$disconnect();
  });

  it('cờ: khoá chính (user, key) — ghi lại không nhân bản; key ngoài enum bị chặn', async () => {
    const flag = (key: string) =>
      db.$executeRawUnsafe(
        `INSERT INTO onboarding_flags (user_id, key) VALUES ('${U}', '${key}')
         ON CONFLICT (user_id, key) DO NOTHING`,
      );
    expect(await flag('explore')).toBe(1);
    expect(await flag('explore')).toBe(0);
    await expect(flag('chat')).rejects.toThrow();
  });

  it('tiến độ 0..8; mail_kind có onboarding; index messages(sender_id)', async () => {
    const set = (n: number) =>
      db.$executeRawUnsafe(
        `INSERT INTO onboarding_progress (user_id, done) VALUES ('${U}', ${n})
         ON CONFLICT (user_id) DO UPDATE SET done = EXCLUDED.done`,
      );
    await set(8);
    await expect(set(9)).rejects.toThrow(/onboarding_progress_done_check/);
    await expect(set(-1)).rejects.toThrow(/onboarding_progress_done_check/);
    const kinds = await db.$queryRawUnsafe<{ v: string }[]>(
      `SELECT unnest(enum_range(NULL::mail_kind))::text AS v`,
    );
    expect(kinds.map((k) => k.v)).toContain('onboarding');
    const idx = await db.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT count(*) AS n FROM pg_indexes WHERE indexname = 'messages_sender_id_idx'`,
    );
    expect(Number(idx[0]?.n)).toBe(1);
  });

  it('xoá thành viên → xoá cờ, nhắc, tiến độ', async () => {
    await db.$executeRawUnsafe(
      `INSERT INTO onboarding_reminders (id, user_id, sent_by) VALUES ('mig-onb-r1', '${U}', 'adm')`,
    );
    await db.$executeRawUnsafe(`DELETE FROM users WHERE id = '${U}'`);
    const left = await db.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT (SELECT count(*) FROM onboarding_flags WHERE user_id = '${U}')
            + (SELECT count(*) FROM onboarding_reminders WHERE user_id = '${U}')
            + (SELECT count(*) FROM onboarding_progress WHERE user_id = '${U}') AS n`,
    );
    expect(Number(left[0]?.n)).toBe(0);
  });
});
