import { cleanup, render, screen } from '@testing-library/react';
import type { BotThread } from '@opchub/shared/api-domains';
import { botTestContext } from '../tests/context';
import { ThreadList } from './thread-list';

afterEach(cleanup);

const thread = (over: Partial<BotThread>): BotThread => ({
  id: 't1',
  scriptId: null,
  topic: 'Thuế cho người mới lập OPC',
  groupIds: ['c1'],
  groupNames: ['OPC Hà Nội'],
  status: 'done',
  isAuto: false,
  live: false,
  cursor: 3,
  total: 3,
  nextAt: null,
  kind: 'script',
  lines: [],
  createdAt: '2026-10-16T01:00:00.000Z',
  ...over,
});
const mount = (t: BotThread) =>
  render(
    <ThreadList
      threads={[t]}
      now={Date.parse('2026-10-16T02:00:00Z')}
      busy={false}
      onStop={vi.fn()}
    />,
    botTestContext(),
  );

describe('D-91 (4) nhãn trạng thái hội thoại như prototype v4', () => {
  it('đăng đủ mọi lượt → "Đã đăng", không nút Dừng', () => {
    mount(thread({}));
    expect(screen.getByText('Đã đăng', { exact: true })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Dừng' })).toBeNull();
  });

  it('dừng giữa chừng giữ tiến độ thật; đang chạy có nút Dừng', () => {
    mount(thread({ cursor: 1 }));
    expect(screen.getByText('Hoàn tất · lượt 1/3', { exact: true })).toBeTruthy();
    cleanup();
    mount(thread({ status: 'running', cursor: 1 }));
    expect(screen.getByText('Đang chạy · lượt 1/3', { exact: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Dừng' })).toBeTruthy();
  });
});
