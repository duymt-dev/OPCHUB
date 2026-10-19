import { Injectable } from '@nestjs/common';
import { parseIdentifier } from '../domain/identifier';
import { UserRepository } from '../repositories/user.repository';
import { PasswordService } from './password.service';

/**
 * NA-01, D-62: đăng nhập Admin bằng TK thành viên — mật khẩu đúng → `WRONG_PORTAL` (admin-account
 * gọi, không đọc bảng `users` trực tiếp).
 */
@Injectable()
export class PortalCredentials {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
  ) {}

  async memberPasswordMatches(identifier: string, password: string): Promise<boolean> {
    const id = parseIdentifier(identifier);
    const user = id ? await this.users.findForLogin(id) : null;
    return user !== null && (await this.passwords.verify(user.passwordHash, password));
  }
}
