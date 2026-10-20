import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthStateService } from '@/common/auth';
import { forbidden } from '@/common/errors';
import { UserEventsPublisher } from '@/common/realtime/user-events.publisher';
import { ROOM_ACCESS_PORT, type RoomAccessPort } from '@/socket/room-access.port';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { liveMetricsSchema } from '@opchub/shared/api-domains';
import { RoomEventsPublisher } from '@/common/realtime/room-events.publisher';
import { createSocketApp, connected, nextEvent, type SocketTestApp } from '../setup/socket-app';
import { createTestApp, type TestApp } from '../setup/test-app';

/** Cổng phòng giả: chỉ phòng `ok-*` vào được */
const fakeRooms: RoomAccessPort = {
  join: (_u, roomId) =>
    roomId.startsWith('ok-')
      ? Promise.resolve({ unread: 3 })
      : Promise.reject(forbidden('Chỉ thành viên nhóm mới xem và gửi được tin nhắn')),
  watchable: (_u, ids) => Promise.resolve(ids.filter((g) => g.startsWith('ok-'))),
};

describe('Socket process: handshake, user room, room.join, presence (TIP-B22)', () => {
  let t: TestApp;
  let s: SocketTestApp;

  beforeAll(async () => {
    t = await createTestApp();
    s = await createSocketApp({ overrides: [[ROOM_ACCESS_PORT, fakeRooms]] });
  });
  afterAll(async () => {
    await s.close();
    await t.close();
  });
  beforeEach(async () => {
    await flushAuthState(t);
  });

  it('token sai / thiếu → connect_error UNAUTHORIZED; chưa đóng phí → MEMBERSHIP_REQUIRED', async () => {
    expect(await connected(s.connect(null))).toEqual({ ok: false, code: 'UNAUTHORIZED' });
    expect(await connected(s.connect('abc'))).toEqual({ ok: false, code: 'UNAUTHORIZED' });
    const unpaid = await tokenOf(t, await createUser(t, { fee: 'pending_payment' }));
    expect(await connected(s.connect(unpaid))).toEqual({
      ok: false,
      code: 'MEMBERSHIP_REQUIRED',
    });
  });

  it('REQ-202 BUG-018 handshake hết hạn theo valid_until → MEMBERSHIP_REQUIRED', async () => {
    const u = await createUser(t, { fee: 'active' });
    const token = await tokenOf(t, u);
    const past = new Date(Date.now() - 60_000).toISOString();
    await t.app.get(AuthStateService).setFee(u.id, { status: 'active', validUntil: past });
    expect(await connected(s.connect(token))).toEqual({ ok: false, code: 'MEMBERSHIP_REQUIRED' });
  });

  it('BUG-025 V2Q-92 chưa đóng phí + scope membership → chỉ nhận membership.updated, room.join bị chặn', async () => {
    const u = await createUser(t, { fee: 'pending_payment' });
    const c = s.connectWith({ token: await tokenOf(t, u), scope: 'membership' });
    expect(await connected(c)).toEqual({ ok: true });
    const join = (await c.emitWithAck('room.join', { roomId: 'ok-1' })) as {
      ok: boolean;
      error: { code: string };
    };
    expect(join).toMatchObject({ ok: false, error: { code: 'MEMBERSHIP_REQUIRED' } });
    const got = nextEvent<{ status: string; validUntil: string | null }>(c, 'membership.updated');
    const until = new Date(Date.now() + 365 * 86_400_000).toISOString();
    await t.app
      .get(UserEventsPublisher)
      .publish(u.id, 'membership.updated', { status: 'active', validUntil: until });
    expect(await got).toEqual({ status: 'active', validUntil: until });
  });

  it('TD-018 handshake vượt SOCKET_CONNECT_PER_MIN (30/phút/IP) → RATE_LIMITED; theo tài khoản cũng vậy', async () => {
    const u = await createUser(t, { fee: 'active' });
    const token = await tokenOf(t, u);
    // Đếm theo IP trước khi xác thực: 30 handshake (kể cả lỗi) rồi lần 31 bị chặn dù token đúng
    const first = await Promise.all(Array.from({ length: 30 }, () => connected(s.connect(null))));
    expect(first.every((r) => !r.ok && r.code === 'UNAUTHORIZED')).toBe(true);
    expect(await connected(s.connect(token))).toEqual({ ok: false, code: 'RATE_LIMITED' });

    // Theo tài khoản (sau xác thực): IP mới sạch nhưng TK đã đủ 30 lần/phút
    await flushAuthState(t);
    await t.redis.client.set(`socket:conn:u:${u.id}`, '30', 'EX', 60);
    expect(await connected(s.connect(token))).toEqual({ ok: false, code: 'RATE_LIMITED' });
    // Hết cửa sổ (xoá khoá) → kết nối lại được
    await flushAuthState(t);
    expect(await connected(s.connect(token))).toEqual({ ok: true });
  });

  it('tài khoản bị khoá → FORBIDDEN', async () => {
    const u = await createUser(t, { fee: 'active' });
    const token = await tokenOf(t, u);
    await t.app.get(AuthStateService).setLocked(u.id, true);
    expect(await connected(s.connect(token))).toEqual({ ok: false, code: 'FORBIDDEN' });
  });

  it('publish socket:user → nhận event; session.revoked → bị ngắt', async () => {
    const u = await createUser(t, { fee: 'active' });
    const c = s.connect(await tokenOf(t, u));
    expect(await connected(c)).toEqual({ ok: true });
    const pub = t.app.get(UserEventsPublisher);
    const got = nextEvent<{ status: string }>(c, 'membership.updated');
    await pub.publish(u.id, 'membership.updated', { status: 'active', validUntil: null });
    expect((await got).status).toBe('active');

    const gone = nextEvent<string>(c, 'disconnect');
    const revoked = nextEvent<{ reason: string }>(c, 'session.revoked');
    await pub.publish(u.id, 'session.revoked', { reason: 'logout_all' });
    expect((await revoked).reason).toBe('logout_all');
    expect(await gone).toBe('io server disconnect');
  });

  it('room.join: phòng không được phép → ack lỗi; phòng được phép → unread + online, room.online = 2', async () => {
    const a = s.connect(await tokenOf(t, await createUser(t, { fee: 'active' })));
    const b = s.connect(await tokenOf(t, await createUser(t, { fee: 'active' })));
    await Promise.all([connected(a), connected(b)]);
    const bad = (await a.emitWithAck('room.join', { roomId: 'x-1' })) as {
      ok: boolean;
      error: { code: string };
    };
    expect(bad).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    const badBody = (await a.emitWithAck('room.join', {})) as {
      ok: boolean;
      error: { code: string };
    };
    expect(badBody.error.code).toBe('VALIDATION_ERROR');

    const room = `ok-${Date.now()}`;
    const ra = (await a.emitWithAck('room.join', { roomId: room })) as {
      ok: true;
      data: { unread: number; online: number };
    };
    expect(ra).toEqual({ ok: true, data: { unread: 3, online: 1 } });
    const online = nextEvent<{ roomId: string; online: number }>(a, 'room.online', 6_000);
    await b.emitWithAck('room.join', { roomId: room });
    // Gom ≤ 5s (S-01): có thể nhận lần đếm 1 trước — chờ tới khi thấy 2
    let last = await online;
    while (last.online < 2) last = await nextEvent(a, 'room.online', 6_000);
    expect(last).toEqual({ roomId: room, online: 2 });

    const left = (await b.emitWithAck('room.leave', { roomId: room })) as { ok: boolean };
    expect(left.ok).toBe(true);
  });

  it('REQ-224 NA-24 metrics.subscribe → ack gói hiện tại + metrics.updated mỗi 3 giây; unsubscribe thì dừng', async () => {
    const c = s.connect(await tokenOf(t, await createUser(t, { fee: 'active' })));
    await connected(c);
    const ack = (await c.emitWithAck('metrics.subscribe', { scope: 'portal' })) as {
      ok: boolean;
      data: unknown;
    };
    expect(ack.ok).toBe(true);
    expect(liveMetricsSchema.safeParse(ack.data).success).toBe(true);
    const tick = await nextEvent<unknown>(c, 'metrics.updated', 7_000);
    expect(liveMetricsSchema.parse(tick).stats.online).toBeGreaterThanOrEqual(1);

    await c.emitWithAck('metrics.unsubscribe', { scope: 'portal' });
    // sau khi rời room, không nhận thêm trong ít nhất 2 nhịp
    await expect(nextEvent(c, 'metrics.updated', 7_000)).rejects.toThrow();
  }, 20_000);

  it('REQ-224 test âm: thành viên subscribe scope admin → FORBIDDEN', async () => {
    const c = s.connect(await tokenOf(t, await createUser(t, { fee: 'active' })));
    await connected(c);
    const r = (await c.emitWithAck('metrics.subscribe', { scope: 'admin' })) as {
      ok: boolean;
      error: { code: string };
    };
    expect(r).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
  });

  it('REQ-225 NA-25 groups.watch chỉ vào nhóm được phép; unread.bump phát một lần vào group:{id}', async () => {
    const a = s.connect(await tokenOf(t, await createUser(t, { fee: 'active' })));
    const b = s.connect(await tokenOf(t, await createUser(t, { fee: 'active' })));
    await Promise.all([connected(a), connected(b)]);
    const gid = `ok-g-${Date.now()}`;
    const w = (await a.emitWithAck('groups.watch', { groupIds: [gid, 'x-g'] })) as {
      ok: boolean;
      data: { groupIds: string[] };
    };
    expect(w).toEqual({ ok: true, data: { groupIds: [gid] } });
    await b.emitWithAck('groups.watch', { groupIds: ['x-g'] });
    const bumpA = nextEvent<unknown>(a, 'unread.bump');
    const bumpB = nextEvent<unknown>(b, 'unread.bump', 1_500);
    await t.app
      .get(RoomEventsPublisher)
      .unreadBump({ roomId: `${gid}-general`, groupId: gid, senderId: null });
    expect(await bumpA).toEqual({ roomId: `${gid}-general`, groupId: gid, senderId: null });
    await expect(bumpB).rejects.toThrow();
  });
});
