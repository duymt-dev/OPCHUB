import { buildServiceRequests, SERVICE_STAFF } from '@opchub/shared/mock-domains';
import type { DbTx } from '../../src/client';
import { SERVICES } from '../catalog';
import { userIdByEmail } from './people';

/**
 * Domain service: phiếu YC-1001…1005 + bình luận nội bộ mẫu. Danh mục 6 dịch vụ V4 là seed bắt buộc
 * (`SERVICES`, D-60); reset demo xoá bảng nên dựng lại đúng danh mục gốc trước khi tạo phiếu.
 * Bình luận theo SEEDC của services-admin mock. Sequence `service_request_seq` đặt lại ở reset.ts.
 */

/** Mốc bình luận mẫu (16/10/2026 09:00 giờ VN) */
const T0 = Date.UTC(2026, 9, 16, 2, 0);
const DAY = 864e5;

const COMMENTS = [
  {
    id: 'src-seed-YC-1004-0',
    requestCode: 'YC-1004',
    authorName: 'Lê Minh Châu',
    body: '<p>Đã gọi anh Huy, bên Sở muốn bắt đầu từ <b>tháng 1/2027</b>. Cần báo giá cho 4 buổi.</p>',
    mentions: ['Phạm Thu Hà'],
    createdAt: new Date(T0 - DAY),
  },
  {
    id: 'src-seed-YC-1003-0',
    requestCode: 'YC-1003',
    authorName: 'Phạm Thu Hà',
    body: '<p>Đã gửi báo giá <b>45 triệu</b> cho gói học liệu + 2 buổi đào tạo giảng viên.</p><ul><li>Chờ trường phản hồi trước 30/10</li></ul>',
    mentions: ['Trần Đức Anh'],
    createdAt: new Date(T0 - 2 * DAY),
  },
];

export async function seedServices(tx: DbTx): Promise<void> {
  await tx.service.createMany({ data: SERVICES });
  await tx.serviceRequest.createMany({
    data: buildServiceRequests().map((r) => ({
      code: r.code,
      serviceId: r.serviceId,
      userId: userIdByEmail(r.email),
      requesterType: r.requesterType,
      fullName: r.fullName,
      phone: r.phone,
      email: r.email,
      organization: r.organization,
      taxCode: r.taxCode,
      address: r.address,
      note: r.note,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.createdAt),
    })),
  });
  // Tác giả bình luận mẫu là danh sách tĩnh (Q-G5c-6) — bình luận chỉ ghi tên
  const staff = new Set(SERVICE_STAFF.map((s) => s.name));
  await tx.serviceRequestComment.createMany({
    data: COMMENTS.filter((c) => staff.has(c.authorName)),
  });
}
