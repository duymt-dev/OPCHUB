import type { BankTxnRow } from '../../api-domains';
import { members } from '../../fixtures';
import { MOCK_NOW } from './util';

/** Explicit TIP806 demo history, shared by native seed and MSW. */
export function buildBankDemoRows(now = MOCK_NOW): BankTxnRow[] {
  const seeds = [
    { id: 'bank-demo-1', user: 0, amount: 1_200_000, status: 'matched', minutes: 12 },
    { id: 'bank-demo-2', user: 1, amount: 3_600_000, status: 'matched', minutes: 55 },
    { id: 'bank-demo-3', user: 2, amount: 1_200_000, status: 'manual', minutes: 180 },
    { id: 'bank-demo-4', user: 3, amount: 1_200_000, status: 'unmatched', minutes: 300 },
    { id: 'bank-demo-5', user: 4, amount: 1_000_000, status: 'short', minutes: 1560 },
  ] as const;
  return seeds.map((s) => {
    const member = members[s.user];
    if (!member) throw new Error('Missing bank demo member');
    return {
      id: s.id,
      receivedAt: new Date(now - s.minutes * 60_000).toISOString(),
      amount: s.amount,
      content:
        s.status === 'unmatched'
          ? 'chuyen tien phi thanh vien'
          : `OPCHUB TV${String(s.user + 1).padStart(6, '0')} 0912345678`,
      memberName: s.status === 'matched' || s.status === 'manual' ? member.name : null,
      status: s.status,
      shortRecorded: false,
      shortNote: null,
      reason:
        s.status === 'short'
          ? 'Số tiền nhỏ hơn phí thành viên'
          : s.status === 'unmatched'
            ? 'Không khớp nội dung'
            : null,
      matchedHint: s.status === 'unmatched' ? null : `TV${String(s.user + 1).padStart(6, '0')}`,
      fundraisingHint: null,
      suggestedName: s.status === 'unmatched' ? null : member.name,
    };
  });
}
