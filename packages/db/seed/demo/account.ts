import { members } from '@opchub/shared/fixtures';
import { buildFees, contactOf, DAY_MS, FEE_AMOUNT, MOCK_NOW } from '@opchub/shared/mock-domains';
import type { DbTx } from '../../src/client';
import { ADMIN_ID, DEMO_USERS, MEMBER_USERS } from './people';

/**
 * Domain account + membership-fee: user demo (mật khẩu prototype), hồ sơ DN, SSO đã liên kết,
 * phí thành viên theo `buildFees()` của mock. TK Super Admin `admin` đăng nhập ở `admin_users`
 * (admin.ts, D-52); dòng `users` cùng id giữ ở trạng thái đã chuyển (xoá mềm).
 */

export interface DemoHashes {
  member: string;
  admin: string;
}

/** D-40: mock để Rina Sari (MST nước ngoài) ở trạng thái chờ xác minh */
const PENDING_BIZ: readonly string[] = ['m7'];
/** Prototype: mọi TK mặc định đã liên kết Google + LinkedIn */
const DEFAULT_SSO = ['google', 'linkedin'] as const;
/** Giờ đăng nhập gần nhất của quản trị viên (ADMIN_SEED) */
const LAST_LOGIN: Record<string, number> = {
  m2: 10 * 60_000,
  m6: DAY_MS + 3_600_000,
  m3: 3 * DAY_MS + 3_600_000,
};

export async function seedUsers(tx: DbTx, h: DemoHashes): Promise<void> {
  // Dòng `users` của `admin`: đã chuyển sang `admin_users` (D-52) → xoá mềm như migration
  // 20261019100000 (giữ cho FK nhóm làm chủ / nhật ký); đổi Mã TV trước để TV000001 là M1
  await tx.user.update({
    where: { id: ADMIN_ID },
    data: {
      passwordHash: null,
      email: `${ADMIN_ID}@moved.invalid`,
      phone: null,
      memberCode: 'TV000000',
      systemRole: 'super_admin',
      status: 'active',
      totpSecretEnc: null,
      mustChangePassword: false,
      deletedAt: new Date(MOCK_NOW - 60 * DAY_MS),
      avatarUrl: null,
      permVersion: { increment: 1 },
    },
  });
  await tx.user.createMany({
    data: DEMO_USERS.map((u) => ({
      id: u.id,
      memberCode: u.memberCode,
      accountType: u.accountType,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      passwordHash: u.login ? h.member : null,
      registrationRole: u.registrationRole,
      position: u.position,
      country: u.country,
      systemRole: u.systemRole,
      status: u.status,
      lockedReason: u.status === 'locked' ? 'Vi phạm nội quy cộng đồng' : null,
      avatarUrl: u.avatarUrl,
      emailVerifiedAt: u.createdAt,
      lastLoginAt: u.id in LAST_LOGIN ? new Date(MOCK_NOW - (LAST_LOGIN[u.id] ?? 0)) : null,
      deletedAt: u.deletedAt,
      createdAt: u.createdAt,
      updatedAt: u.createdAt,
    })),
  });
  await tx.businessProfile.createMany({
    data: members
      .filter((m) => m.type === 'biz')
      .map((m) => ({
        userId: m.id,
        taxCode: m.tax ?? '',
        companyName: m.company ?? m.org ?? '',
        representative: m.name,
        position: m.position ?? '',
        mainField: m.field ?? '',
        subFields: [],
        size: m.size ?? null,
        country: m.bizCountry ?? null,
        // Q-B63-5: địa chỉ DN = địa chỉ prototype hiển thị ở dải liên hệ dự án của chủ DN
        address: contactOf(m.name).address,
        verification: PENDING_BIZ.includes(m.id) ? ('pending' as const) : ('verified' as const),
        verifiedAt: PENDING_BIZ.includes(m.id) ? null : new Date(MOCK_NOW - 30 * DAY_MS),
      })),
  });
  await tx.authIdentity.createMany({
    data: MEMBER_USERS.flatMap((u) =>
      DEFAULT_SSO.map((provider) => ({
        userId: u.id,
        provider,
        subject: `${provider}:${u.email}`,
        email: u.email,
      })),
    ),
  });
}

const YEAR_MS = 365 * DAY_MS;

/**
 * `membership_fees` 1–1 user theo mock (status/paid/valid). Kỳ phí chỉ ghi cho người còn hiệu lực
 * (active|expiring) để "Doanh thu phí năm" = số đã đóng × 600.000đ như mock (Q-B62-6).
 * `updated_at` giảm dần theo thứ tự seed để bảng Admin (updated_at DESC) giữ thứ tự prototype.
 */
export async function seedFees(tx: DbTx): Promise<void> {
  const fees = buildFees();
  await tx.membershipFee.createMany({
    data: fees.map((f, i) => ({
      userId: f.userId,
      status: f.status,
      validUntil: f.validUntil ? new Date(f.validUntil) : null,
      paidAt: f.paidAt ? new Date(f.paidAt) : null,
      amount: f.amount,
      createdAt: new Date(f.joinedAt),
      updatedAt: new Date(MOCK_NOW - i * 60_000),
    })),
  });
  await tx.membershipFeePeriod.createMany({
    data: fees
      .filter((f) => f.paidAt && (f.status === 'active' || f.status === 'expiring'))
      .map((f) => {
        const start = Date.parse(f.paidAt ?? '');
        return {
          id: `demo-fee-${f.userId}`,
          userId: f.userId,
          startsAt: new Date(start),
          endsAt: new Date(start + YEAR_MS),
          amount: FEE_AMOUNT,
          source: 'transfer' as const,
          createdAt: new Date(start),
        };
      }),
  });
}
