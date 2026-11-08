import type { RenewalMilestone } from '@opchub/shared/api-domains';
import { feeReminderLine, vnDateText } from './templates-fee';
import { esc, layout, type RenderedMail } from './templates';

export interface RenewalMailInput {
  fullName: string;
  milestone: RenewalMilestone;
  validUntil: Date;
  amount: number;
  plan: 'personal' | 'business';
  daysLeft: number;
  trial: boolean;
  transfer?: {
    imageUrl?: string;
    qr: string;
    transferContent: string;
    bank: { bankName: string; accountNo: string; accountName: string };
  };
}
/** Signed first-party image plus unchanged offline text fallback, never an external QR URL. */
export function renewalMail(i: RenewalMailInput): RenderedMail {
  const plan = i.plan === 'business' ? 'Gói Doanh nghiệp' : 'Gói Cá nhân';
  const line = i.trial
    ? feeReminderLine('T-7', i.validUntil, true)
    : `${plan} của bạn sẽ hết hạn ngày ${vnDateText(i.validUntil)}.`;
  const benefit =
    i.milestone === 'D30'
      ? 'Gia hạn để tiếp tục kết nối cộng đồng, trò chuyện và phát triển kinh doanh.'
      : i.milestone === 'D1'
        ? 'Nhắc lần cuối: gia hạn để không bị gián đoạn.'
        : 'Gia hạn để không bị gián đoạn.';
  const policy = `Phí ${i.amount.toLocaleString('vi-VN')}đ/năm, không hoàn lại sau khi thanh toán.`;
  const t = i.milestone === 'D1' ? i.transfer : undefined;
  const transfer = t
    ? `Ngân hàng: ${t.bank.bankName}; STK: ${t.bank.accountNo}; Chủ tài khoản: ${t.bank.accountName}. Nội dung: ${t.transferContent}. VietQR: ${t.qr}`
    : '';
  return {
    subject: i.trial
      ? 'Sắp hết 3 tháng miễn phí OPC Hub'
      : `[OPC Hub] ${plan} của bạn sẽ hết hạn sau ${i.daysLeft} ngày`,
    html: layout(
      'Nhắc gia hạn',
      `<p>Xin chào ${esc(i.fullName)},</p><p>${esc(line)}</p><p>${esc(benefit)}</p><p>${esc(policy)}</p>${t?.imageUrl ? `<img src="${esc(t.imageUrl)}" width="200" alt="Mã VietQR chuyển khoản">` : ''}${transfer ? `<p>${esc(transfer)}</p>` : ''}`,
    ),
    text: `${line} ${benefit} ${policy} ${transfer}`,
  };
}
