import type { FeeExport, FeeRow, FeeSummary, UnmatchedTxn } from '../../api-domains';
import { MEMBERSHIP_PLANS } from '../../membership/plans';
import { feeAction } from './ops-admin';
import { mockDb, type MockDb } from './store';
import { conflict, iso, MOCK_NOW, type MockResult } from './util';

/** Mock màn Phí thành viên (Admin): thống kê, thu hàng loạt, nhắc tất cả, xuất CSV */

export function feeSummary(): FeeSummary {
  const fees = mockDb().fees;
  const n = (s: FeeRow['status']) => fees.filter((f) => f.status === s).length;
  const paid = n('active') + n('expiring');
  return {
    total: fees.length,
    active: n('active'),
    trial: n('trial'),
    pending_payment: n('pending_payment'),
    expiring: n('expiring'),
    expired: n('expired'),
    paid,
    revenue: fees
      .filter((f) => f.status === 'active' || f.status === 'expiring')
      .reduce((a, f) => a + f.amount, 0),
  };
}

/** Gia hạn 12 tháng nối tiếp (BR-05) cho từng người — id không tồn tại thì bỏ qua */
export function collectFees(userIds: string[]): { updated: number } {
  const updated = [...new Set(userIds)].filter((id) => feeAction(id, 'renew').ok).length;
  return { updated };
}

/**
 * "Gửi nhắc hàng loạt" như server (`needReminder`): phí chưa Đang hiệu lực, TK còn hoạt động
 * (không khoá), không phải NĐT — D-63 MSW khớp server
 */
export function remindAllFees(): { queued: number } {
  const db = mockDb();
  const queued = db.fees.filter(
    (f) =>
      f.status !== 'active' &&
      f.accountType !== 'investor' &&
      (db.userStatus.get(f.userId) ?? 'active') === 'active',
  ).length;
  return { queued };
}

const STATUS_LABEL: Record<FeeRow['status'], string> = {
  trial: 'Miễn phí 3 tháng',
  pending_payment: 'Chờ thanh toán',
  active: 'Đang hiệu lực',
  expiring: 'Sắp hết hạn',
  expired: 'Hết hạn',
};
const vnDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Ho_Chi_Minh',
      })
    : '—';
/** Excel nhận UTF-8 nhờ BOM */
const BOM = String.fromCharCode(0xfeff);
const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;

/** CSV giống prototype (BOM + tiêu đề tiếng Việt) */
export function exportFeesCsv(userIds: string[]): FeeExport {
  const ids = new Set(userIds);
  const head = 'Thành viên,Email,Loại,Ngày ĐK,Trạng thái phí,Ngày thu,Hiệu lực đến';
  const body = mockDb()
    .fees.filter((f) => ids.has(f.userId))
    .map((f) =>
      [
        f.fullName,
        f.email,
        f.accountType === 'business' ? 'Doanh nghiệp' : 'Cá nhân',
        vnDate(f.joinedAt),
        STATUS_LABEL[f.status],
        vnDate(f.paidAt),
        vnDate(f.validUntil),
      ]
        .map(cell)
        .join(','),
    );
  return { filename: 'phi-thanh-vien.csv', csv: `${BOM}${[head, ...body].join('\n')}` };
}

/**
 * BUG-014 (MSW): hàng "Cần đối soát" (NA-03 4b) — giao dịch CK không tự khớp. Lý do giống
 * `ReconcileService.match`; `matchedHint` = Mã TV đọc được trong nội dung (D-41).
 */
const TXN_SEED: (UnmatchedTxn & { minutesAgo: number })[] = [
  {
    id: 'ptx-901',
    amount: MEMBERSHIP_PLANS.personal.amount,
    content: 'CHUYEN KHOAN SAI NOI DUNG',
    receivedAt: '',
    reason: 'Không tìm thấy Mã TV trong nội dung',
    matchedHint: null,
    minutesAgo: 25,
  },
  {
    id: 'ptx-902',
    amount: 500_000,
    content: 'OPCHUB TV000006 0935210987',
    receivedAt: '',
    reason: 'Số tiền nhỏ hơn phí thành viên',
    matchedHint: 'TV000006',
    minutesAgo: 90,
  },
  {
    id: 'ptx-903',
    amount: MEMBERSHIP_PLANS.business.amount,
    content: 'OPCHUB TV999999 phi thanh vien',
    receivedAt: '',
    reason: 'Không có thành viên TV999999',
    matchedHint: 'TV999999',
    minutesAgo: 60 * 26,
  },
];

const txnStates = new WeakMap<MockDb, UnmatchedTxn[]>();
function txnsOf(): UnmatchedTxn[] {
  const db = mockDb();
  let s = txnStates.get(db);
  if (!s) {
    s = TXN_SEED.map(({ minutesAgo, ...t }) => ({
      ...t,
      receivedAt: iso(MOCK_NOW - minutesAgo * 60_000),
    }));
    txnStates.set(db, s);
  }
  return s;
}

/** Keyset mới → cũ theo `receivedAt` như `GET /admin/fees/transactions?before=` */
export function listUnmatchedTxns(before: string | undefined, size: number) {
  const items = txnsOf()
    .filter((t) => !before || t.receivedAt < before)
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    .slice(0, size);
  const last = items.at(-1);
  return { items, nextBefore: items.length === size && last ? last.receivedAt : null };
}

/** Khớp tay (QĐ-01): bỏ khỏi hàng đợi + gia hạn 12 tháng; đã xử lý → 409 như server */
export function matchUnmatchedTxn(id: string, userId: string): MockResult<FeeRow> {
  const list = txnsOf();
  const i = list.findIndex((t) => t.id === id);
  if (i < 0) return conflict('Giao dịch không còn ở trạng thái chưa khớp');
  const r = feeAction(userId, 'renew');
  if (r.ok) list.splice(i, 1);
  return r;
}
