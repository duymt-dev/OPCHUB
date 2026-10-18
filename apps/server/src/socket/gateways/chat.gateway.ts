import { Inject, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { clientEvents, socketRooms } from '@opchub/shared/socket';
import { AppError } from '@/common/errors';
import { PresenceService } from '@/common/realtime/presence.service';
import { ROOM_ACCESS_PORT, type RoomAccessPort } from '../room-access.port';
import { RoomEventsSubscriber } from './room-events.subscriber';
import { SocketAuth } from './socket-auth';
import {
  type Ack,
  type AppServer,
  type AppSocket,
  HandshakeError,
  rejectClientEvents,
  toAck,
} from './socket-types';
import { UserEventsSubscriber } from './user-events.subscriber';

/** S-01: phát số online gom mỗi ≤ 5s; heartbeat presence 30s */
const ONLINE_FLUSH_MS = 2_000;
const HEARTBEAT_MS = 30_000;

/**
 * Gateway chat (S-02, S-09): handshake JWT → `user:{id}`; `room.join` kiểm quyền 1 lần rồi cache
 * trong `socket.data.rooms`. Gửi/react/pin ở MessageGateway.
 */
@WebSocketGateway()
export class ChatGateway implements OnGatewayInit, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly auth: SocketAuth,
    private readonly presence: PresenceService,
    private readonly userEvents: UserEventsSubscriber,
    private readonly roomEvents: RoomEventsSubscriber,
    @Inject(ROOM_ACCESS_PORT) private readonly access: RoomAccessPort,
  ) {}

  afterInit(io: AppServer): void {
    io.use((socket, next) => {
      this.auth
        .authenticate(socket.handshake.auth)
        .then(({ user, limited }) => {
          socket.data.user = user;
          socket.data.rooms = new Set();
          socket.data.limited = limited;
          void socket.join(socketRooms.user(user.sub));
          // V2Q-92: kết nối chờ phí chỉ nhận sự kiện, không tính online, chặn mọi sự kiện client
          if (limited) rejectClientEvents(socket);
          else void this.presence.usersSeen([user.sub]).catch(() => undefined);
          next();
        })
        .catch((err: unknown) => {
          const e =
            err instanceof AppError
              ? new HandshakeError(err.code, err.message)
              : new HandshakeError('UNAUTHORIZED', 'Vui lòng đăng nhập');
          next(e);
        });
    });
    void this.userEvents.start(io);
    void this.roomEvents.start(io);
    this.presence.startTicker(ONLINE_FLUSH_MS, () => this.flushOnline(io));
    setInterval(() => void this.heartbeat(io).catch(() => undefined), HEARTBEAT_MS).unref();
    this.logger.log('Socket.IO sẵn sàng');
  }

  handleDisconnect(socket: AppSocket): void {
    const rooms = [...(socket.data.rooms ?? [])];
    void this.presence.leave(rooms, socket.id).catch(() => undefined);
  }

  @SubscribeMessage('room.join')
  roomJoin(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() body: unknown,
  ): Promise<Ack<{ unread: number; online: number }>> {
    return toAck(async () => {
      const { roomId } = clientEvents['room.join'].payload.parse(body);
      const { unread } = await this.access.join(socket.data.user, roomId);
      socket.data.rooms.add(roomId);
      await socket.join(socketRooms.room(roomId));
      const online = await this.presence.enter(roomId, socket.id);
      return { unread, online };
    });
  }

  @SubscribeMessage('room.leave')
  roomLeave(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() body: unknown,
  ): Promise<Ack<Record<string, never>>> {
    return toAck(async () => {
      const { roomId } = clientEvents['room.leave'].payload.parse(body);
      if (socket.data.rooms.delete(roomId)) {
        await socket.leave(socketRooms.room(roomId));
        await this.presence.leave([roomId], socket.id);
      }
      return {};
    });
  }

  /** Mỗi process SPOP phần phòng bẩn của mình, phát qua adapter tới mọi process */
  private async flushOnline(io: AppServer): Promise<void> {
    const ids = await this.presence.drainDirty();
    if (!ids.length) return;
    const counts = await this.presence.counts(ids);
    for (const [roomId, online] of counts) {
      io.to(socketRooms.room(roomId)).emit('room.online', { roomId, online });
    }
  }

  /** Gia hạn presence cho socket cục bộ — 1 pipeline */
  private async heartbeat(io: AppServer): Promise<void> {
    const entries: [string, string[]][] = [];
    const users = new Set<string>();
    for (const s of io.of('/').sockets.values()) {
      if (s.data.limited) continue;
      users.add(s.data.user.sub);
      if (s.data.rooms.size) entries.push([s.id, [...s.data.rooms]]);
    }
    await Promise.all([this.presence.touchMany(entries), this.presence.usersSeen([...users])]);
  }
}
