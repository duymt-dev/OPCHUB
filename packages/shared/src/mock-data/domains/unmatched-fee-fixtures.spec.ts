import { beforeEach, expect, it } from 'vitest';
import { listUnmatchedTxns, matchUnmatchedTxn } from './fees-admin';
import { mockDb, resetMockDb } from './store';

beforeEach(() => resetMockDb());

it('UAT-10 D-104 distinguishes a missing OPCHUB prefix from a missing member code', () => {
  const { items } = listUnmatchedTxns(undefined, 20);
  expect(items.find((txn) => txn.id === 'ptx-901')).toMatchObject({
    content: 'CHUYEN KHOAN SAI NOI DUNG',
    amount: 1_200_000,
    reason: 'Nội dung không bắt đầu bằng OPCHUB',
    matchedHint: null,
    fundraisingHint: null,
  });
  expect(items.find((txn) => txn.id === 'ptx-904')).toMatchObject({
    content: 'OPCHUB GV000001',
    reason: 'Không tìm thấy Mã TV trong nội dung',
    matchedHint: null,
    fundraisingHint: 'GV000001',
  });
});

it('UAT-10 BUG-014 manual reconciliation activates the member and removes only the matched row once', () => {
  const before = listUnmatchedTxns(undefined, 20).items;
  expect(matchUnmatchedTxn('ptx-901', 'm6')).toMatchObject({
    ok: true,
    data: { userId: 'm6', status: 'active', amount: 1_200_000 },
  });
  const fee = structuredClone(mockDb().fees.find((row) => row.userId === 'm6'));
  expect(listUnmatchedTxns(undefined, 20).items).toEqual(
    before.filter((txn) => txn.id !== 'ptx-901'),
  );
  expect(matchUnmatchedTxn('ptx-901', 'm6')).toMatchObject({ ok: false });
  expect(mockDb().fees.find((row) => row.userId === 'm6')).toEqual(fee);
});
