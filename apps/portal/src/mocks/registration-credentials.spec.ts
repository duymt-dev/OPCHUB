import { registrationCredentials } from './registration-credentials';

const email = 'private@example.test';
const id = `n-${email}`;
const password = 'SyntheticExample42!';
beforeEach(() => localStorage.clear());

describe('REQ-401 UAT-30 private MSW registration credential boundary', () => {
  it('requires activation and the actual password, never grants an unknown account', async () => {
    const store = registrationCredentials();
    expect(await store.authenticate(email, password)).toBeNull();
    await store.stage(email, password, 100);
    expect(await store.authenticate(email, password)).toBeNull();
    store.activate(email, id, 101);
    expect(await store.authenticate(email, 'wrong')).toBeNull();
    expect(await store.authenticate(email, '')).toBeNull();
    expect(await store.authenticate(email, password)).toBe(id);
    expect(await store.authenticate('other@example.test', password)).toBeNull();
  });

  it('survives a fresh adapter/browser reload with only salted verifiers persisted', async () => {
    await registrationCredentials().stage(email, password, 100);
    registrationCredentials().activate(email, id, 101);
    expect(await registrationCredentials().authenticate(email.toUpperCase(), password)).toBe(id);
    const raw = localStorage.getItem(localStorage.key(0) ?? '');
    expect(raw).not.toContain(password);
    expect(JSON.parse(raw ?? '{}')).toMatchObject({ state: 'active', userId: id });
    const first = JSON.parse(raw ?? '{}') as { salt: string; verifier: string };
    await registrationCredentials().stage('other@example.test', password, 100);
    const otherKey = Array.from({ length: localStorage.length }, (_, i) =>
      localStorage.key(i),
    ).find((key) => key?.includes('other%40'));
    const second = JSON.parse(localStorage.getItem(otherKey ?? '') ?? '{}') as {
      salt: string;
      verifier: string;
    };
    expect(second.salt).not.toBe(first.salt);
    expect(second.verifier).not.toBe(first.verifier);
  });

  it('rejects expired pending and wrong identity; activation cannot be replayed', async () => {
    const store = registrationCredentials();
    await store.stage(email, password, 100);
    store.activate(email, id, 1800100);
    expect(await store.authenticate(email, password)).toBeNull();
    store.activate(email, 'm1', 101);
    expect(await store.authenticate(email, password)).toBeNull();
    store.activate(email, id, 101);
    const before = localStorage.getItem(localStorage.key(0) ?? '');
    store.activate(email, 'm1', 102);
    expect(localStorage.getItem(localStorage.key(0) ?? '')).toBe(before);
  });

  it('does not give passwordless registrations a default/demo password', async () => {
    const store = registrationCredentials();
    await store.stage(email, password, 100);
    await store.stage(email, '', 101);
    store.activate(email, id, 102);
    expect(localStorage.length).toBe(0);
    expect(await store.authenticate(email, password)).toBeNull();
  });

  it('fails closed for malformed storage or injected plaintext fields', async () => {
    const store = registrationCredentials();
    await store.stage(email, password, 100);
    store.activate(email, id, 101);
    const key = localStorage.key(0) ?? '';
    const raw: unknown = JSON.parse(localStorage.getItem(key) ?? '{}');
    localStorage.setItem(key, JSON.stringify({ ...(raw as Record<string, unknown>), password }));
    expect(await store.authenticate(email, password)).toBeNull();
    localStorage.setItem(key, '{broken');
    expect(await store.authenticate(email, password)).toBeNull();
  });
});
