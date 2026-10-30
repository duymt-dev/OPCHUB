import type { DirectorConfig } from '@opchub/shared/api-domains';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from 'antd';
import { ApiError } from '@/lib/api-client';
import { useGrants } from '@/lib/permissions';
import * as api from '../regional-directors-api';
import { affiliateTestContext, setupAffiliateBrowser } from '../tests/context';
import { candidateFixture, directorFixture } from '../tests/regional-directors';
import { RegionalDirectorConfig } from './regional-director-config';

vi.mock('@/lib/permissions', () => ({ useGrants: vi.fn() }));
vi.mock('../regional-directors-api', async (original) => ({
  ...(await original<typeof api>()),
  fetchDirectors: vi.fn(),
  fetchDirectorHistory: vi.fn(),
  fetchDirectorMembers: vi.fn(),
  appointDirector: vi.fn(),
  updateDirector: vi.fn(),
  revokeDirector: vi.fn(),
}));
let state: DirectorConfig;
beforeAll(setupAffiliateBrowser);
beforeEach(() => {
  vi.clearAllMocks();
  state = directorFixture();
  vi.mocked(useGrants).mockReturnValue({
    keys: ['affiliate.view', 'affiliate.gdv'],
    roleName: 'Any role',
    previewing: false,
  });
  vi.mocked(api.fetchDirectors).mockImplementation(() => Promise.resolve(structuredClone(state)));
  vi.mocked(api.fetchDirectorHistory).mockResolvedValue({ items: [], nextCursor: null });
  vi.mocked(api.fetchDirectorMembers).mockResolvedValue(candidateFixture);
  vi.mocked(api.revokeDirector).mockImplementation((region) => {
    state.slots = state.slots.map((slot) =>
      slot.region === region ? { ...slot, version: slot.version + 1, incumbent: null } : slot,
    );
    return Promise.resolve(structuredClone(state));
  });
  vi.mocked(api.updateDirector).mockImplementation((region, body) => {
    state.slots = state.slots.map((slot) =>
      slot.region === region ? { ...slot, ...body, version: slot.version + 1 } : slot,
    );
    const assigned = new Set(state.slots.flatMap((slot) => slot.provinces));
    state.unassignedProvinces = ['Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Huế'].filter(
      (province) => !assigned.has(province),
    );
    return Promise.resolve(structuredClone(state));
  });
  vi.mocked(api.appointDirector).mockResolvedValue(directorFixture());
});
afterEach(cleanup);
const show = () =>
  render(
    <App>
      <RegionalDirectorConfig />
    </App>,
    affiliateTestContext(),
  );
const north = () => screen.getByRole('article', { name: 'Miền Bắc' });
const ready = () => waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(3));

it('REQ-616 read-only renders all three permanent slots and disables all mutations without loading candidates', async () => {
  vi.mocked(useGrants).mockReturnValue({
    keys: ['affiliate.view'],
    roleName: 'Read only',
    previewing: false,
  });
  show();
  await ready();
  expect(screen.getByText('Bạn chỉ có quyền xem cấu hình Giám đốc Vùng.')).toBeTruthy();
  for (const button of screen.getAllByRole('button'))
    expect(button.hasAttribute('disabled')).toBe(true);
  expect(
    within(north()).getByRole<HTMLInputElement>('textbox', { name: 'Số tài khoản' }).disabled,
  ).toBe(true);
  expect(api.fetchDirectorMembers).not.toHaveBeenCalled();
});

it('REQ-616 revoke requires confirmation, sends slot version and keeps the permanent region/provinces/bank', async () => {
  show();
  await ready();
  fireEvent.click(within(north()).getByRole('button', { name: 'Thu hồi' }));
  expect(api.revokeDirector).not.toHaveBeenCalled();
  const modal = await screen.findByRole('dialog');
  expect(within(modal).getByText(/Giữ nguyên hạn phí trước bổ nhiệm/)).toBeTruthy();
  fireEvent.click(within(modal).getByRole('button', { name: 'Thu hồi' }));
  await waitFor(() => expect(api.revokeDirector).toHaveBeenCalledWith('north', 3));
  await waitFor(() => expect(within(north()).getByText('Chưa có GĐ Vùng')).toBeTruthy());
  expect(screen.getAllByRole('article')).toHaveLength(3);
  expect(within(north()).getByRole('button', { name: 'Hà Nội' }).getAttribute('aria-pressed')).toBe(
    'true',
  );
  expect(
    within(north()).getByRole<HTMLInputElement>('textbox', { name: 'Số tài khoản' }).value,
  ).toBe('123456789');
});

it('REQ-616 province mutation preserves bank and uses the current version, with server-owned counts/config', async () => {
  show();
  await ready();
  fireEvent.click(within(north()).getByRole('button', { name: 'Hà Nội' }));
  await waitFor(() =>
    expect(api.updateDirector).toHaveBeenCalledWith('north', {
      version: 3,
      provinces: [],
      bank: directorFixture().slots[0]?.bank,
    }),
  );
  await waitFor(() =>
    expect(
      within(north()).getByRole('button', { name: 'Hà Nội' }).getAttribute('aria-pressed'),
    ).toBe('false'),
  );
});

