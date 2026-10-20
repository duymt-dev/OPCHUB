import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { affiliateTestContext, setupAffiliateBrowser } from '../tests/context';
import { AgentBulkBar } from './agent-bulk-bar';

beforeAll(setupAffiliateBrowser);
afterEach(cleanup);

describe('REQ-308 REQ-312 agent card selection keeps its bulk actions', () => {
  it('wires edit, export and clear without creating replacement selection state', () => {
    const onEdit = vi.fn();
    const onExport = vi.fn();
    const onClear = vi.fn();
    render(
      <AgentBulkBar
        count={2}
        onEdit={onEdit}
        onExport={onExport}
        onClear={onClear}
        exportLoading={false}
      />,
      affiliateTestContext(),
    );
    expect(screen.getByText(/^Đã chọn/).textContent?.trim()).toBe('Đã chọn 2');
    fireEvent.click(screen.getByRole('button', { name: /^Đặt %$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Xuất CSV$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Bỏ chọn$/ }));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onExport).toHaveBeenCalledOnce();
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('does not offer bulk writes without a selected row', () => {
    render(
      <AgentBulkBar
        count={0}
        onEdit={vi.fn()}
        onExport={vi.fn()}
        onClear={vi.fn()}
        exportLoading={false}
      />,
      affiliateTestContext(),
    );
    expect(screen.queryByRole('button')).toBeNull();
  });
});
