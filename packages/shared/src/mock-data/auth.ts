import type { BizLookup, Me } from '../api';
import { members } from '../fixtures';

/** Dữ liệu giả cho luồng đăng ký / OTP / tra MST (fake provider, chỉ dev/test) */

/** Mã OTP hợp lệ duy nhất của MSW */
export const MOCK_OTP = '123456';

/** D-28: TK demo chưa đóng phí — dùng để dựng/chụp popup bắt phí */
export const UNPAID_DEMO = { email: 'do.haiyen@opchub.vn', pwd: 'User@2026', meId: 'm6' } as const;

/** Kết quả tra MST giống prototype (mọi MST hợp lệ đều trả về cùng một doanh nghiệp mẫu) */
export function mockBizLookup(taxCode: string): BizLookup {
  return {
    taxCode,
    companyName: 'Công ty TNHH Giải pháp MediaSoft',
    representative: 'Nguyễn Văn An',
    mainIndustry: '6201 – Lập trình máy vi tính',
    otherIndustries: [
      '6202 – Tư vấn máy vi tính và quản trị hệ thống',
      '6311 – Xử lý dữ liệu, cho thuê và các hoạt động liên quan',
      '4741 – Bán lẻ máy vi tính, phần mềm',
      '7310 – Quảng cáo',
    ],
  };
}

/** Mã thành viên TV000001… theo thứ tự seed — trùng với kho mock-domains (đối soát theo Mã TV, D-41) */
export const memberCode = (userId: string) =>
  `TV${String(members.findIndex((m) => m.id === userId) + 1).padStart(6, '0')}`;

export function unpaidMe(): Me | undefined {
  const m = members.find((x) => x.id === UNPAID_DEMO.meId);
  if (!m) return undefined;
  return {
    id: m.id,
    fullName: m.name,
    email: UNPAID_DEMO.email,
    accountType: m.type === 'biz' ? 'business' : 'personal',
    systemRole: 'member',
    status: 'active',
    avatarUrl: null,
    membershipFee: {
      status: 'pending_payment',
      validUntil: null,
      transferRef: `OPCHUB ${memberCode(m.id)}`,
      amount: 600000,
    },
  };
}

/** Thành viên vừa kích hoạt sau OTP (D-30: vào thẳng /community) */
export function newMemberMe(email: string, fullName: string): Me {
  return {
    id: `n-${email}`,
    fullName: fullName || 'Thành viên mới',
    email,
    accountType: 'personal',
    systemRole: 'member',
    status: 'active',
    avatarUrl: null,
    membershipFee: {
      status: 'pending_payment',
      validUntil: null,
      transferRef: 'OPCHUB NEW',
      amount: 600000,
    },
  };
}
