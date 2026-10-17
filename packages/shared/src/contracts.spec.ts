import { describe, expect, it } from 'vitest';
import { isOutboxEventType, parseOutboxPayload } from './outbox';
import { jobs, QUEUES } from './queues';
import { clientEvents, serverEvents, socketRooms } from './socket';

const message = {
  id: 'x1',
  roomId: 'r1',
  sender: { name: 'A', avatarUrl: null },
  body: 'hi',
  attachment: null,
  reactions: [],
  pinned: false,
  createdAt: '2026-10-17T00:00:00.000Z',
  kind: 'text',
  senderId: 'm1',
  senderRole: null,
  replyTo: null,
  reportedByMe: false,
  myReactions: [],
  clientMsgId: 'c1',
};

describe('hợp đồng socket', () => {
  it('message.new bỏ isSimulated (D-48)', () => {
    const out = serverEvents['message.new'].parse({ ...message, isSimulated: true });
    expect(out).not.toHaveProperty('isSimulated');
  });

  it('message.send cần roomId và clientMsgId', () => {
    const p = clientEvents['message.send'].payload;
    expect(p.safeParse({ roomId: 'r1', clientMsgId: 'c', body: 'x' }).success).toBe(true);
    expect(p.safeParse({ clientMsgId: 'c', body: 'x' }).success).toBe(false);
    expect(p.safeParse({ roomId: 'r1', body: 'x' }).success).toBe(false);
  });

  it('ack lỗi dùng mã lỗi chung', () => {
    const a = clientEvents['room.join'].ack;
    expect(a.safeParse({ ok: false, error: { code: 'FORBIDDEN', message: 'x' } }).success).toBe(
      true,
    );
    expect(a.safeParse({ ok: false, error: { code: 'NOPE', message: 'x' } }).success).toBe(false);
    expect(a.safeParse({ ok: true, data: { unread: 2, online: 5 } }).success).toBe(true);
  });

  it('tên room', () => {
    expect(socketRooms.user('u1')).toBe('user:u1');
    expect(socketRooms.room('r1')).toBe('room:r1');
  });
});

describe('hợp đồng outbox + queue', () => {
  it('user.locked cần userId', () => {
    expect(parseOutboxPayload('user.locked', { userId: 'u', reason: null })).toEqual({
      userId: 'u',
      reason: null,
    });
    expect(() => parseOutboxPayload('user.locked', { reason: null })).toThrow();
  });

  it('nhận diện loại sự kiện', () => {
    expect(isOutboxEventType('mail.requested')).toBe(true);
    expect(isOutboxEventType('nope')).toBe(false);
  });

  it('job scheduler nhận ngày ISO', () => {
    expect(jobs.scheduler.feeStatus.safeParse({ day: '2026-10-17' }).success).toBe(true);
    expect(jobs.scheduler.feeStatus.safeParse({ day: '17/10/2026' }).success).toBe(false);
    expect(QUEUES.mail).toBe('mail');
  });
});
