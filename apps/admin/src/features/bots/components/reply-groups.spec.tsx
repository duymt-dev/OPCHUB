import { cleanup, render, screen } from '@testing-library/react';
import { botTestContext } from '../tests/context';
import { replyFixture } from '../tests/reply-fixture';
import { ReplyGroups } from './reply-groups';
import { ReplyHistory } from './reply-history';

afterEach(cleanup);
it('preserves server ranking while selecting the first eligible group, never a fabricated persona', () => {
  render(<ReplyGroups data={replyFixture()} />, botTestContext());
  expect(screen.getByText('3 tin chờ trong 2 nhóm')).toBeTruthy();
  expect(screen.getByText('Chưa có persona hoạt động')).toBeTruthy();
  expect(screen.getByText('Ưu tiên kế tiếp').parentElement?.parentElement?.textContent).toContain(
    'Nhóm hợp lệ',
  );
  expect(screen.getByRole('region', { name: 'Tin chờ trả lời' }).textContent).toContain(
    'Xin chia sẻ kinh nghiệm',
  );
  expect(screen.getByText('2 persona có thể tham gia trả lời')).toBeTruthy();
  expect(screen.getByText('Chọn khi trả lời')).toBeTruthy();
  expect(screen.getByText(/09:00/)).toBeTruthy();
});
it('shows explicit empty pending/history states without a preview', () => {
  const data = replyFixture();
  data.groups = [];
  data.groupCount = 0;
  data.pendingTotal = 0;
  render(
    <>
      <ReplyGroups data={data} />
      <ReplyHistory history={[]} />
    </>,
    botTestContext(),
  );
  expect(screen.queryByRole('region', { name: 'Tin chờ trả lời' })).toBeNull();
  expect(screen.getByText('Không có tin đang chờ phản hồi.')).toBeTruthy();
  expect(screen.getByText('Chưa có phản hồi nào. AI sẽ tự quét các nhóm và trả lời.')).toBeTruthy();
});
it('bounds history to20 actual publications and renders content as text', () => {
  const history = Array.from({ length: 21 }, (_, i) => ({
    id: `h${i}`,
    groupId: 'g',
    groupName: 'Nhóm thật',
    roomId: 'r',
    replyToId: `m${i}`,
    personaName: `Persona ${i}`,
    body: '<script>unsafe</script>',
    createdAt: '2026-10-28T02:00:00.000Z',
  }));
  render(<ReplyHistory history={history} />, botTestContext());
  expect(screen.getAllByText('<script>unsafe</script>')).toHaveLength(20);
  expect(screen.getByText('Persona 19')).toBeTruthy();
  expect(screen.queryByText('Persona 20')).toBeNull();
  expect(document.querySelector('script')).toBeNull();
});

it('marks the actual running group instead of promising the next group is already running', () => {
  const data = replyFixture();
  data.run = {
    id: 'run',
    groupId: 'g2',
    groupName: 'Nhóm hợp lệ',
    status: 'running',
    total: 1,
    processed: 0,
    posted: 0,
    manual: false,
    createdAt: '2026-10-28T02:00:00.000Z',
  };
  render(<ReplyGroups data={data} />, botTestContext());
  expect(screen.getByText('Đang trả lời').parentElement?.parentElement?.textContent).toContain(
    'Nhóm hợp lệ',
  );
  expect(screen.queryByText('Ưu tiên kế tiếp')).toBeNull();
});
