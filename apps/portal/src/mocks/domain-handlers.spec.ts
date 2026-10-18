import { resetMockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;
const AUTH = { Authorization: 'Bearer mock.m1' };

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => resetMockDb());
afterAll(() => server.close());

const get = async <T>(path: string) =>
  (await fetch(`${BASE}${path}`, { headers: AUTH })).json() as Promise<T>;
const send = (path: string, method: string, body?: unknown, extra: Record<string, string> = {}) =>
  fetch(`${BASE}${path}`, {
    method,
    headers: { ...AUTH, 'Content-Type': 'application/json', ...extra },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

describe('MSW portal — nhóm & chat', () => {
  it('lọc nhóm theo vùng, có myStatus', async () => {
    const b = await get<{ items: { region: string; id: string; myStatus: string | null }[] }>(
      '/groups?region=Miền Bắc&size=100',
    );
    expect(b.items.every((g) => g.region === 'Miền Bắc')).toBe(true);
    expect(b.items.find((g) => g.id === 'c1')?.myStatus).toBe('member');
  });

  it('tham gia nhóm công khai → 201 member, rời nhóm → left', async () => {
    const r = await send('/groups/c3/join', 'POST', {});
    expect(r.status).toBe(201);
    expect(((await r.json()) as { status: string }).status).toBe('member');
    const l = await send('/groups/c3/join', 'DELETE');
    expect(((await l.json()) as { status: string }).status).toBe('left');
  });

  it('nhóm không tồn tại → 404', async () => {
    expect((await send('/groups/zz/join', 'POST', {})).status).toBe(404);
  });

  it('tin nhắn phòng theo cursor', async () => {
    const b = await get<{ items: { id: string }[]; nextCursor: string | null }>(
      '/rooms/c1-general/messages?size=3',
    );
    expect(b.items).toHaveLength(3);
    expect(b.nextCursor).toBe('c1-general-1');
  });

  it('báo cáo tin nhắn: sai lý do → 400 kèm fields', async () => {
    const bad = await send('/messages/c1-general-0/report', 'POST', { reason: 'x' });
    expect(bad.status).toBe(400);
    const body = (await bad.json()) as { error: { fields: { path: string }[] } };
    expect(body.error.fields[0]?.path).toBe('reason');
    expect((await send('/messages/c1-general-0/report', 'POST', { reason: 'spam' })).status).toBe(
      201,
    );
  });
});

describe('MSW portal — sự kiện, dự án, đầu tư', () => {
  it('lọc sự kiện online + registeredByMe', async () => {
    const b = await get<{ items: { mode: string; id: string; registeredByMe: boolean }[] }>(
      '/events?mode=online',
    );
    expect(b.items.every((e) => e.mode === 'online')).toBe(true);
    expect(b.items.find((e) => e.id === 'e2')?.registeredByMe).toBe(true);
  });

  it('đăng ký sự kiện → 201, lặp lại → 409', async () => {
    expect((await send('/events/e1/registration', 'POST')).status).toBe(201);
    expect((await send('/events/e1/registration', 'POST')).status).toBe(409);
  });

  it('dự án công khai size 9 và lọc theo giai đoạn', async () => {
    const b = await get<{ items: { stage: string }[]; size: number; total: number }>(
      '/projects?stage=mvp',
    );
    expect(b.size).toBe(9);
    expect(b.total).toBe(3);
    expect(b.items.every((p) => p.stage === 'mvp')).toBe(true);
  });

  it('dự án chưa duyệt → 404', async () => {
    expect((await fetch(`${BASE}/projects/p7`)).status).toBe(404);
  });

  it('gửi quan tâm cần Idempotency-Key; cùng key trả lại bản cũ, key mới → 409', async () => {
    const body = {
      kind: 'fund',
      contactName: 'Nguyễn Văn An',
      organization: 'Quỹ ABC',
      phone: '+84 900 000 000',
      amount: 10000,
      message: 'Quan tâm',
    };
    expect((await send('/projects/p2/interest', 'POST', body)).status).toBe(400);
    const key = { 'Idempotency-Key': 'k1' };
    expect((await send('/projects/p2/interest', 'POST', body, key)).status).toBe(201);
    expect((await send('/projects/p2/interest', 'POST', body, key)).status).toBe(201);
    const again = { 'Idempotency-Key': 'k2' };
    expect((await send('/projects/p2/interest', 'POST', body, again)).status).toBe(409);
  });

  it('IV-R02 REQ-372 chủ dự án không có luồng NĐT, gửi vào luồng người khác → 404', async () => {
    const b = await get<{ items: unknown[] }>('/me/investor-thread');
    expect(b.items).toEqual([]);
    expect(
      (await send('/investor-thread/p10-i1/messages', 'POST', { body: 'Chào anh' })).status,
    ).toBe(404);
  });

  it('IV-R02 BUG-006 NĐT 2 dự án → một luồng chung, gửi bằng khoá của dự án nào cũng vào đó', async () => {
    const somchai = { Authorization: 'Bearer mock.m5' };
    type Th = {
      key: string;
      counterpartName: string;
      messages: { body: string; fromInvestor: boolean }[];
    };
    const read = async () =>
      (
        (await (await fetch(`${BASE}/me/investor-thread`, { headers: somchai })).json()) as {
          items: Th[];
        }
      ).items;
    const post = (key: string, body: string) =>
      send(`/investor-thread/${key}/messages`, 'POST', { body }, somchai);
    expect((await read()).map((t) => t.counterpartName)).toEqual(['Admin OPC Hub']);
    expect((await post('p10-i1', 'Tin từ trang OPC Hub Mobile')).status).toBe(201);
    expect((await post('p1-i3', 'Tin từ trang SoloBooks')).status).toBe(201);
    const [th] = await read();
    expect(th?.messages.map((m) => [m.body, m.fromInvestor])).toEqual([
      ['Tin từ trang OPC Hub Mobile', true],
      ['Tin từ trang SoloBooks', true],
    ]);
  });
});

describe('MSW portal — phí, thông báo, dịch vụ', () => {
  it('phí thành viên của TK demo', async () => {
    const b = await get<{ status: string; amount: number; transferRef: string }>('/me/membership');
    expect(b).toMatchObject({ status: 'active', amount: 600000, transferRef: 'OPCHUB TV000001' });
  });

  it('thông báo cursor + số chưa đọc', async () => {
    const b = await get<{ items: unknown[]; unread: number; nextCursor: string | null }>(
      '/notifications?size=3',
    );
    expect(b.items).toHaveLength(3);
    expect(b.unread).toBe(2);
    expect(b.nextCursor).toBe('s3');
  });

  it('REQ-408 gửi phiếu YC dịch vụ hợp lệ → mã YC-1006, details bỏ khoá lạ', async () => {
    const r = await send(
      '/service-requests',
      'POST',
      {
        serviceId: 'ai30',
        requesterType: 'personal',
        fullName: 'Nguyễn Văn An',
        phone: '+84 912 345 678',
        email: 'an.nguyen@mediasoft.vn',
        address: 'Hà Nội',
        note: '<p>Cần tư vấn</p>',
        details: { 'Nghề nghiệp / vai trò': 'Freelancer', 'Khoá lạ': 'x' },
      },
      { 'Idempotency-Key': 'yc1' },
    );
    expect(r.status).toBe(201);
    const body = (await r.json()) as { code: string; details: Record<string, string> };
    expect(body.code).toBe('YC-1006');
    expect(body.details).toEqual({ 'Nghề nghiệp / vai trò': 'Freelancer' });
  });

  it('UAT-21 BUG-019 MSW phiếu DN thiếu MST → 400 taxCode như server', async () => {
    const r = await send(
      '/service-requests',
      'POST',
      {
        serviceId: 'ai30',
        requesterType: 'business',
        fullName: 'Nguyễn Văn An',
        phone: '+84 912 345 678',
        email: 'an.nguyen@mediasoft.vn',
        organization: 'MediaSoft',
        address: 'Hà Nội',
        note: 'x',
        details: {
          'Loại hình': 'Doanh nghiệp',
          'Quy mô nhân sự': '1 – 10 người',
          'Chức vụ người liên hệ': 'GĐ',
        },
      },
      { 'Idempotency-Key': 'yc2' },
    );
    expect(r.status).toBe(400);
    const e = (await r.json()) as {
      error: { code: string; fields: { path: string; message: string }[] };
    };
    expect(e.error.code).toBe('VALIDATION_ERROR');
    expect(e.error.fields).toEqual([
      { path: 'taxCode', message: 'Vui lòng nhập mã số thuế (10 hoặc 13 số)' },
    ]);
  });
});
