import type { AccountType, SystemRole, UserStatus } from '@opchub/shared';
import type { Me } from '@opchub/shared/api';
import type { AccessClaimsInput } from '@/common/auth';
import type { FeeSnapshot } from '../ports';

/** Cột user cần để dựng `me` / claim — repository chỉ select đúng các cột này */
export interface SessionUser {
  id: string;
  memberCode: string;
  fullName: string;
  email: string;
  accountType: AccountType;
  systemRole: SystemRole;
  status: UserStatus;
  avatarUrl: string | null;
  permVersion: number;
  mustChangePassword: boolean;
  /** V4-607: null = chưa khai báo sau đăng nhập */
  declaredAt: Date | null;
  /** V4-612: hạn khoá (null = không hạn / không khoá) */
  lockedUntil: Date | null;
}

/** D-41: nội dung chuyển khoản theo Mã TV */
export const transferRefOf = (memberCode: string) => `OPCHUB ${memberCode}`;

/** D-14: Nhà đầu tư không đóng phí → `membershipFee: null` */
export function toMe(u: SessionUser, fee: FeeSnapshot | null): Me {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    accountType: u.accountType,
    systemRole: u.systemRole,
    status: u.status,
    avatarUrl: u.avatarUrl,
    // V4-607: NĐT không khai báo (D-14)
    needsDeclaration: u.declaredAt === null && u.accountType !== 'investor',
    membershipFee:
      fee && u.accountType !== 'investor'
        ? {
            status: fee.status,
            validUntil: fee.validUntil?.toISOString() ?? null,
            transferRef: transferRefOf(u.memberCode),
            amount: fee.amount,
          }
        : null,
  };
}

export function toClaims(u: SessionUser, fee: FeeSnapshot | null): AccessClaimsInput {
  const me = toMe(u, fee);
  return {
    sub: u.id,
    accountType: u.accountType,
    systemRole: u.systemRole,
    permVersion: u.permVersion,
    membershipFee: me.membershipFee
      ? { status: me.membershipFee.status, validUntil: me.membershipFee.validUntil }
      : null,
    mustChangePassword: u.mustChangePassword,
  };
}
