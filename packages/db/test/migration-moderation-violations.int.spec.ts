import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../src/client';
import { testEnv } from './env';

/**
 * TIP-V4-612 (REQ-507, D-77, D-83): sau migration `v4_moderation_violations` trên opchub_test —
 * một vi phạm / ca (UQ report_id), xoá người dùng / ca xoá theo; khoá có hạn + loại khoá;
 * index partial cho đếm 90 ngày và job tự mở khoá.
 */
const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 1 });
const U = 'mig-mod-user';

async function seed() {
  await db.$executeRawUnsafe(`DELETE FROM users WHERE id = '${U}'`);
  await db.$executeRawUnsafe(
    `INSERT INTO users (id, member_code, account_type, full_name, email, updated_at)
     VALUES ('${U}', 'TVMIG612', 'personal', 'Mig', 'mig612@test.opchub.vn', now())`,
  );
  await db.$executeRawUnsafe(
    `INSERT INTO groups (id, name, slug, province, region, updated_at)
     VALUES ('mig-mod-g', 'Mig', 'mig-mod-g', 'Mig tỉnh 612', 'north', now()) ON CONFLICT DO NOTHING`,
  );
  await db.$executeRawUnsafe(
    `INSERT INTO rooms (id, group_id, name, slug, is_default, updated_at)
     VALUES ('mig-mod-r', 'mig-mod-g', 'Chung', 'chung', true, now()) ON CONFLICT DO NOTHING`,
  );
  await db.$executeRawUnsafe(
    `INSERT INTO messages (id, room_id, sender_id, kind, body, updated_at)
     VALUES ('mig-mod-m', 'mig-mod-r', '${U}', 'text', 'x', now())`,
  );
  await db.$executeRawUnsafe(
    `INSERT INTO reports (id, message_id, source, reason, updated_at)
     VALUES ('mig-mod-rp', 'mig-mod-m', 'auto', 'other', now())`,
  );
}

describe('migration Kiểm duyệt vi phạm (TIP-V4-612)', () => {
  beforeAll(seed);
  afterAll(async () => {
    await db.$executeRawUnsafe(`DELETE FROM users WHERE id = '${U}'`);
    await db.$executeRawUnsafe(`DELETE FROM groups WHERE id = 'mig-mod-g'`);
    await db.$disconnect();
  });

  it('một vi phạm / ca; xoá ca → xoá vi phạm', async () => {
    const add = (id: string) =>
      db.$executeRawUnsafe(
        `INSERT INTO moderation_violations (id, user_id, report_id, message_id)
         VALUES ('${id}', '${U}', 'mig-mod-rp', 'mig-mod-m')`,
      );
    expect(await add('mig-v1')).toBe(1);
    await expect(add('mig-v2')).rejects.toThrow(/moderation_violations_report_id_key/);
    await db.$executeRawUnsafe(`DELETE FROM reports WHERE id = 'mig-mod-rp'`);
    const n = await db.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT count(*) AS n FROM moderation_violations WHERE user_id = '${U}'`,
    );
    expect(Number(n[0]?.n)).toBe(0);
  });

  it('users: locked_until + lock_kind (manual | auto); index partial', async () => {
    await db.$executeRawUnsafe(
      `UPDATE users SET status = 'locked', lock_kind = 'auto', locked_until = now() + interval '7 days'
       WHERE id = '${U}'`,
    );
    await expect(
      db.$executeRawUnsafe(`UPDATE users SET lock_kind = 'forever' WHERE id = '${U}'`),
    ).rejects.toThrow();
    const idx = await db.$queryRawUnsafe<{ indexname: string; indexdef: string }[]>(
      `SELECT indexname, indexdef FROM pg_indexes
       WHERE indexname IN ('moderation_violations_active', 'users_lock_expiry') ORDER BY indexname`,
    );
    expect(idx.map((i) => i.indexname)).toEqual([
      'moderation_violations_active',
      'users_lock_expiry',
    ]);
    expect(idx[0]?.indexdef).toContain('WHERE (revoked_at IS NULL)');
    expect(idx[1]?.indexdef).toContain('locked_until IS NOT NULL');
  });
});
