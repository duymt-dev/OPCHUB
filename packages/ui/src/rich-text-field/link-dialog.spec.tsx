import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { LINK_URL_RE, LinkDialog } from './link-dialog';

const setup = (initial: string | null = null) => {
  const h = { onInsert: vi.fn(), onRemove: vi.fn(), onClose: vi.fn() };
  render(<LinkDialog open initial={initial} {...h} />);
  return h;
};

describe('LinkDialog', () => {
  it('BUG-043 LinkDialog từ chối URL không http(s)', async () => {
    const h = setup();
    const input = await screen.findByLabelText('Đường dẫn');
    fireEvent.change(input, { target: { value: 'javascript:alert(1)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chèn' }));
    expect(h.onInsert).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('http://');
    expect(input.getAttribute('aria-invalid')).toBe('true');

    fireEvent.change(input, { target: { value: 'https://opchub.community' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(h.onInsert).toHaveBeenCalledWith('https://opchub.community');
    expect(LINK_URL_RE.test('ftp://x.vn')).toBe(false);
  });

  it('BUG-043 vùng chọn đang là liên kết → điền sẵn + Gỡ liên kết', async () => {
    const h = setup('https://a.vn');
    const input = await screen.findByLabelText<HTMLInputElement>('Đường dẫn');
    expect(input.value).toBe('https://a.vn');
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ liên kết' }));
    expect(h.onRemove).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }));
    expect(h.onClose).toHaveBeenCalled();
  });
});
