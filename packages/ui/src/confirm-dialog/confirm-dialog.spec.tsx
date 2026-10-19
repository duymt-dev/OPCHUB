import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ConfirmDialog, type ConfirmRequest } from './confirm-dialog';

const req = (onOk = vi.fn()): ConfirmRequest => ({
  title: 'Xóa nhóm?',
  body: 'Không hoàn tác.',
  okLabel: 'Xóa',
  cancelLabel: 'Huỷ',
  danger: true,
  onOk,
});

describe('ConfirmDialog', () => {
  it('BUG-044 ConfirmDialog Esc/nền huỷ, busy khoá nút', () => {
    const onClose = vi.fn();
    const onOk = vi.fn();
    const { container, rerender } = render(
      <ConfirmDialog req={req(onOk)} busy={false} onClose={onClose} />,
    );
    expect(screen.getByRole('alertdialog', { name: 'Xóa nhóm?' })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    const backdrop = container.querySelector('button[aria-hidden="true"]');
    expect(backdrop).toBeTruthy();
    if (backdrop) fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);

    rerender(<ConfirmDialog req={req(onOk)} busy onClose={onClose} />);
    const ok = screen.getByRole('button', { name: 'Xóa' });
    expect((ok as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(ok);
    expect(onOk).not.toHaveBeenCalled();
  });

  it('BUG-044 không truyền busy → bấm nút chính đóng hộp rồi chạy onOk', () => {
    const onClose = vi.fn();
    const onOk = vi.fn();
    render(<ConfirmDialog req={req(onOk)} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Xóa' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOk).toHaveBeenCalledTimes(1);
  });

  it('BUG-044 req null → không vẽ gì', () => {
    const { container } = render(<ConfirmDialog req={null} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });
});
