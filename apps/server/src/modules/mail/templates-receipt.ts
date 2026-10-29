import { esc, layout, type RenderedMail } from './templates';
import { vnDateText } from './templates-fee';

const vnd = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
const row = (k: string, v: string) =>
  `<tr><td style="padding:4px 12px 4px 0;color:#595959">${esc(k)}</td><td style="padding:4px 0"><b>${esc(v)}</b></td></tr>`;

/**
 * D-113 (F4), QT-03 bước 5, §12 "Thanh toán được đối soát → Email": biên nhận khi kích hoạt phí.
 * Tiêu đề chứa mã kỳ để relay gọi lại không gửi trùng (khoá `mail_logs` theo tiêu đề).
 */
export function feeReceiptMail(input: {
  fullName: string;
  plan: string;
  amount: number;
  validUntil: Date;
  receiptNo: string;
}): RenderedMail {
  return {
    subject: `Biên nhận phí thành viên OPC Hub · ${input.receiptNo}`,
    html: layout(
      'Biên nhận phí thành viên',
      `<p>Xin chào ${esc(input.fullName)},</p>` +
        '<p>OPC Hub đã nhận phí thành viên của bạn. Tài khoản đã được kích hoạt.</p>' +
        `<table>${row('Số biên nhận', input.receiptNo)}${row('Gói', input.plan)}` +
        `${row('Số tiền', vnd(input.amount))}${row('Hiệu lực đến', vnDateText(input.validUntil))}</table>` +
        '<p>Phí thành viên không hoàn lại sau khi thanh toán.</p>',
    ),
    text:
      `OPC Hub đã nhận phí thành viên ${vnd(input.amount)} (${input.plan}, biên nhận ${input.receiptNo}). ` +
      `Tài khoản hiệu lực đến ${vnDateText(input.validUntil)}.`,
  };
}

/** D-113 (F4): biên nhận Gói Gọi vốn — khoản chuyển sang "Chờ Admin thẩm định" */
export function fundraisingReceiptMail(input: {
  fullName: string;
  projectName: string;
  code: string;
  amount: number;
}): RenderedMail {
  return {
    subject: `Biên nhận Gói Gọi vốn OPC Hub · ${input.code}`,
    html: layout(
      'Biên nhận Gói Gọi vốn',
      `<p>Xin chào ${esc(input.fullName)},</p>` +
        `<p>OPC Hub đã nhận thanh toán Gói Gọi vốn cho dự án <b>${esc(input.projectName)}</b>. ` +
        'Gói đang chờ Admin thẩm định; bạn sẽ nhận thông báo khi có kết quả.</p>' +
        `<table>${row('Mã Gói Gọi vốn', input.code)}${row('Dự án', input.projectName)}` +
        `${row('Số tiền', vnd(input.amount))}</table>`,
    ),
    text:
      `OPC Hub đã nhận ${vnd(input.amount)} Gói Gọi vốn ${input.code} cho dự án ${input.projectName}. ` +
      'Gói đang chờ Admin thẩm định.',
  };
}
