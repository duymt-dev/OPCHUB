import type { DbTx } from '../../src/client';
import { ADMIN_ID } from './people';

/**
 * Đưa dữ liệu nghiệp vụ về mốc demo trước khi nạp lại (cùng transaction với phần insert).
 *
 * e2e ghi đủ thứ với id ngẫu nhiên (đăng ký TK, SSO, nhóm/sự kiện/dự án/chiến dịch/persona mới,
 * giao dịch webhook, lời mời quản trị…) nên muốn chạy lại ra cùng trạng thái thì phải xoá TOÀN BỘ
 * dòng của các bảng nghiệp vụ, không chỉ dòng có id demo. Chỉ chạy trên opchub_dev / opchub_test
 * (guard.ts). GIỮ LẠI: TK `admin` (seed bắt buộc, cả `users` lẫn `admin_users`), 5 vai trò hệ thống, 90 nhóm c1…c34 + g1…g56 + phòng `general` (cập nhật lại
 * ở settings.ts), danh mục k1…k32, `audit_logs` (chỉ INSERT), `outbox_events`, `export_jobs`,
 * `stats_daily`.
 */
export async function resetDemoData(tx: DbTx): Promise<void> {
  // Affiliate: cascade referral/hoa hồng/lượt nhấp trước khi xoá các kỳ phí.
  await tx.affiliate.deleteMany({});
  // Dự án (cascade: thành viên, chia sẻ, gọi vốn, theo dõi, góp ý, like, repo, quan tâm đầu tư)
  await tx.project.deleteMany({});
  await tx.investorSummary.deleteMany({});
  // Sự kiện (cascade đăng ký)
  await tx.event.deleteMany({});
  // Marketing + mail
  await tx.campaign.deleteMany({});
  await tx.mailLog.deleteMany({});
  // BUG-036: e2e huỷ nhận email demo — giữ lại thì ước tính người nhận lệch giữa các test (D-63)
  await tx.mailSuppression.deleteMany({});
  // Bot (persona: tin persona SET NULL — tin bị xoá ngay dưới)
  await tx.botThread.deleteMany({});
  await tx.botScript.deleteMany({});
  await tx.botActivity.deleteMany({});
  // Chat (cascade: reaction, ghim, báo cáo, cờ báo) + con trỏ đã đọc
  await tx.message.deleteMany({});
  await tx.roomReadCursor.deleteMany({});
  await tx.persona.deleteMany({});
  // Dịch vụ (cascade bình luận)
  await tx.serviceRequest.deleteMany({});
  await tx.service.deleteMany({});
  await tx.notification.deleteMany({});
  // Cộng đồng: nhóm e2e tạo thêm, phòng chủ đề, thành viên nhóm
  await tx.$executeRaw`DELETE FROM groups WHERE id !~ '^[cg][0-9]+$'`;
  await tx.$executeRaw`DELETE FROM rooms WHERE NOT (is_default AND slug = 'general')`;
  await tx.groupMember.deleteMany({});
  // Phí: giao dịch webhook (UQ provider+bank_txn_id — chạy lại e2e sẽ bị coi là trùng)
  await tx.membershipFeePeriod.deleteMany({});
  await tx.paymentTransaction.deleteMany({});
  await tx.adminInvite.deleteMany({});
  // TIP-V2-201: TK quản trị trừ Super Admin `admin` (cascade phiên) + vai trò tự tạo e2e để lại
  // (sau khi xoá TK — CHECK role_id). Ma trận vai trò hệ thống đặt lại ở admin.ts
  await tx.adminUser.deleteMany({ where: { id: { not: ADMIN_ID } } });
  await tx.adminRole.deleteMany({ where: { isSystem: false } });
  await tx.adminRefreshToken.deleteMany({ where: { adminUserId: ADMIN_ID } });
  // Mọi user trừ Super Admin của seed bắt buộc (cascade hồ sơ DN, SSO, phiên, phí, đồng ý…)
  await tx.user.deleteMany({ where: { id: { not: ADMIN_ID } } });
  await tx.refreshToken.deleteMany({ where: { userId: ADMIN_ID } });
  await resetSequences(tx);
}

/** Mã sinh từ sequence quay về mốc ngay sau dữ liệu demo (id mới e2e tạo ổn định giữa các lần) */
async function resetSequences(tx: DbTx): Promise<void> {
  await tx.$executeRaw`SELECT setval('member_code_seq', 9, false)`;
  await tx.$executeRaw`SELECT setval('service_request_seq', 1006, false)`;
  await tx.$executeRaw`SELECT setval('persona_seq', 100, false)`;
  await tx.$executeRaw`SELECT setval('bot_script_seq', 100, false)`;
}
