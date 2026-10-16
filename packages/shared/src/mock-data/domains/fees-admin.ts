import type { FeeExport, FeeRow, FeeSummary } from '../../api-domains';
import { FEE_AMOUNT } from './extras';
import { feeAction } from './ops-admin';
import { mockDb } from './store';

/** Mock màn Phí thành viên (Admin): thống kê, thu hàng loạt, nhắc tất cả, xuất CSV */

export function feeSummary(): FeeSummary {
  const fees = mockDb().fees;
  const n = (s: FeeRow['status']) => fees.filter((f) => f.status === s).length;
  const paid = n('active') + n('expiring');
  return {
    total: fees.length,
    active: n('active'),
    pending_payment: n('pending_payment'),
    expiring: n('expiring'),
    expired: n('expired'),
    paid,
    revenue: paid * FEE_AMOUNT,
    feeAmount: FEE_AMOUNT,
  };
}

/** Gia hạn 12 tháng nối tiếp (BR-05) cho từng người — id không tồn tại thì bỏ qua */
export function collectFees(userIds: string[]): { updated: number } {
  const updated = [...new Set(userIds)].filter((id) => feeAction(id, 'renew').ok).length;
  return { updated };
}

/** Prototype "Gửi nhắc hàng loạt": mọi thành viên chưa ở trạng thái Đang hiệu lực */
export function remindAllFees(): { queued: number } {
  return { queued: mockDb().fees.filter((f) => f.status !== 'active').length };
}

const STATUS_LABEL: Record<FeeRow['status'], string> = {
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
