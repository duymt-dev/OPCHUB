import { QueryClient } from '@tanstack/react-query';
import { newMemberMe } from '@opchub/shared/mock-data';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import { bindSessionQueryCache } from './session-query-boundary';

let client: QueryClient;
let unbind: () => void;
const session = (email: string) =>
  useAuthStore.getState().setSession('fake-only', newMemberMe(email, email));
beforeEach(() => {
  useAuthStore.getState().clear();
  session('a@test.vn');
  client = new QueryClient();
  unbind = bindSessionQueryCache(client);
});
afterEach(() => {
  unbind();
  client.clear();
  useAuthStore.getState().clear();
});

describe('BUG-045 AU-09 query identity boundary', () => {
  it('REQ-311 switching members immediately removes prior affiliate and membership cache', () => {
    client.setQueryData(['me', 'affiliate'], { code: 'PRIVATEA' });
    client.setQueryData(['me', 'membership'], { status: 'active' });
    session('b@test.vn');
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
  it('REQ-311 logout removes cache before another member can render it', () => {
    client.setQueryData(['me', 'affiliate'], { bankNo: '123456789' });
    useAuthStore.getState().signOut();
    expect(client.getQueryData(['me', 'affiliate'])).toBeUndefined();
  });
  it('REQ-311 refresh and membership update on the same user preserve cached data', () => {
    client.setQueryData(['me', 'affiliate'], { code: 'KEPT' });
    const me = useAuthStore.getState().me;
    if (!me) throw new Error('Missing session');
    useAuthStore.getState().setSession('refreshed-fake', {
      ...me,
      membershipFee: {
        status: 'active',
        amount: 600000,
        transferRef: 'OPCHUB TV000001',
        validUntil: '2027-10-01T00:00:00Z',
      },
    });
    expect(client.getQueryData(['me', 'affiliate'])).toEqual({ code: 'KEPT' });
  });
  it('REQ-311 late response from the previous user cannot repopulate the new user cache', async () => {
    let finish: (v: string) => void = () => undefined;
    const old = client
      .fetchQuery({
        queryKey: ['me', 'affiliate'],
        queryFn: () =>
          new Promise<string>((resolve) => {
            finish = resolve;
          }),
      })
      .catch(() => undefined);
    session('b@test.vn');
    client.setQueryData(['me', 'affiliate'], 'NEW USER');
    finish('OLD USER BANK');
    await old;
    expect(client.getQueryData(['me', 'affiliate'])).toBe('NEW USER');
  });
});
