import { REGIONAL_LABELS, type RegionalRegion } from '../../api-domains';
import { publishMockNotification } from './notification-runtime';
import { mockDb } from './store';

export const REGIONAL_NOTICE_PREFIX = 'regional-notification-';

/** MSW mirrors the native revoke handler; persisted through the existing fixture bridge. */
export function publishRegionalRevokeNotice(
  userId: string,
  region: RegionalRegion,
  validUntil: string | null,
  now: number,
) {
  const fee = validUntil
    ? `Phí thành viên cũ còn hiệu lực đến ${new Date(validUntil).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
    : 'Vui lòng đóng phí thành viên để tiếp tục sử dụng.';
  publishMockNotification(mockDb(), userId, {
    id: `${REGIONAL_NOTICE_PREFIX}${crypto.randomUUID()}`,
    type: 'system',
    title: `Kết thúc vai trò GĐ Vùng ${REGIONAL_LABELS[region]}`,
    body: `${fee}. Chia sẻ đã ghi nhận vẫn được chi.`,
    link: '/affiliate',
    read: false,
    createdAt: new Date(now).toISOString(),
  });
}
