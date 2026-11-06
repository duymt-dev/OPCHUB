import { describe, expect, it } from 'vitest';
import { resetMockDb } from './store';
import { listUnmatchedTxns } from './fees-admin';

describe('unmatched transfer fixture parser reasons', () => {
  it('uses the canonical OPCHUB prefix error without changing the GV missing-member reason', () => {
    resetMockDb();
    const { items } = listUnmatchedTxns(undefined, 20);
    expect(items.find((t) => t.id === 'ptx-901')).toMatchObject({
      content: 'CHUYEN KHOAN SAI NOI DUNG',
      reason: 'Nội dung không bắt đầu bằng OPCHUB',
      matchedHint: null,
    });
    expect(items.find((t) => t.id === 'ptx-904')).toMatchObject({
      content: 'OPCHUB GV000001',
      reason: 'Không tìm thấy Mã TV trong nội dung',
      fundraisingHint: 'GV000001',
    });
  });
});
