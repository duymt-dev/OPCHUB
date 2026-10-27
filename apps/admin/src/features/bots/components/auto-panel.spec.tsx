import { cleanup, render, screen } from '@testing-library/react';
import { botSettingsSchema } from '@opchub/shared/api-domains';
import { botTestContext } from '../tests/context';
import { AutoPanel } from './auto-panel';

vi.mock('@/lib/permissions', () => ({ useCan: () => true }));
afterEach(cleanup);
const mount = () =>
  render(
    <AutoPanel
      settings={botSettingsSchema.parse({ enabled: true, delayMinutes: 1, topics: [] })}
      todayCount={0}
      onPatch={vi.fn()}
    />,
    botTestContext(),
  );

it('D-50 QT-07 explains direct scheduled posting rather than retired approval', () => {
  mount();
  expect(screen.getByText(/đăng từng lượt theo nhịp tự nhiên vào nhóm của persona/)).toBeTruthy();
  expect(screen.queryByText(/chỉ được đăng sau khi quản trị viên duyệt/)).toBeNull();
});
it('UAT-14 D-50 member replies are automatic, not approval drafts', () => {
  mount();
  expect(screen.getByRole('switch', { name: 'Tự trả lời thành viên thật' })).toBeTruthy();
  expect(screen.getByText(/Persona trong nhóm phản hồi khi thành viên nhắn tin/)).toBeTruthy();
  expect(screen.queryByText(/chờ duyệt rồi mới đăng/)).toBeNull();
});
