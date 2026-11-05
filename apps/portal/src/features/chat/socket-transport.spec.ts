import { beforeEach, describe, expect, it, vi } from 'vitest';
import { chatMessageSchema } from '@opchub/shared/api-domains';
import { socketTransport } from './socket-transport';

const { socket, handlers } = vi.hoisted(() => {
  const handlers = new Map<string, (raw: unknown) => void>();
  const socket = {
    connected: false,
    on: vi.fn((event: string, callback: (raw: unknown) => void) => handlers.set(event, callback)),
    off: vi.fn((event: string) => handlers.delete(event)),
    timeout: vi.fn(() => ({ emitWithAck: vi.fn().mockResolvedValue({ ok: true, data: {} }) })),
  };
  return { socket, handlers };
});
vi.mock('@/lib/socket', () => ({ realtimeEnabled: true, getSocket: () => socket }));
beforeEach(() => {
  handlers.clear();
  vi.clearAllMocks();
});

const message = chatMessageSchema.parse({
  id: 'hidden-member',
  roomId: 'room-a',
  sender: { name: 'Member', avatarUrl: null },
  body: '',
  attachment: null,
  reactions: [],
  pinned: false,
  kind: 'text',
  createdAt: '2026-10-21T05:00:00Z',
  hiddenAt: '2026-10-21T05:00:00Z',
  senderId: 'member',
  senderRole: null,
  replyTo: null,
  reportedByMe: false,
  myReactions: [],
  clientMsgId: 'client-id',
});

describe('D-77 socket delivery provenance', () => {
  it('distinguishes a new message from an update and unregisters both listeners', () => {
    const onMessage = vi.fn();
    const leave = socketTransport.join('room-a', onMessage);
    handlers.get('message.new')?.(message);
    handlers.get('message.updated')?.(message);
    expect(onMessage).toHaveBeenNthCalledWith(1, message, 'message.new');
    expect(onMessage).toHaveBeenNthCalledWith(2, message, 'message.updated');
    leave();
    expect(handlers.has('message.new')).toBe(false);
    expect(handlers.has('message.updated')).toBe(false);
  });
  it('still rejects malformed payloads and messages from another room', () => {
    const onMessage = vi.fn();
    const leave = socketTransport.join('room-a', onMessage);
    handlers.get('message.new')?.({ id: 'invalid' });
    handlers.get('message.new')?.({ ...message, roomId: 'room-b' });
    handlers.get('message.updated')?.({ ...message, roomId: 'room-b' });
    expect(onMessage).not.toHaveBeenCalled();
    leave();
  });
});
