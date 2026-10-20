import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AffiliatePagination } from './affiliate-pagination';

afterEach(cleanup);

describe('REQ-312 all Affiliate tables expose URL pagination controls', () => {
  it('keeps the detail size-eight option available after selecting another page size', () => {
    render(
      <AffiliatePagination
        total={14}
        params={{ page: 1, size: 10 }}
        sizes={[8, 10, 20, 50, 100]}
        update={vi.fn()}
      />,
    );
    const options = screen.getAllByRole<HTMLOptionElement>('option');
    expect(options.map((option) => option.value)).toEqual(['8', '10', '20', '50', '100']);
  });
  it('changes page size with an explicit reset to page one', () => {
    const update = vi.fn();
    render(<AffiliatePagination total={62} params={{ page: 3, size: 10 }} update={update} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Số dòng mỗi trang' }), {
      target: { value: '50' },
    });
    expect(update).toHaveBeenCalledExactlyOnceWith({ size: 50, page: 1 });
    expect(screen.getByRole<HTMLSelectElement>('combobox').value).toBe('10');
  });

  it('requests a different page without replacing the selected size', () => {
    const update = vi.fn();
    render(<AffiliatePagination total={62} params={{ page: 1, size: 20 }} update={update} />);
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect(update).toHaveBeenCalledExactlyOnceWith({ page: 2 });
    expect(screen.getByRole<HTMLSelectElement>('combobox').value).toBe('20');
  });

  it('does not render misleading pagination for an empty result', () => {
    render(<AffiliatePagination total={0} params={{ page: 1, size: 10 }} update={vi.fn()} />);
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('labels the actual domain unit without removing page-size controls', () => {
    render(
      <AffiliatePagination
        total={3}
        params={{ page: 1, size: 10 }}
        update={vi.fn()}
        unit="tháng"
      />,
    );
    expect(screen.getByRole('navigation', { name: /^Hiển thị 1–3 \/ 3 tháng$/ })).toBeTruthy();
    expect(screen.getByRole<HTMLSelectElement>('combobox').value).toBe('10');
  });
});
