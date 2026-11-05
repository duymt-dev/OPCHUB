import { z } from 'zod';
import { bankTxnRowSchema, type BankTxnQuery, type ManualMatchRequest } from '../../api-domains';
import { transferContentOf } from '../../membership/transfer-content';
import { buildBankDemoRows } from './bank-reconcile-seed';
import { recordAudit } from './audit-store';
import { feeAction } from './ops-admin';
import { payMockFundraisingManual } from './fundraising';
import { readMockPrices } from './price-config';
import { mockDb, nextId, type MockDb } from './store';
import { conflict } from './util';

const stateSchema = z.object({
  autoActivate: z.boolean(),
  keyHint: z.string().max(4),
  rows: z.array(bankTxnRowSchema),
});
type State = z.infer<typeof stateSchema>;
const states = new WeakMap<MockDb, State>();
const STORAGE = 'opchub.mock.bank';
function state(): State {
  const db = mockDb();
  let s = states.get(db);
  if (!s) {
    s = { autoActivate: true, keyHint: 'demo', rows: buildBankDemoRows() };
    if (typeof sessionStorage !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(STORAGE);
        if (raw) s = stateSchema.parse(JSON.parse(raw));
      } catch {
        sessionStorage.removeItem(STORAGE);
      }
    }
    states.set(db, s);
  }
  return s;
}
function persist() {
  if (typeof sessionStorage !== 'undefined')
    sessionStorage.setItem(STORAGE, JSON.stringify(state()));
}
export function mockBankConfig() {
  const s = state();
  return {
    autoActivate: s.autoActivate,
    keyHint: s.keyHint,
    provider: 'fake' as const,
    webhookUrl: 'http://localhost:4000/v1/webhooks/bank',
    bankName: 'Vietcombank',
    accountNo: '1203132809',
    accountName: 'Công ty cổ phần Tập đoàn Media Soft',
    canSimulate: true,
    counts: {
      matched: s.rows.filter((r) => r.status === 'matched').length,
      pending: s.rows.filter((r) => r.status === 'unmatched' || r.status === 'short').length,
    },
  };
}
export function patchMockBank(actor: string, autoActivate: boolean) {
  const before = state().autoActivate;
  state().autoActivate = autoActivate;
  recordAudit(actor, 'settings.bank', 'bank', 'Cập nhật đối soát ngân hàng', {
    before,
    autoActivate,
  });
  persist();
  return mockBankConfig();
}
export function rotateMockBank(actor: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const key = btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  const hint = key.slice(-4);
  state().keyHint = hint;
  recordAudit(actor, 'bank.key_rotate', 'bank', 'Tạo lại khóa webhook ngân hàng', { hint });
  persist();
  return { key, hint };
}
export function listMockBank(q: BankTxnQuery) {
  const rows = [...state().rows].sort(
    (a, b) => b.receivedAt.localeCompare(a.receivedAt) || b.id.localeCompare(a.id),
  );
  const filtered = rows.filter(
    (r) =>
      !q.cursor ||
      r.receivedAt < q.cursor.receivedAt ||
      (r.receivedAt === q.cursor.receivedAt && r.id < q.cursor.id),
  );
  const items = filtered.slice(0, q.limit),
    last = items.at(-1);
  return {
    items,
    nextCursor:
      filtered.length > q.limit && last
        ? JSON.stringify({ receivedAt: last.receivedAt, id: last.id })
        : null,
  };
}
export function shortMockBank(actor: string, id: string, note: string) {
  const r = state().rows.find((r) => r.id === id);
  if (!r || r.shortRecorded || r.status === 'matched' || r.status === 'manual') return false;
  r.status = 'short';
  r.shortRecorded = true;
  r.shortNote = note;
  recordAudit(actor, 'fee.short_record', id, 'Ghi nhận giao dịch thiếu tiền', { note });
  persist();
  return true;
}
export function simulateMockBank(actor: string) {
  const member = mockDb().fees.find((r) => r.userId === 'm4');
  if (!member) throw new Error('Missing personal demo member');
  const s = state(),
    amount = readMockPrices().per.y,
    id = nextId('bank-sim');
  const content = transferContentOf(member.memberCode, member.phone);
  if (s.autoActivate) feeAction(member.userId, 'renew');
  s.rows.unshift({
    id,
    amount,
    content,
    receivedAt: new Date().toISOString(),
    memberName: s.autoActivate ? member.fullName : null,
    status: s.autoActivate ? 'matched' : 'unmatched',
    shortRecorded: false,
    shortNote: null,
    reason: s.autoActivate ? null : 'Chờ Admin xác nhận (tự kích hoạt tắt)',
    matchedHint: member.memberCode,
    fundraisingHint: null,
    suggestedName: member.fullName,
  });
  recordAudit(actor, 'bank.simulate', id, 'Mô phỏng giao dịch ngân hàng');
  persist();
  return {
    id,
    amount,
    content,
    autoActivated: s.autoActivate,
    memberName: member.fullName,
    plan: 'personal' as const,
  };
}
export function isMockBankTransaction(id: string) {
  return state().rows.some((r) => r.id === id);
}
/** Same existing manual-match endpoint, not a second activation rule. */
export function matchMockBankTxn(actor: string, id: string, body: ManualMatchRequest) {
  const r = state().rows.find((r) => r.id === id);
  if (!r) return undefined;
  if (r.status === 'matched' || r.status === 'manual' || r.shortRecorded)
    return conflict('Giao dịch không còn ở trạng thái chưa khớp');
  const result =
    body.kind === 'fundraising'
      ? payMockFundraisingManual(actor, body.fundraisingId, id)
      : feeAction(body.userId, 'renew');
  if (!result.ok) return result;
  r.status = 'manual';
  if (body.kind !== 'fundraising')
    r.memberName = mockDb().fees.find((f) => f.userId === body.userId)?.fullName ?? null;
  recordAudit(actor, 'fee.match_transaction', id, 'Khớp tay giao dịch ngân hàng', {
    reason: body.reason,
  });
  persist();
  return result;
}
