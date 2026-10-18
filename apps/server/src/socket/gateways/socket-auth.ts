import { Injectable } from '@nestjs/common';
import { ACCOUNT_LOCKED_MESSAGE } from '@opchub/shared';
import { z } from 'zod';
import {
  type AccessClaims,
  AccessTokenService,
  AuthStateService,
  isFeeUsable,
} from '@/common/auth';
import { AppError, forbidden, unauthorized } from '@/common/errors';

/**
 * `scope: 'membership'` (TIP-V2-108, V2Q-92): kết nối CHỈ để nhận `membership.updated` trong lúc
 * popup phí bắt buộc đang mở — TK chưa/hết phí được vào `user:{id}`, mọi sự kiện client bị chặn.
 */
const handshakeSchema = z.object({
  token: z.string().min(1),
  scope: z.enum(['membership']).optional(),
});

export const MEMBERSHIP_REQUIRED_MESSAGE = 'Vui lòng đóng phí thành viên để tiếp tục';

export interface SocketPrincipal {
  user: AccessClaims;
  /** true = chỉ nhận sự kiện `user:{id}` (chưa/hết phí, scope membership) */
  limited: boolean;
}

/**
 * Handshake (S-09): access JWT trong `auth.token`, trạng thái từ Redis (S-03) — không truy vấn DB.
 * Cùng luật với guard REST: khoá → FORBIDDEN, version đổi → UNAUTHORIZED, chưa phí → MEMBERSHIP_REQUIRED
 * (phí hết hạn tính theo `valid_until` tức thời — D-57, BUG-018).
 * Tài khoản quản trị (có quyền `c.mod`) xem chat chỉ đọc qua REST, không cần socket.
 */
@Injectable()
export class SocketAuth {
  constructor(
    private readonly tokens: AccessTokenService,
    private readonly state: AuthStateService,
  ) {}

  async authenticate(auth: unknown): Promise<SocketPrincipal> {
    const parsed = handshakeSchema.safeParse(auth);
    if (!parsed.success) throw unauthorized('Vui lòng đăng nhập');
    const user = await this.tokens.verify(parsed.data.token);
    const [locked, version, fee] = await Promise.all([
      this.state.isLocked(user.sub),
      this.state.permVersion(user.sub),
      this.state.fee(user.sub),
    ]);
    if (locked) throw forbidden(ACCOUNT_LOCKED_MESSAGE);
    if (version !== null && version > user.permVersion) {
      throw unauthorized('Phiên đăng nhập đã thay đổi, vui lòng đăng nhập lại');
    }
    if (user.accountType === 'investor') {
      throw new AppError('MEMBERSHIP_REQUIRED', MEMBERSHIP_REQUIRED_MESSAGE);
    }
    if (isFeeUsable(fee ?? user.membershipFee, new Date())) return { user, limited: false };
    if (parsed.data.scope === 'membership') return { user, limited: true };
    throw new AppError('MEMBERSHIP_REQUIRED', MEMBERSHIP_REQUIRED_MESSAGE);
  }
}
