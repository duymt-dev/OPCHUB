import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../src/client';
import { testEnv } from './env';

/**
 * TIP-V4-603 (D-71): chạy migration `v4_group_join_instant` trên schema tạm có cấu trúc trước V4
 * (cùng DB test, `search_path` trỏ vào schema tạm) — kiểm dữ liệu sau chuyển đổi.
 */
const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 1 });
const S = 'mig_v4_603';
const SQL = readFileSync(
  join(__dirname, '../prisma/migrations/20261023140000_v4_group_join_instant/migration.sql'),
  'utf8',
);

/** Tách câu lệnh (migration không có `;` bên trong câu), bỏ dòng chú thích */
const statements = (sql: string) =>
  sql
    .split(/;\s*\n/)
    .map((s) =>
      s
        .split('\n')
        .filter((l) => !l.trim().startsWith('--'))
        .join('\n')
        .trim(),
    )
    .filter(Boolean);

const BEFORE = [
  `CREATE SCHEMA ${S}`,
  `CREATE TYPE ${S}.group_join_mode AS ENUM ('open', 'approval')`,
  `CREATE TYPE ${S}.group_member_status AS ENUM ('pending', 'member', 'rejected', 'cancelled', 'left', 'removed')`,
  `CREATE TABLE ${S}.groups (id text PRIMARY KEY, member_count int NOT NULL DEFAULT 0,
     join_mode ${S}.group_join_mode NOT NULL DEFAULT 'approval', updated_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE ${S}.group_members (group_id text NOT NULL, user_id text NOT NULL,
     status ${S}.group_member_status NOT NULL DEFAULT 'pending', decided_at timestamptz,
     created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
     PRIMARY KEY (group_id, user_id))`,
  `CREATE INDEX group_members_pending ON ${S}.group_members (group_id, created_at DESC) WHERE status = 'pending'`,
  `CREATE TABLE ${S}.membership_fees (user_id text PRIMARY KEY, status text NOT NULL, valid_until timestamptz)`,
  `CREATE TABLE ${S}.outbox_events (id bigserial PRIMARY KEY, type text NOT NULL, payload jsonb NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now())`,
  `INSERT INTO ${S}.groups (id, member_count) VALUES ('g1', 10), ('g2', 3)`,
  // u-paid còn hạn, u-exp hết hạn theo valid_until, u-unpaid chưa đóng, u-old đã là thành viên
  `INSERT INTO ${S}.membership_fees VALUES
     ('u-paid', 'active', now() + interval '30 days'),
     ('u-soon', 'expiring', now() + interval '3 days'),
     ('u-exp', 'active', now() - interval '1 day'),
     ('u-unpaid', 'pending_payment', NULL),
     ('u-old', 'active', now() + interval '1 year')`,
  `INSERT INTO ${S}.group_members (group_id, user_id, status) VALUES
     ('g1', 'u-paid', 'pending'), ('g2', 'u-paid', 'pending'),
     ('g1', 'u-soon', 'pending'),
     ('g1', 'u-exp', 'pending'),
     ('g1', 'u-unpaid', 'pending'),
     ('g1', 'u-old', 'member'),
     ('g2', 'u-old', 'rejected'),
     ('g2', 'u-unpaid', 'cancelled')`,
];

describe('migration D-71 vào nhóm ngay (TIP-V4-603)', () => {
  beforeAll(async () => {
    await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${S} CASCADE`);
    for (const s of BEFORE) await db.$executeRawUnsafe(s);
    await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO ${S}`);
      for (const s of statements(SQL)) await tx.$executeRawUnsafe(s);
    });
  });
  afterAll(async () => {
    await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${S} CASCADE`);
    await db.$disconnect();
  });

  const rows = () =>
    db.$queryRawUnsafe<{ group_id: string; user_id: string; status: string }[]>(
      `SELECT group_id, user_id, status::text FROM ${S}.group_members ORDER BY group_id, user_id`,
    );

  it('chờ duyệt + còn phí → member; chưa đóng / hết hạn → xoá; rejected/cancelled → left', async () => {
    expect(await rows()).toEqual([
      { group_id: 'g1', user_id: 'u-old', status: 'member' },
      { group_id: 'g1', user_id: 'u-paid', status: 'member' },
      { group_id: 'g1', user_id: 'u-soon', status: 'member' },
      { group_id: 'g2', user_id: 'u-old', status: 'left' },
      { group_id: 'g2', user_id: 'u-paid', status: 'member' },
      { group_id: 'g2', user_id: 'u-unpaid', status: 'left' },
    ]);
  });

  it('member_count cộng đúng số người được tự duyệt; outbox group.joined mỗi cặp', async () => {
    const groups = await db.$queryRawUnsafe<{ id: string; member_count: number }[]>(
      `SELECT id, member_count FROM ${S}.groups ORDER BY id`,
    );
    expect(groups).toEqual([
      { id: 'g1', member_count: 12 },
      { id: 'g2', member_count: 4 },
    ]);
    const ev = await db.$queryRawUnsafe<{ type: string; payload: unknown }[]>(
      `SELECT type, payload FROM ${S}.outbox_events ORDER BY payload->>'groupId', payload->>'userId'`,
    );
    expect(ev).toEqual([
      { type: 'group.joined', payload: { groupId: 'g1', userId: 'u-paid' } },
      { type: 'group.joined', payload: { groupId: 'g1', userId: 'u-soon' } },
      { type: 'group.joined', payload: { groupId: 'g2', userId: 'u-paid' } },
    ]);
  });

  it('enum chỉ còn member/left/removed; bỏ join_mode, enum group_join_mode, index pending', async () => {
    const labels = await db.$queryRawUnsafe<{ l: string }[]>(
      `SELECT e.enumlabel AS l FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
       JOIN pg_namespace n ON n.oid = t.typnamespace
       WHERE n.nspname = '${S}' AND t.typname = 'group_member_status' ORDER BY e.enumsortorder`,
    );
    expect(labels.map((x) => x.l)).toEqual(['member', 'left', 'removed']);
    const left = await db.$queryRawUnsafe<{ n: number }[]>(
      `SELECT (
         (SELECT count(*) FROM information_schema.columns
          WHERE table_schema = '${S}' AND table_name = 'groups' AND column_name = 'join_mode')
       + (SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = '${S}' AND t.typname IN ('group_join_mode', 'group_member_status_old'))
       + (SELECT count(*) FROM pg_indexes WHERE schemaname = '${S}' AND indexname = 'group_members_pending')
       )::int AS n`,
    );
    expect(left[0]?.n).toBe(0);
  });
});
