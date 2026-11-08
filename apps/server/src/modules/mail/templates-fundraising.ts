import { esc, layout, type RenderedMail } from './templates';
import { vnDateText } from './templates-fee';
import type { RenewalMailInput } from './templates-renewal';

/** V4-610 (D-82): nhắc gia hạn T-14 / hết hạn Gói Gọi vốn */
export type FundraisingMailKind = 'renew' | 'expired';

/** Một câu dùng chung cho mail và thông báo in-app */
export function fundraisingLine(kind: FundraisingMailKind, projectName: string, endsAt: Date) {
  return kind === 'renew'
    ? `Gói Gọi vốn của dự án ${projectName} sẽ hết hạn ngày ${vnDateText(endsAt)}. Gia hạn để tiếp tục hiển thị ở mục Gọi vốn.`
    : `Gói Gọi vốn của dự án ${projectName} đã hết hạn. Phần Gọi vốn đầu tư đã tạm ẩn; gia hạn để hiển thị lại.`;
}

export function fundraisingMail(
  kind: FundraisingMailKind,
  fullName: string,
  projectName: string,
  endsAt: Date,
  payment?: { amount: number; link: string; transfer?: RenewalMailInput['transfer'] },
): RenderedMail {
  const subject =
    kind === 'renew'
      ? `Gói Gọi vốn sắp hết hạn: ${projectName}`
      : `Gói Gọi vốn đã hết hạn: ${projectName}`;
  const line = fundraisingLine(kind, projectName, endsAt);
  const price = payment
    ? `Giá ${kind === 'renew' ? 'gia hạn hiện hành' : 'gia hạn'}: ${payment.amount.toLocaleString('vi-VN')}đ.`
    : '';
  const when = kind === 'renew' ? 'Bạn có thể gia hạn sau khi gói hết hạn.' : '';
  const transfer = kind === 'expired' ? payment?.transfer : undefined;
  const bankText = transfer
    ? `Ngân hàng: ${transfer.bank.bankName}; STK: ${transfer.bank.accountNo}; Chủ tài khoản: ${transfer.bank.accountName}. Nội dung: ${transfer.transferContent}. VietQR: ${transfer.qr}`
    : '';
  const image = transfer?.imageUrl
    ? `<img src="${esc(transfer.imageUrl)}" width="200" alt="Mã VietQR chuyển khoản">`
    : '';
  return {
    subject,
    html: layout(
      subject,
      `<p>Xin chào ${esc(fullName)},</p><p>${esc(line)}</p><p>${esc(price)} ${esc(when)}</p>${image}${bankText ? `<p>${esc(bankText)}</p>` : ''}${payment ? `<p><a href="${esc(payment.link)}">Mở màn gia hạn</a></p>` : ''}`,
    ),
    text: `${line} ${price} ${when} ${bankText}`.trim(),
  };
}
