import { esc, layout, type RenderedMail } from './templates';

/** Thư nhắc phí (NA-04, D-57, NR-R01) — tự động theo mốc hoặc Admin nhắc tay theo trạng thái */
export type FeeReminderKind = 'T-30' | 'T-7' | 'T-0' | 'T+3' | 'pending';

/** D-68: số tiền theo gói của từng người (`membership_fees.amount`) */
const nonRefund = (amount: number) =>
  `Phí ${amount.toLocaleString('vi-VN')}đ/năm, không hoàn lại sau khi thanh toán.`;

export const vnDateText = (d: Date) =>
  d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  });

/** Một câu dùng chung cho mail và thông báo in-app */
export function feeReminderLine(kind: FeeReminderKind, validUntil: Date | null): string {
  const until = validUntil ? vnDateText(validUntil) : '';
  switch (kind) {
    case 'T-30':
    case 'T-7':
      return `Phí thành viên OPC Hub của bạn sẽ hết hạn ngày ${until}.`;
    case 'T-0':
      return 'Phí thành viên OPC Hub của bạn hết hạn hôm nay.';
    case 'T+3':
      return 'Phí thành viên OPC Hub của bạn đã hết hạn — gia hạn để tiếp tục sử dụng.';
    default:
      return 'Phí thành viên OPC Hub của bạn chưa được thanh toán.';
  }
}

export function feeReminderMail(
  fullName: string,
  kind: FeeReminderKind,
  validUntil: Date | null,
  amount: number,
): RenderedMail {
  const line = feeReminderLine(kind, validUntil);
  const policy = nonRefund(amount);
  return {
    subject:
      kind === 'T+3' ? 'Phí thành viên OPC Hub đã hết hạn' : 'Nhắc đóng phí thành viên OPC Hub',
    html: layout(
      'Nhắc phí thành viên',
      `<p>Xin chào ${esc(fullName)},</p><p>${esc(line)}</p>` +
        `<p>Vui lòng vào mục Gói dịch vụ trên OPC Hub để chuyển khoản. ${esc(policy)}</p>`,
    ),
    text: `${line} ${policy}`,
  };
}
