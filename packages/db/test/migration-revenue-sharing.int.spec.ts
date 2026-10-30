import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Prisma } from '../src';
import { createPrismaClient } from '../src/client';
import { testEnv } from './env';
import { prepareRevenueMigration, SCHEMA, shareInsert } from './revenue-sharing-migration.fixture';

const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 2 });

describe('REQ-617 D-119/121/122 sharing migration', () => {
  beforeAll(async () => prepareRevenueMigration(db));
  beforeEach(async () => {
    await db.$executeRaw`DELETE FROM mig_v46_802.revenue_shares`;
    await db.$executeRaw`DELETE FROM mig_v46_802.revenue_payouts`;
  });
  afterAll(async () => {
    await db.$executeRaw`DROP SCHEMA IF EXISTS mig_v46_802 CASCADE`;
    await db.$disconnect();
  });

  it('backfills earliest actual receipt across plans, not list price, approval or period start', async () => {
    const rows = await db.$queryRaw<{ user_id: string; first_received_at: Date }[]>`
      SELECT user_id, first_received_at FROM mig_v46_802.revenue_customers ORDER BY user_id`;
    expect(rows.map((r) => [r.user_id, r.first_received_at.toISOString()])).toEqual([
      ['cross', '2024-01-31T17:00:00.000Z'],
      ['first-member', '2023-06-01T00:00:00.000Z'],
      ['manual', '2024-07-08T00:00:00.000Z'],
      ['rejected-review', '2024-01-31T17:00:00.000Z'],
    ]);
  });

  it('D-121 does not retroactively create shares or payouts from the epoch backfill', async () => {
    const [row] = await db.$queryRaw<{ shares: bigint; payouts: bigint }[]>`
      SELECT (SELECT count(*) FROM mig_v46_802.revenue_shares) AS shares,
        (SELECT count(*) FROM mig_v46_802.revenue_payouts) AS payouts`;
    expect(row).toEqual({ shares: 0n, payouts: 0n });
  });

  it('defaults only new sharing fields, retaining existing policy', async () => {
    const [row] = await db.$queryRaw<Record<string, number>[]>`
      SELECT * FROM mig_v46_802.affiliate_policy WHERE id = 1`;
    expect(row).toEqual({
      id: 1,
      default_rate: 23,
      year_one_rate: 50,
      annual_decrease: 10,
      minimum_rate: 20,
    });
    await expect(db.$executeRaw`
      UPDATE mig_v46_802.affiliate_policy SET minimum_rate = 51 WHERE id = 1
    `).rejects.toThrow(/affiliate_policy_sharing_rates/);
  });

  describe('ledger constraints', () => {
    beforeEach(async () => {
      await db.$executeRaw(shareInsert());
    });

    it('accepts integer rounding; enforces source idempotency independently of director appointment', async () => {
      await expect(db.$executeRaw(shareInsert('duplicate-source'))).rejects.toThrow(
        /revenue_shares_source_source_id_key/,
      );
      await expect(db.$executeRaw`
      UPDATE mig_v46_802.revenue_shares SET director_amount = 50, media_soft_amount = 51
      WHERE id = 'share'`).rejects.toThrow(/revenue_shares_rates/);
    });

    it.each([
      ['amount = 0', 'revenue_shares_positive_amount'],
      ['media_soft_amount = 49', 'revenue_shares_positive_amount'],
      ['director_rate = 101', 'revenue_shares_rates'],
      ['customer_year = 0', 'revenue_shares_rates'],
      ["plan = 'fundraising'", 'revenue_shares_source_plan'],
      ["month_key = '2025-13'", 'revenue_shares_month'],
      ["bank_name = 'Bank'", 'revenue_shares_bank'],
      ["status = 'paid'", 'revenue_shares_settlement'],
      ['director_name = NULL', 'revenue_shares_beneficiary'],
    ])('rejects invalid financial snapshot %s', async (set, constraint) => {
      await expect(
        db.$executeRaw(
          Prisma.sql`UPDATE mig_v46_802.revenue_shares SET ${Prisma.raw(set)} WHERE id = 'share'`,
        ),
      ).rejects.toThrow(constraint);
    });

    it('supports Media Soft-only allocation without assigning a phantom director', async () => {
      await db.$executeRaw`
      UPDATE mig_v46_802.revenue_shares SET director_id = NULL, director_name = NULL,
        affiliate_id = NULL, region = NULL, director_rate = 0, director_amount = 0,
        media_soft_amount = 101 WHERE id = 'share'`;
      const [row] = await db.$queryRaw<{ media_soft_amount: number }[]>`
      SELECT media_soft_amount FROM mig_v46_802.revenue_shares WHERE id = 'share'`;
      expect(row?.media_soft_amount).toBe(101);
    });
  });

  it('payout totals are bigint, positive, bank-complete and uniquely keyed', async () => {
    const insert = (id: string) => Prisma.sql`
      INSERT INTO mig_v46_802.revenue_payouts
        (id, request_key, director_id, director_name, region, month_key, amount,
          share_count, bank_name, bank_no, bank_holder, paid_by, paid_at)
      VALUES (${id}, 'key', 'former-director', 'Director', 'north', '2025-01',
        3000000000, 3, 'Bank', '12345', 'Director', 'admin', '2025-02-01')`;
    await db.$executeRaw(insert('receipt'));
    await expect(db.$executeRaw(insert('duplicate-key'))).rejects.toThrow(
      /revenue_payouts_request_key_key/,
    );
    const [row] = await db.$queryRaw<{ amount: bigint }[]>`
      SELECT amount FROM mig_v46_802.revenue_payouts WHERE request_key = 'key'`;
    expect(row?.amount).toBe(3_000_000_000n);
    await expect(db.$executeRaw`
      UPDATE mig_v46_802.revenue_payouts SET bank_no = '' WHERE id = 'receipt'
    `).rejects.toThrow(/revenue_payouts_bank/);
    await expect(db.$executeRaw`
      UPDATE mig_v46_802.revenue_payouts SET amount = 0 WHERE id = 'receipt'
    `).rejects.toThrow(/revenue_payouts_positive/);
  });

  it('creates selective payable and equality-first covering keyset indexes', async () => {
    const indexes = await db.$queryRaw<{ indexname: string; indexdef: string }[]>`
      SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = ${SCHEMA}`;
    expect(indexes.find((i) => i.indexname === 'revenue_shares_payable')?.indexdef).toMatch(
      /\(director_id, month_key, id\) INCLUDE \(director_amount\) WHERE/,
    );
    expect(
      indexes.find((i) => i.indexname === 'revenue_payouts_director_history')?.indexdef,
    ).toContain('(director_id, paid_at DESC, id DESC) INCLUDE (month_key, amount, share_count)');
    expect(
      indexes.find((i) => i.indexname === 'revenue_shares_customer_anchor')?.indexdef,
    ).toContain('(customer_id, status, first_received_at) INCLUDE (id, received_at)');
  });

  it('AT-GDV04 retains bank ownership by director ID and rejects partial destinations', async () => {
    await db.$executeRaw`INSERT INTO mig_v46_802.revenue_recipient_banks
      (director_id, bank_name, bank_no, bank_holder) VALUES ('former-director', 'Bank', '123456', 'DIRECTOR')`;
    await expect(db.$executeRaw`UPDATE mig_v46_802.revenue_recipient_banks
      SET bank_no = NULL WHERE director_id = 'former-director'`).rejects.toThrow(
      /revenue_recipient_banks_complete/,
    );
    await db.$executeRaw`UPDATE mig_v46_802.revenue_recipient_banks
      SET bank_name = NULL, bank_no = NULL, bank_holder = NULL WHERE director_id = 'former-director'`;
  });
});
