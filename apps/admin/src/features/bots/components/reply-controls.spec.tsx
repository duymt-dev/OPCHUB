import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { botTestContext } from '../tests/context';
import { replyFixture } from '../tests/reply-fixture';
import { ReplyControls } from './reply-controls';

afterEach(cleanup);
function mount({ disabled = false, running = false, fieldError = false } = {}) {
  const data = replyFixture();
  if (running)
    data.run = {
      id: 'run1',
      groupId: 'g2',
      groupName: 'Nhóm hợp lệ',
      status: 'running',
      total: 3,
      processed: 1,
      posted: 1,
      manual: true,
      createdAt: '2026-10-28T02:00:00.000Z',
    };
  const onPatch = vi.fn(),
    onScan = vi.fn(),
    onStop = vi.fn();
  render(
    <ReplyControls
      data={data}
      groupCount={90}
      disabled={disabled}
      error={fieldError ? 'Không lưu được' : null}
      fields={fieldError ? [{ path: 'sampleSize', message: 'Tối đa 200' }] : []}
      onPatch={onPatch}
      onScan={onScan}
      onStop={onStop}
    />,
    botTestContext(),
  );
  return { onPatch, onScan, onStop };
}
it('displays monitored rather than pending group count and permits manual scan with auto off', () => {
  const { onScan, onPatch } = mount();
  expect(screen.getByText('Đã tắt tự quét · 90 nhóm ·')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Quét & trả lời ngay' }));
  expect(onScan).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('switch', { name: 'Tự động' }));
  expect(onPatch).toHaveBeenCalledWith({ autoEnabled: true });
});
it('saves bounded integer settings on blur, not incomplete or invalid edits', () => {
  const { onPatch } = mount();
  const input = screen.getByLabelText('Số tin gần nhất cần đọc');
  for (const value of ['', '0', '201', '1.5']) {
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
  }
  expect(onPatch).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: '200' } });
  fireEvent.blur(input);
  expect(onPatch).toHaveBeenCalledWith({ sampleSize: 200 });
  const delay = screen.getByLabelText('Giãn cách giữa 2 phản hồi (giây)');
  fireEvent.change(delay, { target: { value: '600' } });
  fireEvent.blur(delay);
  expect(onPatch).toHaveBeenCalledWith({ delaySeconds: 600 });
});
it('disables every mutation while read-only or pending', () => {
  const { onScan, onStop } = mount({ disabled: true, running: true });
  for (const control of [
    ...screen.getAllByRole('button'),
    ...screen.getAllByRole('spinbutton'),
    screen.getByRole('switch'),
  ])
    expect(control.hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Dừng lượt trả lời' }));
  expect(onScan).not.toHaveBeenCalled();
  expect(onStop).not.toHaveBeenCalled();
});
it('renders real run progress and explicit stop while blocking a duplicate scan', () => {
  const { onStop } = mount({ running: true });
  expect(screen.getByRole('status').textContent).toContain('1/3 tin · 1 phản hồi');
  expect(screen.queryByRole('button', { name: 'Quét & trả lời ngay' })).toBeNull();
  const progress = screen.getByRole('progressbar', { name: 'Tiến độ trả lời' });
  expect(progress.getAttribute('value')).toBe('1');
  expect(progress.getAttribute('max')).toBe('3');
  fireEvent.click(screen.getByRole('button', { name: 'Dừng lượt trả lời' }));
  expect(onStop).toHaveBeenCalledWith('run1');
});
it('links server field errors to the input without hiding the mutation alert', () => {
  mount({ fieldError: true });
  const input = screen.getByRole('spinbutton', { name: /Số tin gần nhất/ });
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(document.getElementById(input.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
    'Tối đa 200',
  );
  expect(screen.getByRole('alert').textContent).toBe('Không lưu được');
});
