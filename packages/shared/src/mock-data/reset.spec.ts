import { describe, expect, it } from 'vitest';
import { PASSWORD_RESET_INVALID_MESSAGE } from '../errors';
import { MOCK_RESET_TOKEN, mockResetPassword } from './auth';
import { mockLogin } from './index';

const EMAIL = 'an.nguyen@mediasoft.vn';

describe('mockResetPassword (MSW, QT-02)', () => {
  it('QT-02 mật khẩu yếu → lỗi tại ô newPassword, link chưa bị dùng', () => {
    const r = mockResetPassword({ token: MOCK_RESET_TOKEN, newPassword: 'abc' }, false, EMAIL);
    expect(r).toMatchObject({ ok: false, field: 'newPassword' });
  });

  it('BUG-001 token sai hoặc đã dùng → RESET_INVALID', () => {
    const wrong = mockResetPassword({ token: 'khac', newPassword: 'Moi@20261' }, false, EMAIL);
    expect(wrong).toEqual({ ok: false, message: PASSWORD_RESET_INVALID_MESSAGE });
    const used = mockResetPassword(
      { token: MOCK_RESET_TOKEN, newPassword: 'Moi@20261' },
      true,
      EMAIL,
    );
    expect(used).toEqual({ ok: false, message: PASSWORD_RESET_INVALID_MESSAGE });
  });

  it('UAT-11 đặt lại xong → đăng nhập bằng mật khẩu mới, mật khẩu cũ bị từ chối', () => {
    expect(mockLogin(EMAIL, 'User@2026').ok).toBe(true);
    const r = mockResetPassword(
      { token: MOCK_RESET_TOKEN, newPassword: 'Moi@20261' },
      false,
      EMAIL,
    );
    expect(r).toEqual({ ok: true });
    expect(mockLogin(EMAIL, 'User@2026').ok).toBe(false);
    expect(mockLogin(EMAIL, 'Moi@20261').ok).toBe(true);
  });
});
