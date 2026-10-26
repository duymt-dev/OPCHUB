import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../src/client';
import { testEnv } from './env';

/**
 * TIP-V4-609 (REQ-511): ràng buộc bảng `needs` sau migration `v4_local_needs` trên opchub_test —
 * ngân sách ≥ 0 và từ < đến; ẩn phải nhớ trạng thái trước; cần SĐT hoặc email; xoá gian hàng xoá nhu cầu.
 */
const db = createPrismaClient(testEnv.TEST_DATABASE_URL, { max: 1 });
const OWNER = 'mig-need-owner';
const STORE = 'mig-need-store';

const ins = (id: string, cols: Record<string, string>) => {
  const all: Record<string, string> = {
    id: `'${id}'`,
    store_id: `'${STORE}'`,
    owner_id: `'${OWNER}'`,
    type: `'buy'`,
    title: `'T'`,
    description: `'Mô tả đủ dài cho nhu cầu'`,
    field: `'Thủy sản'`,
    province: `'Cà Mau'`,
    phone: `'0912345678'`,
    updated_at: 'now()',
    ...cols,
  };
  return db.$executeRawUnsafe(
    `INSERT INTO needs (${Object.keys(all).join(', ')}) VALUES (${Object.values(all).join(', ')})`,
  );
};

describe('migration Nhu cầu (TIP-V4-609)', () => {
  beforeAll(async () => {
    await db.$executeRawUnsafe(`DELETE FROM users WHERE id = '${OWNER}'`);
    await db.$executeRawUnsafe(
      `INSERT INTO users (id, member_code, account_type, full_name, email, updated_at)
       VALUES ('${OWNER}', 'TVMIG609', 'business', 'Mig', 'mig609@test.opchub.vn', now())`,
    );
    await db.$executeRawUnsafe(
      `INSERT INTO stores (id, owner_id, name, updated_at) VALUES ('${STORE}', '${OWNER}', 'G', now())`,
    );
  });
  afterAll(async () => {
    await db.$executeRawUnsafe(`DELETE FROM users WHERE id = '${OWNER}'`);
    await db.$disconnect();
  });

  it('ngân sách: Thỏa thuận (NULL) hợp lệ; âm hoặc từ ≥ đến bị chặn', async () => {
    await ins('n-ok', {});
    await ins('n-budget', { budget_min: '1000000', budget_max: '5000000000' });
    await expect(ins('n-neg', { budget_min: '-1' })).rejects.toThrow(/needs_budget_check/);
    await expect(ins('n-rev', { budget_min: '5', budget_max: '5' })).rejects.toThrow(
      /needs_budget_check/,
    );
  });

  it('ẩn phải nhớ trạng thái trước; cần SĐT hoặc email', async () => {
    await ins('n-hid', { status: `'hidden'`, hidden_prev: `'closed'` });
    await expect(ins('n-hid2', { status: `'hidden'` })).rejects.toThrow(/needs_hidden_prev_check/);
    await expect(ins('n-open-prev', { hidden_prev: `'open'` })).rejects.toThrow(
      /needs_hidden_prev_check/,
    );
    await expect(ins('n-nocontact', { phone: `''` })).rejects.toThrow(/needs_contact_check/);
    await ins('n-mail', { phone: `''`, email: `'a@b.vn'` });
  });

  it('xoá gian hàng → xoá nhu cầu (cascade)', async () => {
    await db.$executeRawUnsafe(`DELETE FROM stores WHERE id = '${STORE}'`);
    const [{ n }] = await db.$queryRawUnsafe<[{ n: number }]>(
      `SELECT count(*)::int AS n FROM needs WHERE owner_id = '${OWNER}'`,
    );
    expect(n).toBe(0);
  });
});
