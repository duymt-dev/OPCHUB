import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../src/client';
import { testEnv } from './env';

/**
 * TIP-V42-710 (D-114 S3): migration `v42_store_builder` trên schema tạm có cấu trúc trước V4.2 —
 * TK Doanh nghiệp trial / còn phí chưa có gian hàng → gian hàng Nháp `auto_created`; gian hàng đang có,
 * TK Cá nhân, TK hết hạn, TK đã xoá không đổi; chạy lại không tạo thêm.
 */
const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 1 });
const S = 'mig_v42_710';
const SQL = readFileSync(
  join(__dirname, '../prisma/migrations/20261029120000_v42_store_builder/migration.sql'),
  'utf8',
);

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
  `CREATE TABLE ${S}.users (id text PRIMARY KEY, account_type text NOT NULL, full_name text NOT NULL,
     email text NOT NULL, phone text, city text NOT NULL DEFAULT '', deleted_at timestamptz)`,
  `CREATE TABLE ${S}.membership_fees (user_id text PRIMARY KEY, status text NOT NULL)`,
  `CREATE TABLE ${S}.business_profiles (user_id text PRIMARY KEY, company_name text NOT NULL,
     province text, website text NOT NULL DEFAULT '', address text)`,
  `CREATE TABLE ${S}.stores (id text PRIMARY KEY, owner_id text NOT NULL UNIQUE, name text NOT NULL,
     province text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', email text NOT NULL DEFAULT '',
     website text NOT NULL DEFAULT '', address text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'draft',
     audience text NOT NULL DEFAULT 'business', updated_at timestamptz NOT NULL)`,
  `INSERT INTO ${S}.users (id, account_type, full_name, email, phone, city, deleted_at) VALUES
     ('trial', 'business', 'Nguyễn Trial', 'trial@x.vn', '+84900000001', 'Huế', NULL),
     ('paid', 'business', 'Trần Paid', 'paid@x.vn', NULL, 'Hà Nội', NULL),
     ('has', 'business', 'Lê Có', 'has@x.vn', NULL, '', NULL),
     ('exp', 'business', 'Hết Hạn', 'exp@x.vn', NULL, '', NULL),
     ('person', 'personal', 'Cá Nhân', 'p@x.vn', NULL, '', NULL),
     ('gone', 'business', 'Đã Xoá', 'g@x.vn', NULL, '', now())`,
  `INSERT INTO ${S}.membership_fees VALUES ('trial', 'trial'), ('paid', 'expiring'), ('has', 'active'),
     ('exp', 'expired'), ('person', 'active'), ('gone', 'active')`,
  `INSERT INTO ${S}.business_profiles VALUES
     ('trial', 'HTX Cà phê Ea Kar', 'Đắk Lắk', 'eakar.vn', '12 Hùng Vương'),
     ('paid', '', NULL, '', NULL)`,
  `INSERT INTO ${S}.stores (id, owner_id, name, status, updated_at)
     VALUES ('s-has', 'has', 'Gian hàng sẵn có', 'published', now())`,
];

/** `insertOnly`: lần chạy lại chỉ kiểm phần INSERT (DDL đã có) */
const run = (insertOnly = false) =>
  db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO ${S}`);
    for (const s of statements(SQL)) {
      if (!insertOnly || s.startsWith('INSERT')) await tx.$executeRawUnsafe(s);
    }
  });

describe('migration gian hàng Nháp D-114 S3 (TIP-V42-710)', () => {
  beforeAll(async () => {
    await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${S} CASCADE`);
    for (const s of BEFORE) await db.$executeRawUnsafe(s);
    await run();
  });
  afterAll(async () => {
    await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${S} CASCADE`);
    await db.$disconnect();
  });

  const stores = () =>
    db.$queryRawUnsafe<
      {
        owner_id: string;
        name: string;
        province: string;
        phone: string;
        email: string;
        website: string;
        address: string;
        status: string;
        auto_created: boolean;
      }[]
    >(
      `SELECT owner_id, name, province, phone, email, website, address, status, auto_created
       FROM ${S}.stores ORDER BY owner_id`,
    );

  it('DN trial / còn phí chưa có gian hàng → Nháp tự tạo từ hồ sơ DN, rơi về tên TK + tỉnh TK', async () => {
    const rows = await stores();
    expect(rows.map((r) => r.owner_id)).toEqual(['has', 'paid', 'trial']);
    expect(rows.find((r) => r.owner_id === 'trial')).toEqual({
      owner_id: 'trial',
      name: 'HTX Cà phê Ea Kar',
      province: 'Đắk Lắk',
      phone: '+84900000001',
      email: 'trial@x.vn',
      website: 'eakar.vn',
      address: '12 Hùng Vương',
      status: 'draft',
      auto_created: true,
    });
    const paid = rows.find((r) => r.owner_id === 'paid');
    expect(paid).toMatchObject({ name: 'Trần Paid', province: 'Hà Nội', status: 'draft' });
  });

  it('gian hàng đang có giữ nguyên; TK hết hạn / Cá nhân / đã xoá không có gian hàng', async () => {
    const has = (await stores()).find((r) => r.owner_id === 'has');
    expect(has).toMatchObject({
      name: 'Gian hàng sẵn có',
      status: 'published',
      auto_created: false,
    });
  });

  it('chạy lại không tạo thêm', async () => {
    await run(true);
    expect(await stores()).toHaveLength(3);
  });

  it('bảng lượt xem theo ngày + cột media có mặc định rỗng', async () => {
    const [r] = await db.$queryRawUnsafe<
      { logos: string[]; socials: unknown; media_urls: string[] }[]
    >(`SELECT logos, socials, media_urls FROM ${S}.stores WHERE owner_id = 'trial'`);
    expect(r).toEqual({ logos: [], socials: {}, media_urls: [] });
    const [t] = await db.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT count(*) AS n FROM information_schema.tables
       WHERE table_schema = '${S}' AND table_name = 'store_daily_views'`,
    );
    expect(Number(t!.n)).toBe(1);
  });
});
