import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { bulkItem, ITEM_ID, TYPE_ID } from '../../tests/bulk-fixture';
import { botTestContext } from '../../tests/context';
import { BulkResults } from './bulk-results';

afterEach(cleanup);
const defaults = () => ({
  items: [bulkItem()],
  personas: [],
  disabled: false,
  hasMore: false,
  fetching: false,
  onMore: vi.fn(),
  onSelect: vi.fn(),
});
it('D-112 renders actual ready text, flags missing personas honestly and selects by durable item ID', () => {
  const props = defaults();
  render(<BulkResults {...props} />, botTestContext());
  expect(screen.getByText(/Hỏi về AI/)).toBeTruthy();
  expect(screen.getAllByText('Persona không còn khả dụng').length).toBeGreaterThan(0);
  const checkbox = screen.getByRole<HTMLInputElement>('checkbox');
  expect(checkbox.checked).toBe(true);
  fireEvent.click(checkbox);
  expect(props.onSelect).toHaveBeenCalledWith(ITEM_ID, false);
});
it('D-112 permanently saved items cannot be unchecked; paging is explicit', () => {
  const props = {
    ...defaults(),
    items: [bulkItem({ savedScriptId: 'saved1' }), bulkItem({ id: TYPE_ID, ordinal: 1 })],
    hasMore: true,
  };
  render(<BulkResults {...props} />, botTestContext());
  const inputs = screen.getAllByRole<HTMLInputElement>('checkbox');
  expect(inputs[0]?.disabled).toBe(true);
  expect(inputs[1]?.disabled).toBe(false);
  expect(screen.getByText('Đã lưu')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Tải thêm kết quả' }));
  expect(props.onMore).toHaveBeenCalledTimes(1);
});
it('D-112 read-only/busy results cannot change selection and an empty batch fabricates no dialogue', () => {
  const props = defaults();
  const { rerender } = render(<BulkResults {...props} disabled />, botTestContext());
  expect(screen.getByRole<HTMLInputElement>('checkbox').disabled).toBe(true);
  rerender(<BulkResults {...props} items={[]} />);
  expect(screen.queryByRole('checkbox')).toBeNull();
});
