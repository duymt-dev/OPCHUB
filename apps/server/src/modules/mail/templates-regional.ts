import { REGIONAL_LABELS, type RegionalRegion } from '@opchub/shared/api-domains';
import { esc, layout, type RenderedMail } from './templates';

export function regionalAppointedMail(
  region: RegionalRegion,
  provinces: string[],
  portalUrl: string,
): RenderedMail {
  const subject = `[OPC Hub] Bạn được bổ nhiệm GĐ Vùng ${REGIONAL_LABELS[region]} · miễn phí thành viên`;
  const text = `Bạn được bổ nhiệm GĐ Vùng ${REGIONAL_LABELS[region]}. Tỉnh phụ trách: ${provinces.join(', ')}. Miễn phí thành viên trong thời gian làm GĐ Vùng.`;
  return {
    subject,
    text,
    html: layout(
      'Bổ nhiệm Giám đốc Vùng',
      `<p>${esc(text)}</p><p><a href="${esc(portalUrl)}/login">Đăng nhập</a></p>` +
        `<p><a href="${esc(portalUrl)}/huong-dan">Tài liệu hướng dẫn</a></p>`,
    ),
  };
}

export function regionalRevokeText(
  validUntil: string | null,
  reason: 'manual' | 'locked' | 'deleted' = 'manual',
): string {
  const fee = validUntil
    ? `Phí thành viên cũ còn hiệu lực đến ${new Date(validUntil).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
    : 'Vui lòng đóng phí thành viên để tiếp tục sử dụng.';
  const why =
    reason === 'locked'
      ? 'Kết thúc vai trò do tài khoản bị khóa. '
      : reason === 'deleted'
        ? 'Kết thúc vai trò do tài khoản đã bị xóa. '
        : '';
  return `${why}${fee}. Chia sẻ đã ghi nhận vẫn được chi.`;
}

export function regionalRevokedMail(
  region: RegionalRegion,
  validUntil: string | null,
  revokedAt: string,
  reason: 'manual' | 'locked' | 'deleted' = 'manual',
): RenderedMail {
  const fee = validUntil
    ? `phí thành viên còn hiệu lực đến ${new Date(validUntil).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
    : 'vui lòng đóng phí thành viên';
  const subject = `[OPC Hub] Kết thúc vai trò GĐ Vùng ${REGIONAL_LABELS[region]} · ${fee}`;
  const at = new Date(revokedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const text = `Kết thúc vai trò GĐ Vùng ${REGIONAL_LABELS[region]} lúc ${at}. ${regionalRevokeText(validUntil, reason)}`;
  return { subject, text, html: layout('Kết thúc vai trò Giám đốc Vùng', `<p>${esc(text)}</p>`) };
}
