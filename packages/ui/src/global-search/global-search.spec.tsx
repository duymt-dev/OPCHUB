import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GlobalSearch } from './global-search';
import type { GlobalSearchProps } from './types';

afterEach(cleanup);
function mount(overrides: Partial<GlobalSearchProps> = {}) {
  const props: GlobalSearchProps = {
    placeholder: 'Search',
    emptyText: 'No results',
    clearLabel: 'Clear',
    groups: [
      { kind: 'store', label: 'Stores', items: [{ id: 's1', title: 'Coffee', sub: 'Local' }] },
    ],
    open: true,
    onQuery: vi.fn(),
    onPick: vi.fn(),
    ...overrides,
  };
  render(<GlobalSearch {...props} />);
  return { ...props, input: screen.getByRole('combobox') };
}
describe('GlobalSearch BR-491 interaction', () => {
  it('only opens at two trimmed characters, keeps text on outside click and reopens on focus', () => {
    const { input } = mount();
    fireEvent.change(input, { target: { value: ' a ' } });
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.change(input, { target: { value: 'co' } });
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe(screen.getByRole('listbox').id);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).toBeNull();
    expect((input as HTMLInputElement).value).toBe('co');
    fireEvent.focus(input);
    expect(screen.getByRole('option').textContent).toContain('Coffee');
  });
  it.each(['Escape', 'clear'])('clears and closes via %s', (action) => {
    const { input, onQuery } = mount();
    fireEvent.change(input, { target: { value: 'co' } });
    if (action === 'Escape') fireEvent.keyDown(input, { key: 'Escape' });
    else fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect((input as HTMLInputElement).value).toBe('');
    expect(onQuery).toHaveBeenLastCalledWith('');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
  it.each(['Enter', 'click'])('selects first hit and clears via %s', (action) => {
    const { input, onPick, groups } = mount();
    fireEvent.change(input, { target: { value: 'co' } });
    if (action === 'Enter') fireEvent.submit(screen.getByRole('search'));
    else fireEvent.click(screen.getByRole('option'));
    expect(onPick).toHaveBeenCalledWith('store', groups[0]?.items[0]);
    expect((input as HTMLInputElement).value).toBe('');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
  it('shows empty text, does nothing on Enter and respects forbidden open=false', () => {
    const { input, onPick } = mount({ groups: [] });
    fireEvent.change(input, { target: { value: 'zz' } });
    expect(screen.getByText('No results')).toBeTruthy();
    fireEvent.submit(screen.getByRole('search'));
    expect(onPick).not.toHaveBeenCalled();
    cleanup();
    const forbidden = mount({ open: false });
    fireEvent.change(forbidden.input, { target: { value: 'co' } });
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
