import { Injectable } from '@nestjs/common';
import type { AdminEmailPort } from '@/modules/account';
import { AdminUserRepository } from '../repositories/admin-user.repository';

/** Hiện thực `ADMIN_EMAIL_PORT` cho account (RB-R03: đăng ký/SSO bằng email TK quản trị → 409) */
@Injectable()
export class AdminEmailService implements AdminEmailPort {
  constructor(private readonly users: AdminUserRepository) {}

  isAdminEmail(email: string): Promise<boolean> {
    return this.users.emailExists(email.trim().toLowerCase());
  }
}
