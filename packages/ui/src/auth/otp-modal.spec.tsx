import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OtpModal } from './otp-modal';
import type { OtpLabels } from './otp-modal';

const labels: OtpLabels = {
  title: 'Xác thực OTP',
  descLead: 'Mã đã gửi tới',
  descTail: '. Vui lòng kiểm tra email.',
  close: 'Đóng',
  codeLabel: 'Mã OTP 6 số',
  submit: 'Xác nhận',
  noCode: 'Chưa nhận được mã?',
  resend: 'Gửi lại mã',
};

describe('OtpModal', () => {
  it('disables input and submit button while submitting to prevent duplicate requests', () => {
    const onSubmit = vi.fn();
    const onResend = vi.fn();
    render(
      <OtpModal
        open={true}
        email="test@opchub.community"
        code="123456"
        labels={labels}
        submitting={true}
        onCode={vi.fn()}
        onSubmit={onSubmit}
        onResend={onResend}
        onClose={vi.fn()}
      />,
    );

    const input = screen.getByLabelText<HTMLInputElement>('Mã OTP 6 số');
    expect(input.disabled).toBe(true);

    const submitBtn = screen.getByRole<HTMLButtonElement>('button', { name: 'Xác nhận' });
    expect(submitBtn.disabled).toBe(true);
    expect(submitBtn.getAttribute('data-submitting')).toBe('true');

    fireEvent.click(submitBtn);
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();

    const resendBtn = screen.getByRole<HTMLButtonElement>('button', { name: 'Gửi lại mã' });
    expect(resendBtn.disabled).toBe(true);
    fireEvent.click(resendBtn);
    expect(onResend).not.toHaveBeenCalled();
  });

  it('allows submit and Enter key when code has 6 digits and not submitting', () => {
    const onSubmit = vi.fn();
    render(
      <OtpModal
        open={true}
        email="test@opchub.community"
        code="123456"
        labels={labels}
        submitting={false}
        onCode={vi.fn()}
        onSubmit={onSubmit}
        onResend={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const submitBtn = screen.getByRole<HTMLButtonElement>('button', { name: 'Xác nhận' });
    expect(submitBtn.disabled).toBe(false);
    expect(submitBtn.getAttribute('data-ready')).toBe('true');

    fireEvent.click(submitBtn);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    const input = screen.getByLabelText<HTMLInputElement>('Mã OTP 6 số');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });
});
