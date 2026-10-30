import type { DirectorRegion } from '@opchub/shared/api-domains';
import { DIRECTOR_REGION_LABEL } from '@opchub/shared/api-domains';
import type { MembershipFeeStatus } from '@opchub/shared';
import { actionButton, esc, layout } from './email-layout';
import { vnDateText } from './templates-fee';
import type { RenderedMail } from './templates';

export function directorAppointedMail(
  name: string,
  region: DirectorRegion,
  provinces: readonly string[],
  portalUrl: string,
): RenderedMail {
  const subject = 'Thông báo bổ nhiệm GĐ Vùng';
  const text = `Bạn được bổ nhiệm GĐ Vùng ${DIRECTOR_REGION_LABEL[region]}. Tỉnh phụ trách: ${provinces.join(', ') || 'Chưa gán'}. Miễn phí thành viên trong thời gian đương nhiệm.`;
  return {
    subject,
    text,
    html: layout(
      subject,
      `<p>Xin chào ${esc(name)},</p><p>${esc(text)}</p>` +
        actionButton('Đăng nhập OPC Hub', `${portalUrl}/login`) +
        `<p>Hướng dẫn GĐ Vùng: quản lý mạng lưới affiliate theo tỉnh; phần đã ghi nhận được đối soát và chi trả theo chính sách.</p>` +
        `<p>Bạn tiếp tục dùng tài khoản đã đăng ký, không cần tạo tài khoản mới.</p>`,
    ),
  };
}

export function directorRevokedMail(
  name: string,
  region: DirectorRegion,
  at: Date,
  fee: { status: MembershipFeeStatus; validUntil: Date | null },
  portalUrl: string,
): RenderedMail {
  const subject = 'Thông báo thu hồi GĐ Vùng';
  const remaining =
    fee.status !== 'pending_payment' && fee.validUntil
      ? `Hạn phí ${fee.status === 'trial' ? 'dùng thử' : 'thành viên'} trước bổ nhiệm được giữ nguyên đến ngày ${vnDateText(fee.validUntil)}.`
      : 'Phí thành viên đã hết hạn hoặc chưa thanh toán. Vui lòng thanh toán để tiếp tục sử dụng.';
  const timestamp = at.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });
  const text = `Quyền GĐ Vùng ${DIRECTOR_REGION_LABEL[region]} được thu hồi lúc ${timestamp}. ${remaining} Phần chia sẻ đã ghi nhận trước khi thu hồi vẫn được chi trả.`;
  return {
    subject,
    text,
    html: layout(
      subject,
      `<p>Xin chào ${esc(name)},</p><p>${esc(text)}</p>` +
        actionButton('Đăng nhập OPC Hub', `${portalUrl}/login`),
    ),
  };
}
