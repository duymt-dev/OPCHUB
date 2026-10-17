import { Injectable, type OnModuleInit } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';

/** argon2id (auth-rbac.md). Hash giả để thời gian phản hồi không lộ email có tồn tại hay không. */
@Injectable()
export class PasswordService implements OnModuleInit {
  private dummyHash = '';

  async onModuleInit(): Promise<void> {
    this.dummyHash = await hash('opchub-dummy-password', { type: argon2id });
  }

  hash(plain: string): Promise<string> {
    return hash(plain, { type: argon2id });
  }

  /** Luôn chạy verify kể cả khi không có hash (chống dò tài khoản qua thời gian) */
  async verify(storedHash: string | null, plain: string): Promise<boolean> {
    try {
      const ok = await verify(storedHash ?? this.dummyHash, plain);
      return ok && storedHash !== null;
    } catch {
      return false;
    }
  }
}
