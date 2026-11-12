import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Pagination } from './pagination';
import { BulkBar } from './bulk-bar';

afterEach(cleanup);

describe('D-141 AC824-08 optional shared numeric presentation', () => {
  it('keeps default Pagination text, size values and numeric callback for Portal', () => {
    const onChange = vi.fn(),
      onSizeChange = vi.fn();
    render(
      <Pagination page={1} size={10} total={30} onChange={onChange} onSizeChange={onSizeChange} />,
    );
    expect(screen.getByRole('button', { name: 'Trang 2' }).textContent).toBe('2');
    expect(screen.getByRole('combobox', { name: 'Số dòng mỗi trang' }).textContent).toContain(
      '10 / trang',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Trang 2' }));
    expect(onChange).toHaveBeenCalledWith(2);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '20' } });
    expect(onSizeChange).toHaveBeenCalledWith(20);
  });

  it('formats button text only, keeping numeric page and size callbacks unchanged', () => {
    const onChange = vi.fn(),
      onSizeChange = vi.fn();
    const number = (n: number) => new Intl.NumberFormat('my-MM').format(n);
    render(
      <Pagination
        page={1}
        size={10}
        total={30}
        labels={{ number }}
        onChange={onChange}
        onSizeChange={onSizeChange}
      />,
    );
    const second = screen.getByRole('button', { name: 'Trang 2' });
    expect(second.textContent).toBe('၂');
    fireEvent.click(second);
    expect(onChange).toHaveBeenCalledWith(2);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '20' } });
    expect(onSizeChange).toHaveBeenCalledWith(20);
  });

  it('keeps default BulkBar selection text/callback and zero-count visibility for Portal', () => {
    const onClear = vi.fn();
    const view = render(<BulkBar count={1234} onClear={onClear} />);
    expect(screen.getByText(/^Đã chọn/).textContent).toBe('Đã chọn 1234 mục');
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ chọn' }));
    expect(onClear).toHaveBeenCalledOnce();
    view.rerender(<BulkBar count={0} onClear={onClear} />);
    expect(view.container.firstChild).toBeNull();
  });

  it('formats a count without changing its selection semantics or action callbacks', () => {
    const onClear = vi.fn();
    const formatCount = (n: number) => new Intl.NumberFormat('en-GB').format(n);
    const view = render(<BulkBar count={1234} formatCount={formatCount} onClear={onClear} />);
    expect(screen.getByText(/^Đã chọn/).textContent).toBe('Đã chọn 1,234 mục');
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ chọn' }));
    expect(onClear).toHaveBeenCalledOnce();
    view.rerender(<BulkBar count={0} formatCount={formatCount} onClear={onClear} />);
    expect(view.container.firstChild).toBeNull();
  });
});
