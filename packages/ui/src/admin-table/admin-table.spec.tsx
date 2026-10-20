import { cleanup, render } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AdminTable } from './admin-table';

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {
        return undefined;
      }
      unobserve() {
        return undefined;
      }
      disconnect() {
        return undefined;
      }
    },
  );
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
});
afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());
const data = Array.from({ length: 11 }, (_, i) => ({ id: String(i), name: `row ${i}` }));
const columns = [{ title: 'Name', dataIndex: 'name' }];

describe('AdminTable pagination contract', () => {
  it('REQ-311 default server pager remains backwards compatible', () => {
    const { container } = render(<AdminTable rowKey="id" columns={columns} data={data} />);
    expect(container.querySelector('.ant-pagination')).not.toBeNull();
    expect(container.querySelectorAll('tbody tr.ant-table-row')).toHaveLength(10);
  });
  it('REQ-311 explicit external pager disables AntD pagination rather than hiding it in CSS', () => {
    const { container } = render(
      <AdminTable rowKey="id" columns={columns} data={data} pagination={false} />,
    );
    expect(container.querySelector('.ant-pagination')).toBeNull();
    expect(container.querySelectorAll('tbody tr.ant-table-row')).toHaveLength(11);
  });
});
