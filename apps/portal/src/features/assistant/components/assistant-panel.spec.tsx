import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import assistant from '../../../../messages/vi/assistant.json';
import { ASSISTANT_OPEN_KEY } from '../model';
import { AssistantPanel } from './assistant-panel';

const { consult, pricing, fetchServices } = vi.hoisted(() => ({
  consult: vi.fn(),
  pricing: vi.fn(),
  fetchServices: vi.fn(),
}));
vi.mock('@/features/membership', () => ({
  openConsultForm: consult,
  openPricingPopup: pricing,
}));
vi.mock('@/features/services', async () => {
  const { useQuery } = await import('@tanstack/react-query');
  return {
    ServiceIcon: () => null,
    useServices: () =>
      useQuery({
        queryKey: ['services'],
        queryFn: fetchServices,
        select: (r: { items: { enabled: boolean }[] }) => r.items.filter((s) => s.enabled),
      }),
  };
});

const SVC = [
  {
    id: 'fund',
    name: 'Kết nối nguồn vốn',
    model: 'Theo dự án',
    description: 'Kết nối quỹ.',
    enabled: true,
  },
  {
    id: 'mkt',
    name: 'Marketing số theo tháng',
    model: 'Thuê bao',
    description: 'Fanpage.',
    enabled: false,
  },
];

function ui() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="vi" messages={{ assistant }}>
        <AssistantPanel />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  fetchServices.mockResolvedValue({ items: SVC });
});
afterEach(cleanup);

/** V4-613 REQ-513 / AD-09: khung Trợ lý ở chân sidebar — đóng / mở, mục tắt không hiện, mở form tư vấn */
describe('Trợ lý OPC Hub', () => {
  it('mặc định đóng; mở → chỉ mục đang bật; nhớ trạng thái', async () => {
    ui();
    expect(screen.getByText('Trợ lý OPC Hub')).toBeTruthy();
    expect(screen.queryByText('Kết nối nguồn vốn')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Mở Trợ lý OPC Hub' }));
    await waitFor(() => expect(screen.getByText('Kết nối nguồn vốn')).toBeTruthy());
    expect(screen.queryByText('Marketing số theo tháng')).toBeNull();
    expect(window.localStorage.getItem(ASSISTANT_OPEN_KEY)).toBe('1');
    cleanup();
    ui();
    expect(screen.getByRole('button', { name: 'Thu gọn Trợ lý OPC Hub' })).toBeTruthy();
  });

  it('accordion → "Đăng ký tư vấn" mở form của đúng dịch vụ; "Xem tất cả" mở popup', async () => {
    window.localStorage.setItem(ASSISTANT_OPEN_KEY, '1');
    ui();
    const head = await screen.findByRole('button', { name: /Kết nối nguồn vốn/ });
    expect(head.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(head);
    expect(screen.getByText('Kết nối quỹ.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký tư vấn' }));
    expect(consult).toHaveBeenCalledWith('fund');
    fireEvent.click(head);
    expect(screen.queryByText('Kết nối quỹ.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Xem tất cả dịch vụ →' }));
    expect(pricing).toHaveBeenCalledOnce();
  });

  it('lỗi tải → "Thử lại" gọi lại; danh mục rỗng → câu rỗng', async () => {
    window.localStorage.setItem(ASSISTANT_OPEN_KEY, '1');
    fetchServices.mockRejectedValueOnce(new Error('down'));
    ui();
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(screen.getByText('Kết nối nguồn vốn')).toBeTruthy());
    cleanup();
    fetchServices.mockResolvedValue({ items: [] });
    ui();
    expect(await screen.findByText('Chưa có chương trình nào đang mở.')).toBeTruthy();
  });
});
