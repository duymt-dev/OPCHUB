import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { BotScheduleControl } from '../types';
import { botTestContext } from '../tests/context';
import { ScheduleBar } from './schedule-bar';

afterEach(cleanup);
function mount(patch: Partial<BotScheduleControl> = {}, disabled = false, enabled = true) {
  const control: BotScheduleControl = {
    schedule: { fromDate: null, toDate: null, paused: false },
    state: 'live',
    error: null,
    fields: [],
    onPatch: vi.fn(),
    onToggle: vi.fn(),
    ...patch,
  };
  render(<ScheduleBar control={control} enabled={enabled} disabled={disabled} />, botTestContext());
  return control;
}
it('shows labelled date inputs, continuous schedule and an explicit pause control', () => {
  const control = mount();
  expect(screen.getByText('Chưa đặt lịch · bot chạy liên tục')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-10-21' } });
  expect(control.onPatch).toHaveBeenCalledWith({ fromDate: '2026-10-21' });
  fireEvent.click(screen.getByRole('button', { name: 'Tạm dừng bot' }));
  expect(control.onToggle).toHaveBeenCalledTimes(1);
});
it('formats calendar dates without a browser timezone shift and clears only dates', () => {
  const control = mount({
    schedule: { fromDate: '2026-10-21', toDate: '2026-10-22', paused: true },
    state: 'paused',
  });
  expect(screen.getByText('Lịch chạy: 21/10/2026 → 22/10/2026')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Chạy lại bot' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Xóa lịch' }));
  expect(control.onPatch).toHaveBeenCalledWith({ fromDate: null, toDate: null });
});
it('disables all writes while pending or read-only', () => {
  const control = mount({}, true);
  for (const button of screen.getAllByRole('button'))
    expect(button.hasAttribute('disabled')).toBe(true);
  expect(screen.getByLabelText('Từ ngày').hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Tạm dừng bot' }));
  expect(control.onToggle).not.toHaveBeenCalled();
});
it('links server validation to the date field and keeps a visible retryable alert', () => {
  mount({
    error: 'Lịch chạy không hợp lệ',
    fields: [{ path: 'toDate', message: 'Ngày kết thúc phải từ ngày bắt đầu' }],
  });
  expect(screen.getByRole('alert').textContent).toBe('Lịch chạy không hợp lệ');
  const input = screen.getByLabelText(/Đến ngày/);
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(document.getElementById(input.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
    'Ngày kết thúc phải từ ngày bắt đầu',
  );
});
it('makes explicit resume available after emergency disable, without presenting it as running', () => {
  mount({}, false, false);
  expect(screen.getByRole('button', { name: 'Chạy lại bot' })).toBeTruthy();
});
