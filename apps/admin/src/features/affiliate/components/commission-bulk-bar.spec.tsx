import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { affiliateTestContext } from '../tests/context';
import { CommissionBulkBar } from './commission-bulk-bar';

afterEach(cleanup);

describe('REQ-310 REQ-312 commission selection actions remain delegated to the parent', () => {
  it('delegates cancel, export and clear without changing selected money itself', () => {
    const onCancel = vi.fn(),
      onExport = vi.fn(),
      onClear = vi.fn();
    render(
      <CommissionBulkBar
        count={2}
        onCancel={onCancel}
        onExport={onExport}
        onClear={onClear}
        exportLoading={false}
      />,
      affiliateTestContext(),
    );
    expect(screen.getByText(/^Đã chọn/).textContent?.trim()).toBe('Đã chọn 2');
    fireEvent.click(screen.getByRole('button', { name: /^Hủy$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Xuất CSV$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Bỏ chọn$/ }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onExport).toHaveBeenCalledOnce();
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('does not expose bulk actions with no selected row', () => {
    render(
      <CommissionBulkBar
        count={0}
        onCancel={vi.fn()}
        onExport={vi.fn()}
        onClear={vi.fn()}
        exportLoading={false}
      />,
      affiliateTestContext(),
    );
    expect(screen.queryByRole('button', { name: /^Hủy$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Xuất CSV$/ })).toBeNull();
  });
});
