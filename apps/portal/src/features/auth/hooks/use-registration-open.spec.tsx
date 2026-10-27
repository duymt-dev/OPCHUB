import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { api } from '@/lib/api-client';
import auth from '../../../../messages/vi/auth.json';
import { useRegistrationOpen } from './use-registration-open';

const { push, toast } = vi.hoisted(() => ({ push: vi.fn(), toast: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@opchub/ui', () => ({ useToast: () => toast }));
vi.mock('@/lib/api-client', () => ({ api: vi.fn() }));
let client: QueryClient;
const settings = (registrationOpen: boolean) => ({ registrationOpen });
function deferred() {
  let resolve: (value: ReturnType<typeof settings>) => void = () => {
    throw new Error('Not initialized');
  };
  let reject: (error: Error) => void = () => {
    throw new Error('Not initialized');
  };
  const promise = new Promise<ReturnType<typeof settings>>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="vi" timeZone="Asia/Ho_Chi_Minh" messages={{ auth }}>
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});
afterEach(() => {
  cleanup();
  client.clear();
});

it.each([false, true])(
  'A-11 REQ-123 never navigates before delayed configuration resolves (%s)',
  async (open) => {
    const response = deferred();
    vi.mocked(api).mockReturnValue(response.promise);
    const { result } = renderHook(useRegistrationOpen, { wrapper: Wrapper });
    let attempt: unknown;
    act(() => {
      attempt = result.current();
    });
    expect(push).not.toHaveBeenCalled();
    await act(async () => {
      response.resolve(settings(open));
      await attempt;
    });
    await waitFor(() => expect(open ? push : toast).toHaveBeenCalledTimes(1));
    expect(api).toHaveBeenCalledTimes(1);
    if (open) expect(push).toHaveBeenCalledWith('/register', { scroll: false });
    else {
      expect(push).not.toHaveBeenCalled();
      expect(toast).toHaveBeenCalledWith(auth.register.closed);
    }
  },
);

it('A-11 REQ-123 failed configuration fails closed and a fresh click can retry successfully', async () => {
  const response = deferred();
  vi.mocked(api).mockReturnValueOnce(response.promise);
  const { result } = renderHook(useRegistrationOpen, { wrapper: Wrapper });
  let attempt: unknown;
  act(() => {
    attempt = result.current();
  });
  expect(push).not.toHaveBeenCalled();
  await act(async () => {
    response.reject(new Error('Unavailable'));
    await attempt;
  });
  expect(push).not.toHaveBeenCalled();
  expect(toast).toHaveBeenCalledTimes(1);
  expect(toast).not.toHaveBeenCalledWith(auth.register.closed);
  vi.mocked(api).mockResolvedValueOnce(settings(true));
  await act(async () => {
    await result.current();
  });
  expect(push).toHaveBeenCalledExactlyOnceWith('/register', { scroll: false });
});

it('A-11 REQ-123 cached closed configuration keeps the original notice without another request', async () => {
  client.setQueryData(['public-settings'], settings(false));
  const { result } = renderHook(useRegistrationOpen, { wrapper: Wrapper });
  await act(async () => {
    await result.current();
  });
  expect(push).not.toHaveBeenCalled();
  expect(toast).toHaveBeenCalledExactlyOnceWith(auth.register.closed);
  expect(api).not.toHaveBeenCalled();
});
