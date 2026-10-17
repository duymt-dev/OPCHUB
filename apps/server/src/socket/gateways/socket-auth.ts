import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { type AccessClaims, AccessTokenService, AuthStateService } from '@/common/auth';
import { isFeeActive } from '@/common/auth/auth-state.service';
import { AppError, forbidden, unauthorized } from '@/common/errors';

const handshakeSchema = z.object({ token: z.string().min(1) });

/**
 * Handshake (S-09): access JWT trong `auth.token`, trạng thái từ Redis (S-03) — không truy vấn DB.
 * Cùng luật với guard REST: khoá → FORBIDDEN, version đổi → UNAUTHORIZED, chưa phí → MEMBERSHIP_REQUIRED.
 * Tài khoản quản trị (có quyền `c.mod`) xem chat chỉ đọc qua REST, không cần socket.
 */
@Injectable()
export class SocketAuth {
  constructor(
    private readonly tokens: AccessTokenService,
    private readonly state: AuthStateService,
  ) {}

  async authenticate(auth: unknown): Promise<AccessClaims> {
    const parsed = handshakeSchema.safeParse(auth);
    if (!parsed.success) throw unauthorized('Vui lòng đăng nhập');
    const user = await this.tokens.verify(parsed.data.token);
    const [locked, version, fee] = await Promise.all([
      this.state.isLocked(user.sub),
      this.state.permVersion(user.sub),
      this.state.fee(user.sub),
    ]);
    if (locked) throw forbidden('Tài khoản đã bị khóa, liên hệ hỗ trợ');
    if (version !== null && version > user.permVersion) {
      throw unauthorized('Phiên đăng nhập đã thay đổi, vui lòng đăng nhập lại');
    }
    const current = fee ?? user.membershipFee;
    if (user.accountType === 'investor' || !current || !isFeeActive(current.status)) {
      throw new AppError('MEMBERSHIP_REQUIRED', 'Vui lòng đóng phí thành viên để tiếp tục');
    }
    return user;
  }
}
