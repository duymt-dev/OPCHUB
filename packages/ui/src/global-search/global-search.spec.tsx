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
  const view = render(<GlobalSearch {...props} />);
  return {
    ...props,
    input: screen.getByRole('combobox'),
    rerenderGroups: (groups: GlobalSearchProps['groups']) =>
      view.rerender(<GlobalSearch {...props} groups={groups} />),
  };
}
describe('GlobalSearch BR-491 interaction', () => {
  it('REQ-625 hint threshold and keyboard without selectable hint or stale hits', () => {
    const { input, onPick } = mount({ hintText: 'Type two characters' });
    fireEvent.focus(input);
    expect(screen.getByRole('status').textContent).toBe('Type two characters');
    fireEvent.change(input, { target: { value: ' a ' } });
    expect(screen.queryByRole('option')).toBeNull();
    fireEvent.submit(screen.getByRole('search'));
    expect(onPick).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.focus(input);
    expect(screen.getByRole('status')).toBeTruthy();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('status')).toBeNull();
  });
  it('REQ-625 loading and error are not empty results or navigable stale rows', () => {
    const loading = mount({ loading: true, loadingText: 'Loading' });
    fireEvent.change(loading.input, { target: { value: 'co' } });
    expect(screen.getByRole('status').textContent).toBe('Loading');
    fireEvent.submit(screen.getByRole('search'));
    expect(loading.onPick).not.toHaveBeenCalled();
    cleanup();
    const failed = mount({ errorText: 'Failed' });
    fireEvent.change(failed.input, { target: { value: 'co' } });
    expect(screen.getByRole('alert').textContent).toBe('Failed');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
  it('REQ-625 keyword empty state is text and Enter does not navigate', () => {
    const { input, onPick } = mount({ groups: [], emptyQueryText: (q) => `No results for ${q}` });
    fireEvent.change(input, { target: { value: '<script>' } });
    expect(screen.getByRole('listbox').textContent).toBe('No results for <script>');
    expect(document.querySelector('script')).toBeNull();
    fireEvent.submit(screen.getByRole('search'));
    expect(onPick).not.toHaveBeenCalled();
  });
  const groups: GlobalSearchProps['groups'] = [
    {
      kind: 'store',
      label: 'Stores',
      items: [1, 2].map((n) => ({ id: `s${n}`, title: `Store ${n}`, sub: '' })),
    },
    {
      kind: 'need',
      label: 'Needs',
      items: [1, 2].map((n) => ({ id: `n${n}`, title: `Need ${n}`, sub: '' })),
    },
  ];
  it('crosses groups, enters third result, wraps in both directions and keeps ARIA selection', () => {
    const { input, onPick } = mount({ groups });
    fireEvent.change(input, { target: { value: 'co' } });
    for (let i = 0; i < 3; i++) fireEvent.keyDown(input, { key: 'ArrowDown' });
    const options = screen.getAllByRole('option');
    expect(input.getAttribute('aria-activedescendant')).toBe(options[2]?.id);
    expect(options[2]?.getAttribute('aria-selected')).toBe('true');
    fireEvent.submit(screen.getByRole('search'));
    expect(onPick).toHaveBeenCalledWith('need', groups[1]?.items[0]);
    fireEvent.change(input, { target: { value: 'co' } });
    fireEvent.mouseEnter(screen.getAllByRole('option')[0] as HTMLElement);
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[3]?.id);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[0]?.id);
  });
  it('mouse hover selects a result; a new response resets selection to Enter first hit', () => {
    const props = mount({ groups });
    fireEvent.change(props.input, { target: { value: 'co' } });
    fireEvent.mouseEnter(screen.getAllByRole('option')[3] as HTMLElement);
    expect(props.input.getAttribute('aria-activedescendant')).toBe(
      screen.getAllByRole('option')[3]?.id,
    );
    // React re-renders on the new caller-owned result array, not a comparison of hit IDs.
    props.rerenderGroups([...groups]);
    expect(props.input.hasAttribute('aria-activedescendant')).toBe(false);
    fireEvent.submit(screen.getByRole('search'));
    expect(props.onPick).toHaveBeenCalledWith('store', groups[0]?.items[0]);
  });
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
