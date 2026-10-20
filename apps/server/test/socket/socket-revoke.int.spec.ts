import { createHash, randomBytes } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { forbidden } from '@/common/errors';
import { PresenceService } from '@/common/realtime';
import { ROOM_ACCESS_PORT, type RoomAccessPort } from '@/socket/room-access.port';
import { AccountCoreModule } from '@/modules/account';
import { AccountProcessor } from '@/worker/processors/account.processor';
import { drainOutbox, setStatus } from '../account/lock-helpers';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createSocketApp, connected, nextEvent, type SocketTestApp } from '../setup/socket-app';
import { createTestApp, type TestApp } from '../setup/test-app';

const fakeRooms: RoomAccessPort = {
  join: (_u, roomId) =>
    roomId.startsWith('ok-')
      ? Promise.resolve({ unread: 0 })
      : Promise.reject(forbidden('Chỉ thành viên nhóm mới xem và gửi được tin nhắn')),
  watchable: (_u, ids) => Promise.resolve(ids.filter((g) => g.startsWith('ok-'))),
};

/**
 * TIP-V2-104 BUG-005: socket process thật + relay outbox thật + AccountProcessor —
 * khoá / đặt lại mật khẩu / đổi vai trò → `session.revoked` rồi ngắt socket đang mở.
 */
describe('Socket bị ngắt khi thu hồi phiên (TIP-V2-104)', () => {
  let t: TestApp;
  let s: SocketTestApp;
  let superToken: string;

  beforeAll(async () => {
    t = await createTestApp({ imports: [AccountCoreModule], providers: [AccountProcessor] });
    s = await createSocketApp({ overrides: [[ROOM_ACCESS_PORT, fakeRooms]] });
    await flushAuthState(t);
    superToken = await tokenOf(t, await createUser(t, { systemRole: 'super_admin' }));
    await drainOutbox(t);
  });
  afterAll(async () => {
    await s.close();
    await t.close();
  });
  beforeEach(() => flushAuthState(t));

  /** Thành viên đã đóng phí đang mở socket trong một phòng chat */
  async function online() {
    const u = await createUser(t, { fee: 'active' });
    const token = await tokenOf(t, u);
    const c = s.connect(token);
    expect(await connected(c)).toEqual({ ok: true });
    const joined = (await c.emitWithAck('room.join', { roomId: `ok-${u.id}` })) as { ok: boolean };
    expect(joined.ok).toBe(true);
    return { u, token, c };
  }

  const isOnline = async (userId: string) =>
    (await t.app.get(PresenceService).usersOnline([userId])).has(userId);

  it('REQ-216 BUG-005 khoá → session.revoked locked + ngắt + rời presence', async () => {
    const { u, token, c } = await online();
    expect(await isOnline(u.id)).toBe(true);
    const revoked = nextEvent<{ reason: string }>(c, 'session.revoked');
    const gone = nextEvent<string>(c, 'disconnect');

    await setStatus(t, superToken, u.id, 'locked');
    await drainOutbox(t);

    expect(await revoked).toEqual({ reason: 'locked' });
    expect(await gone).toBe('io server disconnect');
    expect(await isOnline(u.id)).toBe(false);
    // Reconnect bằng token cũ → FORBIDDEN (Redis auth:locked)
    expect(await connected(s.connect(token))).toEqual({ ok: false, code: 'FORBIDDEN' });
  });

  it('BUG-005 đặt lại mật khẩu → ngắt', async () => {
    const { u, c } = await online();
    // Token đặt lại như mail gửi (Redis `pwreset:<sha256>`, QT-02) rồi đi đúng API reset
    const resetToken = randomBytes(24).toString('hex');
    const key = `pwreset:${createHash('sha256').update(resetToken).digest('hex')}`;
    await t.redis.client.set(key, u.id, 'EX', 900);
    const revoked = nextEvent<{ reason: string }>(c, 'session.revoked');
    const gone = nextEvent<string>(c, 'disconnect');

    const r = await t.call('/auth/password/reset', {
      method: 'POST',
      json: { token: resetToken, newPassword: 'Moi@2026Matkhau!' },
    });
    expect(r.status).toBe(204);
    await drainOutbox(t);

    expect(await revoked).toEqual({ reason: 'password_changed' });
    expect(await gone).toBe('io server disconnect');
  });
});
