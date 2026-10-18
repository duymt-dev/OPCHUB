import { Injectable } from '@nestjs/common';
import { weakPasswordMessage } from '@opchub/shared';
import { MIN_PASSWORD_SCORE, passwordScore } from '@opchub/shared/api-domains';
import { AppError } from '@/common/errors';
import { AppSettingsService } from '@/modules/settings';
import { PasswordService } from './password.service';

/** Chính sách mật khẩu chung: đăng ký, đặt lại, đổi (`minPasswordLength` + điểm ≥ 3, D-44) */
@Injectable()
export class PasswordPolicyService {
  constructor(
    private readonly settings: AppSettingsService,
    private readonly passwords: PasswordService,
  ) {}

  /** Kiểm rồi băm; yếu → 400 gắn vào trường `field` */
  async hashChecked(password: string, field: string): Promise<string> {
    const { minPasswordLength } = await this.settings.security();
    if (password.length < minPasswordLength || passwordScore(password) < MIN_PASSWORD_SCORE) {
      const message = weakPasswordMessage(minPasswordLength);
      throw new AppError('VALIDATION_ERROR', message, [{ path: field, message }]);
    }
    return this.passwords.hash(password);
  }
}