it('REQ-616 bank drafts validate as a complete account, normalize safely and preserve invalid input without writes', async () => {
  show();
  await ready();
  const account = within(north()).getByRole<HTMLInputElement>('textbox', { name: 'Số tài khoản' });
  fireEvent.change(account, { target: { value: 'x' } });
  fireEvent.click(within(north()).getByRole('button', { name: 'Lưu tài khoản nhận' }));
  await waitFor(() =>
    expect(within(north()).getByText('Số tài khoản gồm 6–19 chữ số')).toBeTruthy(),
  );
  expect(api.updateDirector).not.toHaveBeenCalled();
  expect(account.value).toBe('x');
  fireEvent.change(account, { target: { value: '0011 0010 4567' } });
  fireEvent.change(within(north()).getByRole('textbox', { name: 'Chủ tài khoản' }), {
    target: { value: 'Trần Quốc Bảo' },
  });
  fireEvent.click(within(north()).getByRole('button', { name: 'Lưu tài khoản nhận' }));
  await waitFor(() =>
    expect(api.updateDirector).toHaveBeenCalledWith('north', {
      version: 3,
      provinces: ['Hà Nội'],
      bank: { bankName: 'Vietcombank', bankNo: '001100104567', bankHolder: 'TRAN QUOC BAO' },
    }),
  );
});

it('REQ-616 failed bank write leaves the draft available for retry without changing config', async () => {
  vi.mocked(api.updateDirector).mockRejectedValue(new ApiError('CONFLICT', 409, 'Stale slot'));
  show();
  await ready();
  const account = within(north()).getByRole<HTMLInputElement>('textbox', { name: 'Số tài khoản' });
  fireEvent.change(account, { target: { value: '999888777' } });
  fireEvent.click(within(north()).getByRole('button', { name: 'Lưu tài khoản nhận' }));
  await waitFor(() => expect(api.updateDirector).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(api.fetchDirectors).toHaveBeenCalledTimes(2));
  expect(account.value).toBe('999888777');
  expect(within(north()).getByRole('button', { name: 'Lưu tài khoản nhận' })).toBeTruthy();
});

it('REQ-616 appointment searches registered members and submits a versioned empty slot, not a new account', async () => {
  show();
  await ready();
  fireEvent.click(
    within(screen.getByRole('article', { name: 'Miền Trung & Tây Nguyên' })).getByRole('button', {
      name: '+ Bổ nhiệm GĐ Vùng',
    }),
  );
  const modal = await screen.findByRole('dialog');
  const search = within(modal).getByRole('combobox', { name: 'Thành viên phụ trách' });
  fireEvent.change(search, { target: { value: 'candidate' } });
  await waitFor(() => expect(api.fetchDirectorMembers).toHaveBeenCalledWith('candidate', 1));
  fireEvent.mouseDown(search);
  fireEvent.click(await screen.findByText('Thành viên mới · candidate@example.com · TV000002'));
  fireEvent.click(within(modal).getByRole('button', { name: '+ Bổ nhiệm GĐ Vùng' }));
  await waitFor(() =>
    expect(api.appointDirector).toHaveBeenCalledWith({
      region: 'central',
      userId: 'candidate-two',
      version: 3,
    }),
  );
});

it('REQ-616 config read error exposes retry and recovers without showing fake slots', async () => {
  vi.mocked(api.fetchDirectors).mockRejectedValueOnce(new Error('Offline'));
  show();
  await screen.findByText('Không tải được cấu hình Giám đốc Vùng');
  expect(screen.queryAllByRole('article')).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  await ready();
});

it('REQ-616 assigned provinces do not falsely imply a vacant slot has an incumbent', async () => {
  state.unassignedProvinces = [];
  show();
  await ready();
  expect(screen.getByText('Tất cả 34 tỉnh/thành đã được phân vùng')).toBeTruthy();
  expect(screen.queryByText('Tất cả 34 tỉnh/thành đã có GĐ Vùng phụ trách')).toBeNull();
});

it('REQ-616 appointment cancellation never issues a write', async () => {
  show();
  await ready();
  const open = screen.getAllByRole('button', { name: '+ Bổ nhiệm GĐ Vùng' })[0];
  if (!open) throw new Error('Missing appointment control');
  fireEvent.click(open);
  const modal = await screen.findByRole('dialog');
  act(() => {
    fireEvent.click(within(modal).getByRole('button', { name: 'Hủy' }));
  });
  expect(api.appointDirector).not.toHaveBeenCalled();
});

it('REQ-616 clearing the entire receiving account sends null, never incomplete bank fields', async () => {
  show();
  await ready();
  const clear = north().querySelector('.ant-select-clear');
  if (!clear) throw new Error('Missing bank clear control');
  fireEvent.click(clear);
  fireEvent.change(within(north()).getByRole('textbox', { name: 'Số tài khoản' }), {
    target: { value: '' },
  });
  fireEvent.change(within(north()).getByRole('textbox', { name: 'Chủ tài khoản' }), {
    target: { value: '' },
  });
  fireEvent.click(within(north()).getByRole('button', { name: 'Lưu tài khoản nhận' }));
  await waitFor(() =>
    expect(api.updateDirector).toHaveBeenCalledWith('north', {
      version: 3,
      provinces: ['Hà Nội'],
      bank: null,
    }),
  );
});

it('REQ-616 full slots show feedback without opening an unusable appointment form', async () => {
  const incumbent = state.slots[0]?.incumbent;
  if (!incumbent) throw new Error('Missing incumbent fixture');
  state.slots = state.slots.map((slot) => ({
    ...slot,
    incumbent: { ...incumbent, id: slot.region },
  }));
  show();
  await ready();
  fireEvent.click(screen.getByRole('button', { name: '+ Bổ nhiệm GĐ Vùng' }));
  expect(
    await screen.findByText(
      'Cả ba vùng đã có người phụ trách. Thu hồi người đương nhiệm trước khi bổ nhiệm người khác.',
    ),
  ).toBeTruthy();
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(api.fetchDirectorMembers).not.toHaveBeenCalled();
  expect(api.appointDirector).not.toHaveBeenCalled();
});
